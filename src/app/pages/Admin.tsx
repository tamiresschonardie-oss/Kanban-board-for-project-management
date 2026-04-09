import { Component, ReactNode } from 'react';
import { Users, UsersIcon, Building2, UserCircle, Package, Server, FolderKanban, Settings, Tag, GitBranch, Target, Bot, CheckSquare, CalendarDays, BrainCircuit } from 'lucide-react';
import { UsersCRUD } from '../components/admin/UsersCRUD';
import { TeamsCRUD } from '../components/admin/TeamsCRUD';
import { ClientsCRUD } from '../components/admin/ClientsCRUD';
import { StakeholdersCRUD } from '../components/admin/StakeholdersCRUD';
import { ProductsCRUD } from '../components/admin/ProductsCRUD';
import { SystemsCRUD } from '../components/admin/SystemsCRUD';
import { ProjectTypesCRUD } from '../components/admin/ProjectTypesCRUD';
import { DemandTypesCRUD } from '../components/admin/DemandTypesCRUD';
import { EAPTemplatesCRUD } from '../components/admin/EAPTemplatesCRUD';
import { ProjectPurposesCRUD } from '../components/admin/ProjectPurposesCRUD';
import { AutomationsCRUD } from '../components/admin/AutomationsCRUD';
import { TaskTemplatesCRUD } from '../components/admin/TaskTemplatesCRUD';
import { MeetingRoomsCRUD } from '../components/admin/MeetingRoomsCRUD';
import { SkillsCRUD } from '../components/admin/SkillsCRUD';
import { useAdmin } from '../context/AdminContext';
import { canUserPerform, isPmoUser } from '../utils/permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

class AdminSectionBoundary extends Component<{ title: string; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[Admin] erro ao renderizar seção "${this.props.title}"`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
          <h3 className="text-base font-semibold text-amber-900">Não foi possível carregar esta seção</h3>
          <p className="mt-1 text-sm text-amber-800">
            A aba <strong>{this.props.title}</strong> apresentou um erro de renderização. A página principal continua disponível.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

function SafeAdminSection({ title, children }: { title: string; children: ReactNode }) {
  return <AdminSectionBoundary title={title}>{children}</AdminSectionBoundary>;
}

export function Admin() {
  const { currentUser } = useAdmin();
  const canAccessAdmin = isPmoUser(currentUser);
  const canManageCatalogs = canUserPerform(currentUser, 'admin:catalogs');
  const canManageEap = canUserPerform(currentUser, 'eap:manage');
  const canManageAutomations = canUserPerform(currentUser, 'automation:manage');
  const canManageTaskTemplates = canUserPerform(currentUser, 'task-template:manage');

  if (!canAccessAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="rounded-2xl border border-red-200 bg-white px-8 py-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Acesso restrito</h1>
          <p className="mt-2 text-gray-600">
            Seu perfil atual não possui permissão para acessar a área administrativa.
          </p>
        </div>
      </div>
    );
  }

  const defaultTab = canManageCatalogs
    ? 'users'
    : canManageTaskTemplates
      ? 'task-templates'
      : canManageAutomations
        ? 'automations'
        : 'eap-templates';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administração</h1>
            <p className="text-gray-600">Gerencie configurações e dados do sistema</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue={defaultTab} className="h-full">
          <div className="bg-white border-b border-gray-200 px-8 sticky top-0 z-10">
            <TabsList className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-lg my-4">
              {canManageCatalogs && (
                <>
                  <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <Users className="w-4 h-4" />
                    Usuários
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <UsersIcon className="w-4 h-4" />
                    Equipes
                  </TabsTrigger>
                  <TabsTrigger value="clients" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <Building2 className="w-4 h-4" />
                    Clientes
                  </TabsTrigger>
                  <TabsTrigger value="stakeholders" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <UserCircle className="w-4 h-4" />
                    Stakeholders
                  </TabsTrigger>
                  <TabsTrigger value="products" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <Package className="w-4 h-4" />
                    Produtos
                  </TabsTrigger>
                  <TabsTrigger value="systems" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <Server className="w-4 h-4" />
                    Sistemas
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <BrainCircuit className="w-4 h-4" />
                    Habilidades
                  </TabsTrigger>
                  <TabsTrigger value="project-purposes" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <Target className="w-4 h-4" />
                    Finalidades
                  </TabsTrigger>
                  <TabsTrigger value="project-types" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <FolderKanban className="w-4 h-4" />
                    Tipos de Projeto
                  </TabsTrigger>
                  <TabsTrigger value="demand-types" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <Tag className="w-4 h-4" />
                    Tipos de Demanda
                  </TabsTrigger>
                  <TabsTrigger value="meeting-rooms" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                    <CalendarDays className="w-4 h-4" />
                    Salas
                  </TabsTrigger>
                </>
              )}
              {canManageEap && (
                <TabsTrigger value="eap-templates" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                  <GitBranch className="w-4 h-4" />
                  Templates de Fases (EAP)
                </TabsTrigger>
              )}
              {canManageAutomations && (
                <TabsTrigger value="automations" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                  <Bot className="w-4 h-4" />
                  Automações
                </TabsTrigger>
              )}
              {canManageTaskTemplates && (
                <TabsTrigger value="task-templates" className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                  <CheckSquare className="w-4 h-4" />
                  Templates de Tarefas
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="p-8">
            {canManageCatalogs && (
              <>
                <TabsContent value="users">
                  <SafeAdminSection title="Usuários">
                  <UsersCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="teams">
                  <SafeAdminSection title="Equipes">
                  <TeamsCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="clients">
                  <SafeAdminSection title="Clientes">
                  <ClientsCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="stakeholders">
                  <SafeAdminSection title="Stakeholders">
                  <StakeholdersCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="products">
                  <SafeAdminSection title="Produtos">
                  <ProductsCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="systems">
                  <SafeAdminSection title="Sistemas">
                  <SystemsCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="skills">
                  <SafeAdminSection title="Habilidades">
                  <SkillsCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="project-purposes">
                  <SafeAdminSection title="Finalidades">
                  <ProjectPurposesCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="project-types">
                  <SafeAdminSection title="Tipos de Projeto">
                  <ProjectTypesCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="demand-types">
                  <SafeAdminSection title="Tipos de Demanda">
                  <DemandTypesCRUD />
                  </SafeAdminSection>
                </TabsContent>
                <TabsContent value="meeting-rooms">
                  <SafeAdminSection title="Salas">
                  <MeetingRoomsCRUD />
                  </SafeAdminSection>
                </TabsContent>
              </>
            )}

            {canManageEap && (
              <TabsContent value="eap-templates">
                <SafeAdminSection title="Templates de Fases (EAP)">
                <EAPTemplatesCRUD />
                </SafeAdminSection>
              </TabsContent>
            )}

            {canManageAutomations && (
              <TabsContent value="automations">
                <SafeAdminSection title="Automações">
                <AutomationsCRUD />
                </SafeAdminSection>
              </TabsContent>
            )}

            {canManageTaskTemplates && (
              <TabsContent value="task-templates">
                <SafeAdminSection title="Templates de Tarefas">
                <TaskTemplatesCRUD />
                </SafeAdminSection>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
