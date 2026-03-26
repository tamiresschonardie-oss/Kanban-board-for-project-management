import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { WBSTask, TaskStatus, Comment } from '../types';
import { useProjects } from './ProjectContext';
import { useAdmin } from './AdminContext';

interface TaskContextType {
  allTasks: EnrichedTask[];
  independentTasks: WBSTask[];
  addIndependentTask: (task: WBSTask) => void;
  updateTask: (taskId: string, updates: Partial<WBSTask>) => void;
  deleteTask: (taskId: string) => void;
  toggleSubtaskCompletion: (taskId: string, subtaskId: string) => void;
  addComment: (taskId: string, comment: Comment) => void;
  startTimeTracking: (taskId: string) => void;
  stopTimeTracking: (taskId: string) => void;
  getTaskById: (taskId: string) => EnrichedTask | undefined;
  getTasksForProject: (projectId: string) => WBSTask[];
  getTasksForPhase: (projectId: string, phaseId: string) => WBSTask[];
  getTasksForMilestone: (projectId: string, phaseId: string, milestoneId: string) => WBSTask[];
  reorderTasksInGroup: (projectId: string, phaseId: string, milestoneId: string | undefined, taskIds: string[]) => void;
  moveTaskInGroup: (projectId: string, phaseId: string, milestoneId: string | undefined, taskId: string, direction: 'up' | 'down') => void;
  moveIndependentTask: (taskId: string, direction: 'up' | 'down') => void;
}

export interface EnrichedTask extends WBSTask {
  projectName?: string;
  phaseName?: string;
  milestoneName?: string;
  projectId?: string;
  phaseId?: string;
  tags?: string[];
  timeTracking?: TimeTrackingEntry[];
  isTracking?: boolean;
  kanbanColumn?: string; // ID da coluna no kanban pessoal
  isLinkedToProject?: boolean; // Indica se está vinculada a um projeto
}

