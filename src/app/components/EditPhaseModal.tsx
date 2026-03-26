import { useState } from 'react';
import { X } from 'lucide-react';
import { Phase, Project } from '../types';
import { useProjects } from '../context/ProjectContext';

interface EditPhaseModalProps {
  phase: Phase;
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function EditPhaseModal({ phase, project, isOpen, onClose }: EditPhaseModalProps) {
  const { updateProject } = useProjects();
  const [formData, setFormData] = useState({
    plannedStartDate: phase.plannedStartDate?.split('T')[0] || '',
    plannedEndDate: phase.plannedEndDate?.split('T')[0] || '',
    actualEndDate: phase.actualEndDate?.split('T')[0] || '',
  });

  if (!isOpen) return null;

  const handleSave = () => {
    if (!project.phases) return;

    // Atualizar apenas a fase editada, preservando as demais
    const updatedPhases = project.phases.map(p =>
      p.id === phase.id
        ? {
            ...p,
            plannedStartDate: formData.plannedStartDate || undefined,
            plannedEndDate: formData.plannedEndDate || undefined,
            actualEndDate: formData.actualEndDate || undefined,
          }
        : p
    );

    updateProject(project.id, { phases: updatedPhases });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Editar Cronograma</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Fase Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fase
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
              {phase.name}
            </div>
          </div>

          {/* Planejamento */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Datas Planejadas</h3>
            
            <div>
              <label htmlFor="plannedStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                Início Planejado
              </label>
              <input
                id="plannedStartDate"
                type="date"
                value={formData.plannedStartDate}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, plannedStartDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="plannedEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                Conclusão Planejada
              </label>
              <input
                id="plannedEndDate"
                type="date"
                value={formData.plannedEndDate}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, plannedEndDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Execução Real */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Datas Reais</h3>
            
            <div>
              <label htmlFor="actualEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                Conclusão Real
              </label>
              <input
                id="actualEndDate"
                type="date"
                value={formData.actualEndDate}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, actualEndDate: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
