# WBS (Work Breakdown Structure) - Estrutura Analítica do Projeto

## 📋 Visão Geral

O WBS é o **núcleo central do sistema de gestão de projetos**, fornecendo uma visão hierárquica completa de:
- Projeto → Fases → Marcos → Tarefas → Subtarefas

Esta estrutura serve como **fonte única da verdade** para todo o projeto.

---

## 🌳 Componentes Principais

### 1. WBS Tree (`/src/app/components/WBSTree.tsx`)

**Visualização hierárquica em árvore** com:

#### Funcionalidades:
- ✅ Expand/collapse em todos os níveis
- ✅ Ícones específicos por nível (pasta, bandeira, checkbox, círculo)
- ✅ Indicadores visuais de status
- ✅ Botões para adicionar elementos em cada nível
- ✅ Drag handles para reordenação (preparado para DnD)
- ✅ Menu de contexto (⋮) em cada elemento

#### Hierarquia de Níveis:

```
📁 FASE (Phase)
  └─ 🚩 MARCO (Milestone)
      └─ ☑️ TAREFA (Task)
          └─ ⭕ SUBTAREFA (Subtask)
```

#### Status Visual:
- **Fases**: Cor customizável
- **Marcos**: Verde (concluído), Azul (em andamento), Vermelho (atrasado), Cinza (não iniciado)
- **Tarefas**: Badge com status (A fazer, Fazendo, Concluído)
- **Subtarefas**: Círculo preenchido (concluído) ou vazio (pendente)

---

### 2. Milestone Panel (`/src/app/components/MilestonePanel.tsx`)

**Painel PMO** para gerenciamento de marcos com tabela completa:

#### Colunas:
- Nome do marco + descrição
- Tipo (Negócio, Técnico, Regulatório, Entrega)
- Status (Não iniciado, Em andamento, Concluído, Atrasado)
- Data de início
- Data de término
- SLA (em dias)
- Indicador de atraso (calculado automaticamente)
- Progresso de tarefas (X/Y concluídas)

#### Regras de Negócio:
- ✅ Fase é concluída quando todos os marcos estão concluídos
- ✅ Marcos podem rodar em paralelo
- ✅ Atraso calculado automaticamente comparando data fim com data atual
- ✅ Resumo com totais por status no rodapé

---

### 3. Project Timeline (`/src/app/components/ProjectTimeline.tsx`)

**Visualização Gantt horizontal** com:

#### Características:
- ✅ Barras horizontais para cada marco
- ✅ Cores de status (verde, azul, vermelho, cinza)
- ✅ Agrupamento por fase
- ✅ Marcador "hoje" (linha vertical laranja)
- ✅ Tooltip com detalhes ao passar mouse
- ✅ Escala temporal automática baseada nas datas
- ✅ Legenda de status

#### Cálculo Automático:
- Início do projeto = data mais antiga
- Fim do projeto = data mais recente
- Duração total em dias
- Posicionamento proporcional das barras

---

### 4. Task Kanban (`/src/app/components/TaskKanban.tsx`)

**Kanban interno** para gestão de tarefas:

#### Colunas:
1. **A Fazer** (To Do) - fundo cinza
2. **Fazendo** (Doing) - fundo azul
3. **Concluído** (Done) - fundo verde

#### Funcionalidades:
- ✅ Drag & drop entre colunas (react-dnd)
- ✅ Filtros por Fase e Marco
- ✅ Cards com informações:
  - Título e descrição da tarefa
  - Tags de fase e marco
  - Progresso de subtarefas (barra + contador)
  - Responsável (avatar)
  - Horas estimadas
  - Indicador de prioridade (borda colorida)

#### Prioridades:
- 🔴 Alta (borda vermelha)
- 🟡 Média (borda amarela)
- 🟢 Baixa (borda verde)

---

### 5. Project Summary (`/src/app/components/ProjectSummary.tsx`)

**Dashboard de resumo** com indicadores-chave:

#### Seções:

##### 📍 Fase Atual
- Nome e descrição da fase
- Progresso de marcos (X de Y concluídos)
- Identificação visual por cor

##### 📊 Progresso Geral
- Percentual total (grande destaque)
- Contador de tarefas
- Barra de progresso visual

##### ⏱️ Tempo por Fase
- Barras de progresso individuais
- Percentual calculado por tarefas concluídas
- Cores personalizadas por fase

##### ⚠️ Indicador de Risco
- **Alto Risco**: < 30% progresso + > 120h restantes
- **Médio Risco**: < 60% progresso + > 80h restantes
- **Baixo Risco**: demais casos
- Badge colorido + descrição contextual

##### 📝 Histórico de Atividades
- Timeline de ações no projeto
- Últimas 5 atividades
- Timestamp e responsável

##### ℹ️ Informações Adicionais
- Data de início
- Data de término (deadline)
- Horas restantes
- Orçamento (se definido)

---

## 📄 Página de Detalhes do Projeto

### Estrutura (`/src/app/pages/ProjectDetail.tsx`)

#### Header do Projeto:
- Logo personalizado grande
- Nome do projeto
- Informações: Cliente, Equipe, Responsável
- Botão de configurações

#### Navegação por Tabs:
1. **WBS** - Árvore hierárquica completa
2. **Marcos** - Painel PMO de marcos
3. **Timeline** - Gantt visual
4. **Kanban** - Gerenciamento de tarefas
5. **Resumo** - Dashboard de indicadores