interface TimeTrackingEntry {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { projects, updateProject } = useProjects();
  const [independentTasks, setIndependentTasks] = useState<WBSTask[]>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('independentTasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [trackingSessions, setTrackingSessions] = useState<Record<string, TimeTrackingEntry[]>>({});
  const [activeTracking, setActiveTracking] = useState<Record<string, boolean>>({});

  // Persist independent tasks to localStorage
  useEffect(() => {
    localStorage.setItem('independentTasks', JSON.stringify(independentTasks));
  }, [independentTasks]);

  // Flatten all tasks from projects and combine with independent tasks
  const allTasks: EnrichedTask[] = React.useMemo(() => {
    const projectTasks: EnrichedTask[] = [];
    
    projects.forEach(project => {
      if (project.phases) {
        project.phases.forEach(phase => {
          phase.milestones.forEach(milestone => {
            milestone.tasks.forEach(task => {
              projectTasks.push({
                ...task,
                projectName: project.name,
                projectId: project.id,
                phaseName: phase.name,
                phaseId: phase.id,
                milestoneName: milestone.name,
                milestoneId: milestone.id,
                tags: project.tags,
                timeTracking: trackingSessions[task.id] || [],
                isTracking: activeTracking[task.id] || false,
                isLinkedToProject: true, // Tarefa vinculada a projeto
              });
            });
          });
        });
      }
    });

    const independentEnriched: EnrichedTask[] = independentTasks.map(task => ({
      ...task,
      timeTracking: trackingSessions[task.id] || [],
      isTracking: activeTracking[task.id] || false,
      isLinkedToProject: false, // Tarefa independente
    }));

    return [...projectTasks, ...independentEnriched];
  }, [projects, independentTasks, trackingSessions, activeTracking]);

  const addIndependentTask = (task: WBSTask) => {
    setIndependentTasks(prev => [...prev, task]);
  };

  const updateTask = (taskId: string, updates: Partial<WBSTask>) => {
    // Validação: Se marcando como 'done', verificar se todas as subtarefas estão concluídas
    const task = allTasks.find(t => t.id === taskId);
    if (task && updates.status === 'done' && task.subtasks && task.subtasks.length > 0) {
      const allSubtasksDone = task.subtasks.every(st => st.completed);
      if (!allSubtasksDone) {
        console.warn('Não é possível marcar como concluído: existem subtarefas inconclusas');
        return; // Impedir atualização
      }
    }

    // Check if it's an independent task
    const isIndependent = independentTasks.some(t => t.id === taskId);
    
    if (isIndependent) {
      setIndependentTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, ...updates } : t))
      );
    } else {
      // Update task in project structure
      projects.forEach(project => {
        if (project.phases) {
          let updated = false;
          const updatedPhases = project.phases.map(phase => ({
            ...phase,
            milestones: phase.milestones.map(milestone => ({
              ...milestone,
              tasks: milestone.tasks.map(t => {
                if (t.id === taskId) {
                  updated = true;
                  return { ...t, ...updates };
                }
                return t;
              }),
            })),
          }));

          if (updated) {
            updateProject(project.id, { phases: updatedPhases });
          }
        }
      });
    }
  };

  const deleteTask = (taskId: string) => {
    // Check if it's an independent task
    const isIndependent = independentTasks.some(t => t.id === taskId);
    
    if (isIndependent) {
      setIndependentTasks(prev => prev.filter(task => task.id !== taskId));
    } else {
      // Remove task from project structure
      projects.forEach(project => {
        if (project.phases) {
          const updatedPhases = project.phases.map(phase => ({
            ...phase,
            milestones: phase.milestones.map(milestone => ({
              ...milestone,
              tasks: milestone.tasks.filter(task => task.id !== taskId),
            })),
          }));

          updateProject(project.id, { phases: updatedPhases });
        }
      });
    }
  };

  const toggleSubtaskCompletion = (taskId: string, subtaskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const toggleInSubtasks = (subtasks: any[]): any[] => {
      return subtasks.map(st => {
        if (st.id === subtaskId) {
          return { ...st, completed: !st.completed };
        }
        if (st.subtasks && st.subtasks.length > 0) {
          return { ...st, subtasks: toggleInSubtasks(st.subtasks) };
        }
        return st;
      });
    };

    const updatedSubtasks = toggleInSubtasks(task.subtasks);
    updateTask(taskId, { subtasks: updatedSubtasks });
  };

  const addComment = (taskId: string, comment: Comment) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedComments = [...(task.comments || []), comment];
    updateTask(taskId, { comments: updatedComments });
  };

  const startTimeTracking = (taskId: string) => {
    const newEntry: TimeTrackingEntry = {
      id: `tracking-${Date.now()}`,
      startTime: new Date().toISOString(),
    };

    setTrackingSessions(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), newEntry],
    }));

    setActiveTracking(prev => ({
      ...prev,
      [taskId]: true,
    }));
  };

  const stopTimeTracking = (taskId: string) => {
    const sessions = trackingSessions[taskId] || [];
    const activeSession = sessions.find(s => !s.endTime);

    if (activeSession) {
      const endTime = new Date();
      const startTime = new Date(activeSession.startTime);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

      setTrackingSessions(prev => ({
        ...prev,
        [taskId]: sessions.map(s =>
          s.id === activeSession.id
            ? { ...s, endTime: endTime.toISOString(), duration }
            : s
        ),
      }));

      // Update actual hours
      const task = allTasks.find(t => t.id === taskId);
      if (task) {
        const totalMinutes = sessions.reduce((acc, s) => {
          if (s.id === activeSession.id) return acc + duration;
          return acc + (s.duration || 0);
        }, 0);
        
        updateTask(taskId, { actualHours: Math.ceil(totalMinutes / 60) });
      }
    }

    setActiveTracking(prev => ({
      ...prev,
      [taskId]: false,
    }));
  };

  const getTaskById = (taskId: string): EnrichedTask | undefined => {
    return allTasks.find(t => t.id === taskId);
  };

  const getTasksForProject = (projectId: string): WBSTask[] => {
    const projectTasks: WBSTask[] = [];
    
    // Get tasks from project phases
    const project = projects.find(p => p.id === projectId);
    if (project && project.phases) {
      project.phases.forEach(phase => {
        phase.milestones.forEach(milestone => {
          milestone.tasks.forEach(task => {
            projectTasks.push(task);
          });
        });
      });
    }
    
    return projectTasks;
  };

  const getTasksForPhase = (projectId: string, phaseId: string): WBSTask[] => {
    return getTasksForProject(projectId)
      .filter(task => task.phaseId === phaseId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const getTasksForMilestone = (projectId: string, phaseId: string, milestoneId: string): WBSTask[] => {
    return getTasksForProject(projectId)
      .filter(task => task.phaseId === phaseId && task.milestoneId === milestoneId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const reorderTasksInGroup = (projectId: string, phaseId: string, milestoneId: string | undefined, taskIds: string[]) => {
    // Normalizar orders: sequência contínua 0,1,2,3...
    taskIds.forEach((taskId, index) => {
      updateTask(taskId, { order: index });
    });
  };

  const moveTaskInGroup = (projectId: string, phaseId: string, milestoneId: string | undefined, taskId: string, direction: 'up' | 'down') => {
    // Obter todas as tasks do grupo (mesmo projeto + mesma fase + mesmo milestone)
    let groupTasks = allTasks.filter(t => t.projectId === projectId && t.phaseId === phaseId);
    
    if (milestoneId) {
      groupTasks = groupTasks.filter(t => t.milestoneId === milestoneId);
    } else {
      groupTasks = groupTasks.filter(t => !t.milestoneId);
    }

    groupTasks = groupTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    const taskIndex = groupTasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1 || groupTasks.length <= 1) return;

    let newIndex = taskIndex;
    if (direction === 'up' && taskIndex > 0) {
      newIndex = taskIndex - 1;
    } else if (direction === 'down' && taskIndex < groupTasks.length - 1) {
      newIndex = taskIndex + 1;
    } else {
      return; // Impossível mover
    }

    // Reordenar no array
    const [movedTask] = groupTasks.splice(taskIndex, 1);
    groupTasks.splice(newIndex, 0, movedTask);

    // Renormalizar orders para toda o grupo (0, 1, 2, 3...)
    groupTasks.forEach((task, index) => {
      if (task.order !== index) {
        updateTask(task.id, { order: index });
      }
    });
  };

  const moveIndependentTask = (taskId: string, direction: 'up' | 'down') => {
    // Reordenar tasks independentes
    const sortedTasks = [...independentTasks].sort((a, b) => (a.order || 0) - (b.order || 0));
    const taskIndex = sortedTasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1 || sortedTasks.length <= 1) return;

    let newIndex = taskIndex;
    if (direction === 'up' && taskIndex > 0) {
      newIndex = taskIndex - 1;
    } else if (direction === 'down' && taskIndex < sortedTasks.length - 1) {
      newIndex = taskIndex + 1;
    } else {
      return; // Impossível mover
    }

    // Reordenar no array
    const [movedTask] = sortedTasks.splice(taskIndex, 1);
    sortedTasks.splice(newIndex, 0, movedTask);

    // Renormalizar orders (0, 1, 2, 3...)
    sortedTasks.forEach((task, index) => {
      if (task.order !== index) {
        updateTask(task.id, { order: index });
      }
    });
  };

  return (
    <TaskContext.Provider
      value={{
        allTasks,
        independentTasks,
        addIndependentTask,
        updateTask,
        deleteTask,
        toggleSubtaskCompletion,
        addComment,
        startTimeTracking,
        stopTimeTracking,
        getTaskById,
        getTasksForProject,
        getTasksForPhase,
        getTasksForMilestone,
        reorderTasksInGroup,
        moveTaskInGroup,
        moveIndependentTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within TaskProvider');
  }
  return context;
}