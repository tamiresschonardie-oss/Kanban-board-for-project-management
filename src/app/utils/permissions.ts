import { User, UserRole } from '../types';

export type PermissionAction =
  | 'admin:access'
  | 'admin:catalogs'
  | 'automation:manage'
  | 'task-template:manage'
  | 'task-template:apply'
  | 'project:create'
  | 'project:edit'
  | 'project:delete'
  | 'governance:manage'
  | 'costs:view'
  | 'gantt:manage'
  | 'eap:manage';

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: [
    'task-template:apply',
    'project:create',
    'project:edit',
    'project:delete',
    'governance:manage',
    'costs:view',
    'gantt:manage',
  ],
  pmo: [
    'admin:access',
    'admin:catalogs',
    'automation:manage',
    'task-template:manage',
    'task-template:apply',
    'project:create',
    'project:edit',
    'governance:manage',
    'costs:view',
    'gantt:manage',
    'eap:manage',
  ],
  gestor: [
    'governance:manage',
    'costs:view',
  ],
  user: [],
};

export function canUserPerform(user: User | undefined, action: PermissionAction): boolean {
  if (!user || user.status !== 'active') return false;
  return ROLE_PERMISSIONS[user.role].includes(action);
}

export function isPmoUser(user: User | undefined): boolean {
  return Boolean(user && user.status === 'active' && user.role === 'pmo');
}

export function canAccessGovernance(user: User | undefined): boolean {
  return canUserPerform(user, 'governance:manage');
}

export function canViewCosts(user: User | undefined): boolean {
  return canUserPerform(user, 'costs:view');
}

export function canManageOperationalPriority(user: User | undefined): boolean {
  if (!user || user.status !== 'active') return false;
  return user.role === 'pmo' || user.role === 'admin';
}

export function canManageWeeklyFocus(user: User | undefined): boolean {
  if (!user || user.status !== 'active') return false;
  return user.role === 'pmo' || user.role === 'gestor' || user.role === 'admin';
}

export function canManageSprints(user: User | undefined): boolean {
  if (!user || user.status !== 'active') return false;
  return user.role === 'pmo' || user.role === 'admin';
}

export function hasAnyPermission(
  user: User | undefined,
  actions: PermissionAction[]
): boolean {
  return actions.some((action) => canUserPerform(user, action));
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Gestão / Admin',
    pmo: 'PMO',
    gestor: 'Gestor',
    user: 'Colaborador',
  };

  return labels[role];
}
