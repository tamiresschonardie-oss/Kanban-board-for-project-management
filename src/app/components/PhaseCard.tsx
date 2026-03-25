import { ChevronDown, ChevronRight } from 'lucide-react';
import { Phase } from '../types';
import { MilestoneCard } from './MilestoneCard';

interface PhaseCardProps {
  phase: Phase;
  isExpanded: boolean;
  onToggle: () => void;
  expandedMilestones: Set<string>;
  onToggleMilestone: (milestoneId: string) => void;
}

export function PhaseCard({
  phase,
  isExpanded,
  onToggle,
  expandedMilestones,
  onToggleMilestone,
}: PhaseCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="mt-0.5 text-gray-400 flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{phase.name}</h3>
          {phase.description && (
            <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {phase.milestones.length} marco{phase.milestones.length !== 1 ? 's' : ''}
          </p>
        </div>
      </button>

      {isExpanded && phase.milestones.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-2">
          {phase.milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              isExpanded={expandedMilestones.has(milestone.id)}
              onToggle={() => onToggleMilestone(milestone.id)}
              showTasks={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
