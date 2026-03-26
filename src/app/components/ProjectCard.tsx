import { Clock, Layers, Check, Pause, AlertCircle } from 'lucide-react';
import { Project } from '../types';
import { useTasks } from '../context/TaskContext';
import { getProjectProgress } from '../utils/progressCalculator';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  isDragging?: boolean;
}

export function ProjectCard({ project, onClick, isDragging }: ProjectCardProps) {
  const isPaused = project.isPaused;
  const { getTasksForProject } = useTasks();
  
  // Get all tasks for this project
  const allProjectTasks = getTasksForProject(project.id);
  const totalTasks = allProjectTasks.length;
  const completedTasks = allProjectTasks.filter(t => t.status === 'done').length;
  const inProgressTasks = allProjectTasks.filter(t => t.status === 'doing').length;
  
  // Calculate delayed tasks (with overdue dueDate and not done)
  const now = new Date();
  const delayedTasks = allProjectTasks.filter(t => {
    if (t.status === 'done' || !t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    return dueDate < now;
  }).length;
  
  const calculatedProgress = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;
  
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isPaused ? 'opacity-70 grayscale-[50%]' : ''}`}
    >
      {/* Logo/Header */}
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

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Paused Badge */}
        {isPaused && (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5">
            <Pause className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Projeto Pausado</span>
          </div>
        )}

        {/* Project Name */}
        <h3 className="font-semibold text-gray-900">{project.name}</h3>

        {/* Responsible */}
        <p className="text-sm text-gray-600">
          <span className="font-medium">Responsável:</span> {project.responsible}
        </p>

        {/* Client */}
        <p className="text-sm text-gray-600">
          <span className="font-medium">Cliente:</span> {project.client}
        </p>

        {/* ID and Hours */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">ID: {project.id}</span>
          <div className="flex items-center gap-1 text-blue-600 text-sm">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{project.hoursRemaining}h</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${calculatedProgress}%` }}
            />
          </div>
        </div>

        {/* Tasks and Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-600 text-sm">
            <Layers className="w-4 h-4" />
            <span>{completedTasks}/{totalTasks}</span>
          </div>
          <span className="font-semibold text-gray-900">{calculatedProgress}%</span>
        </div>

        {/* Task Status Summary */}
        {totalTasks > 0 && (
          <div className="flex items-center gap-2 pt-2 text-xs">
            {inProgressTasks > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                ⏳ {inProgressTasks}
              </span>
            )}
            {delayedTasks > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {delayedTasks}
              </span>
            )}
          </div>
        )}

        {/* Tags and Deadline */}
        <div className="flex items-center gap-2 pt-1">
          {project.tags?.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm rounded-full"
            >
              {tag}
            </span>
          ))}
          {project.deadline && (
            <span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-full flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {project.deadline}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}