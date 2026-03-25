Refine and extend the existing system design.

IMPORTANT:
Do not create isolated screens. All features must be connected and follow a clear navigation and behavior logic.

---

# 🧭 HOME (INÍCIO)

Update the Home screen to include a clear entry point for task management.

Add a primary button or call-to-action:
→ "Ir para minhas tarefas"

This button must:
- Redirect the user to the "Minhas Tarefas" page (already in the sidebar)
- Be visually prominent (CTA style)

The Home screen must NOT display full task management.
Only show:
- KPI indicators
- Notifications
- Small preview of tasks (optional)
- The CTA to access "Minhas Tarefas"

---

# 🧩 "MINHAS TAREFAS" (MAIN TASK AREA)

Refine the "Minhas Tarefas" page to follow the behavior of the QA Task Manager system.

This page must be the central place for task execution.

---

## 🔹 MAIN VIEW: PERSONAL KANBAN

Create a personal kanban board with:

- Default columns:
  - Backlog
  - Em andamento
  - Em testes
  - Concluído

- Allow user to:
  - Create new columns (custom workflow)
  - Rename columns
  - Reorder columns

Each card must include:

- Task title
- Tags
- Project reference (if exists)
- Team reference
- Priority
- Due date
- Status indicator (late, critical)
- Checklist progress (ex: 2/4)
- Time tracked

---

## 🔹 FILTERS

Add filters at the top:

- Projeto
- Equipe
- Prioridade
- Tags
- Status
- Data de vencimento

Include search bar:
→ "Buscar tarefas..."

---

## 🔹 TASK CREATION

When creating a task:

- The task MUST appear immediately in:
  → Personal kanban
  → Task list (if exists)

Tasks can be:
- Linked to a project
- Or independent

---

# 🔹 TASK DETAIL (MODAL / POPUP)

When clicking a task, open a detailed modal (same style as project modal).

This modal must include:

## MAIN AREA

### Description
- Editable text

### Checklist
- Add/remove items
- Progress bar

### Time tracking
- Total time
- Visual indicator

### Comments
- Add comments

### History
- Show changes

---

## SIDEBAR (DETAILS)

- Projeto
- Equipe
- Solicitante
- Responsável
- Data de início
- Prazo
- Tempo total
- Status
- Tags
- Sistemas envolvidos

---

# 🔁 TASK INTEGRATION WITH PROJECT

Define behavior clearly:

If a task is linked to a project:

- It must appear inside the project (EAP / tasks)
- When moved to "Concluído":
  → Update project task
  → Update milestone progress
  → Reflect in project status

This must be consistent across all views.

---

# 📊 DASHBOARD (TASK ANALYTICS)

Create a dashboard similar to QA system:

Include:

- Total de tarefas
- Em andamento
- Concluídas
- Bloqueadas
- Tarefas atrasadas
- Tempo total registrado

Charts:

- Tarefas por status
- Tarefas por projeto
- Tarefas por prioridade
- Tarefas por equipe

---

# ⚙️ ADMIN / CONFIGURAÇÕES

Create administration screens similar to QA system.

---

## 🔹 TAGS

- Create tag
- Assign color
- List of tags

---

## 🔹 PROJECTS

- Create project
- Assign color
- List projects

---

## 🔹 TEAMS

- Create team
- Assign color
- List teams

---

## 🔹 SYSTEMS

- Register systems
- Simple name-based input

---

All admin screens must be functional and consistent.

---

# ⚠️ IMPORTANT RULES

- Do NOT duplicate task systems
- All tasks must belong to one unified system
- Kanban, dashboard and project must reflect the same data

---

# 🎯 UX GOALS

- Fast interaction
- Clear visual hierarchy
- Consistent navigation
- Integrated experience between:
  → user tasks
  → projects
  → governance

---

# FINAL OBJECTIVE

Create a hybrid system where:

- Users manage their work through flexible personal kanban
- Projects are controlled through structured EAP
- Both layers stay synchronized