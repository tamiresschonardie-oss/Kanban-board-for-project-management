import { useState } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useEAP } from '../../context/EAPContext';
import { EAP } from '../../types';
import { EAPTemplateModal } from './EAPTemplateModal';

export function EAPTemplatesCRUD() {
  const { eapTemplates, addEAPTemplate, updateEAPTemplate, deleteEAPTemplate } = useEAP();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EAP | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = eapTemplates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (template: EAP) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar este template?')) {
      deleteEAPTemplate(id);
    }
  };

  const handleSaveTemplate = (template: EAP) => {
    if (editingTemplate) {
      updateEAPTemplate(editingTemplate.id, template);
    } else {
      addEAPTemplate(template);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header com Search e Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {/* Tabela de Templates */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Descrição</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fases</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                  {searchTerm ? 'Nenhum template encontrado' : 'Nenhum template criado ainda'}
                </td>
              </tr>
            ) : (
              filteredTemplates.map((template) => (
                <tr key={template.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{template.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600 text-sm line-clamp-2">{template.description || '—'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{template.phases.length} fase(s)</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        template.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {template.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <EAPTemplateModal
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
