export type ProjectStatus = 'backlog' | 'pre-analysis' | 'documentation' | 'waiting-approval' | 'construction';

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

export interface Project {
  id: string;
  name: string;
  group: string;
  responsible: string;
  status: ProjectStatus;
  progress: number;
  tasksTotal: number;
  tasksCompleted: number;
  hoursRemaining: number;
  deadline?: string;
  logoColor: string;
  logoText?: string; // Texto customizado do logo
  client: string;
  description?: string;
  phases?: Phase[];
  startDate?: string;
  budget?: number;
  demandType?: DemandType;
  requester?: string;
  year?: number;
  product?: string;
  coverImage?: string;
  stakeholders?: string[];
  isPaused?: boolean; // Indica se o projeto está pausado
  tags?: string[]; // Tags do projeto
  quadro?: string; // Quadro/board ao qual o projeto pertence
}

export interface FilterState {
  quadro: string;
  group: string;
  client: string;
  responsible: string;
  project: string;
}