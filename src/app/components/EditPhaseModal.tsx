import { useState } from 'react';
import { X } from 'lucide-react';
import { Phase, Project } from '../types';
import { useProjects } from '../context/ProjectContext';
import { getProjectExecutionPhases } from '../utils/projectSelectors';
import { useAdmin } from '../context/AdminContext';
import { isValidDateRange } from '../utils/ganttCalculator';

interface EditPhaseModalProps {
  phase: Phase;
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function EditPhaseModal({ phase, project, isOpen, onClose }: EditPhaseModalProps) {
  const { updateProject } = useProjects();
  const { users } = useAdmin();
  const [formData, setFormData] = useState({
    plannedStartDate: phase.plannedStartDate?.split('T')[0] || '',
    actualStartDate: phase.actualStartDate?.split('T')[0] || '',
    plannedEndDate: phase.plannedEndDate?.split('T')[0] || '',
    actualEndDate: phase.actualEndDate?.split('T')[0] || '',
    assignedOwnerId: phase.assignedOwnerId || '',
  });
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (formData.plannedEndDate && !formData.plannedStartDate) {
      setValidationError('Preencha o início planejado antes do final planejado.');
      return;
    }

    if (formData.actualEndDate && !formData.actualStartDate) {
      setValidationError('Preencha o início oficial antes do final oficial.');
      return;
    }

    if (!isValidDateRange(formData.plannedStartDate || undefined, formData.plannedEndDate || undefined)) {
      setValidationError('A data final planejada não pode ser anterior à data inicial planejada.');
      return;
    }

    if (!isValidDateRange(formData.actualStartDate || undefined, formData.actualEndDate || undefined)) {
      setValidationError('A data final oficial não pode ser anterior à data inicial oficial.');
      return;
    }

    const executionPhases = getProjectExecutionPhases(project);
    if (!executionPhases.length) return;

    const selectedOwner = users.find((user) => user.id === formData.assignedOwnerId);
    const updatedPhases = executionPhases.map((currentPhase) =>
      currentPhase.id === phase.id
        ? {
            ...currentPhase,
            plannedStartDate: formData.plannedStartDate || undefined,
            actualStartDate: formData.actualStartDate || undefined,
            plannedEndDate: formData.plannedEndDate || undefined,
            actualEndDate: formData.actualEndDate || undefined,
            assignedOwnerId: formData.assignedOwnerId || undefined,
            assignedOwnerName: selectedOwner?.name || undefined,
            responsible:
              selectedOwner?.name || currentPhase.suggestedOwnerName || undefined,
          }
        : currentPhase
    );

    updateProject(project.id, {
      execution: {
        ...project.execution,
        phases: updatedPhases,
      },
    });
    onClose();
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setValidationError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/70 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-200/70 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Editar Cronograma</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <label className="field-label">Fase</label>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-900">{phase.name}</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">Papel esperado</label>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-900">
                {phase.expectedRoleLabel || 'Não definido na EAP'}
              </div>
            </div>
            <div>
              <label className="field-label">Responsável sugerido</label>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-900">
                {phase.suggestedOwnerName || 'Responsável não definido'}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="assignedOwnerId" className="field-label">
              Responsável operacional da fase
            </label>
            <select
              id="assignedOwnerId"
              value={formData.assignedOwnerId}
              onChange={(event) => updateField('assignedOwnerId', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">
                {phase.suggestedOwnerName
                  ? `Usar sugestão automática (${phase.suggestedOwnerName})`
                  : 'Sem responsável definido'}
              </option>
              {users
                .filter((user) => user.status === 'active')
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              O responsável principal do projeto não é alterado aqui. Este campo controla apenas a fase operacional.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Datas Planejadas</h3>

              <div>
                <label htmlFor="plannedStartDate" className="field-label">
                  Início planejado
                </label>
                <input
                  id="plannedStartDate"
                  type="date"
                  value={formData.plannedStartDate}
                  onChange={(event) => updateField('plannedStartDate', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label htmlFor="plannedEndDate" className="field-label">
                  Final planejado
                </label>
                <input
                  id="plannedEndDate"
                  type="date"
                  value={formData.plannedEndDate}
                  onChange={(event) => updateField('plannedEndDate', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Datas Oficiais</h3>

              <div>
                <label htmlFor="actualStartDate" className="field-label">
                  Início oficial
                </label>
                <input
                  id="actualStartDate"
                  type="date"
                  value={formData.actualStartDate}
                  onChange={(event) => updateField('actualStartDate', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label htmlFor="actualEndDate" className="field-label">
                  Final oficial
                </label>
                <input
                  id="actualEndDate"
                  type="date"
                  value={formData.actualEndDate}
                  onChange={(event) => updateField('actualEndDate', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>
          </div>

          {validationError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {validationError}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-200/70 p-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-slate-100 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-2xl bg-slate-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-slate-800"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
