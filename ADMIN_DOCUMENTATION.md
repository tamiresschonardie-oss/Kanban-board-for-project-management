# 🔧 Painel de Administração - Documentação Completa

## 📋 Visão Geral

O Painel de Administração fornece controle total sobre configurações e dados do sistema PMO, permitindo gerenciar todas as entidades através de interfaces CRUD completas.

---

## 🗂️ Entidades Gerenciadas

### 1. 👥 **Usuários (Users)**

#### Campos:
- **Nome** (obrigatório)
- **Email** (obrigatório)
- **Equipe** (seleção)
- **Perfil** (Admin, PMO, User)
- **Status** (Ativo, Inativo)

#### Funcionalidades:
- ✅ Busca por nome ou email
- ✅ Criação de novos usuários
- ✅ Edição de usuários existentes
- ✅ Exclusão com confirmação
- ✅ Badges coloridos por perfil e status
- ✅ Avatar gerado automaticamente com iniciais

#### Perfis de Acesso:
- **Admin**: Acesso total ao sistema
- **PMO**: Gerenciamento de projetos e relatórios
- **User**: Acesso básico às tarefas

---

### 2. 👥 **Equipes (Teams)**

#### Campos:
- **Nome** (obrigatório)
- **Descrição** (opcional)
- **Cor** (seletor de cor)
- **Membros** (multi-seleção de usuários)

#### Funcionalidades:
- ✅ Cards visuais com cor customizada
- ✅ Contador de membros
- ✅ Seleção múltipla de membros via checkbox
- ✅ Ícone de equipe colorido
- ✅ Exclusão com confirmação

#### Layout:
- Grid responsivo (1-2-3 colunas)
- Hover effects
- Informações agrupadas

---

### 3. 🏢 **Clientes (Clients)**

#### Campos:
- **Nome** (obrigatório)
- **Nome do Contato** (opcional)
- **Email do Contato** (opcional)
- **Telefone do Contato** (opcional)
- **Projetos Vinculados** (calculado automaticamente)

#### Funcionalidades:
- ✅ Busca por nome
- ✅ Tabela limpa e organizada
- ✅ Ícone de empresa
- ✅ Contador de projetos vinculados
- ✅ CRUD completo

#### Uso:
- Vinculação automática ao criar projeto
- Filtros na visão "Por Cliente"

---

### 4. 👤 **Stakeholders**

#### Campos:
- **Nome** (obrigatório)
- **Função/Papel** (obrigatório)
- **Email** (opcional)
- **Telefone** (opcional)
- **Projetos Vinculados** (multi-seleção)

#### Funcionalidades:
- ✅ Gestão de partes interessadas
- ✅ Vinculação múltipla a projetos
- ✅ Informações de contato
- 🚧 Em desenvolvimento

---

### 5. 📦 **Produtos**

#### Campos:
- **Nome** (obrigatório)
- **Tipo** (Sistema Web, App Mobile, etc.)
- **Descrição** (opcional)
- **Projetos Vinculados** (calculado)

#### Funcionalidades:
- ✅ Catálogo de produtos
- ✅ Tipos customizáveis
- ✅ Vinculação a projetos
- 🚧 Em desenvolvimento

---

### 6. 🖥️ **Sistemas**

#### Campos:
- **Nome** (obrigatório)
- **Integrações** (lista)
- **Descrição** (opcional)

#### Funcionalidades:
- ✅ Registro de sistemas corporativos
- ✅ Documentação de integrações
- ✅ Uso em projetos
- 🚧 Em desenvolvimento

---

### 7. 📁 **Tipos de Projeto**

#### Campos:
- **Nome** (obrigatório)
- **Descrição** (opcional)
- **Template WBS Padrão** (estrutura de fases)

#### Funcionalidades:
- ✅ Templates reutilizáveis
- ✅ WBS pré-configurado
- ✅ Aceleração na criação de projetos
- 🚧 Em desenvolvimento

---

## 🎨 Interface do Painel

### Estrutura:
```
┌─────────────────────────────────────────┐
│ Header: Administração                   │
├─────────────────────────────────────────┤
│ Tabs: Usuários | Equipes | Clientes... │
├─────────────────────────────────────────┤
│                                         │
│         Conteúdo da Tab Ativa          │
│                                         │
│   [Busca]              [Novo +]        │
│                                         │
│   Tabela ou Cards com dados            │
│                                         │
└─────────────────────────────────────────┘
```

### Navegação:
- **7 Tabs** horizontais no topo
- **Ícones** específicos por seção
- **Indicador visual** de tab ativa
- **Scroll** interno no conteúdo

---

## 🚀 Modal de Criação de Projeto (Aprimorado)

### Seções do Formulário:

#### 📌 Informações Básicas:
- **Nome do Projeto** (obrigatório)
- **Equipe** (seleção) → filtra responsáveis
- **Responsável** (depende da equipe)
- **Cliente** (seleção)
- **Tipo de Projeto** (seleção)

