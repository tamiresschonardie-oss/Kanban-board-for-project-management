# Project Management System (PMO)

## Overview
A comprehensive project management platform inspired by Figma and Monday.com, built for managing projects, teams, tasks, and governance workflows. The UI is primarily in Portuguese (BR).

## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4.x (via `@tailwindcss/vite`)
- **UI Components**: Radix UI, Shadcn UI, Material UI
- **Routing**: React Router 7
- **State Management**: React Context API
- **Charts**: Recharts
- **Animations**: Motion (Framer Motion)
- **Icons**: Lucide React, MUI Icons

## Project Structure
```
src/
  app/
    components/   # Reusable UI and domain components
      admin/      # Admin panel CRUD components
      figma/      # Figma-like UI components
      ui/         # Base UI primitives
    context/      # React Context providers
    pages/        # Top-level page components
    types/        # TypeScript interfaces
    App.tsx       # Root component
    routes.tsx    # Route definitions
  imports/        # Reference/documentation text
  styles/         # Global CSS and Tailwind config
  main.tsx        # Entry point
index.html
vite.config.ts
```

## Key Features
- Home Dashboard with project overview
- Work Breakdown Structure (WBS) per project
- Kanban, Gantt, and "By Client" views
- Admin panel for Users, Teams, Clients, Stakeholders, etc.
- My Tasks: personalized task tracking with subtasks
- Governance: macro view of project health

## Development
- **Package Manager**: npm
- **Run**: `npm run dev` (starts on port 5000)
- **Build**: `npm run build`

## Replit Configuration
- Frontend runs on `0.0.0.0:5000`
- Vite configured with `allowedHosts: true` for proxy compatibility
- Workflow: "Start application" → `npm run dev`
