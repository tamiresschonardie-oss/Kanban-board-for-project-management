import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, UserCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Stakeholder } from '../../types';

export function StakeholdersCRUD() {
  const { stakeholders, addStakeholder, updateStakeholder, deleteStakeholder } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
  });

  const filtered = stakeholders.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateStakeholder(editing.id, form);
    } else {
      addStakeholder({
        id: Date.now().toString(),
        ...form,
        linkedProjects: [],
        createdAt: new Date().toISOString(),
      });
    }
    closeModal();
  };

  const openModal = (stakeholder?: Stakeholder) => {
    if (stakeholder) {
      setEditing(stakeholder);
      setForm({
        name: stakeholder.name,
        role: stakeholder.role,
        email: stakeholder.email || '',
        phone: stakeholder.phone || '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm({ name: '', role: '', email: '', phone: '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar stakeholders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Novo Stakeholder
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-4 text-left font-medium text-gray-700">Nome</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Função</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Email</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Telefone</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Projetos</th>
              <th className="px-6 py-4 text-right font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((stakeholder) => (
              <tr key={stakeholder.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <UserCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-900">{stakeholder.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{stakeholder.role}</td>
                <td className="px-6 py-4 text-gray-600">{stakeholder.email || '-'}</td>
                <td className="px-6 py-4 text-gray-600">{stakeholder.phone || '-'}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900">
                    {stakeholder.linkedProjects.length} projeto(s)
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openModal(stakeholder)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Excluir este stakeholder?')) deleteStakeholder(stakeholder.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">{editing ? 'Editar Stakeholder' : 'Novo Stakeholder'}</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                <input
                  type="text"
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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