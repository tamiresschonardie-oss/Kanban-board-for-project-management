import { createBrowserRouter } from 'react-router';
import { Layout } from './pages/Layout';
import { Home } from './pages/Home';
import { Governance } from './pages/Governance';
import { TeamWorkspace } from './pages/TeamWorkspace';
import { Dashboards } from './pages/Dashboards';
import { GanttView } from './pages/GanttView';
import { ByClient } from './pages/ByClient';
import { ProjectDetail } from './pages/ProjectDetail';
import { Admin } from './pages/Admin';
import { MyTasksRefined } from './pages/MyTasksRefined';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        Component: Home,
      },
      {
        path: 'governance',
        Component: Governance,
      },
      {
        path: 'workspace/:team',
        Component: TeamWorkspace,
      },
      {
        path: 'my-tasks',
        Component: MyTasksRefined,
      },
      {
        path: 'project/:projectId',
        Component: ProjectDetail,
      },
      {
        path: 'admin',
        Component: Admin,
      },
      {
        path: 'dashboards',
        Component: Dashboards,
      },
      {
        path: 'gantt',
        Component: GanttView,
      },
      {
        path: 'by-client',
        Component: ByClient,
      },
    ],
  },
]);