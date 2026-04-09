import { User } from '../types';

export function getUserTeams(user?: Pick<User, 'team' | 'teams'> | null) {
  if (!user) return [];

  const teams = user.teams?.length ? user.teams : user.team ? [user.team] : [];
  return Array.from(new Set(teams.filter(Boolean)));
}

export function getPrimaryUserTeam(user?: Pick<User, 'team' | 'teams'> | null) {
  return getUserTeams(user)[0] || user?.team || '';
}
