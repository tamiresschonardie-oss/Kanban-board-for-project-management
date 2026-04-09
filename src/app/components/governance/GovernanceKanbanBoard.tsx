import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CheckCircle2, Copy, Edit2, FolderKanban, GripVertical, Settings, Star, Trash2, X } from 'lucide-react';
import { GovernancePhaseDefinition, Project, WorkspaceProjectStageDefinition } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useAdmin } from '../../context/AdminContext';
import {
  getProjectExecutionPhases,
  getProjectGovernancePhaseId,
  getProjectMetrics,
  getProjectRiskLevel,
  getProjectSmartStatus,
  getProjectTaskCounts,
  getProjectWorkspaceStageId,
  isProjectPaused,
} from '../../utils/projectSelectors';
import { getProjectExecutionStatus, getProjectExecutionStatusBadge } from '../../utils/phaseStatusCalculator';
import {
  KanbanDropPlacement,
  moveItemBetweenLists,
  moveItemWithinList,
} from '../../utils/kanbanReorderUtils';
import {
  KanbanAddColumnButton,
  KanbanBoardViewport,
  KanbanColumnFrame,
  KanbanEmptyState,
} from '../kanban/KanbanLayout';

interface GovernanceKanbanBoardProps {
  projects: Project[];
  boardMode?: 'governance' | 'workspace';
  workspaceId?: string;
  workspaceIds?: string[];
  onProjectOpen: (project: Project) => void;
  allTasks?: any[];
  canManagePhases: boolean;
  canMoveProjects: boolean;
  highlightWeeklyFocus?: boolean;
}

type BoardStageDefinition = GovernancePhaseDefinition | WorkspaceProjectStageDefinition;

