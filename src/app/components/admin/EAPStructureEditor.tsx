import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2 } from 'lucide-react';
import { Phase, Milestone } from '../../types';
import { MilestoneListItem } from './MilestoneListItem';
import { normalizeProjectRoleKey } from '../../utils/phaseOwnership';

interface EAPStructureEditorProps {
  phases: Phase[];
  setPhases: (phases: Phase[]) => void;
}

const normalizeMilestones = (milestones: Milestone[] = []): Milestone[] =>
  milestones
    .map((milestone) => ({
      ...milestone,
      tasks: milestone.tasks || [],
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((milestone, index) => ({
      ...milestone,
      order: index + 1,
    }));

const normalizePhases = (phases: Phase[]): Phase[] =>
  [...phases]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((phase, index) => ({
      ...phase,
      order: index + 1,
      phaseType: 'execution',
      milestones: normalizeMilestones(phase.milestones || []),
    }));

export function EAPStructureEditor({ phases, setPhases }: EAPStructureEditorProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(phases.map(p => p.id))
  );
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseName, setEditingPhaseName] = useState('');
  const [editingPhaseDescription, setEditingPhaseDescription] = useState('');
  const [editingExpectedRoleLabel, setEditingExpectedRoleLabel] = useState('');

  const togglePhaseExpand = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const startEditPhase = (phase: Phase) => {
    setEditingPhaseId(phase.id);
    setEditingPhaseName(phase.name);
    setEditingPhaseDescription(phase.description || '');
    setEditingExpectedRoleLabel(phase.expectedRoleLabel || '');
  };

  const saveEditPhase = (phaseId: string) => {
    setPhases(
      normalizePhases(
        phases.map(p =>
          p.id === phaseId
            ? {
                ...p,
                name: editingPhaseName.trim(),
                description: editingPhaseDescription.trim(),
                expectedRoleLabel: editingExpectedRoleLabel.trim() || undefined,
                expectedRoleKey: editingExpectedRoleLabel.trim()
                  ? normalizeProjectRoleKey(editingExpectedRoleLabel)
                  : undefined,
              }
            : p
        )
      )
    );
    setEditingPhaseId(null);
  };

  const deletePhase = (phaseId: string) => {
    setPhases(normalizePhases(phases.filter(p => p.id !== phaseId)));
  };

  const movePhaseUp = (idx: number) => {
    if (idx > 0) {
      const newPhases = [...normalizePhases(phases)];
      [newPhases[idx], newPhases[idx - 1]] = [newPhases[idx - 1], newPhases[idx]];
      setPhases(normalizePhases(newPhases));
    }
  };

  const movePhaseDown = (idx: number) => {
    if (idx < phases.length - 1) {
      const newPhases = [...normalizePhases(phases)];
      [newPhases[idx], newPhases[idx + 1]] = [newPhases[idx + 1], newPhases[idx]];
      setPhases(normalizePhases(newPhases));
    }
  };

  const addMilestoneToPhase = (phaseId: string) => {
    setPhases(
      normalizePhases(phases.map(p => {
        if (p.id === phaseId) {
          const newMilestone: Milestone = {
            id: `milestone-${Date.now()}`,
            name: 'Novo Marco',
            type: 'business',
            status: 'not-started',
            startDate: '',
            endDate: '',
            sla: 0,
            description: '',
            tasks: [],
            order: (p.milestones?.length || 0) + 1,
          };
          return {
            ...p,
            milestones: normalizeMilestones([...(p.milestones || []), newMilestone]),
          };
        }
        return p;
      }))
    );
  };

  const updateMilestone = (phaseId: string, milestone: Milestone) => {
    setPhases(
      normalizePhases(phases.map(p => {
        if (p.id === phaseId) {
          return {
            ...p,
            milestones: normalizeMilestones(p.milestones.map(m =>
              m.id === milestone.id ? milestone : m
            )),
          };
        }
        return p;
      }))
    );
  };

  const deleteMilestone = (phaseId: string, milestoneId: string) => {
    setPhases(
      normalizePhases(phases.map(p => {
        if (p.id === phaseId) {
          return {
            ...p,
            milestones: normalizeMilestones(p.milestones.filter(m => m.id !== milestoneId)),
          };
        }
        return p;
      }))
    );
  };

  const moveMilestoneUp = (phaseId: string, idx: number) => {
    setPhases(
      normalizePhases(phases.map(p => {
        if (p.id === phaseId && idx > 0) {
          const newMilestones = [...normalizeMilestones(p.milestones)];
          [newMilestones[idx], newMilestones[idx - 1]] = [
            newMilestones[idx - 1],
            newMilestones[idx],
          ];
          return { ...p, milestones: normalizeMilestones(newMilestones) };
        }
        return p;
      }))
    );
  };

  const moveMilestoneDown = (phaseId: string, idx: number) => {
    setPhases(
      normalizePhases(phases.map(p => {
        if (p.id === phaseId && idx < p.milestones.length - 1) {
          const newMilestones = [...normalizeMilestones(p.milestones)];
          [newMilestones[idx], newMilestones[idx + 1]] = [
            newMilestones[idx + 1],
            newMilestones[idx],
          ];
          return { ...p, milestones: normalizeMilestones(newMilestones) };
        }
        return p;
      }))
    );
  };

  if (phases.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhuma fase criada ainda. Adicione uma fase para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {phases.map((phase, phaseIdx) => (
        <div key={phase.id} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Fase Header */}
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => togglePhaseExpand(phase.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {expandedPhases.has(phase.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                )}
              </button>

              {editingPhaseId === phase.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    autoFocus
                    value={editingPhaseName}
                    onChange={(e) => setEditingPhaseName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditPhase(phase.id);
                      if (e.key === 'Escape') setEditingPhaseId(null);
                    }}
                    className="w-full px-2 py-1 border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <textarea
                    value={editingPhaseDescription}
                    onChange={(e) => setEditingPhaseDescription(e.target.value)}
                    rows={2}
                    placeholder="Descricao da fase"
                    className="w-full px-2 py-1 border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    value={editingExpectedRoleLabel}
                    onChange={(e) => setEditingExpectedRoleLabel(e.target.value)}
                    placeholder="Papel / funcao esperada da fase"
                    className="w-full px-2 py-1 border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveEditPhase(phase.id)}
                      className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors"
                    >
                      Salvar fase
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPhaseId(null)}
                      className="px-3 py-1 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{phase.name}</p>
                  {phase.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{phase.description}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {phase.expectedRoleLabel ? (
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        Papel esperado: {phase.expectedRoleLabel}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Papel nao definido
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{phase.milestones.length} marcos</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => movePhaseUp(phaseIdx)}
                disabled={phaseIdx === 0}
                className="p-1 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                title="Mover para cima"
              >
                <ChevronUp className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => movePhaseDown(phaseIdx)}
                disabled={phaseIdx === phases.length - 1}
                className="p-1 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                title="Mover para baixo"
              >
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => startEditPhase(phase)}
                className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-600"
                title="Editar fase"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => deletePhase(phase.id)}
                className="p-1 hover:bg-red-100 rounded transition-colors text-gray-600 hover:text-red-600"
                title="Deletar fase"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Marcos (expandível) */}
          {expandedPhases.has(phase.id) && (
            <div className="border-t border-gray-200 bg-white p-4 space-y-2">
              {phase.milestones.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Nenhum marco nesta fase</p>
              ) : (
                phase.milestones.map((milestone, milestoneIdx) => (
                  <MilestoneListItem
                    key={milestone.id}
                    milestone={milestone}
                    idx={milestoneIdx}
                    totalCount={phase.milestones.length}
                    onUpdate={(updated) => updateMilestone(phase.id, updated)}
                    onDelete={() => deleteMilestone(phase.id, milestone.id)}
                    onMoveUp={() => moveMilestoneUp(phase.id, milestoneIdx)}
                    onMoveDown={() => moveMilestoneDown(phase.id, milestoneIdx)}
                  />
                ))
              )}

              <button
                onClick={() => addMilestoneToPhase(phase.id)}
                className="w-full mt-3 py-2 px-3 border border-dashed border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm text-gray-600 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Marco
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
