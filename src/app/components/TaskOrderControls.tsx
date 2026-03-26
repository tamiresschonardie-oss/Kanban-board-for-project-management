import { ArrowUp, ArrowDown } from 'lucide-react';
import { WBSTask } from '../types';

interface TaskOrderControlsProps {
  task: WBSTask;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disabled?: boolean;
}

export function TaskOrderControls({
  task,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  disabled = false,
}: TaskOrderControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onMoveUp}
        disabled={isFirst || disabled}
        className="p-1 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
        title={isFirst ? 'Primeiro item' : 'Mover para cima'}
        aria-label="Mover para cima"
      >
        <ArrowUp className="w-4 h-4 text-blue-600" />
      </button>
      <button
        onClick={onMoveDown}
        disabled={isLast || disabled}
        className="p-1 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
        title={isLast ? 'Último item' : 'Mover para baixo'}
        aria-label="Mover para baixo"
      >
        <ArrowDown className="w-4 h-4 text-blue-600" />
      </button>
    </div>
  );
}
