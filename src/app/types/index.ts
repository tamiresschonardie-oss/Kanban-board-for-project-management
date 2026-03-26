export type ProjectStatus = 'backlog' | 'pre-analysis' | 'documentation' | 'waiting-approval' | 'construction';
export type ProjectExecutionStatus = 'não-iniciado' | 'em-andamento' | 'concluído' | 'em-risco';
export type ProjectSituation = 'ativo' | 'pausado' | 'cancelado';
export type ProjectPurpose = 'expansao' | 'suporte' | 'inovacao' | 'seguranca' | 'operacional' | 'estrategico';

export type MilestoneType = 'business' | 'technical' | 'regulatory' | 'delivery';
export type MilestoneStatus = 'not-started' | 'in-progress' | 'completed' | 'delayed';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type UserRole = 'admin' | 'pmo' | 'user';
export type UserStatus = 'active' | 'inactive';
export type DemandType = 'projeto' | 'melhoria' | 'suporte' | 'evolucao' | 'experimentacao';

// Demand Type Entity for Admin
export interface DemandTypeEntity {
  id: string;
  name: string;
  value: DemandType;
  createdAt: string;
}

// Admin entities
export interface User {
  id: string;
  name: string;
  email: string;
  team: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: string[]; // User IDs
  color: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  linkedProjects: string[]; // Project IDs
  createdAt: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  linkedProjects: string[]; // Project IDs
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  description?: string;
  linkedProjects: string[]; // Project IDs
  createdAt: string;
}

export interface System {
  id: string;
  name: string;
  integrations?: string[];
  description?: string;
  createdAt: string;
}

export interface ProjectType {
  id: string;
  name: string;
  description?: string;
  defaultWBSTemplate?: Phase[];
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'deadline_approaching';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  linkTo?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
  subtasks?: Subtask[]; // Suporta hierarquia de subtarefas
  priority?: 'low' | 'medium' | 'high';
}

export interface WBSTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  priority?: 'low' | 'medium' | 'high';
  subtasks: Subtask[];
  order: number;
  comments?: Comment[];
  projectId?: string;
  phaseId?: string;
  milestoneId?: string;
}

export interface Milestone {
  id: string;
  name: string;
  type: MilestoneType;
  status: MilestoneStatus;
  startDate: string;
  endDate: string;
  sla: number; // days
  description?: string;
  tasks: WBSTask[];
  order: number;
}

export interface Phase {
  id: string;
  name: string;
  description?: string; // Descrição da fase
  order: number;
  milestones: Milestone[];
}

export interface EAP {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  phases: Phase[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface ProjectAttachment {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  type: string;
}

export interface Project {
  // Identificação básica
  id: string;
  name: string;
  group: string;
  logoColor: string;
  logoText?: string;
  
  // Status e situação
  status: ProjectStatus;
  situation?: ProjectSituation;
  
  // Responsabilidade
  responsible: string;
  requestedBy?: string;
  client: string;
  teams?: string[];
  stakeholders?: string[];
  
  // Contexto do negócio
  purpose?: ProjectPurpose;
  objective?: string;
  justification?: string;
  expectedBenefits?: string[];
  
  // Informações complementares
  originTicket?: string;
  product?: string;
  demandType?: DemandType;
  description?: string;
  year?: number;
  budget?: number;
  
  // Datas e prazos
  startDate?: string;
  deadline?: string;
  requestDate?: string;
  completionDate?: string;
  
  // Documentação e anexos
  documentation?: string;
  attachments?: ProjectAttachment[];
  
  // Estrutura e execução
  eapId?: string;
  phases?: Phase[];
  
  // Progresso
  progress: number;
  tasksTotal: number;
  tasksCompleted: number;
  hoursRemaining: number;
  totalTimeTracked?: number;
  
  // Metadados
  coverImage?: string;
  tags?: string[];
  quadro?: string;
  
  // Deprecado - manter apenas para compatibilidade
  requester?: string;
  isPaused?: boolean;
}

export interface FilterState {
  quadro: string;
  group: string;
  client: string;
  responsible: string;
  project: string;
}