#### 📌 Informações Adicionais:
- **Produto** (opcional)
- **Sistema** (opcional)
- **Data de Início** (date picker)
- **Data de Término** (date picker)
- **Orçamento** (numérico)
- **Descrição** (textarea)

### Funcionalidades:
- ✅ **Dependências**: Responsável aparece apenas após selecionar equipe
- ✅ **Template WBS**: Aplicado automaticamente se tipo selecionado
- ✅ **Validação**: Campos obrigatórios marcados com *
- ✅ **Feedback visual**: Banner azul indica template WBS
- ✅ **Layout responsivo**: 2 colunas em desktop, 1 em mobile
- ✅ **Ícones contextuais**: Cada campo tem ícone apropriado

### Fluxo de Criação:
1. Usuário clica em "Criar Projeto" (sidebar)
2. Modal abre com formulário limpo
3. Preenche informações obrigatórias
4. Seleciona opcionais conforme necessário
5. Sistema aplica template WBS se disponível
6. Projeto criado com estrutura completa
7. Atividade inicial registrada no histórico

---

## 📋 Tela "Minhas Tarefas"

### Visão Geral:
Centraliza todas as tarefas atribuídas ao usuário logado.

### Layout:

#### KPIs no Topo:
```
┌─────────┬─────────┬─────────┬─────────┐
│  Total  │ A Fazer │ Fazendo │Concluído│
│   24    │    8    │    10   │    6    │
└─────────┴─────────┴─────────┴─────────┘
```

#### Filtros:
- **Status**: Todos / A Fazer / Fazendo / Concluído
- **Prioridade**: Todas / Alta / Média / Baixa

#### Lista de Tarefas:
Cada card exibe:
- **Título** e **Descrição**
- **Badge de prioridade** (colorido)
- **Badge de status**
- **Contexto**: Projeto → Fase → Marco
- **Data de entrega** (se definida)
- **Horas estimadas**
- **Progresso de subtarefas** (X/Y)
- **Botão "Ver Detalhes"**

### Funcionalidades:
- ✅ Agregação de todas as tarefas do usuário
- ✅ Filtros rápidos por status e prioridade
- ✅ Cards clicáveis para detalhes
- ✅ Informações contextuais completas
- ✅ Stats em tempo real

---

## 🔄 Fluxos de Interação

### 1. Criação de Projeto Completo:
```
Admin → Cadastra Cliente
     → Cadastra Equipe
     → Adiciona Usuários na Equipe
     → Cria Tipo de Projeto (com template WBS)

Usuário → Clica "Criar Projeto"
        → Seleciona Cliente (cadastrado)
        → Seleciona Equipe (cadastrada)
        → Seleciona Responsável (da equipe)
        → Seleciona Tipo (com template)
        → Preenche dados adicionais
        → Submete formulário
        → Projeto criado com WBS pronto!
```

### 2. Gestão de Equipes:
```
Admin → Acessa "Administração"
      → Tab "Equipes"
      → Clica "Nova Equipe"
      → Define nome, cor, descrição
      → Seleciona membros (checkbox)
      → Salva
      → Equipe disponível para projetos
```

### 3. Atribuição de Tarefas:
```
PMO → Acessa Projeto
    → Navega para tab "WBS"
    → Expande Fase → Marco → Tarefa
    → Clica em "Editar Tarefa"
    → Seleciona responsável (usuário da equipe)
    → Define prioridade e prazo
    → Salva
    → Tarefa aparece em "Minhas Tarefas" do usuário
```

---

## 🎯 Recursos Adicionais (Roadmap)

### 🔔 Notificações:
- [ ] Sistema de notificações em tempo real
- [ ] Badge de contador não lidas
- [ ] Tipos: Atribuição, Atualização, Comentário, Prazo
- [ ] Centro de notificações
- [ ] Marcar como lida

### 💬 Comentários:
- [ ] Comentários em tarefas
- [ ] Menção de usuários (@usuario)
- [ ] Thread de discussão
- [ ] Histórico completo
- [ ] Anexos de arquivos

### 🔄 Encaminhamento de Tarefas:
- [ ] Botão "Encaminhar para..."
- [ ] Seleção de novo responsável
- [ ] Mensagem de encaminhamento
- [ ] Histórico de transferências
- [ ] Notificação automática

### 📊 Dashboards Pessoais:
- [ ] Resumo de tarefas por status
- [ ] Gráfico de produtividade
- [ ] Tarefas atrasadas destacadas
- [ ] Próximos prazos
- [ ] Horas trabalhadas vs estimadas

---

## 🗄️ Estrutura de Dados

### AdminContext (`/src/app/context/AdminContext.tsx`):
- **State Management** para todas as entidades
- **CRUD methods** para cada tipo
- **Initial data** com exemplos
- **Provider** wrapping o app

### Tipos TypeScript (`/src/app/types/index.ts`):
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  team: string;
  role: 'admin' | 'pmo' | 'user';
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  members: string[]; // User IDs
  color: string;
  createdAt: string;
}

