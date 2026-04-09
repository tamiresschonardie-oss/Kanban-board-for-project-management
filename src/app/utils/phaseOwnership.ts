import { Phase, ProjectRoleAssignment } from '../types';

export function normalizeProjectRoleKey(value?: string) {
  return (value || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeProjectRoleAssignments(
  assignments: ProjectRoleAssignment[] = [],
  projectId?: string
) {
  return assignments
    .map((assignment) => {
      const roleLabel = assignment.roleLabel?.trim() || assignment.roleKey || '';
      const roleKey = assignment.roleKey?.trim() || normalizeProjectRoleKey(roleLabel);
      const createdAt = assignment.createdAt || new Date().toISOString();

      return {
        ...assignment,
        projectId: assignment.projectId || projectId,
        roleKey,
        roleLabel,
        createdAt,
        updatedAt: assignment.updatedAt || createdAt,
      };
    })
    .filter((assignment) => assignment.userId && assignment.roleLabel);
}

export function resolvePhaseOwnerSuggestion(
  phase: Pick<Phase, 'expectedRoleKey' | 'expectedRoleLabel'>,
  projectRoleAssignments: ProjectRoleAssignment[] = []
) {
  const phaseRoleKey =
    phase.expectedRoleKey || normalizeProjectRoleKey(phase.expectedRoleLabel);

  if (!phaseRoleKey) {
    return {
      suggestedOwnerId: undefined,
      suggestedOwnerName: undefined,
    };
  }

  const matchedAssignment = projectRoleAssignments.find((assignment) => {
    const assignmentRoleKey =
      assignment.roleKey || normalizeProjectRoleKey(assignment.roleLabel);
    return assignmentRoleKey === phaseRoleKey;
  });

  return {
    suggestedOwnerId: matchedAssignment?.userId,
    suggestedOwnerName: matchedAssignment?.userName,
  };
}

export function applyRoleAssignmentsToPhases(
  phases: Phase[] = [],
  projectRoleAssignments: ProjectRoleAssignment[] = []
) {
  return phases.map((phase) => {
    const normalizedExpectedRoleLabel = phase.expectedRoleLabel?.trim() || '';
    const normalizedExpectedRoleKey =
      phase.expectedRoleKey || normalizeProjectRoleKey(normalizedExpectedRoleLabel);
    const suggestion = resolvePhaseOwnerSuggestion(
      {
        expectedRoleKey: normalizedExpectedRoleKey,
        expectedRoleLabel: normalizedExpectedRoleLabel,
      },
      projectRoleAssignments
    );

    const assignedOwnerName = phase.assignedOwnerName || undefined;
    const responsible = assignedOwnerName || suggestion.suggestedOwnerName || undefined;

    return {
      ...phase,
      expectedRoleKey: normalizedExpectedRoleKey || undefined,
      expectedRoleLabel: normalizedExpectedRoleLabel || undefined,
      suggestedOwnerId: suggestion.suggestedOwnerId,
      suggestedOwnerName: suggestion.suggestedOwnerName,
      assignedOwnerId: phase.assignedOwnerId || undefined,
      assignedOwnerName,
      responsible,
    };
  });
}
