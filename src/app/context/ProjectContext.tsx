import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, FilterState, ProjectSituation } from '../types';
import { PROJECT_SITUATIONS } from '../constants/project';

interface ProjectContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addProject: (project: Project) => void;
  deleteProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

/**
 * Migra dados antigos de projetos para o novo formato
 * Converte campos deprecated (isPaused, requester) para novos campos (situation, requestedBy)
 */
const migrateProjectData = (project: Project): Project => {
  // Determinar situation baseado em isPaused (compatibilidade)
  const situation: ProjectSituation = project.isPaused
    ? PROJECT_SITUATIONS.PAUSADO
    : PROJECT_SITUATIONS.ATIVO;

  return {
    ...project,
    // Novos campos com defaults seguros
    situation: project.situation || situation,
    requestedBy: project.requestedBy || project.requester,
    teams: project.teams || [],
    objective: project.objective,
    justification: project.justification,
    expectedBenefits: project.expectedBenefits || [],
    originTicket: project.originTicket,
    requestDate: project.requestDate,
    completionDate: project.completionDate,
    documentation: project.documentation,
    attachments: project.attachments || [],
    eapId: project.eapId,
    totalTimeTracked: project.totalTimeTracked || 0,
    purpose: project.purpose,
    
    // Manter deprecated fields para compatibilidade transitória
    requester: project.requester,
    isPaused: project.isPaused,
  };
};

const rawProjects = [
  {
    id: '95662',
    name: 'Vendas Plus',
    responsible: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'Fábrica',
    status: 'documentation',
    logoColor: '#2563EB',
    logoText: 'Vendas Plus',
    progress: 86,
    tasksCompleted: 3,
    tasksTotal: 5,
    hoursRemaining: 78,
    tags: ['Tarefas'],
    quadro: 'Crisdu labs H1/H2',
  },
  {
    id: '95663',
    name: 'Portal Seguros',
    responsible: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'Fábrica',
    status: 'documentation',
    logoColor: '#1E293B',
    logoText: 'crisdu seguros',
    progress: 86,
    tasksCompleted: 3,
    tasksTotal: 5,
    hoursRemaining: 78,
    tags: ['Tarefas'],
    deadline: '30/02/2024',
    quadro: 'Crisdu labs H1/H2',
    isPaused: true, // Projeto pausado
  },
  {
    id: '95664',
    name: 'Sistema de RH',
    responsible: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'AIO',
    status: 'documentation',
    logoColor: '#991B1B',
    logoText: 'TOP RH',
    progress: 86,
    tasksCompleted: 3,
    tasksTotal: 5,
    hoursRemaining: 78,
    tags: ['Tarefas'],
    quadro: 'Crisdu labs H1/H2',
  },
  {
    id: '95665',
    name: 'Portal Clientes',
    responsible: 'Maria Silva',
    client: 'Tech Corp',
    group: 'Infra',
    status: 'backlog',
    logoColor: '#059669',
    logoText: 'Portal',
    progress: 25,
    tasksCompleted: 1,
    tasksTotal: 6,
    hoursRemaining: 120,
    tags: ['Tarefas'],
    quadro: 'Tech Q1/2026',
  },
  {
    id: '95666',
    name: 'Dashboard Analytics',
    responsible: 'João Santos',
    client: 'Data Insights',
    group: 'Fábrica',
    status: 'pre-analysis',
    logoColor: '#7C3AED',
    logoText: 'Analytics',
    progress: 45,
    tasksCompleted: 2,
    tasksTotal: 4,
    hoursRemaining: 96,
    tags: ['Tarefas'],
    quadro: 'Data Q1/2026',
  },
  {
    id: '95667',
    name: 'App Mobile',
    responsible: 'Ana Costa',
    client: 'Mobile First',
    group: 'Fábrica',
    status: 'waiting-approval',
    logoColor: '#DC2626',
    logoText: 'Mobile',
    progress: 92,
    tasksCompleted: 5,
    tasksTotal: 5,
    hoursRemaining: 24,
    tags: ['Tarefas'],
    deadline: '15/04/2026',
    quadro: 'Mobile Q1/2026',
  },
  {
    id: '95668',
    name: 'Sistema ERP',
    responsible: 'Carlos Lima',
    client: 'Enterprise Co',
    group: 'AIO',
    status: 'construction',
    logoColor: '#0891B2',
    logoText: 'ERP',
    progress: 67,
    tasksCompleted: 4,
    tasksTotal: 7,
    hoursRemaining: 156,
    tags: ['Tarefas'],
    quadro: 'Enterprise H1/H2',
  },
];

const STORAGE_KEY = 'crisdu_projects';

/**
 * Carrega projetos do localStorage ou usa seed (rawProjects)
 * SEMPRE aplica migração para garantir compatibilidade
 */
const getInitialProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('[ProjectContext] Carregado do localStorage:', parsed.length, 'projetos');
      return parsed.map(migrateProjectData);
    }
  } catch (error) {
    console.warn('[ProjectContext] Erro ao ler localStorage - aplicando fallback:', error);
  }
  
  // Fallback: usar seed e aplicar migração
  console.log('[ProjectContext] Usando dados seed padrão');
  return rawProjects.map(migrateProjectData);
};

const initialFilters: FilterState = {
  quadro: 'Todos',
  group: 'Todos',
  client: 'Todos',
  responsible: 'Todos',
  project: 'Todos',
};

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => getInitialProjects());
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Sincroniza projects com localStorage sempre que state muda
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    console.log('[ProjectContext] Salvando', projects.length, 'projetos no localStorage');
  }, [projects]);

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === id ? { ...project, ...updates } : project
      )
    );
  };

  const addProject = (project: Project) => {
    if (project.id === 'test-project-gantt') {
      console.log('%c ========== TESTE PROJECT ADICIONADO ========== ', 'background: #22c55e; color: white; font-size: 14px; font-weight: bold; padding: 10px;');
      console.log('%c Projeto:', 'color: #22c55e; font-weight: bold;', project.name);
      console.log('%c Total de Fases:', 'color: #22c55e; font-weight: bold;', project.phases?.length || 0);
      console.log('%c Fases com Datas:', 'color: #22c55e; font-weight: bold;', project.phases?.filter(p => p.startDate && p.endDate).length || 0);
      console.table(project.phases?.map(p => ({ id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate })));
    }
    setProjects(prev => [...prev, project]);
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(project => project.id !== id));
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      setProjects, 
      filters, 
      setFilters,
      updateProject,
      addProject,
      deleteProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within ProjectProvider');
  }
  return context;
}