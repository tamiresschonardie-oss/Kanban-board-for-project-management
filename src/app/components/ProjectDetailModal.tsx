import { useState } from 'react';
import { X, Calendar, TrendingUp, Users, Clock, Target, FileText, Activity, Edit2, Plus, Trash2, Save, Pause, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { Project, Milestone, Phase, WBSTask, Subtask } from '../types';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { getProjectProgress } from '../utils/progressCalculator';
import { getProjectExecutionStatus, getProjectExecutionStatusBadge } from '../utils/phaseStatusCalculator';
import { ProjectModal } from './ProjectModal';
import { TaskModal } from './TaskModal';
import { ProjectTasksKanbanView } from './ProjectTasksKanbanView';
import { ProjectPhasesTab } from './ProjectPhasesTab';
import { ProjectGanttTab } from './ProjectGanttTab';

interface ProjectDetailModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectDetailModal({ project, isOpen, onClose }: ProjectDetailModalProps) {
  const { updateProject } = useProjects();
  const { allTasks } = useTasks();
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  if (!isOpen) return null;

  // DEBUG: Log para verificar qual projeto foi aberto
  if (project.id === 'test-project-gantt') {
    console.log('[PROJECT_DETAIL] ✅ Projeto de teste aberto:');
    console.table(project.phases?.map(p => ({
      id: p.id,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
    })));
  }

  // Calculate project progress
  const calculatedProgress = getProjectProgress(project, allTasks);
  
  // Calculate project execution status (EAP-based)
  const executionStatus = getProjectExecutionStatus(project, allTasks);
  const executionStatusBadge = getProjectExecutionStatusBadge(executionStatus);

  // Get all milestones from all phases
  const allMilestones: Milestone[] = project.phases?.flatMap((phase) => phase.milestones) || [];

  const handleProjectUpdate = (updatedProject: Project) => {
    updateProject(project.id, updatedProject);
    setIsEditingProject(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* Header with Cover */}
          <div className="relative">
            {project.coverImage ? (
              <div className="h-48 relative overflow-hidden">
                <img
                  src={project.coverImage}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            ) : (
              <div
                className="h-48"
                style={{
                  background: `linear-gradient(135deg, ${project.logoColor} 0%, ${project.logoColor}dd 100%)`,
                }}
              />
            )}

            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => setIsEditingProject(true)}
                className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors shadow-lg flex items-center gap-2 px-4"
              >
                <Edit2 className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Editar Projeto</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors shadow-lg"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Project Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {project.responsible}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {project.client}
                    </span>
                    {project.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.deadline).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                {project.isPaused && (
                  <div className="flex items-center gap-2 bg-yellow-500/90 px-3 py-1.5 rounded-lg">
                    <Pause className="w-4 h-4" />
                    <span className="text-sm font-medium">Projeto Pausado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-5 gap-4 p-6 border-b">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Progresso</p>
              <p className="text-2xl font-bold text-gray-900">{calculatedProgress}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Marcos</p>
              <p className="text-2xl font-bold text-gray-900">
                {project.tasksCompleted}/{project.tasksTotal}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Horas Restantes</p>
              <p className="text-2xl font-bold text-gray-900">{project.hoursRemaining}h</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <StatusBadge status={project.status} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Execução</p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-lg">{executionStatusBadge.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{executionStatusBadge.label}</span>
              </div>
            </div>
          </div>

          {/* Tabs Content */}
          <Tabs defaultValue="overview" className="p-6">
            <TabsList className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-lg mb-6">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <FileText className="w-4 h-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="structure"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <Layers className="w-4 h-4" />
                Estrutura
              </TabsTrigger>
              <TabsTrigger
                value="milestones"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <Target className="w-4 h-4" />
                Marcos
              </TabsTrigger>
              <TabsTrigger
                value="gantt"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <TrendingUp className="w-4 h-4" />
                Gantt
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <Activity className="w-4 h-4" />
                Tarefas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab project={project} />
            </TabsContent>

            <TabsContent value="structure">
              <ProjectPhasesTab project={project} onEditTask={setEditingTask} />
            </TabsContent>

            <TabsContent value="milestones">
              <MilestonesTab project={project} milestones={allMilestones} />
            </TabsContent>

            <TabsContent value="gantt">
              <ProjectGanttTab project={project} allTasks={allTasks} />
            </TabsContent>

            <TabsContent value="tasks">
              <TasksKanbanTab 
                project={project} 
                onCreateTask={() => setIsCreatingTask(true)}
                onEditTask={setEditingTask}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Project Modal */}
      {isEditingProject && (
        <ProjectModal
          isOpen={isEditingProject}
          onClose={() => setIsEditingProject(false)}
          onSave={handleProjectUpdate}
          project={project}
        />
      )}

      {/* Create/Edit Task Modal */}
      {(isCreatingTask || editingTask) && (
        <TaskModal
          isOpen={isCreatingTask || !!editingTask}
          onClose={() => {
            setIsCreatingTask(false);
            setEditingTask(null);
          }}
          projectId={project.id}
          editingTask={editingTask}
        />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    backlog: { label: 'Backlog', color: 'bg-gray-100 text-gray-700' },
    'pre-analysis': { label: 'Em Análise', color: 'bg-blue-100 text-blue-700' },
    construction: { label: 'Em Execução', color: 'bg-green-100 text-green-700' },
    'waiting-approval': { label: 'Pausado', color: 'bg-yellow-100 text-yellow-700' },
    documentation: { label: 'Concluído', color: 'bg-purple-100 text-purple-700' },
  };

  const config = statusConfig[status] || statusConfig.backlog;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      {project.description && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Descrição</h3>
          <p className="text-gray-700">{project.description}</p>
        </div>
      )}

      {/* Phases */}
      {project.phases && project.phases.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estrutura do Projeto (WBS)</h3>
          <div className="space-y-3">
            {project.phases.map((phase, index) => (
              <div key={phase.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <h4 className="font-semibold text-gray-900">{phase.name}</h4>
                  <span className="ml-auto text-sm text-gray-500">
                    {phase.milestones.length} marco(s)
                  </span>
                </div>
                {phase.description && (
                  <p className="text-sm text-gray-600 ml-11">{phase.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-4">
        {project.startDate && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Data de Início</p>
            <p className="font-semibold text-gray-900">
              {new Date(project.startDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}
        {project.budget && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Orçamento</p>
            <p className="font-semibold text-gray-900">
              R$ {project.budget.toLocaleString('pt-BR')}
            </p>
          </div>
        )}
        {project.demandType && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Tipo de Demanda</p>
            <p className="font-semibold text-gray-900 capitalize">{project.demandType}</p>
          </div>
        )}
        {project.requester && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Solicitante</p>
            <p className="font-semibold text-gray-900">{project.requester}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MilestonesTab({ project, milestones }: { project: Project; milestones: Milestone[] }) {
  const { updateProject } = useProjects();
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    sla: 0,
    type: 'business' as 'business' | 'technical' | 'regulatory' | 'delivery',
  });

  const openEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneForm({
      name: milestone.name,
      description: milestone.description || '',
      startDate: milestone.startDate.split('T')[0],
      endDate: milestone.endDate.split('T')[0],
      sla: milestone.sla,
      type: milestone.type,
    });
  };

  const openAddMilestone = () => {
    setIsAddingMilestone(true);
    setMilestoneForm({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      sla: 0,
      type: 'business',
    });
  };

  const saveMilestone = () => {
    if (!project.phases || project.phases.length === 0) return;

    const updatedPhases = [...project.phases];
    const firstPhase = updatedPhases[0];

    if (editingMilestone) {
      // Update existing milestone
      const milestoneIndex = firstPhase.milestones.findIndex((m) => m.id === editingMilestone.id);
      if (milestoneIndex !== -1) {
        firstPhase.milestones[milestoneIndex] = {
          ...editingMilestone,
          name: milestoneForm.name,
          description: milestoneForm.description,
          startDate: milestoneForm.startDate,
          endDate: milestoneForm.endDate,
          sla: milestoneForm.sla,
          type: milestoneForm.type,
        };
      }
    } else {
      // Add new milestone
      const newMilestone: Milestone = {
        id: `milestone-${Date.now()}`,
        name: milestoneForm.name,
        description: milestoneForm.description,
        type: milestoneForm.type,
        status: 'not-started',
        startDate: milestoneForm.startDate,
        endDate: milestoneForm.endDate,
        sla: milestoneForm.sla,
        tasks: [],
        order: firstPhase.milestones.length,
      };
      firstPhase.milestones.push(newMilestone);
    }

    updateProject(project.id, { phases: updatedPhases });
    setEditingMilestone(null);
    setIsAddingMilestone(false);
  };

  const deleteMilestone = (milestoneId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este marco?')) return;
    if (!project.phases || project.phases.length === 0) return;

    const updatedPhases = project.phases.map((phase) => ({
      ...phase,
      milestones: phase.milestones.filter((m) => m.id !== milestoneId),
    }));

    updateProject(project.id, { phases: updatedPhases });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Marcos do Projeto</h3>
        <button
          onClick={openAddMilestone}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Marco
        </button>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Nenhum marco cadastrado ainda</p>
          <button
            onClick={openAddMilestone}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Criar Primeiro Marco
          </button>
        </div>
      ) : (
        milestones.map((milestone) => (
          <div
            key={milestone.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
                {milestone.description && (
                  <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <MilestoneStatusBadge status={milestone.status} />
                <button
                  onClick={() => openEditMilestone(milestone)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => deleteMilestone(milestone.id)}
                  className="p-1.5 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Início</p>
                <p className="font-medium text-gray-900">
                  {new Date(milestone.startDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Fim</p>
                <p className="font-medium text-gray-900">
                  {new Date(milestone.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-gray-500">SLA</p>
                <p className="font-medium text-gray-900">{milestone.sla} dias</p>
              </div>
            </div>

            {milestone.tasks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">{milestone.tasks.length} tarefa(s)</p>
              </div>
            )}
          </div>
        ))
      )}

      {/* Milestone Form Modal */}
      {(editingMilestone || isAddingMilestone) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingMilestone ? 'Editar Marco' : 'Novo Marco'}
              </h3>
              <button
                onClick={() => {
                  setEditingMilestone(null);
                  setIsAddingMilestone(false);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do Marco *
                </label>
                <input
                  type="text"
                  value={milestoneForm.name}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Kickoff do Projeto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descrição
                </label>
                <textarea
                  value={milestoneForm.description}
                  onChange={(e) =>
                    setMilestoneForm({ ...milestoneForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva o marco..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    value={milestoneForm.startDate}
                    onChange={(e) =>
                      setMilestoneForm({ ...milestoneForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Data de Fim *
                  </label>
                  <input
                    type="date"
                    value={milestoneForm.endDate}
                    onChange={(e) =>
                      setMilestoneForm({ ...milestoneForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  SLA (dias) *
                </label>
                <input
                  type="number"
                  value={milestoneForm.sla}
                  onChange={(e) =>
                    setMilestoneForm({ ...milestoneForm, sla: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tipo de Marco
                </label>
                <select
                  value={milestoneForm.type}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      type: e.target.value as 'business' | 'technical' | 'regulatory' | 'delivery',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="business">Negócio</option>
                  <option value="technical">Técnico</option>
                  <option value="regulatory">Regulatório</option>
                  <option value="delivery">Entrega</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setEditingMilestone(null);
                    setIsAddingMilestone(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveMilestone}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    'not-started': { label: 'Não Iniciado', color: 'bg-gray-100 text-gray-700' },
    'in-progress': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
    delayed: { label: 'Atrasado', color: 'bg-red-100 text-red-700' },
  };

  const config = statusConfig[status] || statusConfig['not-started'];

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function GanttTab({ project, milestones }: { project: Project; milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Nenhum marco para visualizar no Gantt</p>
        <p className="text-sm text-gray-400 mt-2">
          Adicione marcos na aba "Marcos" para visualizar o cronograma
        </p>
      </div>
    );
  }

  // Calculate date range from milestones
  const allDates = milestones.flatMap((m) => [new Date(m.startDate), new Date(m.endDate)]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="flex mb-4">
          <div className="w-64 flex-shrink-0">
            <h4 className="font-semibold text-gray-900">Marco</h4>
          </div>
          <div className="flex-1 flex items-center justify-between px-4">
            <span className="text-sm text-gray-600">
              {minDate.toLocaleDateString('pt-BR')}
            </span>
            <span className="text-sm text-gray-600">
              {maxDate.toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Gantt Bars - alimentado pelos dados dos marcos */}
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const start = new Date(milestone.startDate);
            const end = new Date(milestone.endDate);
            const startOffset =
              ((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
            const duration =
              ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;

            const statusColors: Record<string, string> = {
              'not-started': 'bg-gray-400',
              'in-progress': 'bg-blue-500',
              completed: 'bg-green-500',
              delayed: 'bg-red-500',
            };

            return (
              <div key={milestone.id} className="flex items-center">
                <div className="w-64 flex-shrink-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{milestone.name}</p>
                  <p className="text-xs text-gray-500">{milestone.sla} dias</p>
                </div>
                <div className="flex-1 relative h-8 bg-gray-100 rounded">
                  <div
                    className={`absolute top-1 h-6 ${
                      statusColors[milestone.status]
                    } rounded shadow-sm flex items-center justify-center text-white text-xs font-medium`}
                    style={{
                      left: `${startOffset}%`,
                      width: `${Math.max(duration, 2)}%`,
                    }}
                    title={`${new Date(milestone.startDate).toLocaleDateString('pt-BR')} - ${new Date(
                      milestone.endDate
                    ).toLocaleDateString('pt-BR')}`}
                  >
                    {duration > 10 && <span>{milestone.sla}d</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Legenda:</strong> As barras do Gantt são alimentadas automaticamente pelas datas
            cadastradas nos marcos. Edite os marcos para atualizar o cronograma.
          </p>
        </div>
      </div>
    </div>
  );
}

function TasksKanbanTab({ 
  project, 
  onCreateTask,
  onEditTask,
}: { 
  project: Project; 
  onCreateTask: () => void;
  onEditTask?: (task: WBSTask) => void;
}) {
  const { getTasksForProject, updateTask } = useTasks();
  const allTasks = getTasksForProject(project.id);

  return (
    <ProjectTasksKanbanView 
      project={project} 
      allTasks={allTasks} 
      onEditTask={onEditTask}
      onUpdateTask={updateTask}
    />
  );
}

