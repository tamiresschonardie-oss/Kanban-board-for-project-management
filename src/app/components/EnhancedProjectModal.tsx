import { useProjects } from '../context/ProjectContext';
import { ProjectModal } from './ProjectModal';

interface EnhancedProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnhancedProjectModal({ isOpen, onClose }: EnhancedProjectModalProps) {
  const { addProject } = useProjects();

  return (
    <ProjectModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={addProject}
    />
  );
}
