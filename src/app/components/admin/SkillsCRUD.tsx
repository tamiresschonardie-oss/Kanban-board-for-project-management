import { useMemo, useState } from 'react';
import { ArrowRight, BrainCircuit, Edit2, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { useAdmin } from '../../context/AdminContext';
import { useProjects } from '../../context/ProjectContext';
import { useTasks } from '../../context/TaskContext';
import { Skill, SkillStatus } from '../../types';
import { getSkillMetrics } from '../../utils/skillSelectors';

const STATUS_OPTIONS: Array<{ value: SkillStatus; label: string }> = [
  { value: 'active', label: 'Ativa' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'paused', label: 'Pausada' },
  { value: 'archived', label: 'Arquivada' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  area: '',
  ownerId: '',
  status: 'active' as SkillStatus,
  maturityLevel: '',
};

export function SkillsCRUD() {
  const { skills, users, addSkill, updateSkill, deleteSkill } = useAdmin();
  const { projects } = useProjects();
  const { allTasks } = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const activeUsers = useMemo(
    () =>
      users
        .filter((user) => user.status === 'active')
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [users]
  );

  const openModal = (skill?: Skill) => {
    if (skill) {
      setEditing(skill);
      setForm({
        name: skill.name,
        description: skill.description || '',
        area: skill.area || '',
        ownerId: skill.ownerId || '',
        status: skill.status,
        maturityLevel: skill.maturityLevel || '',
      });
    } else {
      setEditing(null);
      setForm(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const timestamp = new Date().toISOString();

    if (editing) {
      updateSkill(editing.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        area: form.area.trim() || undefined,
        ownerId: form.ownerId || undefined,
        status: form.status,
        maturityLevel: form.maturityLevel.trim() || undefined,
      });
    } else {
      addSkill({
        id: `skill-${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        area: form.area.trim() || undefined,
        ownerId: form.ownerId || undefined,
        status: form.status,
        maturityLevel: form.maturityLevel.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    closeModal();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Habilidades</h2>
          <p className="mt-1 text-sm text-gray-500">
            Cadastre capacidades reutilizáveis da empresa sem misturar com projetos finitos.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Nova Habilidade
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {skills.map((skill) => {
          const owner = activeUsers.find((user) => user.id === skill.ownerId);
          const statusLabel =
            STATUS_OPTIONS.find((option) => option.value === skill.status)?.label || skill.status;
          const metrics = getSkillMetrics(skill, projects, allTasks);

          return (
            <div
              key={skill.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                      <BrainCircuit className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                      <p className="text-sm text-gray-500">{skill.area || 'Área não definida'}</p>
                    </div>
                  </button>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openModal(skill)}
                    className="rounded-lg p-1.5 hover:bg-gray-100"
                    aria-label={`Editar habilidade ${skill.name}`}
                  >
                    <Edit2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Excluir esta habilidade?')) deleteSkill(skill.id);
                    }}
                    className="rounded-lg p-1.5 hover:bg-red-50"
                    aria-label={`Excluir habilidade ${skill.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>

              {skill.description && (
                <p className="mb-4 text-sm leading-6 text-gray-600">{skill.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {statusLabel}
                </span>
                {skill.maturityLevel && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {skill.maturityLevel}
                  </span>
                )}
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {owner?.name || 'Sem owner'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <MetricItem label="Projetos" value={String(metrics.totalProjects)} />
                <MetricItem label="Tarefas abertas" value={String(metrics.tasksBacklog + metrics.tasksInProgress)} />
                <MetricItem label="Em andamento" value={String(metrics.tasksInProgress)} />
                <MetricItem
                  label="Última atualização"
                  value={
                    metrics.lastMovementAt
                      ? new Date(metrics.lastMovementAt).toLocaleDateString('pt-BR')
                      : '—'
                  }
                />
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <Link
                  to={`/governance/skills/${skill.id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  Ver na governança
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="border-b p-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editing ? 'Editar Habilidade' : 'Nova Habilidade'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Habilidades representam capacidades reutilizáveis da operação.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Área</label>
                  <input
                    type="text"
                    value={form.area}
                    onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                    placeholder="Ex: TI, Crédito, Comercial"
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Owner</label>
                  <select
                    value={form.ownerId}
                    onChange={(e) => setForm((prev) => ({ ...prev, ownerId: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione</option>
                    {activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, status: e.target.value as SkillStatus }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nível de maturidade
                  </label>
                  <input
                    type="text"
                    value={form.maturityLevel}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, maturityLevel: e.target.value }))
                    }
                    placeholder="Ex: Em estruturação"
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border px-4 py-2 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
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

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
