import type { AuthSession } from '../types';

const PBKDF2_ITERATIONS = 100_000;
const HASH_LENGTH = 32;
const HASH_ALGORITHM = 'SHA-256';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function derivePasswordHash(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  return bytesToBase64(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${hash}`;
}

export async function verifyPassword(password: string, storedHash?: string): Promise<boolean> {
  if (!storedHash) return false;

  const [scheme, iterationsValue, saltBase64, expectedHash] = storedHash.split('$');
  if (scheme !== 'pbkdf2' || !iterationsValue || !saltBase64 || !expectedHash) {
    return false;
  }

  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = base64ToBytes(saltBase64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  return bytesToBase64(new Uint8Array(bits)) === expectedHash;
}

export function generatePlainToken(size = 32): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(size)));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export function generateSession(userId: string): AuthSession {
  return {
    sessionToken: generatePlainToken(24),
    userId,
    createdAt: new Date().toISOString(),
  };
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}