// ... outros tipos
```

---

## 🎨 Design System

### Cores de Perfil (Users):
- **Admin**: `purple-100` / `purple-700`
- **PMO**: `blue-100` / `blue-700`
- **User**: `gray-100` / `gray-700`

### Status:
- **Ativo**: `green-100` / `green-700`
- **Inativo**: `red-100` / `red-700`

### Prioridades (Tasks):
- **Alta**: `red-600` / `red-50` / border vermelho
- **Média**: `yellow-600` / `yellow-50` / border amarelo
- **Baixa**: `green-600` / `green-50` / border verde

### Status de Tarefa:
- **A Fazer**: `gray-100` / `gray-700`
- **Fazendo**: `blue-100` / `blue-700`
- **Concluído**: `green-100` / `green-700`

---

## 📱 Responsividade

### Breakpoints:
- **Mobile**: 1 coluna
- **Tablet**: 2 colunas (grids)
- **Desktop**: 3 colunas (grids)

### Adaptações:
- Sidebar colapsável (futuro)
- Tabelas com scroll horizontal
- Modais centralizados
- Forms em coluna única no mobile

---

## 🔐 Controle de Acesso (Futuro)

### Perfis:

#### Admin:
- ✅ Acesso total ao painel de administração
- ✅ CRUD em todas as entidades
- ✅ Visualização de todos os projetos
- ✅ Configurações do sistema

#### PMO:
- ✅ Visualização de projetos da equipe
- ✅ Criação/edição de projetos
- ✅ Gestão de WBS e tarefas
- ❌ Sem acesso ao painel admin

#### User:
- ✅ Visualização de "Minhas Tarefas"
- ✅ Atualização de status das próprias tarefas
- ✅ Comentários
- ❌ Sem criação de projetos
- ❌ Sem acesso ao admin

---

## 🚦 Status de Implementação

### ✅ Completo:
- [x] Context API para admin
- [x] CRUD de Usuários (completo)
- [x] CRUD de Equipes (completo)
- [x] CRUD de Clientes (completo)
- [x] Tela "Minhas Tarefas" (completa)
- [x] Modal de Criação de Projeto (aprimorado)
- [x] Integração com sistema existente
- [x] Navegação e rotas
- [x] Design system consistente

### 🚧 Em Desenvolvimento:
- [ ] CRUD de Stakeholders
- [ ] CRUD de Produtos
- [ ] CRUD de Sistemas
- [ ] CRUD de Tipos de Projeto
- [ ] Sistema de notificações
- [ ] Sistema de comentários
- [ ] Encaminhamento de tarefas

### 📋 Planejado:
- [ ] Permissões por perfil
- [ ] Auditoria de alterações
- [ ] Import/Export de dados
- [ ] API REST
- [ ] Testes automatizados

---

## 💡 Boas Práticas

### Código:
- **TypeScript** para type safety
- **Context API** para state management
- **Componentes** reutilizáveis e isolados
- **Validação** de formulários
- **Confirmações** antes de exclusões

### UX:
- **Feedback visual** em todas as ações
- **Loading states** (futuro)
- **Empty states** informativos
- **Mensagens de erro** claras
- **Atalhos de teclado** (futuro)

### Performance:
- **Lazy loading** de tabs
- **Memoization** de listas grandes (futuro)
- **Debounce** em buscas (futuro)
- **Paginação** para muitos registros (futuro)

---

## 🔗 Navegação

### Rotas:
- `/` - Governança
- `/my-tasks` - Minhas Tarefas
- `/admin` - Painel de Administração
- `/workspace/:team` - Workspace por equipe
- `/project/:id` - Detalhes do projeto

### Sidebar:
- **Governança** - Visão macro
- **Minhas Tarefas** - Tarefas pessoais
- **Workspaces** - Por equipe
- **Visualizações** - Dashboards, Gantt, etc.
- **Administração** - Configurações (separado)

---

## 📚 Arquivos Principais

```
/src/app/
├── context/
│   └── AdminContext.tsx          # State management admin
├── components/
│   ├── admin/
│   │   ├── UsersCRUD.tsx         # Gestão de usuários
│   │   ├── TeamsCRUD.tsx         # Gestão de equipes
│   │   └── ClientsCRUD.tsx       # Gestão de clientes
│   └── EnhancedProjectModal.tsx  # Modal criação projeto
├── pages/
│   ├── Admin.tsx                 # Página admin principal
│   └── MyTasks.tsx              # Página minhas tarefas
└── types/
    └── index.ts                  # Tipos TypeScript
```

---

## 🎓 Próximos Passos

1. **Completar CRUDs faltantes** (Stakeholders, Produtos, Sistemas, Tipos)
2. **Implementar sistema de notificações**
3. **Adicionar comentários em tarefas**
4. **Criar encaminhamento de tarefas**
5. **Implementar controle de acesso por perfil**
6. **Adicionar auditoria de alterações**
7. **Criar testes automatizados**
8. **Documentar APIs**

---

**Documentação criada em:** 24/03/2026
**Versão do Sistema:** 2.0
**Status:** Em produção ativa
