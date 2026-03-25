import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import {
  ArrowLeft,
  FolderTree,
  Flag,
  GanttChart,
  LayoutGrid,
  FileText,
  Settings,
} from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { WBSTree } from '../components/WBSTree';
import { MilestonePanel } from '../components/MilestonePanel';
import { ProjectTimeline } from '../components/ProjectTimeline';
import { TaskKanban } from '../components/TaskKanban';
import { ProjectSummary } from '../components/ProjectSummary';
import { Phase, Milestone } from '../types';

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjects();

  const project = projects.find((p) => p.id === projectId);

  // Mock data for demonstration - In a real app, this would be loaded from the project
  const [phases, setPhases] = useState<Phase[]>(
    project?.phases || [
      {
        id: 'phase-1',
        name: 'Planejamento',
        description: 'Fase inicial de planejamento e definição de escopo',
        color: '#3B82F6',
        order: 1,
        milestones: [
          {
            id: 'milestone-1',
            name: 'Kickoff do Projeto',
            type: 'business',
            status: 'completed',
            startDate: '2026-01-15',
            endDate: '2026-01-20',
            sla: 5,
            description: 'Reunião inicial com stakeholders',
            order: 1,
            tasks: [
              {
                id: 'task-1',
                title: 'Preparar apresentação',
                description: 'Criar apresentação para o kickoff',
                status: 'done',
                assignee: 'João Silva',
                estimatedHours: 8,
                actualHours: 6,
                priority: 'high',
                order: 1,
                subtasks: [
                  {
                    id: 'subtask-1',
                    title: 'Definir agenda',
                    completed: true,
                  },
                  {
                    id: 'subtask-2',
                    title: 'Criar slides',
                    completed: true,
                  },
                ],
              },
              {
                id: 'task-2',
                title: 'Enviar convites',
                status: 'done',
                assignee: 'Maria Santos',
                estimatedHours: 2,
                priority: 'medium',
                order: 2,
                subtasks: [],
              },
            ],
          },
          {
            id: 'milestone-2',
            name: 'Documento de Requisitos',
            type: 'technical',
            status: 'in-progress',
            startDate: '2026-01-21',
            endDate: '2026-02-05',
            sla: 15,
            description: 'Levantamento e documentação de requisitos',
            order: 2,
            tasks: [
              {
                id: 'task-3',
                title: 'Reunião com stakeholders',
                status: 'done',
                assignee: 'Pedro Costa',
                estimatedHours: 4,
                priority: 'high',
                order: 1,
                subtasks: [],
              },
              {
                id: 'task-4',
                title: 'Redigir documento de requisitos',
                status: 'doing',
                assignee: 'Ana Oliveira',
                estimatedHours: 16,
                priority: 'high',
                order: 2,
                subtasks: [
                  {
                    id: 'subtask-3',
                    title: 'Requisitos funcionais',
                    completed: true,
                  },
                  {
                    id: 'subtask-4',
                    title: 'Requisitos não-funcionais',
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'phase-2',
        name: 'Design',
        description: 'Criação de wireframes e protótipos',
        color: '#8B5CF6',
        order: 2,
        milestones: [
          {
            id: 'milestone-3',
            name: 'Wireframes',
            type: 'business',
            status: 'in-progress',
            startDate: '2026-02-06',
            endDate: '2026-02-20',
            sla: 14,
            order: 1,
            tasks: [
              {
                id: 'task-5',
                title: 'Criar wireframes de baixa fidelidade',
                status: 'doing',
                assignee: 'Carlos Design',
                estimatedHours: 20,
                priority: 'high',
                order: 1,
                subtasks: [],
              },
            ],
          },
          {
            id: 'milestone-4',
            name: 'Protótipo Interativo',
            type: 'delivery',
            status: 'not-started',
            startDate: '2026-02-21',
            endDate: '2026-03-10',
            sla: 17,
            order: 2,
            tasks: [
              {
                id: 'task-6',
                title: 'Desenvolver protótipo no Figma',
                status: 'todo',
                assignee: 'Carlos Design',
                estimatedHours: 30,
                priority: 'medium',
                order: 1,
                subtasks: [],
              },
            ],
          },
        ],
      },
      {
        id: 'phase-3',
        name: 'Desenvolvimento',
        description: 'Implementação da solução',
        color: '#10B981',
        order: 3,
        milestones: [
          {
            id: 'milestone-5',
            name: 'Sprint 1',
            type: 'technical',
            status: 'not-started',
            startDate: '2026-03-11',
            endDate: '2026-03-25',
            sla: 14,
            order: 1,
            tasks: [
              {
                id: 'task-7',
                title: 'Configurar ambiente de desenvolvimento',
                status: 'todo',
                assignee: 'Dev Team',
                estimatedHours: 8,
                priority: 'high',
                order: 1,
                subtasks: [],
              },
            ],
          },
        ],
      },
    ]
  );

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projeto não encontrado</h2>
          <p className="text-gray-600 mb-4">O projeto que você está procurando não existe.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  // Flatten all milestones for the milestone panel
  const allMilestones: Milestone[] = phases.flatMap((phase) => phase.milestones);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-md"
                style={{ backgroundColor: project.logoColor }}
              >
                {project.logoText || project.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Cliente:</span> {project.client}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Equipe:</span> {project.group}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Responsável:</span> {project.responsible}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Settings className="w-4 h-4" />
            <span className="font-medium">Configurações</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <Tabs defaultValue="wbs" className="h-full">
          <div className="bg-white border-b border-gray-200 px-8 sticky top-0 z-10">
            <TabsList className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-lg my-4">
              <TabsTrigger
                value="wbs"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <FolderTree className="w-4 h-4" />
                WBS
              </TabsTrigger>
              <TabsTrigger
                value="milestones"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <Flag className="w-4 h-4" />
                Marcos
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <GanttChart className="w-4 h-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="kanban"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <FileText className="w-4 h-4" />
                Resumo
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8">
            <TabsContent value="wbs">
              <WBSTree
                phases={phases}
                projectId={project.id}
                onAddPhase={() => alert('Adicionar fase (funcionalidade em desenvolvimento)')}
                onAddMilestone={(phaseId) =>
                  alert(`Adicionar marco à fase ${phaseId} (funcionalidade em desenvolvimento)`)
                }
                onAddTask={(milestoneId) =>
                  alert(`Adicionar tarefa ao marco ${milestoneId} (funcionalidade em desenvolvimento)`)
                }
                onAddSubtask={(taskId) =>
                  alert(`Adicionar subtarefa à tarefa ${taskId} (funcionalidade em desenvolvimento)`)
                }
              />
            </TabsContent>

            <TabsContent value="milestones">
              <MilestonePanel milestones={allMilestones} />
            </TabsContent>

            <TabsContent value="timeline">
              <ProjectTimeline phases={phases} />
            </TabsContent>

            <TabsContent value="kanban">
              <TaskKanban
                phases={phases}
                onUpdateTask={(taskId, updates) => {
                  alert(`Atualizar tarefa ${taskId} (funcionalidade em desenvolvimento)`);
                  console.log('Update task:', taskId, updates);
                }}
              />
            </TabsContent>

            <TabsContent value="summary">
              <ProjectSummary project={project} phases={phases} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
