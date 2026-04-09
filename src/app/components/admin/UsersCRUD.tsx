import { useState } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { User, UserRole, UserStatus } from '../../types';
import { SearchableMultiSelect } from '../filters/SearchableMultiSelect';
import { getPrimaryUserTeam, getUserTeams } from '../../utils/userTeams';

interface UserFormData {
  name: string;
  email: string;
  teams: string[];
  cargo: string;
  salaryMonthly: string;
  costPerHour: string;
  role: UserRole;
  status: UserStatus;
}

export function UsersCRUD() {
  const { users, addUser, updateUser, deleteUser, teams, issuePasswordSetupLink, requestPasswordReset } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accessNotice, setAccessNotice] = useState('');
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    teams: [],
    cargo: '',
    salaryMonthly: '',
    costPerHour: '',
    role: 'user',
    status: 'active',
  });

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.teams.length === 0) return;

    const parsedUserData = {
      name: formData.name,
      email: formData.email,
      teams: formData.teams,
      cargo: formData.cargo,
      salaryMonthly: formData.salaryMonthly ? Number(formData.salaryMonthly) : undefined,
      costPerHour: formData.costPerHour ? Number(formData.costPerHour) : undefined,
      role: formData.role,
      status: formData.status,
    };
    
    if (editingUser) {
      updateUser(editingUser.id, parsedUserData);
      setAccessNotice(`Dados de ${formData.name} atualizados com sucesso.`);
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        ...parsedUserData,
        team: getPrimaryUserTeam({ team: '', teams: formData.teams }),
        createdAt: new Date().toISOString(),
      };
      addUser(newUser);
      setAccessNotice(
        `Usuário ${formData.name} criado. Um link de definição de senha foi preparado na caixa de saída local.`
      );
    }
    
    closeModal();
  };

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        teams: getUserTeams(user),
        cargo: user.cargo || '',
        salaryMonthly:
          typeof user.salaryMonthly === 'number' ? String(user.salaryMonthly) : '',
        costPerHour:
          typeof user.costPerHour === 'number' ? String(user.costPerHour) : '',
        role: user.role,
        status: user.status,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      teams: [],
      cargo: '',
      salaryMonthly: '',
      costPerHour: '',
      role: 'user',
      status: 'active',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      deleteUser(id);
    }
  };

  const handleAccessAction = async (user: User) => {
    if (user.passwordHash && !user.mustSetPassword) {
      const result = await requestPasswordReset(user.email, 'reset');
      if (!result.ok) {
        setAccessNotice(result.message);
        return;
      }
      setAccessNotice(
        result.previewUrl
          ? `Link de redefinição preparado para ${user.email}: ${result.previewUrl}`
          : `Fluxo de redefinição preparado para ${user.email}.`
      );
      return;
    }

    const result = await issuePasswordSetupLink(user.id);
    if (!result.ok) {
      setAccessNotice(result.error || 'Não foi possível preparar o acesso do usuário.');
      return;
    }
    setAccessNotice(
      result.previewUrl
        ? `Link de ativação preparado para ${user.email}: ${result.previewUrl}`
        : `Fluxo de ativação preparado para ${user.email}.`
    );
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700',
      pmo: 'bg-blue-100 text-blue-700',
      gestor: 'bg-emerald-100 text-emerald-700',
      user: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      admin: 'Gestão / Admin',
      pmo: 'PMO',
      gestor: 'Gestor',
      user: 'Colaborador',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const getStatusBadge = (status: UserStatus) => {
    return status === 'active' ? (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Ativo
      </span>
    ) : (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Inativo
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Usuário
        </button>
      </div>

      {/* Table */}
      {accessNotice ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {accessNotice}
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-left font-medium text-gray-700">Nome</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Email</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Equipes</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Cargo</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Custo/Hora</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Perfil</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Status</th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Acesso</th>
              <th className="px-6 py-4 text-right font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                      {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {getUserTeams(user).join(', ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{user.cargo || '—'}</td>
                <td className="px-6 py-4 text-gray-600">
                  {typeof user.costPerHour === 'number'
                    ? `R$ ${user.costPerHour.toFixed(2)}`
                    : typeof user.salaryMonthly === 'number'
                      ? `R$ ${(user.salaryMonthly / 160).toFixed(2)}`
                      : '—'}
                </td>
                <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                <td className="px-6 py-4">
                  {user.passwordHash && !user.mustSetPassword ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      Senha ativa
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Aguardando definição
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => void handleAccessAction(user)}
                      className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      {user.passwordHash && !user.mustSetPassword ? 'Redefinir senha' : 'Enviar acesso'}
                    </button>
                    <button
                      onClick={() => openModal(user)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            Nenhum usuário encontrado
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipes
                </label>
                <SearchableMultiSelect
                  value={formData.teams}
                  onChange={(value) => setFormData({ ...formData, teams: value })}
                  options={teams.map((team) => ({ value: team.name, label: team.name }))}
                  placeholder="Selecione uma ou mais equipes"
                  allLabel="Todas as equipes"
                  searchPlaceholder="Buscar equipe..."
                  emptyMessage="Nenhuma equipe encontrada."
                />
                <p className="mt-2 text-xs text-gray-500">
                  A primeira equipe selecionada será usada como equipe principal para compatibilidade.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Ex.: Desenvolvedor Backend"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salário mensal
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salaryMonthly}
                    onChange={(e) => setFormData({ ...formData, salaryMonthly: e.target.value })}
                    placeholder="Ex: 9600"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custo por hora
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.costPerHour}
                    onChange={(e) => setFormData({ ...formData, costPerHour: e.target.value })}
                    placeholder="Prioritário sobre salário"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">Colaborador</option>
                  <option value="gestor">Gestor</option>
                  <option value="pmo">PMO</option>
                  <option value="admin">Gestão / Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formData.teams.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {editingUser ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
