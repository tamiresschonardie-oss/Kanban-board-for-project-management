import { SearchableMultiSelect, SearchableMultiSelectOption } from './SearchableMultiSelect';
import { ProjectRoleAssignment } from '../../types';
import { normalizeProjectRoleKey } from '../../utils/phaseOwnership';

interface ProjectRoleAssignmentSelectorProps {
  value: ProjectRoleAssignment[];
  options: SearchableMultiSelectOption[];
  onChange: (value: ProjectRoleAssignment[]) => void;
  disabled?: boolean;
}

export function ProjectRoleAssignmentSelector({
  value,
  options,
  onChange,
  disabled = false,
}: ProjectRoleAssignmentSelectorProps) {
  const selectedIds = value.map((item) => item.userId);

  const handleSelectionChange = (selectedUserIds: string[]) => {
    const nextAssignments = selectedUserIds.map((userId) => {
      const currentAssignment = value.find((item) => item.userId === userId);
      const option = options.find((item) => item.value === userId);
      const now = new Date().toISOString();

      return (
        currentAssignment || {
          id: `project-role-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId,
          userName: option?.label || userId,
          roleKey: '',
          roleLabel: '',
          createdAt: now,
          updatedAt: now,
        }
      );
    });

    onChange(nextAssignments);
  };

  const updateRole = (userId: string, roleLabel: string) => {
    onChange(
      value.map((assignment) =>
        assignment.userId === userId
          ? {
              ...assignment,
              roleLabel,
              roleKey: normalizeProjectRoleKey(roleLabel),
              updatedAt: new Date().toISOString(),
            }
          : assignment
      )
    );
  };

  const removeAssignment = (userId: string) => {
    onChange(value.filter((assignment) => assignment.userId !== userId));
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700">Equipe do projeto</h4>
        <p className="mt-1 text-xs text-gray-500">
          Selecione os usuários do projeto e defina o papel de cada um no contexto operacional.
        </p>
      </div>

      <SearchableMultiSelect
        value={selectedIds}
        onChange={handleSelectionChange}
        options={options}
        placeholder="Selecionar usuário"
        allLabel="Todos"
        searchPlaceholder="Buscar usuário..."
        emptyMessage="Nenhum usuário encontrado."
        disabled={disabled}
      />

      {value.length > 0 ? (
        <div className="space-y-3">
          {value.map((assignment) => (
            <div
              key={assignment.id}
              className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:grid-cols-[minmax(0,1fr)_240px_auto]"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{assignment.userName || assignment.userId}</p>
                <p className="text-xs text-gray-500">Pessoa do projeto</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium tracking-wide text-gray-500">
                  Papel:
                </label>
                <input
                  type="text"
                  value={assignment.roleLabel || ''}
                  disabled={disabled}
                  onChange={(event) => updateRole(assignment.userId, event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Analista de Negócios, Desenvolvedora, Tester"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAssignment(assignment.userId)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
