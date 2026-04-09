import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ProjectProvider } from "./context/ProjectContext";
import { EAPProvider } from "./context/EAPContext";
import { AdminProvider } from "./context/AdminContext";
import { TaskProvider } from "./context/TaskContext";
import { UserKanbanProvider } from "./context/UserKanbanContext";
import { ScheduleProvider } from "./context/ScheduleContext";
import { FeedbackProvider } from "./context/FeedbackContext";
import { PersonalProductivityProvider } from "./context/PersonalProductivityContext";
import { IntegrationProvider } from "./context/IntegrationContext";

export default function App() {
  return (
    <AdminProvider>
      <IntegrationProvider>
        <ProjectProvider>
          <EAPProvider>
            <TaskProvider>
              <ScheduleProvider>
                <FeedbackProvider>
                  <PersonalProductivityProvider>
                    <UserKanbanProvider>
                      <RouterProvider router={router} />
                    </UserKanbanProvider>
                  </PersonalProductivityProvider>
                </FeedbackProvider>
              </ScheduleProvider>
            </TaskProvider>
          </EAPProvider>
        </ProjectProvider>
      </IntegrationProvider>
    </AdminProvider>
  );
}
