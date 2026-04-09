import type { AuthEmailMessage, EmailTemplate, PasswordTokenPurpose, Project } from '../types';
import { getProjectCurrentGovernancePhase, getProjectRequester } from './projectSelectors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function buildPasswordEmailSubject(purpose: PasswordTokenPurpose): string {
  return purpose === 'setup' ? 'Defina sua senha de acesso' : 'Redefina sua senha';
}

export function buildPasswordActionPath(purpose: PasswordTokenPurpose, token: string): string {
  const basePath = purpose === 'setup' ? '/set-password' : '/reset-password';
  return `${basePath}?token=${token}`;
}

export function createAuthEmailMessage(params: {
  email: string;
  purpose: PasswordTokenPurpose;
  actionUrl: string;
}): AuthEmailMessage {
  return {
    id: `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    to: [params.email],
    subject: buildPasswordEmailSubject(params.purpose),
    template: params.purpose,
    kind: 'auth',
    actionUrl: params.actionUrl,
    createdAt: new Date().toISOString(),
  };
}

export function buildProjectEmailVariables(project: Project) {
  return {
    project_name: project.name || '',
    responsavel: project.responsible || '',
    cliente: project.client || '',
    fase_atual: getProjectCurrentGovernancePhase(project)?.name || project.status || '',
    data_prevista: project.deadline || '',
    link_projeto: `/project/${project.id}`,
    solicitante: getProjectRequester(project),
    equipe: project.group || '',
  };
}

export function renderEmailContent(
  template: string,
  variables: Record<string, string | number | boolean | null | undefined>
) {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, rawKey) => {
    const key = String(rawKey).trim();
    const value = variables[key];
    return value == null ? '' : String(value);
  });
}

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmailAddress(value: string) {
  return EMAIL_REGEX.test(normalizeEmailAddress(value));
}

export function createProjectCommunicationMessage(params: {
  to: string[];
  project: Project;
  template: EmailTemplate;
  initiatedBy?: string;
  kind?: AuthEmailMessage['kind'];
}) {
  const variables = buildProjectEmailVariables(params.project);
  return {
    id: `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    to: params.to,
    subject: renderEmailContent(params.template.assunto, variables),
    template: params.template.nome,
    kind: params.kind || 'project_communication',
    templateId: params.template.id,
    templateName: params.template.nome,
    htmlBody: renderEmailContent(params.template.corpo_html, variables),
    textBody: renderEmailContent(params.template.corpo_html.replace(/<[^>]+>/g, ' '), variables),
    projectId: params.project.id,
    metadata: {
      initiatedBy: params.initiatedBy || 'Sistema',
    },
    createdAt: new Date().toISOString(),
  } satisfies AuthEmailMessage;
}
