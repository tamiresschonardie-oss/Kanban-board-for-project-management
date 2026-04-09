import type { TimeLog } from '../types';

const HOUR_IN_SECONDS = 3600;
const MINUTE_IN_SECONDS = 60;

export function toSafeInteger(value: number | undefined | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function getTimeLogDurationSeconds(log: TimeLog) {
  if (typeof log.durationSeconds === 'number') return toSafeInteger(log.durationSeconds);
  if (typeof log.manualSeconds === 'number') return toSafeInteger(log.manualSeconds);
  if (typeof log.durationMinutes === 'number') return toSafeInteger(log.durationMinutes * MINUTE_IN_SECONDS);
  if (typeof log.manualMinutes === 'number') return toSafeInteger(log.manualMinutes * MINUTE_IN_SECONDS);
  return 0;
}

export function normalizeTimeLog(log: TimeLog): TimeLog {
  const durationSeconds = getTimeLogDurationSeconds(log);
  return {
    ...log,
    durationSeconds,
    manualSeconds:
      log.source === 'manual'
        ? durationSeconds
        : typeof log.manualSeconds === 'number'
          ? toSafeInteger(log.manualSeconds)
          : undefined,
  };
}

export function normalizeTimeLogs(logs: TimeLog[] | unknown = []) {
  if (!Array.isArray(logs)) return [];
  return logs.map((log) => normalizeTimeLog((log || {}) as TimeLog));
}

export function formatDurationClock(totalSeconds: number) {
  const normalized = toSafeInteger(totalSeconds);
  const hours = Math.floor(normalized / HOUR_IN_SECONDS);
  const minutes = Math.floor((normalized % HOUR_IN_SECONDS) / MINUTE_IN_SECONDS);
  const seconds = normalized % MINUTE_IN_SECONDS;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function formatDurationSummary(totalSeconds: number) {
  const normalized = toSafeInteger(totalSeconds);
  if (normalized === 0) return '0s';

  const hours = Math.floor(normalized / HOUR_IN_SECONDS);
  const minutes = Math.floor((normalized % HOUR_IN_SECONDS) / MINUTE_IN_SECONDS);
  const seconds = normalized % MINUTE_IN_SECONDS;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} s`);
  return parts.join(' ');
}

export function formatDurationHours(totalSeconds: number) {
  return Number((toSafeInteger(totalSeconds) / HOUR_IN_SECONDS).toFixed(2));
}

export function parseManualDurationInput(
  hoursInput: string,
  minutesInput: string,
  secondsInput: string
) {
  const parsePart = (value: string, max?: number) => {
    if (value.trim() === '') return 0;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) return null;
    if (typeof max === 'number' && parsed > max) return null;
    return parsed;
  };

  const hours = parsePart(hoursInput);
  const minutes = parsePart(minutesInput, 59);
  const seconds = parsePart(secondsInput, 59);

  if (hours === null || minutes === null || seconds === null) return null;

  const totalSeconds = hours * HOUR_IN_SECONDS + minutes * MINUTE_IN_SECONDS + seconds;
  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
  };
}
