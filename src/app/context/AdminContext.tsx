import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  User,
  Team,
  Client,
  Stakeholder,
  Product,
  System,
  ProjectType,
  Notification,
  DemandType,
  DemandTypeEntity,
} from '../types';

interface AdminContextType {
  users: User[];
  teams: Team[];
  clients: Client[];
  stakeholders: Stakeholder[];
  products: Product[];
  systems: System[];
  projectTypes: ProjectType[];
  demandTypes: DemandTypeEntity[];
  notifications: Notification[];
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addTeam: (team: Team) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addStakeholder: (stakeholder: Stakeholder) => void;
  updateStakeholder: (id: string, updates: Partial<Stakeholder>) => void;
  deleteStakeholder: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addSystem: (system: System) => void;
  updateSystem: (id: string, updates: Partial<System>) => void;
  deleteSystem: (id: string) => void;
  addProjectType: (projectType: ProjectType) => void;
  updateProjectType: (id: string, updates: Partial<ProjectType>) => void;
  deleteProjectType: (id: string) => void;
  addDemandType: (demandType: DemandTypeEntity) => void;
  updateDemandType: (id: string, updates: Partial<DemandTypeEntity>) => void;
  deleteDemandType: (id: string) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const initialUsers: User[] = [
  {
    id: '1',
    name: 'Guilherme Drehmer',
    email: 'guilherme@pmo.com',
    team: 'Fábrica',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'joao@pmo.com',
    team: 'AIO',
    role: 'pmo',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'maria@pmo.com',
    team: 'Fábrica',
    role: 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

const initialTeams: Team[] = [
  {
    id: '1',
    name: 'Fábrica',
    description: 'Equipe de desenvolvimento de software',
    members: ['1', '3'],
    color: '#3B82F6',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'AIO',
    description: 'Equipe de análise e inovação',
    members: ['2'],
    color: '#8B5CF6',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Infra',
    description: 'Equipe de infraestrutura',
    members: [],
    color: '#10B981',
    createdAt: new Date().toISOString(),
  },
];

const initialClients: Client[] = [
  {
    id: '1',
    name: 'Grupo Crisdu',
    contactName: 'Carlos Eduardo',
    contactEmail: 'carlos@crisdu.com',
    contactPhone: '+55 11 98765-4321',
    linkedProjects: ['95662', '95663'],
    createdAt: new Date().toISOString(),
  },
];

const initialStakeholders: Stakeholder[] = [
  {
    id: '1',
    name: 'Ana Paula',
    role: 'Product Owner',
    email: 'ana@stakeholder.com',
    phone: '+55 11 99999-8888',
    linkedProjects: ['95662'],
    createdAt: new Date().toISOString(),
  },
];

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Vendas Plus',
    type: 'Sistema Web',
    description: 'Plataforma de vendas online',
    linkedProjects: ['95662'],
    createdAt: new Date().toISOString(),
  },
];

const initialSystems: System[] = [
  {
    id: '1',
    name: 'ERP Principal',
    integrations: ['SAP', 'Salesforce'],
    description: 'Sistema integrado de gestão empresarial',
    createdAt: new Date().toISOString(),
  },
];

const initialProjectTypes: ProjectType[] = [
  {
    id: '1',
    name: 'Sistema Web',
    description: 'Projeto de desenvolvimento de sistema web',
    defaultWBSTemplate: [
      { id: 'phase-1', name: 'Análise', milestones: [], order: 0 },
      { id: 'phase-2', name: 'Documentação', milestones: [], order: 1 },
      { id: 'phase-3', name: 'Desenvolvimento', milestones: [], order: 2 },
      { id: 'phase-4', name: 'Testes', milestones: [], order: 3 },
      { id: 'phase-5', name: 'Homologação', milestones: [], order: 4 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'App Mobile',
    description: 'Projeto de desenvolvimento de aplicativo móvel',
    defaultWBSTemplate: [
      { id: 'phase-1', name: 'Análise', milestones: [], order: 0 },
      { id: 'phase-2', name: 'Design UI/UX', milestones: [], order: 1 },
      { id: 'phase-3', name: 'Desenvolvimento', milestones: [], order: 2 },
      { id: 'phase-4', name: 'Testes', milestones: [], order: 3 },
      { id: 'phase-5', name: 'Publicação', milestones: [], order: 4 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Integração',
    description: 'Projeto de integração entre sistemas',
    defaultWBSTemplate: [
      { id: 'phase-1', name: 'Levantamento', milestones: [], order: 0 },
      { id: 'phase-2', name: 'Mapeamento', milestones: [], order: 1 },
      { id: 'phase-3', name: 'Desenvolvimento', milestones: [], order: 2 },
      { id: 'phase-4', name: 'Homologação', milestones: [], order: 3 },
    ],
    createdAt: new Date().toISOString(),
  },
];

const initialDemandTypes: DemandTypeEntity[] = [
  {
    id: '1',
    name: 'Manutenção Corretiva',
    value: 'suporte',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Novo Projeto',
    value: 'projeto',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Melhoria Contínua',
    value: 'melhoria',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Evolução de Sistema',
    value: 'evolucao',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'POC e Experimentação',
    value: 'experimentacao',
    createdAt: new Date().toISOString(),
  },
];

const initialNotifications: Notification[] = [
  {
    id: '1',
    userId: '1',
    type: 'task_assigned',
    title: 'Nova tarefa atribuída',
    message: 'Você foi atribuído à tarefa "Implementar autenticação"',
    read: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    userId: '1',
    type: 'deadline_approaching',
    title: 'Prazo se aproximando',
    message: 'A tarefa "Documentação API" vence amanhã',
    read: false,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    userId: '1',
    type: 'comment_added',
    title: 'Novo comentário',
    message: 'João Silva comentou na tarefa "Revisão de código"',
    read: true,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function AdminProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(initialStakeholders);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [systems, setSystems] = useState<System[]>(initialSystems);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>(initialProjectTypes);
  const [demandTypes, setDemandTypes] = useState<DemandTypeEntity[]>(initialDemandTypes);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  // Users
  const addUser = (user: User) => setUsers([...users, user]);
  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  };
  const deleteUser = (id: string) => setUsers(users.filter((u) => u.id !== id));

  // Teams
  const addTeam = (team: Team) => setTeams([...teams, team]);
  const updateTeam = (id: string, updates: Partial<Team>) => {
    setTeams(teams.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };
  const deleteTeam = (id: string) => setTeams(teams.filter((t) => t.id !== id));

  // Clients
  const addClient = (client: Client) => setClients([...clients, client]);
  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(clients.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };
  const deleteClient = (id: string) => setClients(clients.filter((c) => c.id !== id));

  // Stakeholders
  const addStakeholder = (stakeholder: Stakeholder) =>
    setStakeholders([...stakeholders, stakeholder]);
  const updateStakeholder = (id: string, updates: Partial<Stakeholder>) => {
    setStakeholders(stakeholders.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };
  const deleteStakeholder = (id: string) =>
    setStakeholders(stakeholders.filter((s) => s.id !== id));

  // Products
  const addProduct = (product: Product) => setProducts([...products, product]);
  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };
  const deleteProduct = (id: string) => setProducts(products.filter((p) => p.id !== id));

  // Systems
  const addSystem = (system: System) => setSystems([...systems, system]);
  const updateSystem = (id: string, updates: Partial<System>) => {
    setSystems(systems.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };
  const deleteSystem = (id: string) => setSystems(systems.filter((s) => s.id !== id));

  // Project Types
  const addProjectType = (projectType: ProjectType) =>
    setProjectTypes([...projectTypes, projectType]);
  const updateProjectType = (id: string, updates: Partial<ProjectType>) => {
    setProjectTypes(projectTypes.map((pt) => (pt.id === id ? { ...pt, ...updates } : pt)));
  };
  const deleteProjectType = (id: string) =>
    setProjectTypes(projectTypes.filter((pt) => pt.id !== id));

  // Demand Types
  const addDemandType = (demandType: DemandTypeEntity) =>
    setDemandTypes([...demandTypes, demandType]);
  const updateDemandType = (id: string, updates: Partial<DemandTypeEntity>) => {
    setDemandTypes(demandTypes.map((dt) => (dt.id === id ? { ...dt, ...updates } : dt)));
  };
  const deleteDemandType = (id: string) =>
    setDemandTypes(demandTypes.filter((dt) => dt.id !== id));

  // Notifications
  const addNotification = (notification: Notification) =>
    setNotifications([notification, ...notifications]);
  const markNotificationAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <AdminContext.Provider
      value={{
        users,
        teams,
        clients,
        stakeholders,
        products,
        systems,
        projectTypes,
        demandTypes,
        notifications,
        addUser,
        updateUser,
        deleteUser,
        addTeam,
        updateTeam,
        deleteTeam,
        addClient,
        updateClient,
        deleteClient,
        addStakeholder,
        updateStakeholder,
        deleteStakeholder,
        addProduct,
        updateProduct,
        deleteProduct,
        addSystem,
        updateSystem,
        deleteSystem,
        addProjectType,
        updateProjectType,
        deleteProjectType,
        addDemandType,
        updateDemandType,
        deleteDemandType,
        addNotification,
        markNotificationAsRead,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}