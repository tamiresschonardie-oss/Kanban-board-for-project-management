import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ProjectProvider } from "./context/ProjectContext";
import { EAPProvider } from "./context/EAPContext";
import { AdminProvider } from "./context/AdminContext";
import { TaskProvider } from "./context/TaskContext";
import { UserKanbanProvider } from "./context/UserKanbanContext";

export default function App() {
  return (
    <ProjectProvider>
      <EAPProvider>
        <AdminProvider>
          <TaskProvider>
            <UserKanbanProvider>
              <RouterProvider router={router} />
            </UserKanbanProvider>
          </TaskProvider>
        </AdminProvider>
      </EAPProvider>
    </ProjectProvider>
  );
}