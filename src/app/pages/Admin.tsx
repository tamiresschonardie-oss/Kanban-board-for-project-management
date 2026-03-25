import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { Users, UsersIcon, Building2, UserCircle, Package, Server, FolderKanban, Settings, Tag } from 'lucide-react';
import { UsersCRUD } from '../components/admin/UsersCRUD';
import { TeamsCRUD } from '../components/admin/TeamsCRUD';
import { ClientsCRUD } from '../components/admin/ClientsCRUD';
import { StakeholdersCRUD } from '../components/admin/StakeholdersCRUD';
import { ProductsCRUD } from '../components/admin/ProductsCRUD';
import { SystemsCRUD } from '../components/admin/SystemsCRUD';
import { ProjectTypesCRUD } from '../components/admin/ProjectTypesCRUD';
import { DemandTypesCRUD } from '../components/admin/DemandTypesCRUD';

export function Admin() {
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
        <Tabs defaultValue="users" className="h-full">
          <div className="bg-white border-b border-gray-200 px-8 sticky top-0 z-10">
            <TabsList className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-lg my-4">
              <TabsTrigger
                value="users"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <Users className="w-4 h-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger
                value="teams"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <UsersIcon className="w-4 h-4" />
                Equipes
              </TabsTrigger>
              <TabsTrigger
                value="clients"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <Building2 className="w-4 h-4" />
                Clientes
              </TabsTrigger>
              <TabsTrigger
                value="stakeholders"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <UserCircle className="w-4 h-4" />
                Stakeholders
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <Package className="w-4 h-4" />
                Produtos
              </TabsTrigger>
              <TabsTrigger
                value="systems"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <Server className="w-4 h-4" />
                Sistemas
              </TabsTrigger>
              <TabsTrigger
                value="project-types"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <FolderKanban className="w-4 h-4" />
                Tipos de Projeto
              </TabsTrigger>
              <TabsTrigger
                value="demand-types"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
              >
                <Tag className="w-4 h-4" />
                Tipos de Demanda
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8">
            <TabsContent value="users">
              <UsersCRUD />
            </TabsContent>

            <TabsContent value="teams">
              <TeamsCRUD />
            </TabsContent>

            <TabsContent value="clients">
              <ClientsCRUD />
            </TabsContent>

            <TabsContent value="stakeholders">
              <StakeholdersCRUD />
            </TabsContent>

            <TabsContent value="products">
              <ProductsCRUD />
            </TabsContent>

            <TabsContent value="systems">
              <SystemsCRUD />
            </TabsContent>

            <TabsContent value="project-types">
              <ProjectTypesCRUD />
            </TabsContent>

            <TabsContent value="demand-types">
              <DemandTypesCRUD />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}