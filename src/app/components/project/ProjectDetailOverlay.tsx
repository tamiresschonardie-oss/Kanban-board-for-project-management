import { useMemo } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { ProjectDetailView } from './ProjectDetailView';

interface ProjectDetailOverlayProps {
  projectId: string;
  onClose: () => void;
}

export function ProjectDetailOverlay({
  projectId,
  onClose,
}: ProjectDetailOverlayProps) {
  const { projects } = useProjects();
  const project = useMemo(
    () => projects.find((item) => item.id === projectId),
    [projects, projectId]
  );

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full items-center justify-center p-4">
        <div className="h-[92vh] w-full max-w-[1480px] pointer-events-auto">
          <ProjectDetailView project={project} mode="overlay" onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
