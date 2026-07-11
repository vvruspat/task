import type { TaskApiClient } from "@task/api-client";
import { Button, Callout } from "@task/ui/app";
import type { ReactElement } from "react";
import { AgentHistoryView } from "./workspace/AgentHistoryView.js";
import { FallbackWorkspaceRouteView } from "./workspace/FallbackWorkspaceRouteView.js";
import { KanbanView } from "./workspace/KanbanView.js";
import { MatrixView } from "./workspace/MatrixView.js";
import { type ProjectActionState, ProjectsView } from "./workspace/ProjectsView.js";
import { SettingsView } from "./workspace/SettingsView.js";
import { TaskDetailDrawer } from "./workspace/TaskDetailDrawer.js";
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
  currentUserId: string | null;
  projects: ProjectSummary[];
  onArchiveProject(projectId: string): Promise<void>;
  onCreateProject(title: string): Promise<void>;
  onCreateTask(projectId: string, title: string): Promise<void>;
  onCloseTask(): void;
  onOpenTask(taskId: string): void;
  onOpenConfirmations(): void;
  onTaskDirtyChange(value: boolean): void;
  onTaskUpdated(task: import("@task/api-client").TaskDetail): void;
  onSelectProject(projectId: string): void;
  onUpdateProject(
    projectId: string,
    input: { description: string | null; title: string },
  ): Promise<void>;
  projectActionState: ProjectActionState;
  route: WorkspaceRoute;
  skills: TaskSkillSummary[];
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  selectedWorkspaceId: string | null;
  statuses: WorkspaceStatus[];
  taskActionState: ProjectActionState;
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
  taskClient: TaskApiClient | null;
};

export default function WorkspaceView({
  agentRuns,
  currentUserId,
  onArchiveProject,
  onCreateProject,
  onCreateTask,
  onCloseTask,
  onOpenTask,
  onOpenConfirmations,
  onTaskDirtyChange,
  onTaskUpdated,
  onSelectProject,
  onUpdateProject,
  projectActionState,
  projects,
  route,
  selectedProjectId,
  selectedTaskId,
  selectedWorkspaceId,
  skills,
  statuses,
  taskActionState,
  tasks,
  workspaces,
  taskClient,
}: WorkspaceViewProps): ReactElement {
  const taskDrawer = renderTaskDrawer({
    onCloseTask,
    onTaskDirtyChange,
    onTaskUpdated,
    selectedTaskId,
    selectedWorkspaceId,
    statuses,
    taskClient,
    tasks,
  });
  if (route.id === "kanban") {
    return (
      <>
        <KanbanView
          client={taskClient}
          onOpenTask={onOpenTask}
          onTaskUpdated={onTaskUpdated}
          projects={projects}
          statuses={statuses}
          tasks={tasks}
          workspaceId={selectedWorkspaceId}
        />
        {taskDrawer}
      </>
    );
  }

  if (route.id === "matrix") {
    return (
      <>
        <MatrixView
          client={taskClient}
          onOpenTask={onOpenTask}
          onTaskUpdated={onTaskUpdated}
          projectId={selectedProjectId}
          workspaceId={selectedWorkspaceId}
        />
        {taskDrawer}
      </>
    );
  }

  if (route.id === "projects") {
    return (
      <>
        <ProjectsView
          onArchiveProject={onArchiveProject}
          onCreateProject={onCreateProject}
          onCreateTask={onCreateTask}
          onOpenTask={onOpenTask}
          onSelectProject={onSelectProject}
          onUpdateProject={onUpdateProject}
          projectActionState={projectActionState}
          projects={projects}
          selectedProjectId={selectedProjectId}
          statuses={statuses}
          tasks={tasks}
          taskActionState={taskActionState}
        />
        {taskDrawer}
      </>
    );
  }

  if (route.id === "table") {
    return (
      <>
        <TaskTableView
          client={taskClient}
          onOpenTask={onOpenTask}
          projectId={selectedProjectId}
          statuses={statuses}
          workspaceId={selectedWorkspaceId}
        />
        {taskDrawer}
      </>
    );
  }

  if (route.id === "templates") {
    return (
      <>
        <TemplatesView
          client={taskClient}
          projects={projects}
          skills={skills}
          workspaceId={selectedWorkspaceId}
        />
        {taskDrawer}
      </>
    );
  }

  if (route.id === "agent") {
    return (
      <>
        <AgentHistoryView
          agentRuns={agentRuns}
          client={taskClient}
          onOpenConfirmations={onOpenConfirmations}
          projects={projects}
          selectedProjectId={selectedProjectId}
          selectedWorkspaceId={selectedWorkspaceId}
          skills={skills}
          statuses={statuses}
          tasks={tasks}
          workspaces={workspaces}
        />
        {taskDrawer}
      </>
    );
  }

  if (route.id === "settings") {
    return (
      <>
        <SettingsView
          client={taskClient}
          currentUserId={currentUserId}
          projects={projects}
          selectedProjectId={selectedProjectId}
          selectedWorkspaceId={selectedWorkspaceId}
          skills={skills}
          statuses={statuses}
          tasks={tasks}
          workspaces={workspaces}
        />
        {taskDrawer}
      </>
    );
  }

  return (
    <>
      <FallbackWorkspaceRouteView projects={projects} route={route} skills={skills} tasks={tasks} />
      {taskDrawer}
    </>
  );
}

function renderTaskDrawer(input: {
  onCloseTask(): void;
  onTaskDirtyChange(value: boolean): void;
  onTaskUpdated(task: import("@task/api-client").TaskDetail): void;
  selectedTaskId: string | null;
  selectedWorkspaceId: string | null;
  statuses: WorkspaceStatus[];
  taskClient: TaskApiClient | null;
  tasks: TaskSummary[];
}): ReactElement | null {
  if (
    input.selectedTaskId === null ||
    input.selectedWorkspaceId === null ||
    input.taskClient === null
  ) {
    return null;
  }
  const task = input.tasks.find((candidate) => candidate.id === input.selectedTaskId);
  if (task === undefined) {
    return (
      <Callout.Root color="red">
        <Callout.Text>
          The linked task is not available in this project. Close this notice to clear the task
          link.
        </Callout.Text>
        <Button onClick={input.onCloseTask}>Clear task link</Button>
      </Callout.Root>
    );
  }
  return (
    <TaskDetailDrawer
      client={input.taskClient}
      onClose={input.onCloseTask}
      onDirtyChange={input.onTaskDirtyChange}
      onTaskUpdated={input.onTaskUpdated}
      projectId={task.projectId}
      statuses={input.statuses}
      taskId={task.id}
      workspaceId={input.selectedWorkspaceId}
    />
  );
}
