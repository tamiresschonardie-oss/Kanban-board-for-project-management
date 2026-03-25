# 🏠 Tela Inicial & Melhorias Visuais - Documentação

## 📋 Visão Geral

Melhorias inspiradas nas melhores práticas de ferramentas modernas de gestão de projetos, com foco em usabilidade, visualização e produtividade em **Português-BR**.

---

## 🏠 Tela Inicial (Home/Dashboard)

### Descrição:
**Primeira tela ao abrir a ferramenta**, funcionando como área de trabalho centralizada e hub de navegação.

### Estrutura:

#### 1️⃣ **Header Personalizado**
```
┌─────────────────────────────────────────┐
│ Olá, Guilherme!                         │
│ terça-feira, 24 de março                │
│                                         │
│ [Minhas tarefas] [Resumo de atividades]│
└─────────────────────────────────────────┘
```

- **Saudação personalizada** com primeiro nome do usuário
- **Data atual** formatada em português (dia da semana + data completa)
- **Botões de ação rápida**:
  - "Minhas tarefas" (link para /my-tasks)
  - "Resumo de atividades" (futuro)

---

#### 2️⃣ **Cards de KPI (4 indicadores)**

##### EXECUTADAS (Verde):
- ✅ Tarefas concluídas esta semana
- Ícone: CheckCircle2
- Cor: green-600

##### ATRASADAS (Vermelho):
- ⚠️ Tarefas com prazo vencido
- Ícone: AlertCircle
- Cor: red-600
- Subtítulo: "Requer atenção"

##### HOJE (Laranja):
- 📅 Tarefas com vencimento hoje
- Ícone: Calendar
- Cor: orange-600
- Subtítulo: "Para concluir"

##### PRÓXIMAS (Azul):
- 📆 Tarefas da próxima semana
- Ícone: Calendar
- Cor: blue-600
- Subtítulo: "Esta semana"

---

#### 3️⃣ **Seção "Minhas Tarefas"**

**Layout:**
- Header com título e botão "VER TUDO"
- Lista das **3 tarefas mais urgentes**
- Indicador de prioridade (ponto colorido)
- Badge de vencimento para tarefas atrasadas
- Botão "+Ver todas as tarefas" (dashed border)

**Funcionalidades:**
- Click em tarefa → navega para /my-tasks
- Ordenação por data de vencimento (mais próximas primeiro)
- Filtra apenas tarefas não concluídas

**Empty State:**
- Ícone CheckCircle2 grande
- Mensagem: "Nenhuma tarefa pendente"

---

#### 4️⃣ **Seção "Meus Fluxos"**

**O que exibe:**
- **Workspaces/Equipes** (até 3):
  - Ícone colorido da equipe
  - Nome: "{Equipe} - Tarefas"
  - Contador de cards/projetos

- **Projetos** onde o usuário é responsável (até 2):
  - Logo colorido do projeto
  - Nome: "{Projeto} - Projetos"
  - Nome da equipe

**Funcionalidades:**
- Click em workspace → navega para `/workspace/{nome}`
- Click em projeto → navega para `/project/{id}`
- Botão "Criar um novo fluxo"

---

## 📋 Tela "Minhas Tarefas" (Aprimorada)

### Novidades:

#### ✅ **Botão "Nova Tarefa"**
- Localização: Canto superior direito
- Ação: Permite criar tarefas **não vinculadas a projetos**
- Uso: Para tarefas pessoais, ad-hoc ou standalone

#### ✅ **Visualização de Hierarquia**
```
Projeto → Fase → Marco
```
- Breadcrumb contextual em cada tarefa
- Facilita entendimento da origem da tarefa

#### ✅ **Click para Abrir Detalhes**
- Click em qualquer card de tarefa abre o **TaskDetailPanel**
- Painel lateral deslizante (drawer)
- Visualização completa sem sair da página

---

## 🔍 TaskDetailPanel (Painel Lateral de Detalhes)

### Descrição:
**Drawer lateral** que abre ao clicar em uma tarefa, mostrando todas as informações e permitindo edição.

### Estrutura:

#### 📌 **Header**
- Título da tarefa (grande)
- Breadcrumb: Projeto → Fase → Marco
- Botão "X" para fechar

---

#### 📌 **Seção de Propriedades (Grid 2x2)**

##### Status:
- Dropdown interativo
- Opções: BACKLOG, EM PROGRESSO, CONCLUÍDO
- Badge colorido

##### Responsáveis:
- Nome do assignee
- Fundo cinza (não editável por enquanto)
- Futuro: Multi-select de usuários

##### Datas:
- Data de início (com ícone Circle)
- Data de vencimento (com ícone Circle)
- Formato: dd/mm/aaaa

##### Prioridade:
- Dropdown interativo
- Opções: Alta, Média, Baixa
- Badge colorido (amarelo/laranja/azul)

---

#### 📌 **Objetivo Mensurável**
- Título da seção
- Campo de texto (description)
- Descrição detalhada da tarefa

---

