import { Clock, Layers, Check, Pause, AlertCircle } from 'lucide-react';
import { Project } from '../types';
import { useTasks } from '../context/TaskContext';
import {
  getProjectExecutionDependencies,
  getProjectMetrics,
  getProjectTaskCounts,
  isProjectPaused,
} from '../utils/projectSelectors';
import { isTaskDoneStatus, isTaskInProgressStatus } from '../utils/taskStatus';
import { getProjectDependencySummary } from '../utils/taskDependencies';
import { formatDurationSummary } from '../utils/timeTracking';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  isDragging?: boolean;
}

export function ProjectCard({ project, onClick, isDragging }: ProjectCardProps) {
  const isPaused = isProjectPaused(project);
  const { getTasksForProject } = useTasks();
  const metrics = getProjectMetrics(project);
  const taskCounts = getProjectTaskCounts(project);
  
  // Get all tasks for this project
  const allProjectTasks = getTasksForProject(project.id);
  const totalTasks = taskCounts.total;
  const completedTasks = taskCounts.completed;
  const inProgressTasks = allProjectTasks.filter(t => isTaskInProgressStatus(t.status)).length;
  
  // Calculate delayed tasks (with overdue dueDate and not done)
  const now = new Date();
  const delayedTasks = allProjectTasks.filter(t => {
    if (isTaskDoneStatus(t.status) || !t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    return dueDate < now;
  }).length;
  
  const calculatedProgress = metrics.progress;
  const dependencySummary = getProjectDependencySummary(
    getProjectExecutionDependencies(project),
    allProjectTasks.filter((task) => task.isDependencyBlocked).map((task) => task.id)
  );
  
  return (
    <div
      onClick={onClick}
      className={`interactive-surface overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      } ${isPaused ? 'opacity-70 grayscale-[50%]' : ''}`}
    >
      {/* Cover/Header */}
      {project.coverImage ? (
        <div className={`relative h-[120px] overflow-hidden ${isPaused ? 'opacity-80' : ''}`}>
          <img
            src={project.coverImage}
            alt={`Capa do projeto ${project.name}`}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
          {isPaused && (
            <div className="absolute top-2 right-2 bg-yellow-500 rounded-full p-1">
              <Pause className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`h-24 flex items-center justify-center text-white font-semibold text-lg px-4 text-center relative ${
            isPaused ? 'opacity-80' : ''
          }`}
          style={{ backgroundColor: project.logoColor }}
        >
          {isPaused && (
            <div className="absolute top-2 right-2 bg-yellow-500 rounded-full p-1">
              <Pause className="w-4 h-4 text-white" />
            </div>
          )}
          {project.logoText?.includes('crisdu') ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
              <span className="text-sm">{project.logoText}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div className="text-lg" style={{ color: project.logoColor }}>+</div>
              </div>
              <span>{project.logoText || project.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="space-y-4 p-5">
        {/* Paused Badge */}
        {isPaused && (
          <div className="flex items-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50/90 px-3 py-2">
            <Pause className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Projeto Pausado</span>
          </div>
        )}

        {/* Project Name */}
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">{project.name}</h3>
          <p className="text-sm text-slate-500">{project.client}</p>
        </div>

        {/* Responsible */}
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">Responsável:</span> {project.responsible}
        </p>

        {/* ID and Effort */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">#{project.id}</span>
          <div className="flex items-center gap-1 text-sm text-slate-700">
            <Clock className="w-4 h-4" />
            <span className="font-semibold">{formatDurationSummary(metrics.totalTimeTrackedSeconds || 0)}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Esforço total investido no projeto
        </p>

        {/* Progress Bar */}
        <div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${calculatedProgress}%` }}
            />
          </div>
        </div>

        {/* Tasks and Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Layers className="w-4 h-4" />
            <span>{completedTasks}/{totalTasks}</span>
          </div>
          <span className="text-sm font-semibold text-slate-900">{calculatedProgress}%</span>
        </div>

        {/* Task Status Summary */}
        {allProjectTasks.length > 0 && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            {inProgressTasks > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                ⏳ {inProgressTasks}
              </span>
            )}
            {delayedTasks > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                <AlertCircle className="w-3 h-3" />
                {delayedTasks}
              </span>
            )}
            {dependencySummary.blockedTasks > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                <AlertCircle className="w-3 h-3" />
                {dependencySummary.blockedTasks} bloqueadas
              </span>
            )}
            {dependencySummary.externalDependencies > 0 && (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">
                externas {dependencySummary.externalDependencies}
              </span>
            )}
            {dependencySummary.phaseDependencies > 0 && (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                fases {dependencySummary.phaseDependencies}
              </span>
            )}
          </div>
        )}

        {/* Tags and Deadline */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {project.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
          {project.deadline && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <Check className="w-3.5 h-3.5" />
              {project.deadline}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
