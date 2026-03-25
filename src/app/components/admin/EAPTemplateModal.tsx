import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { EAP, Phase } from '../../types';
import { EAPStructureEditor } from './EAPStructureEditor';

interface EAPTemplateModalProps {
  template: EAP | null;
  onSave: (template: EAP) => void;
  onClose: () => void;
}

export function EAPTemplateModal({ template, onSave, onClose }: EAPTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [phases, setPhases] = useState<Phase[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setIsActive(template.isActive);
      setPhases(template.phases);
    } else {
      // Nova EAP vazia
      setName('');
      setDescription('');
      setIsActive(true);
      setPhases([]);
    }
  }, [template]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Nome do template é obrigatório');
      return;
    }

    const savedTemplate: EAP = {
      id: template?.id || `eap-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      isActive,
      phases,
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedTemplate);
  };

  const handleAddPhase = () => {
    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      name: 'Nova Fase',
      description: '',
      order: phases.length + 1,
      milestones: [],
    };
    setPhases([...phases, newPhase]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {template ? 'Editar Template' : 'Novo Template EAP'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dados básicos */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: EAP Padrão - Fábrica"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do template..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Template ativo (disponível para uso)
              </label>
            </div>
          </div>

          {/* Estrutura de Fases e Marcos */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Estrutura (Fases e Marcos)</h3>
              <button
                onClick={handleAddPhase}
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium hover:bg-purple-200 transition-colors"
              >
                + Adicionar Fase
              </button>
            </div>

            <EAPStructureEditor phases={phases} setPhases={setPhases} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-colors"
          >
            Salvar Template
          </button>
        </div>
      </div>
    </div>
  );
}