const GovernanceProjectCard = memo(function GovernanceProjectCard({
  project,
  phaseId,
  index,
  onOpen,
  onProjectDrop,
  allTasks,
  canMoveProjects,
  currentStageLabel,
  completionStageId,
  focusedTaskCount,
  highlightWeeklyFocus,
  boardMode,
}: {
  project: Project;
  phaseId: string;
  index: number;
  onOpen: (project: Project) => void;
  onProjectDrop: (
    projectId: string,
    phaseId: string,
    targetProjectId?: string,
    placement?: KanbanDropPlacement
  ) => void;
  allTasks: any[];
  canMoveProjects: boolean;
  currentStageLabel: string;
  completionStageId?: string;
  focusedTaskCount: number;
  highlightWeeklyFocus: boolean;
  boardMode: 'governance' | 'workspace';
}) {
  const { updateProject, duplicateProject } = useProjects();
  const { users, toggleFavoriteEntity, isFavoriteEntity } = useAdmin();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const executionStatus =
    getProjectExecutionPhases(project).length > 0 && allTasks.length > 0
      ? getProjectExecutionStatus(project, allTasks)
      : 'não-iniciado';
  const executionStatusBadge = getProjectExecutionStatusBadge(executionStatus);
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'PROJECT',
      item: { id: project.id, phaseId, index },
      canDrag: canMoveProjects,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [project.id, phaseId, index, canMoveProjects]
  );
  const [, drop] = useDrop(
    () => ({
      accept: 'PROJECT',
      drop: (item: { id: string }, monitor) => {
        if (!canMoveProjects || item.id === project.id) return;
        const clientOffset = monitor.getClientOffset();
        const bounds = cardRef.current?.getBoundingClientRect();
        const placement: KanbanDropPlacement =
          clientOffset && bounds && clientOffset.y < bounds.top + bounds.height / 2
            ? 'before'
            : 'after';
        onProjectDrop(item.id, phaseId, project.id, placement);
        return { handled: true };
      },
    }),
    [canMoveProjects, onProjectDrop, phaseId, project.id]
  );

  const risk = getProjectRiskLevel(project);
  const metrics = getProjectMetrics(project);
  const taskCounts = getProjectTaskCounts(project);
  const paused = isProjectPaused(project);
  const favorite = isFavoriteEntity('project', project.id);
  const smartStatus = getProjectSmartStatus(project);
  const isWeeklyFocus = project.isWeeklyFocus || focusedTaskCount > 0;
  const activeUsers = users
    .filter((user) => user.status === 'active')
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div
      ref={(node) => {
        cardRef.current = node;
        drag(node);
        drop(node);
      }}
      onClick={() => onOpen(project)}
      className={`kanban-card overflow-hidden ${paused ? 'border-dashed border-slate-300 bg-slate-50/80' : ''} ${
        highlightWeeklyFocus && isWeeklyFocus ? 'ring-2 ring-emerald-200 ring-offset-2 ring-offset-white' : ''
      } ${
        canMoveProjects ? 'cursor-pointer' : 'cursor-default'
      } interactive-surface transition-colors ${isDragging ? 'opacity-50' : ''}`}
    >
          {project.coverImage ? (
            <div className={`relative h-24 overflow-hidden ${paused ? 'opacity-40' : ''}`}>
              <img
                src={project.coverImage}
                alt={project.name}
                className="h-full w-full object-cover object-center"
              />
              {paused && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-500/30">
                  <span className="rounded bg-yellow-500 px-2 py-1 text-xs font-bold text-white">
                    PAUSADO
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`relative h-24 ${paused ? 'opacity-40' : ''}`}
              style={{
                background: paused
                  ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                  : `linear-gradient(135deg, ${project.logoColor} 0%, ${project.logoColor}dd 100%)`,
              }}
            />
          )}

          <div className={`p-5 ${paused ? 'opacity-70' : ''}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {project.group || 'Sem equipe'}
                  </span>
                  {boardMode === 'governance' && project.isWeeklyFocus ? (
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Foco
                    </span>
                  ) : null}
                  {boardMode === 'governance' && highlightWeeklyFocus && focusedTaskCount > 0 ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      {focusedTaskCount} tarefa(s) em foco
                    </span>
                  ) : null}
                </div>
                <h3 className={`text-[15px] font-semibold tracking-tight ${paused ? 'text-gray-500' : 'text-slate-900'}`}>
                  {project.name}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFavoriteEntity('project', project.id);
                  }}
                  className={`rounded-full p-1.5 transition-colors ${
                    favorite
                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                      : 'bg-white/70 text-slate-400 hover:bg-slate-100 hover:text-amber-500'
                  }`}
                  title={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Star className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    duplicateProject(project.id);
                  }}
                  className="rounded-full bg-white/70 p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title="Duplicar projeto"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${risk.color}`} title={risk.label} />
              </div>
            </div>

            <div className="mb-3">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Fase atual</span>
              <p className={`mt-1 text-sm font-medium ${paused ? 'text-gray-500' : 'text-slate-700'}`}>
                {currentStageLabel}
              </p>
            </div>

            <div className="mb-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Status inteligente
              </p>
              <p className="mt-2 text-sm text-slate-700">{smartStatus}</p>
              {project.weeklyUpdate ? (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                  {project.weeklyUpdate}
                </p>
              ) : null}
            </div>

            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-slate-500">Progresso</span>
                <span className={`text-xs font-medium ${paused ? 'text-gray-500' : 'text-slate-900'}`}>
                  {taskCounts.completed}/{taskCounts.total} marcos
                </span>
              </div>
              <div className={`h-1.5 overflow-hidden rounded-full ${paused ? 'bg-gray-200' : 'bg-slate-100'}`}>
                <div
                  className={`h-full rounded-full transition-all ${paused ? 'bg-gray-400' : 'bg-slate-900'}`}
                  style={{ width: `${metrics.progress}%` }}
                />
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <span className={`text-xs ${paused ? 'text-gray-500' : 'text-slate-600'}`}>{project.responsible}</span>
              <span className={`text-xs font-medium ${paused ? 'text-gray-400' : 'text-slate-500'}`}>{metrics.progress}%</span>
            </div>

            <div
              className="mb-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Ações rápidas
                </p>
                {completionStageId && completionStageId !== phaseId ? (
                  <button
                    type="button"
                    onClick={() => onProjectDrop(project.id, completionStageId)}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-200"
                    title="Concluir sem abrir o detalhe"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Concluir
                  </button>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Responsável</span>
                  <select
                    value={activeUsers.find((user) => user.name === project.responsible)?.id || ''}
                    onChange={(event) => {
                      const nextResponsible =
                        activeUsers.find((user) => user.id === event.target.value)?.name ||
                        project.responsible;
                      updateProject(project.id, { responsible: nextResponsible });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-300"
                  >
                    {activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-2 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-500">Situação</span>
                    <select
                      value={project.situation || 'ativo'}
                      onChange={(event) =>
                        updateProject(project.id, {
                          situation: event.target.value as Project['situation'],
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-300"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="pausado">Pausado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-500">Prazo</span>
                    <input
                      type="date"
                      value={project.deadline || ''}
                      onChange={(event) =>
                        updateProject(project.id, { deadline: event.target.value || undefined })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-300"
                    />
                  </label>
                </div>
              </div>
            </div>

            {getProjectExecutionPhases(project).length > 0 && (
              <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
                <span className="text-sm">{executionStatusBadge.emoji}</span>
                <span className={`text-xs font-medium ${paused ? 'text-gray-500' : 'text-slate-700'}`}>
                  {executionStatusBadge.label}
                </span>
              </div>
            )}
          </div>
    </div>
  );
});

const GovernanceColumn = memo(function GovernanceColumn({
  phase,
  projects,
  boardMode,
  onProjectDrop,
  onProjectOpen,
  allTasks,
  canMoveProjects,
  canManagePhases,
  onStartEdit,
  onRequestDelete,
  completionStageId,
  index,
  canReorderColumns,
  onColumnDrop,
  highlightWeeklyFocus,
  focusedTaskCountByProject,
}: {
  phase: BoardStageDefinition;
  projects: Project[];
  boardMode: 'governance' | 'workspace';
  onProjectDrop: (
    projectId: string,
    phaseId: string,
    targetProjectId?: string,
    placement?: KanbanDropPlacement
  ) => void;
  onProjectOpen: (project: Project) => void;
  allTasks: any[];
  canMoveProjects: boolean;
  canManagePhases: boolean;
  onStartEdit: (phase: BoardStageDefinition) => void;
  onRequestDelete: (phase: BoardStageDefinition) => void;
  completionStageId?: string;
  index: number;
  canReorderColumns: boolean;
  onColumnDrop: (draggedColumnId: string, targetColumnId: string) => void;
  highlightWeeklyFocus: boolean;
  focusedTaskCountByProject: Map<string, number>;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [{ isDraggingColumn }, dragColumn] = useDrag(
    () => ({
      type: 'BOARD_STAGE',
      item: { columnId: String(phase.id), index },
      canDrag: canReorderColumns,
      collect: (monitor) => ({
        isDraggingColumn: monitor.isDragging(),
      }),
    }),
    [phase.id, index, canReorderColumns]
  );
  const [{ isOverColumn }, dropColumn] = useDrop(
    () => ({
      accept: 'BOARD_STAGE',
      drop: (item: { columnId: string }) => {
        if (!canReorderColumns || item.columnId === String(phase.id)) return;
        onColumnDrop(item.columnId, String(phase.id));
      },
      collect: (monitor) => ({
        isOverColumn: monitor.isOver({ shallow: true }),
      }),
    }),
    [phase.id, canReorderColumns, onColumnDrop]
  );

  const [{ isOverProject }, dropProject] = useDrop(
    () => ({
      accept: 'PROJECT',
      drop: (item: { id: string }, monitor) => {
        if (monitor.didDrop()) return;
        onProjectDrop(item.id, phase.id as string);
      },
      collect: (monitor) => ({
        isOverProject: monitor.isOver(),
      }),
    }),
    [phase.id, onProjectDrop]
  );

  return (
    <div
      ref={(node) => {
        dragColumn(node);
        dropColumn(node);
      }}
      className={`${isDraggingColumn ? 'opacity-40' : ''} ${isOverColumn ? 'scale-[1.02]' : ''} transition-all`}
    >
      <KanbanColumnFrame
        title={phase.name}
        count={projects.length}
        headerStyle={{ backgroundColor: phase.color || '#E5E7EB' }}
        isActive={isOverProject}
        actions={
          canManagePhases ? (
            <div className="group relative">
              <div className="flex items-center gap-1">
                {canReorderColumns ? <GripVertical className="h-4 w-4 text-gray-500" /> : null}
                <button
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="rounded-full p-1 transition-colors hover:bg-white/60"
                >
                  <Settings className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              {showMenu && (
                <div className="absolute right-0 top-full z-20 mt-2 min-w-[170px] overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_20px_40px_rgba(15,23,42,0.14)]">
                  <button
                    onClick={() => {
                      onStartEdit(phase);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar fase
                  </button>
                  <button
                    onClick={() => {
                      onRequestDelete(phase);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir fase
                  </button>
                </div>
              )}
            </div>
          ) : null
        }
      >
        <div
          ref={dropProject}
          className="space-y-3"
        >
          {projects.map((project, projectIndex) => (
            <GovernanceProjectCard
              key={project.id}
              project={project}
              phaseId={String(phase.id)}
              index={projectIndex}
              onOpen={onProjectOpen}
              onProjectDrop={onProjectDrop}
              allTasks={allTasks}
              canMoveProjects={canMoveProjects}
              currentStageLabel={phase.name}
              completionStageId={completionStageId}
              focusedTaskCount={focusedTaskCountByProject.get(project.id) || 0}
              highlightWeeklyFocus={highlightWeeklyFocus}
              boardMode={boardMode}
            />
          ))}
          {projects.length === 0 && (
            <KanbanEmptyState
              icon={<FolderKanban className="h-5 w-5" />}
              title="Nenhum projeto nesta fase"
              description="Arraste projetos para cá ou ajuste os filtros para visualizar mais itens."
            />
          )}
        </div>
      </KanbanColumnFrame>
    </div>
  );
});

export function GovernanceKanbanBoard({
  projects: visibleProjects,
  boardMode = 'governance',
  workspaceId,
  workspaceIds,
  onProjectOpen,
  allTasks = [],
  canManagePhases,
  canMoveProjects,
  highlightWeeklyFocus = false,
}: GovernanceKanbanBoardProps) {
  const {
    projects: allProjects,
    updateProject,
    getWorkspaceGovernancePhases,
    createGovernancePhase,
    updateGovernancePhase,
    reorderGovernancePhases,
    deleteGovernancePhase,
    getWorkspaceProjectStages,
    createWorkspaceProjectStage,
    updateWorkspaceProjectStage,
    reorderWorkspaceProjectStages,
    deleteWorkspaceProjectStage,
  } = useProjects();

  const [phaseBeingEdited, setPhaseBeingEdited] = useState<BoardStageDefinition | null>(null);
  const [phaseName, setPhaseName] = useState('');
  const [phaseColor, setPhaseColor] = useState('#E5E7EB');
  const [phaseBeingDeleted, setPhaseBeingDeleted] = useState<BoardStageDefinition | null>(null);
  const [deleteTargetPhaseId, setDeleteTargetPhaseId] = useState('');

  const selectedWorkspaceIds = useMemo(() => {
    const base = workspaceIds?.length
      ? workspaceIds
      : workspaceId
        ? [workspaceId]
        : Array.from(new Set(visibleProjects.map((project) => project.group).filter(Boolean) as string[]));

    return Array.from(new Set(base.filter(Boolean)));
  }, [visibleProjects, workspaceId, workspaceIds]);
  const activeWorkspaceId = selectedWorkspaceIds.length === 1 ? selectedWorkspaceIds[0] : '';

  const getColumnsForWorkspace = useCallback(
    (selectedId: string) =>
      boardMode === 'governance'
        ? getWorkspaceGovernancePhases(selectedId)
        : getWorkspaceProjectStages(selectedId),
    [boardMode, getWorkspaceGovernancePhases, getWorkspaceProjectStages]
  );

  const getProjectColumnId = useCallback(
    (project: Project, boardWorkspaceId?: string) =>
      boardMode === 'governance'
        ? String(getProjectGovernancePhaseId(project))
        : String(getProjectWorkspaceStageId(project, boardWorkspaceId || project.group) || ''),
    [boardMode]
  );

  const isCompletedStage = (stage?: BoardStageDefinition) => {
    if (!stage) return false;
    if (stage.isTerminal) return true;
    return stage.name.toLocaleLowerCase('pt-BR').includes('conclu');
  };

  const columns = useMemo(
    () => {
      if (selectedWorkspaceIds.length === 1) {
        return getColumnsForWorkspace(selectedWorkspaceIds[0]);
      }

      const phaseMap = new Map<string, BoardStageDefinition>();
      visibleProjects.forEach((project) => {
        const sourceStages =
          boardMode === 'governance'
            ? project.governance?.phases || []
            : getColumnsForWorkspace(project.group);

        sourceStages.forEach((phase, index) => {
          if (!phaseMap.has(String(phase.id))) {
            phaseMap.set(String(phase.id), {
              ...phase,
              id: String(phase.id),
              order: phase.order ?? index,
            });
          }
        });
      });

      return Array.from(phaseMap.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    [boardMode, getColumnsForWorkspace, visibleProjects, selectedWorkspaceIds]
  );

  const sortProjectsByOrder = useCallback(
    (items: Project[]) =>
      items
        .slice()
        .sort((a, b) => {
          const aFocus =
            Number(Boolean(a.isWeeklyFocus)) +
            Number(allTasks.some((task) => task.projectId === a.id && task.isWeeklyFocus));
          const bFocus =
            Number(Boolean(b.isWeeklyFocus)) +
            Number(allTasks.some((task) => task.projectId === b.id && task.isWeeklyFocus));
          if (boardMode === 'workspace' && aFocus !== bFocus) {
            return bFocus - aFocus;
          }
          if ((a.governanceOrder ?? 0) !== (b.governanceOrder ?? 0)) {
            return (a.governanceOrder ?? 0) - (b.governanceOrder ?? 0);
          }
          return a.name.localeCompare(b.name, 'pt-BR');
        }),
    [allTasks, boardMode]
  );
  const focusedTaskCountByProject = useMemo(() => {
    const counts = new Map<string, number>();
    allTasks
      .filter((task) => task.projectId && task.isWeeklyFocus)
      .forEach((task) => {
        const projectId = task.projectId as string;
        counts.set(projectId, (counts.get(projectId) || 0) + 1);
      });
    return counts;
  }, [allTasks]);

  const getCompletedWorkspaceBoardStates = (project: Project): Project['workspaceBoardStates'] => {
    const workspaceIds = Array.from(
      new Set(
        [project.group, ...(project.workspaceBoardStates || []).map((state) => state.workspaceId)].filter(Boolean)
      )
    );

    return workspaceIds
      .map((currentWorkspaceId) => {
        const workspaceStages = getWorkspaceProjectStages(currentWorkspaceId);
        if (!workspaceStages.length) return null;
        const completedStage =
          workspaceStages.find((stage) => isCompletedStage(stage)) ||
          workspaceStages[workspaceStages.length - 1];
        return {
          workspaceId: currentWorkspaceId,
          stageId: completedStage.id,
          updatedAt: new Date().toISOString(),
        };
      })
      .filter(Boolean) as NonNullable<Project['workspaceBoardStates']>;
  };

  const handleProjectDrop = (
    projectId: string,
    phaseId: string,
    targetProjectId?: string,
    placement: KanbanDropPlacement = 'after'
  ) => {
    if (!canMoveProjects) return;
    const project = allProjects.find((item) => item.id === projectId);
    if (!project) return;

    const sourcePhaseId = getProjectColumnId(project, activeWorkspaceId);
    const sourceProjects = sortProjectsByOrder(
      allProjects.filter((item) => getProjectColumnId(item, activeWorkspaceId) === sourcePhaseId)
    );
    const destinationProjects =
      sourcePhaseId === phaseId
        ? sourceProjects
        : sortProjectsByOrder(
            allProjects.filter((item) => getProjectColumnId(item, activeWorkspaceId) === phaseId)
          );

    const destinationPhase = columns.find((column) => String(column.id) === String(phaseId));
    const shouldValidateCompletion =
      boardMode === 'governance' &&
      sourcePhaseId !== phaseId &&
      isCompletedStage(destinationPhase);

    if (shouldValidateCompletion) {
      const pendingTasks = allTasks.filter(
        (task) => task.projectId === projectId && task.status !== 'done'
      );

      if (pendingTasks.length > 0) {
        window.alert(
          'Não foi possível concluir o projeto na Governança porque ainda existem tarefas pendentes na execução.'
        );
        return;
      }
    }

    if (sourcePhaseId === phaseId && targetProjectId) {
      const reorderedIds = moveItemWithinList(
        sourceProjects.map((item) => item.id),
        projectId,
        targetProjectId,
        placement
      );

      reorderedIds.forEach((id, index) => {
        const currentProject = allProjects.find((item) => item.id === id);
        if (!currentProject) return;
        if ((currentProject.governanceOrder ?? 0) !== index) {
          updateProject(id, {
            governanceOrder: index,
          });
        }
      });
      return;
    }

    const reordered = moveItemBetweenLists(
      sourceProjects.map((item) => item.id),
      destinationProjects.map((item) => item.id),
      projectId,
      targetProjectId,
      placement
    );

    reordered.sourceIds.forEach((id, index) => {
      const currentProject = allProjects.find((item) => item.id === id);
      if (!currentProject) return;
      if ((currentProject.governanceOrder ?? 0) !== index) {
        updateProject(id, {
          governanceOrder: index,
        });
      }
    });

    reordered.destinationIds.forEach((id, index) => {
      const currentProject = allProjects.find((item) => item.id === id);
      if (!currentProject) return;

      const updates: Partial<Project> = {
        governanceOrder: index,
      };

      if (id === projectId) {
        if (boardMode === 'governance') {
          updates.governance = {
            ...currentProject.governance,
            currentPhaseId: phaseId,
          };
          updates.status = phaseId as Project['status'];
          if (isCompletedStage(destinationPhase)) {
            updates.workspaceBoardStates = getCompletedWorkspaceBoardStates(currentProject);
          }
        } else if (activeWorkspaceId) {
          const nextWorkspaceBoardStates = [
            ...(currentProject.workspaceBoardStates || []).filter(
              (state) => state.workspaceId !== activeWorkspaceId
            ),
            {
              workspaceId: activeWorkspaceId,
              stageId: phaseId,
              updatedAt: new Date().toISOString(),
            },
          ];
          updates.workspaceBoardStates = nextWorkspaceBoardStates;
        }
      }

      updateProject(id, updates);
    });
  };

  const handleCreatePhase = () => {
    if (!activeWorkspaceId || !canManagePhases) return;
    const newPhase =
      boardMode === 'governance'
        ? createGovernancePhase(activeWorkspaceId)
        : createWorkspaceProjectStage(activeWorkspaceId);
    if (!newPhase) return;
    setPhaseBeingEdited(newPhase);
    setPhaseName(newPhase.name);
    setPhaseColor(newPhase.color || '#E5E7EB');
  };

  const openEditModal = (phase: BoardStageDefinition) => {
    setPhaseBeingEdited(phase);
    setPhaseName(phase.name);
    setPhaseColor(phase.color || '#E5E7EB');
  };

  const savePhaseEdit = () => {
    if (!phaseBeingEdited || !activeWorkspaceId || !phaseName.trim()) return;
    if (boardMode === 'governance') {
      updateGovernancePhase(activeWorkspaceId, phaseBeingEdited.id as string, {
        name: phaseName.trim(),
        color: phaseColor,
      });
    } else {
      updateWorkspaceProjectStage(activeWorkspaceId, phaseBeingEdited.id as string, {
        name: phaseName.trim(),
        color: phaseColor,
      });
    }
    setPhaseBeingEdited(null);
    setPhaseName('');
    setPhaseColor('#E5E7EB');
  };

  const confirmDelete = () => {
    if (!phaseBeingDeleted || !activeWorkspaceId) return;
    if (boardMode === 'governance') {
      deleteGovernancePhase(activeWorkspaceId, phaseBeingDeleted.id as string, deleteTargetPhaseId || undefined);
    } else {
      deleteWorkspaceProjectStage(activeWorkspaceId, phaseBeingDeleted.id as string, deleteTargetPhaseId || undefined);
    }
    setPhaseBeingDeleted(null);
    setDeleteTargetPhaseId('');
  };

  const projectsInPhase = phaseBeingDeleted
    ? allProjects.filter(
        (project) => getProjectColumnId(project, activeWorkspaceId) === String(phaseBeingDeleted.id)
      )
    : [];

  const destinationOptions = columns.filter(
    (phase) => phase.id !== phaseBeingDeleted?.id
  );
  const completionStageId = useMemo(() => {
    const completedColumn =
      columns.find((column) => isCompletedStage(column)) || columns[columns.length - 1];
    return completedColumn ? String(completedColumn.id) : undefined;
  }, [columns]);
  const canReorderColumns = canManagePhases && selectedWorkspaceIds.length === 1;

  const handleColumnDrop = useCallback((draggedColumnId: string, targetColumnId: string) => {
    if (!canReorderColumns || !activeWorkspaceId || draggedColumnId === targetColumnId) return;

    const draggedIndex = columns.findIndex((column) => String(column.id) === draggedColumnId);
    const targetIndex = columns.findIndex((column) => String(column.id) === targetColumnId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const reorderedColumns = [...columns];
    const [draggedColumn] = reorderedColumns.splice(draggedIndex, 1);
    reorderedColumns.splice(targetIndex, 0, draggedColumn);
    const orderedIds = reorderedColumns.map((column) => String(column.id));

    if (boardMode === 'governance') {
      reorderGovernancePhases(activeWorkspaceId, orderedIds);
      return;
    }

    reorderWorkspaceProjectStages(activeWorkspaceId, orderedIds);
  }, [
    activeWorkspaceId,
    boardMode,
    canReorderColumns,
    columns,
    reorderGovernancePhases,
    reorderWorkspaceProjectStages,
  ]);

  const projectsByColumn = useMemo(() => {
    const grouped: Record<string, Project[]> = {};

    columns.forEach((column) => {
      grouped[String(column.id)] = [];
    });

    visibleProjects.forEach((project) => {
      const columnId = String(getProjectColumnId(project, activeWorkspaceId));
      if (!grouped[columnId]) {
        grouped[columnId] = [];
      }
      grouped[columnId].push(project);
    });

    Object.keys(grouped).forEach((columnId) => {
      grouped[columnId] = sortProjectsByOrder(grouped[columnId]);
    });

    return grouped;
  }, [activeWorkspaceId, columns, getProjectColumnId, sortProjectsByOrder, visibleProjects]);

  if (selectedWorkspaceIds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
        Selecione ao menos uma equipe no filtro para visualizar o quadro consolidado.
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <KanbanBoardViewport
        footer={
          selectedWorkspaceIds.length > 1 ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Visão consolidada de múltiplas equipes. A edição estrutural das fases fica disponível ao filtrar uma única equipe.
            </div>
          ) : null
        }
      >
        {columns.map((column) => {
          const columnProjects = projectsByColumn[String(column.id)] || [];
          return (
            <GovernanceColumn
              key={`${activeWorkspaceId}-${column.id}`}
              phase={column}
              projects={columnProjects}
              boardMode={boardMode}
              index={columns.findIndex((item) => String(item.id) === String(column.id))}
              onProjectDrop={handleProjectDrop}
              onColumnDrop={handleColumnDrop}
              onProjectOpen={onProjectOpen}
              allTasks={allTasks}
              canMoveProjects={canMoveProjects}
              canManagePhases={canManagePhases}
              canReorderColumns={canReorderColumns}
              onStartEdit={openEditModal}
              onRequestDelete={(phase) => {
                setPhaseBeingDeleted(phase);
                setDeleteTargetPhaseId('');
              }}
              completionStageId={completionStageId}
              highlightWeeklyFocus={highlightWeeklyFocus}
              focusedTaskCountByProject={focusedTaskCountByProject}
            />
          );
        })}

        {canManagePhases && selectedWorkspaceIds.length === 1 && (
          <KanbanAddColumnButton label="Criar nova fase" onClick={handleCreatePhase} />
        )}
      </KanbanBoardViewport>

      {phaseBeingEdited && selectedWorkspaceIds.length === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Editar fase</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                <input
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cor</label>
                <input
                  type="color"
                  value={phaseColor}
                  onChange={(e) => setPhaseColor(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-2"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setPhaseBeingEdited(null);
                  setPhaseName('');
                  setPhaseColor('#E5E7EB');
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={savePhaseEdit}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {phaseBeingDeleted && selectedWorkspaceIds.length === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Excluir fase</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {projectsInPhase.length > 0
                    ? 'Existem projetos nesta fase. Escolha o destino antes de excluir.'
                    : 'Esta fase não possui projetos e pode ser removida.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setPhaseBeingDeleted(null);
                  setDeleteTargetPhaseId('');
                }}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {projectsInPhase.length > 0 && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="mb-3 text-sm text-amber-800">
                  Existem <strong>{projectsInPhase.length}</strong> projeto(s) nesta fase.
                  Deseja mover para outra fase antes de excluir?
                </p>
                <select
                  value={deleteTargetPhaseId}
                  onChange={(e) => setDeleteTargetPhaseId(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Selecione a fase de destino</option>
                  {destinationOptions.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPhaseBeingDeleted(null);
                  setDeleteTargetPhaseId('');
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={projectsInPhase.length > 0 && !deleteTargetPhaseId}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Excluir fase
              </button>
            </div>
          </div>
        </div>
      )}
    </DndProvider>
  );
}
