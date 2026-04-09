import type { ComponentType } from 'react';
import { createBrowserRouter, redirect } from 'react-router';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/AuthRouteGuards';
import { RouteErrorBoundary } from './components/shared/RouteErrorBoundary';

const lazyRoute = <T extends Record<string, unknown>>(loader: () => Promise<T>, exportName: keyof T) =>
  async () => {
    const module = await loader();
    return {
      Component: module[exportName] as ComponentType,
    };
  };

export const router = createBrowserRouter([
  {
    Component: PublicOnlyRoute,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        path: '/login',
        lazy: lazyRoute(() => import('./pages/Login'), 'Login'),
      },
      {
        path: '/forgot-password',
        lazy: lazyRoute(() => import('./pages/ForgotPassword'), 'ForgotPassword'),
      },
      {
        path: '/reset-password',
        lazy: lazyRoute(() => import('./pages/PasswordTokenPage'), 'PasswordTokenPage'),
      },
      {
        path: '/set-password',
        lazy: lazyRoute(() => import('./pages/PasswordTokenPage'), 'PasswordTokenPage'),
      },
    ],
  },
  {
    Component: ProtectedRoute,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        path: '/',
        ErrorBoundary: RouteErrorBoundary,
        lazy: lazyRoute(() => import('./pages/Layout'), 'Layout'),
        children: [
          {
            index: true,
            lazy: lazyRoute(() => import('./pages/Home'), 'Home'),
          },
          {
            path: 'governance',
            lazy: lazyRoute(() => import('./pages/Governance'), 'Governance'),
          },
          {
            path: 'governance/skills',
            lazy: lazyRoute(() => import('./pages/GovernanceSkills'), 'GovernanceSkills'),
          },
          {
            path: 'governance/dashboard',
            lazy: lazyRoute(() => import('./pages/GovernanceAnalyticsDashboard'), 'GovernanceAnalyticsDashboard'),
          },
          {
            path: 'governanca/dashboard',
            lazy: lazyRoute(() => import('./pages/GovernanceAnalyticsDashboard'), 'GovernanceAnalyticsDashboard'),
          },
          {
            path: 'governanca/custos',
            lazy: lazyRoute(() => import('./pages/GovernanceCosts'), 'GovernanceCosts'),
          },
          {
            path: 'governance/costs',
            lazy: lazyRoute(() => import('./pages/GovernanceCosts'), 'GovernanceCosts'),
          },
          {
            path: 'governance/skills/:skillId',
            lazy: lazyRoute(() => import('./pages/SkillDetail'), 'SkillDetail'),
          },
          {
            path: 'operational-priority',
            lazy: lazyRoute(() => import('./pages/OperationalPriority'), 'OperationalPriority'),
          },
          {
            path: 'workspace',
            lazy: lazyRoute(() => import('./pages/TeamWorkspace'), 'TeamWorkspace'),
          },
          {
            path: 'workspace/:team',
            lazy: lazyRoute(() => import('./pages/TeamWorkspace'), 'TeamWorkspace'),
          },
          {
            path: 'my-tasks',
            lazy: lazyRoute(() => import('./pages/MyTasksRefined'), 'MyTasksRefined'),
          },
          {
            path: 'agenda',
            lazy: lazyRoute(() => import('./pages/Schedule'), 'Schedule'),
          },
          {
            path: 'sprints',
            loader: async () => redirect('/operational-priority'),
          },
          {
            path: 'meetings',
            lazy: lazyRoute(() => import('./pages/Meetings'), 'Meetings'),
          },
          {
            path: 'project/:projectId',
            lazy: lazyRoute(() => import('./pages/ProjectDetail'), 'ProjectDetail'),
          },
          {
            path: 'skills/:skillId',
            lazy: lazyRoute(() => import('./pages/SkillDetail'), 'SkillDetail'),
          },
          {
            path: 'admin',
            lazy: lazyRoute(() => import('./pages/Admin'), 'Admin'),
          },
          {
            path: 'dashboards',
            lazy: lazyRoute(() => import('./pages/Dashboards'), 'Dashboards'),
          },
          {
            path: 'gantt',
            lazy: lazyRoute(() => import('./pages/GanttView'), 'GanttView'),
          },
          {
            path: 'by-client',
            lazy: lazyRoute(() => import('./pages/ByClient'), 'ByClient'),
          },
        ],
      },
    ],
  },
]);
