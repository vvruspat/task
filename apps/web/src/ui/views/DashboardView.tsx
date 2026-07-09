import { MOperationalContentGrid } from "@task/ui/app";
import type { ReactElement } from "react";
import { AgentCommandPanel } from "./dashboard/AgentCommandPanel.js";
import type {
  FormSubmissionState,
  ProjectSummary,
  TaskSkillSummary,
  TaskSummary,
} from "./dashboard/dashboardTypes.js";
import { MyTasksPanel } from "./dashboard/MyTasksPanel.js";
import { ProjectsPanel } from "./dashboard/ProjectsPanel.js";
import { TemplatesPanel } from "./dashboard/TemplatesPanel.js";

type DashboardViewProps = {
  createProjectDisabled: boolean;
  createProjectState: FormSubmissionState;
  createTaskDisabled: boolean;
  createTaskState: FormSubmissionState;
  onCreateProject(title: string): Promise<void>;
  onCreateTask(title: string): Promise<void>;
  projects: ProjectSummary[];
  skills: TaskSkillSummary[];
  tasks: TaskSummary[];
};

export default function DashboardView({
  createProjectDisabled,
  createProjectState,
  createTaskDisabled,
  createTaskState,
  onCreateProject,
  onCreateTask,
  projects,
  skills,
  tasks,
}: DashboardViewProps): ReactElement {
  return (
    <MOperationalContentGrid>
      <MyTasksPanel
        createTaskDisabled={createTaskDisabled}
        createTaskState={createTaskState}
        onCreateTask={onCreateTask}
        projects={projects}
        tasks={tasks}
      />
      <ProjectsPanel
        createProjectDisabled={createProjectDisabled}
        createProjectState={createProjectState}
        onCreateProject={onCreateProject}
        projects={projects}
      />
      <TemplatesPanel skills={skills} />
      <AgentCommandPanel />
    </MOperationalContentGrid>
  );
}