#### 📌 **Escopo**
- Horas estimadas vs realizadas
- Formato: "Estimativa: Xh | Realizado: Yh"

---

#### 📌 **Subtarefas (Tabela Hierárquica)**

**Header da tabela:**
```
┌─────────────┬────────────┬────────────┐
│ Nome        │ Responsável│ Prioridade │
└─────────────┴────────────┴────────────┘
```

**Funcionalidades:**
- ✅ Checkbox para marcar como concluída
- 📝 Nome com line-through quando completa
- 👤 Responsável por subtarefa
- 🎯 Indicador visual de prioridade (bolinha colorida)
- 🔽 Botões "Classificar" e "Expandir tudo"
- ➕ Botão "+ Adicionar subtarefa"

**Contador:**
- "X de Y" no título da seção
- Progresso visual

---

#### 📌 **Activity (Feed de Atividades)**

##### Input de Comentário:
- Textarea para escrever
- Botão de anexo (📎 Paperclip)
- Botão "Comentar" (azul)

##### Feed de Atividades:
- Avatar do usuário
- Nome + ação + timestamp
- Exemplo: "Guilherme Drehmer criou esta tarefa • 24/03/2026"
- Timeline visual

---

### Design:

**Overlay:**
- Fundo preto semi-transparente (bg-black/20)
- Click para fechar

**Panel:**
- Largura: 600px em desktop, full em mobile
- Desliza da direita para esquerda
- Fundo branco
- Shadow 2xl
- Scroll interno

---

## 🌐 Idioma Português-BR

### Traduções Aplicadas:

#### Interface Geral:
- ✅ "Minhas Tarefas" (My Tasks)
- ✅ "Início" (Home)
- ✅ "Governança" (Governance)
- ✅ "Administração" (Administration)
- ✅ "Criar Projeto" (Create Project)
- ✅ "Ver Detalhes" (View Details)

#### Status de Tarefas:
- ✅ "A Fazer" (To Do)
- ✅ "Fazendo" (Doing)
- ✅ "Concluído" (Done)
- ✅ "BACKLOG" (Backlog)
- ✅ "EM PROGRESSO" (In Progress)

#### Prioridades:
- ✅ "Alta" (High)
- ✅ "Média" (Medium)
- ✅ "Baixa" (Low)

#### KPIs:
- ✅ "EXECUTADAS" (Completed)
- ✅ "ATRASADAS" (Overdue)
- ✅ "HOJE" (Today)
- ✅ "PRÓXIMAS" (Upcoming)

#### Outros:
- ✅ "Nova Tarefa" (New Task)
- ✅ "Subtarefas" (Subtasks)
- ✅ "Comentar" (Comment)
- ✅ "Responsáveis" (Assignees)
- ✅ "Objetivo mensurável" (Measurable Objective)
- ✅ "Escopo" (Scope)

---

## 🔄 Fluxos de Navegação

### 1. Fluxo: Abrir Ferramenta
```
Usuário acessa / 
  → Home é exibida
  → Vê saudação + stats + tarefas urgentes
  → Pode clicar em:
    - "Minhas tarefas" → /my-tasks
    - Card de tarefa → /my-tasks + painel lateral
    - Workspace → /workspace/{nome}
    - Projeto → /project/{id}
```

### 2. Fluxo: Visualizar Tarefa Detalhada
```
Usuário em /my-tasks
  → Click em card de tarefa
  → TaskDetailPanel abre (drawer lateral)
  → Vê todas informações:
    - Status, Responsável, Datas, Prioridade
    - Descrição completa
    - Subtarefas hierárquicas
    - Comentários
  → Pode editar status/prioridade (dropdown)
  → Pode adicionar comentário
  → Fecha o painel (X ou overlay)
```

### 3. Fluxo: Criar Tarefa Standalone
```
Usuário em /my-tasks
  → Click "Nova Tarefa"
  → Modal/Form abre (futuro)
  → Preenche informações
  → Tarefa criada SEM vinculação a projeto
  → Aparece na lista de tarefas
```

---

## 🎨 Design System

### Cores por Contexto:

#### KPIs:
- **Verde** (Executadas): `green-600` / `green-100`
- **Vermelho** (Atrasadas): `red-600` / `red-100`
- **Laranja** (Hoje): `orange-600` / `orange-100`
- **Azul** (Próximas): `blue-600` / `blue-100`

#### Prioridades (TaskDetailPanel):
- **Alta**: `yellow-600` / `yellow-100`
- **Média**: `orange-600` / `orange-100`
- **Baixa**: `blue-600` / `blue-100`

#### Status:
- **BACKLOG**: `gray-600` / `gray-100`
- **EM PROGRESSO**: `blue-600` / `blue-100`
- **CONCLUÍDO**: `green-600` / `green-100`

---

## 📱 Responsividade

### Breakpoints:

#### Desktop (≥ 768px):
- Home: Grid 2 colunas (Tarefas | Fluxos)
- KPIs: Grid 4 colunas
- TaskDetailPanel: 600px largura

#### Mobile (< 768px):
- Home: 1 coluna empilhada
- KPIs: 1 coluna empilhada
- TaskDetailPanel: Full width

