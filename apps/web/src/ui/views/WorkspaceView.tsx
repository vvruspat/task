import type { ReactElement } from "react";
import { AgentHistoryView } from "./workspace/AgentHistoryView.js";
import { FallbackWorkspaceRouteView } from "./workspace/FallbackWorkspaceRouteView.js";
import { KanbanView } from "./workspace/KanbanView.js";
import { MatrixView } from "./workspace/MatrixView.js";
import { type ProjectActionState, ProjectsView } from "./workspace/ProjectsView.js";
import { SettingsView } from "./workspace/SettingsView.js";
import { TaskTableView } from "./workspace/TaskTableView.js";
import { TemplatesView } from "./workspace/TemplatesView.js";
import type {
  AgentRunSummary,
  ProjectSummary,
  TaskSkillSummary,
  TaskSummary,
  WorkspaceRoute,
  WorkspaceStatus,
  WorkspaceSummary,
} from "./workspace/types.js";

type WorkspaceViewProps = {
  agentRuns: AgentRunSummary[];
  projects: ProjectSummary[];
  onArchiveProject(projectId: string): Promise<void>;
  onCreateProject(title: string): Promise<void>;
  onCreateTask(projectId: string, title: string): Promise<void>;
  onSelectProject(projectId: string): void;
  onUpdateProject(
    projectId: string,
    input: { description: string | null; title: string },
  ): Promise<void>;
  projectActionState: ProjectActionState;
  route: WorkspaceRoute;
  skills: TaskSkillSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  statuses: WorkspaceStatus[];
  taskActionState: ProjectActionState;
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
};

export default function WorkspaceView({
  agentRuns,
  onArchiveProject,
  onCreateProject,
  onCreateTask,
  onSelectProject,
  onUpdateProject,
  projectActionState,
  projects,
  route,
  selectedProjectId,
  selectedWorkspaceId,
  skills,
  statuses,
  taskActionState,
  tasks,
  workspaces,
}: WorkspaceViewProps): ReactElement {
  if (route.id === "kanban") {
    return <KanbanView projects={projects} statuses={statuses} tasks={tasks} />;
  }

  if (route.id === "matrix") {
    return <MatrixView tasks={tasks} />;
  }

  if (route.id === "projects") {
    return (
      <ProjectsView
        onArchiveProject={onArchiveProject}
        onCreateProject={onCreateProject}
        onCreateTask={onCreateTask}
        onSelectProject={onSelectProject}
        onUpdateProject={onUpdateProject}
        projectActionState={projectActionState}
        projects={projects}
        selectedProjectId={selectedProjectId}
        statuses={statuses}
        tasks={tasks}
        taskActionState={taskActionState}
      />
    );
  }

  if (route.id === "table") {
    return <TaskTableView projects={projects} tasks={tasks} />;
  }

  if (route.id === "templates") {
    return <TemplatesView skills={skills} />;
  }

  if (route.id === "agent") {
    return (
      <AgentHistoryView
        agentRuns={agentRuns}
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedWorkspaceId={selectedWorkspaceId}
        skills={skills}
        statuses={statuses}
        tasks={tasks}
        workspaces={workspaces}
      />
    );
  }

  if (route.id === "settings") {
    return (
      <SettingsView
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedWorkspaceId={selectedWorkspaceId}
        skills={skills}
        statuses={statuses}
        tasks={tasks}
        workspaces={workspaces}
      />
    );
  }

  return (
    <FallbackWorkspaceRouteView projects={projects} route={route} skills={skills} tasks={tasks} />
  );
}
