import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Project, Phase } from '../types';
import { useEAP } from '../context/EAPContext';
import { useTasks } from '../context/TaskContext';
import { getPhaseProgress } from '../utils/progressCalculator';
import { getPhaseStatus } from '../utils/phaseStatusCalculator';
import { PhaseCard } from './PhaseCard';
import { EditPhaseModal } from './EditPhaseModal';

interface ProjectPhasesTabProps {
  project: Project;
  onEditTask?: (task: any) => void;
}

export function ProjectPhasesTab({ project, onEditTask }: ProjectPhasesTabProps) {
  const { getEAPTemplate } = useEAP();
  const { getTasksForPhase, allTasks } = useTasks();
  
  const eapName = useMemo(() => {
    if (!project.eapId) return null;
    const template = getEAPTemplate(project.eapId);
    return template?.name || null;
  }, [project.eapId, getEAPTemplate]);

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    () => new Set(project.phases?.map(p => p.id) || [])
  );

  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId);
      } else {
        newSet.add(milestoneId);
      }
      return newSet;
    });
  };

  if (!project.phases || project.phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-gray-400 mb-3">
          <ChevronDown className="w-12 h-12 mx-auto opacity-50" />
        </div>
        <p className="text-gray-500 text-lg font-medium">Sem estrutura de fases</p>
        <p className="text-gray-400 text-sm mt-1">
          Este projeto não possui uma estrutura de fases definida.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {eapName && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 font-medium">
            <span className="opacity-75">Origem: </span>
            {eapName}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {project.phases.map((phase) => {
          const phaseTasks = getTasksForPhase(project.id, phase.id);
          const phaseProgress = getPhaseProgress(phase.id, allTasks);
          const phaseStatus = getPhaseStatus(phase.id, allTasks);
          return (
            <PhaseCard
              key={phase.id}
              projectId={project.id}
              phase={phase}
              tasks={phaseTasks}
              phaseProgress={phaseProgress}
              phaseStatus={phaseStatus}
              isExpanded={expandedPhases.has(phase.id)}
              onToggle={() => togglePhase(phase.id)}
              expandedMilestones={expandedMilestones}
              onToggleMilestone={toggleMilestone}
              onEditTask={onEditTask}
              onEditPhase={() => setEditingPhase(phase)}
            />
          );
        })}
      </div>

      {/* Edit Phase Modal */}
      {editingPhase && (
        <EditPhaseModal
          phase={editingPhase}
          project={project}
          isOpen={!!editingPhase}
          onClose={() => setEditingPhase(null)}
        />
      )}
    </div>
  );
}