---

## 🗂️ Estrutura de Arquivos

```
/src/app/
├── pages/
│   ├── Home.tsx                    # ✨ NOVA: Tela inicial
│   ├── MyTasks.tsx                 # ✅ ATUALIZADA: Painel de detalhes
│   └── ...
├── components/
│   ├── TaskDetailPanel.tsx         # ✨ NOVA: Drawer lateral
│   ├── Sidebar.tsx                 # ✅ ATUALIZADA: Links PT-BR
│   └── ...
└── routes.tsx                       # ✅ ATUALIZADA: Home como index
```

---

## 🚀 Funcionalidades Implementadas

### ✅ Completo:
- [x] Tela inicial com dashboard personalizado
- [x] KPIs de tarefas (4 indicadores)
- [x] Seção "Minhas Tarefas" na home
- [x] Seção "Meus Fluxos" na home
- [x] TaskDetailPanel (drawer lateral completo)
- [x] Visualização hierárquica de subtarefas
- [x] Breadcrumb de contexto (Projeto → Fase → Marco)
- [x] Interface 100% em Português-BR
- [x] Botão "Nova Tarefa" (UI pronto)
- [x] Navegação fluida entre páginas
- [x] Responsividade mobile

### 🚧 Em Desenvolvimento:
- [ ] Criar tarefa standalone (form)
- [ ] Editar status/prioridade (salvar alterações)
- [ ] Sistema de comentários (salvar e listar)
- [ ] Adicionar subtarefas (form)
- [ ] Marcar subtarefas como concluídas (funcional)
- [ ] Upload de anexos
- [ ] Notificações de atividades
- [ ] Filtros avançados na home

---

## 💡 Boas Práticas Aplicadas

### UX:
- ✅ **Saudação personalizada** aumenta engajamento
- ✅ **KPIs visuais** fornecem overview rápido
- ✅ **Drawer lateral** mantém contexto ao visualizar detalhes
- ✅ **Breadcrumbs** facilitam navegação hierárquica
- ✅ **Empty states** informativos
- ✅ **Hover effects** indicam interatividade
- ✅ **Idioma nativo** reduz fricção cognitiva

### Performance:
- ✅ **Cálculos otimizados** de stats em tempo real
- ✅ **Lazy loading** de painel de detalhes
- ✅ **Memoization** futura para listas grandes

### Código:
- ✅ **Componentes reutilizáveis**
- ✅ **TypeScript** para type safety
- ✅ **Props bem definidas**
- ✅ **Estados isolados**

---

## 🔗 Navegação Atualizada

### Sidebar:
1. **Início** → `/` (HOME - nova)
2. **Minhas Tarefas** → `/my-tasks`
3. **Governança** → `/governance`
4. **Workspaces** → `/workspace/{team}`
5. **Visualizações** → Dashboards, Gantt, Por Cliente
6. **Administração** → `/admin`

### Fluxo de Navegação:
```
/ (Home)
├── Click "Minhas tarefas" → /my-tasks
├── Click card tarefa → /my-tasks + TaskDetailPanel
├── Click workspace → /workspace/{nome}
└── Click projeto → /project/{id}

/my-tasks
├── Click tarefa → TaskDetailPanel abre
├── Click "Nova Tarefa" → Modal (futuro)
└── Filtros por status/prioridade
```

---

## 📊 Métricas e Cálculos

### KPIs da Home:

#### Executadas:
```typescript
allTasks.filter(t => t.status === 'done').length
```

#### Atrasadas:
```typescript
allTasks.filter(t => {
  if (!t.dueDate || t.status === 'done') return false;
  return new Date(t.dueDate) < new Date();
}).length
```

#### Hoje:
```typescript
allTasks.filter(t => {
  if (!t.dueDate) return false;
  const dueDate = new Date(t.dueDate);
  return sameDay(dueDate, today);
}).length
```

#### Próximas (próximos 7 dias):
```typescript
allTasks.filter(t => {
  if (!t.dueDate || t.status === 'done') return false;
  const dueDate = new Date(t.dueDate);
  return dueDate > today && dueDate <= weekFromNow;
}).length
```

---

## 🎯 Próximos Passos

1. **Implementar criação de tarefa standalone**
   - Form modal completo
   - Campos: título, descrição, prioridade, data
   - Opção de vincular a projeto (opcional)

2. **Tornar TaskDetailPanel editável**
   - Salvar alterações de status
   - Salvar alterações de prioridade
   - Atualizar responsáveis

3. **Sistema de comentários funcional**
   - Salvar comentários
   - Listar histórico
   - Menções de usuários (@)

4. **Subtarefas interativas**
   - Criar novas subtarefas
   - Marcar como concluída (funcional)
   - Editar inline

5. **Filtros avançados na home**
   - Por equipe
   - Por projeto
   - Por prioridade

---

**Documentação criada em:** 24/03/2026  
**Versão do Sistema:** 3.0  
**Status:** Em produção ativa  
**Idioma:** Português-BR 🇧🇷
