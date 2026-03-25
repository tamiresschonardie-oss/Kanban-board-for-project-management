Create an advanced task management module inside an existing project management system.

This module must be inspired by the provided QA task management interface, but integrated into a larger system that uses project-level WBS (EAP) as the main structure.

---

# 🎯 OBJECTIVE

Allow users to manage their tasks in a flexible and detailed way, without breaking the project structure.

The system must support both:
- structured project control (EAP)
- personal task management (user workflow)

---

# 🧩 USER TASK WORKSPACE

Create a dedicated "My Tasks" workspace inside the main dashboard.

This workspace must include:

## 🔹 Personal Kanban

Columns should be customizable:
- Backlog
- In progress
- Testing
- Done
- Custom columns allowed

Each card must include:
- Task title
- Tags
- Project reference
- Team reference
- Deadline
- Priority
- Progress (checklist)
- Time tracked
- Status indicator (late, critical, etc)

---

## 🔹 Filters

Allow filtering tasks by:
- Project
- Team
- Priority
- Tags
- Status
- Due date

---

# 🔹 TASK DETAIL VIEW

When clicking a task, open a detailed panel or modal with:

## Sections:

### Description
- Editable text

### Checklist
- Add/remove items
- Progress bar (e.g. 2/4 completed)

### Time tracking
- Total time
- Start/stop tracking

### Comments
- Add comments
- Threaded or simple list

### History
- Track changes

---

## Sidebar (task info)

- Project
- Team
- Requester
- Responsible
- Start date
- Due date
- Total time
- Status
- Tags
- Systems involved

---

# 🔁 INTEGRATION WITH PROJECT (IMPORTANT)

Define visual behavior:

- Tasks can belong to a project (linked to EAP)
- Tasks can also be independent

When a task is marked as "Done" in the user kanban:
- It must update the corresponding task in the project structure
- Update milestone progress
- Update phase status

This connection must be visible but not intrusive.

---

# 📊 TASK DASHBOARD

Create a dashboard showing:

- Tasks by status (chart)
- Tasks by project (pie chart)
- Tasks by priority
- Tasks by team
- Late tasks
- Total time tracked

---

# ⚙️ TASK CREATION MODAL

Fields:

- Title
- Description
- Type
- Priority
- Project (optional)
- Team
- Requester
- Responsible
- Start date
- Due date
- Tags
- Systems
- Link (documentation)

---

# 🎯 UX GOALS

- Highly visual
- Fast interaction
- Flexible workflow
- Clear status indicators
- Easy navigation between project and task

---

# 🎨 STYLE

- Follow existing system visual identity
- Soft shadows, rounded cards
- Color-coded tags
- Clear hierarchy

---

# FINAL OBJECTIVE

Create a hybrid system where:
- projects are controlled by structured EAP
- users manage execution through flexible task boards
- both layers stay synchronized