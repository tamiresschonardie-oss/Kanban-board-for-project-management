import { useState } from 'react';
import { Plus, Edit2, Trash2, Server } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { System } from '../../types';

export function SystemsCRUD() {
  const { systems, addSystem, updateSystem, deleteSystem } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<System | null>(null);
  const [form, setForm] = useState({ name: '', integrations: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateSystem(editing.id, {
        name: form.name,
        integrations: form.integrations.split(',').map((s) => s.trim()).filter(Boolean),
        description: form.description,
      });
    } else {
      addSystem({
        id: Date.now().toString(),
        name: form.name,
        integrations: form.integrations.split(',').map((s) => s.trim()).filter(Boolean),
        description: form.description,
        createdAt: new Date().toISOString(),
      });
    }
    closeModal();
  };

  const openModal = (system?: System) => {
    if (system) {
      setEditing(system);
      setForm({
        name: system.name,
        integrations: system.integrations?.join(', ') || '',
        description: system.description || '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm({ name: '', integrations: '', description: '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Sistemas</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Novo Sistema
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systems.map((system) => (
          <div
            key={system.id}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Server className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{system.name}</h3>
                  <p className="text-sm text-gray-500">
                    {system.integrations?.length || 0} integrações
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openModal(system)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Excluir este sistema?')) deleteSystem(system.id);
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            {system.description && (
              <p className="text-sm text-gray-600 mb-4">{system.description}</p>
            )}

            {system.integrations && system.integrations.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-gray-500 mb-2">INTEGRAÇÕES</p>
                <div className="flex flex-wrap gap-1">
                  {system.integrations.map((integration, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                    >
                      {integration}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">{editing ? 'Editar Sistema' : 'Novo Sistema'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Integrações (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={form.integrations}
                  onChange={(e) => setForm({ ...form, integrations: e.target.value })}
                  placeholder="Ex: SAP, Salesforce, Oracle"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
