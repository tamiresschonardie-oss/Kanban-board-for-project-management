import { SearchableMultiSelect, SearchableMultiSelectOption } from './SearchableMultiSelect';
import { ProjectStakeholderAssignment } from '../../types';

interface StakeholderRoleSelectorProps {
  value: ProjectStakeholderAssignment[];
  options: SearchableMultiSelectOption[];
  onChange: (value: ProjectStakeholderAssignment[]) => void;
  disabled?: boolean;
}

export function StakeholderRoleSelector({
  value,
  options,
  onChange,
  disabled = false,
}: StakeholderRoleSelectorProps) {
  const selectedIds = value.map((item) => item.stakeholderId);

  const handleSelectionChange = (selectedStakeholderIds: string[]) => {
    const nextAssignments = selectedStakeholderIds.map((stakeholderId) => {
      const currentAssignment = value.find((item) => item.stakeholderId === stakeholderId);
      const option = options.find((item) => item.value === stakeholderId);

      return (
        currentAssignment || {
          stakeholderId,
          name: option?.label || stakeholderId,
          projectRole: '',
        }
      );
    });

    onChange(nextAssignments);
  };

  const updateRole = (stakeholderId: string, projectRole: string) => {
    onChange(
      value.map((assignment) =>
        assignment.stakeholderId === stakeholderId
          ? { ...assignment, projectRole }
          : assignment
      )
    );
  };

  const removeStakeholder = (stakeholderId: string) => {
    onChange(value.filter((assignment) => assignment.stakeholderId !== stakeholderId));
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700">Stakeholders externos</h4>
        <p className="mt-1 text-xs text-gray-500">
          Registre participantes externos ou de interface que não fazem parte da equipe operacional.
        </p>
      </div>

      <SearchableMultiSelect
        value={selectedIds}
        onChange={handleSelectionChange}
        options={options}
        placeholder="Selecionar stakeholder"
        allLabel="Todos"
        searchPlaceholder="Buscar stakeholder..."
        emptyMessage="Nenhum stakeholder encontrado."
        disabled={disabled}
      />

      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((assignment) => (
            <div
              key={assignment.stakeholderId}
              className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:grid-cols-[minmax(0,1fr)_220px_auto]"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{assignment.name}</p>
                <p className="text-xs text-gray-500">Pessoa</p>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">
                  Papel no projeto
                </label>
                <input
                  type="text"
                  value={assignment.projectRole || ''}
                  disabled={disabled}
                  onChange={(event) => updateRole(assignment.stakeholderId, event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: patrocinador, aprovador, usuario-chave"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeStakeholder(assignment.stakeholderId)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