---

## 🗂️ Estrutura de Tipos

### Tipos Principais (`/src/app/types/index.ts`)

```typescript
// Status
type MilestoneType = 'business' | 'technical' | 'regulatory' | 'delivery';
type MilestoneStatus = 'not-started' | 'in-progress' | 'completed' | 'delayed';
type TaskStatus = 'todo' | 'doing' | 'done';

// Hierarquia
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
}

interface WBSTask {
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
}

interface Milestone {
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

interface Phase {
  id: string;
  name: string;
  description?: string;
  color: string;
  startDate?: string;
  endDate?: string;
  milestones: Milestone[];
  order: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

// Projeto estendido
interface Project {
  // ... campos existentes ...
  phases?: Phase[];
  activities?: ActivityLog[];
  description?: string;
  startDate?: string;
  budget?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}
```

---

## 🔄 Fluxo de Dados

### 1. Acesso à Página de Detalhes
```
Lista de Projetos → Click em linha → navigate(`/project/${id}`)
```

### 2. Carregamento de Dados
```typescript
// Em ProjectDetail.tsx
const project = projects.find(p => p.id === projectId);
const phases = project?.phases || mockPhases;
```

### 3. Atualização de Status (Kanban)
```typescript
onUpdateTask={(taskId, updates) => {
  // Atualiza status da tarefa via context
  // Recalcula progresso automaticamente
}}
```

---

## 🎨 Design System

### Cores de Status

#### Marcos:
- 🟢 Concluído: `green-500`, `green-100`
- 🔵 Em andamento: `blue-500`, `blue-100`
- 🔴 Atrasado: `red-500`, `red-100`
- ⚪ Não iniciado: `gray-400`, `gray-100`

#### Tipos de Marco:
- 🟣 Negócio: `purple-100`, `purple-700`
- 🔵 Técnico: `blue-100`, `blue-700`
- 🟠 Regulatório: `orange-100`, `orange-700`
- 🟢 Entrega: `green-100`, `green-700`

#### Prioridades:
- 🔴 Alta: `border-l-red-500`
- 🟡 Média: `border-l-yellow-500`
- 🟢 Baixa: `border-l-green-500`

---

## 🚀 Próximos Passos (Funcionalidades Futuras)

### ✨ Em Desenvolvimento:
- [ ] Adicionar/editar fases via modal
- [ ] Adicionar/editar marcos
- [ ] Adicionar/editar tarefas
- [ ] Adicionar/editar subtarefas
- [ ] Drag & drop para reordenação na WBS Tree
- [ ] Edição inline de elementos
- [ ] Exclusão de elementos
- [ ] Duplicação de elementos
- [ ] Importação/exportação de WBS
- [ ] Templates de fase/marco
- [ ] Baseline de projeto
- [ ] Comparação de versões
- [ ] Comentários e discussões por elemento
- [ ] Anexos de arquivos
- [ ] Dependências entre tarefas
- [ ] Caminho crítico (Critical Path)
- [ ] Gráfico de burndown
- [ ] Time tracking integrado
- [ ] Notificações de prazo
- [ ] Relatórios exportáveis (PDF/Excel)

---

## 🔗 Navegação

### Rotas:
- `/` - Governança (visão geral)
- `/project/:projectId` - Detalhes do projeto (WBS)
- `/workspace/:team` - Workspace por equipe
- `/dashboards` - Dashboards
- `/gantt` - Visão Gantt global
- `/by-client` - Visão por cliente

### Integração:
- Click em projeto na tabela → Abre página de detalhes
- Botão "Ver detalhes" (🔗) → Abre em nova aba
- Breadcrumb/voltar → Retorna à página anterior

---

## 📦 Dependências

### Bibliotecas Utilizadas:
- `react-dnd` + `react-dnd-html5-backend` - Drag and drop
- `@radix-ui/react-tabs` - Navegação por abas
- `lucide-react` - Ícones
- `react-router` - Navegação
- `date-fns` - Manipulação de datas (futuro)

---

## 💡 Melhores Práticas

### 1. Estrutura de Dados
- Sempre manter `order` para ordenação consistente
- IDs únicos para cada elemento
- Timestamps em ISO 8601 para datas

### 2. Performance
- Usar `useMemo` para cálculos pesados
- Virtualização para listas muito longas (futuro)
- Debounce em filtros

### 3. UX
- Feedback visual em todas as ações
- Loading states
- Empty states informativos
- Confirmação antes de exclusões

### 4. Acessibilidade
- Keyboard navigation
- ARIA labels
- Focus management
- Screen reader support

---

## 🐛 Debug

### Verificar dados do projeto:
```typescript
console.log('Project:', project);
console.log('Phases:', phases);
console.log('All milestones:', allMilestones);
```

### Mock data disponível:
O arquivo `ProjectDetail.tsx` contém dados mockados completos para demonstração, incluindo:
- 3 fases (Planejamento, Design, Desenvolvimento)
- 5 marcos
- 7 tarefas
- 4 subtarefas

---

## 📚 Referências

- [React DnD Documentation](https://react-dnd.github.io/react-dnd/)
- [Radix UI Tabs](https://www.radix-ui.com/primitives/docs/components/tabs)
- [PMI WBS Practice Standard](https://www.pmi.org/)
