import {
  MBadge,
  MBox,
  MButton,
  MFlex,
  MGrid,
  MHeading,
  MInput,
  MOperationalContentGrid,
  MText,
} from "@task/ui/app";
import { Archive, Pencil, Plus } from "lucide-react";
import type { FormEvent, ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import type { ProjectActionFeedbackInput } from "../workspaceViewModels.js";
import {
  buildProjectDetailSummary,
  buildProjectOverviewRows,
  buildProjectOverviewSummary,
  buildProjectParentTaskProgress,
  formatProjectActionFeedback,
} from "../workspaceViewModels.js";
import type { ProjectSummary, TaskSummary, WorkspaceStatus } from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

type ProjectUpdateInput = {
  description: string | null;
  title: string;
};

export type ProjectActionState = ProjectActionFeedbackInput;

export type ProjectsViewProps = {
  onArchiveProject(projectId: string): Promise<void>;
  onCreateProject(title: string): Promise<void>;
  onCreateTask(projectId: string, title: string): Promise<void>;
  onSelectProject(projectId: string): void;
  onUpdateProject(projectId: string, input: ProjectUpdateInput): Promise<void>;
  projectActionState: ProjectActionState;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  statuses: WorkspaceStatus[];
  taskActionState: ProjectActionState;
  tasks: TaskSummary[];
};

export function ProjectsView({
  onArchiveProject,
  onCreateProject,
  onCreateTask,
  onSelectProject,
  onUpdateProject,
  projectActionState,
  projects,
  selectedProjectId,
  statuses,
  taskActionState,
  tasks,
}: ProjectsViewProps): ReactElement {
  const rows = buildProjectOverviewRows(projects, tasks);
  const summary = buildProjectOverviewSummary(projects, tasks);
  const activeProjects = rows.filter((project) => !isArchived(projects, project.id));
  const archivedProjects = rows.filter((project) => isArchived(projects, project.id));
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const doneStatusIds = new Set(
    statuses.filter((status) => status.isDone).map((status) => status.id),
  );
  const selectedProjectTasks =
    selectedProject === null ? [] : tasks.filter((task) => task.projectId === selectedProject.id);

  return (
    <MOperationalContentGrid>
      <WorkspacePanel
        action={<ProjectCreateForm onCreateProject={onCreateProject} />}
        eyebrow="Projects"
        title="Workspace projects"
        titleId="projects-view-title"
      >
        <MText as="p" mode="secondary">
          Albums, releases, and other delivery containers in this workspace.
        </MText>
        <ProjectCatalogue
          emptyMessage="No active projects yet. Create the first one above."
          onSelectProject={onSelectProject}
          projects={activeProjects}
          title="Active"
        />
        <ProjectCatalogue
          emptyMessage="No archived projects."
          onSelectProject={onSelectProject}
          projects={archivedProjects}
          title="Archive"
        />
        <ActionFeedback action="Project" state={projectActionState} />
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Project load" titleId="projects-summary-title">
        <WorkspaceMetrics
          items={[
            { label: "Projects", value: summary.projectCount },
            { label: "Tasks", value: summary.taskCount },
            { label: "Due soon", value: summary.dueSoonTaskCount },
            { label: "Unassigned", value: summary.unassignedTaskCount },
          ]}
        />
      </WorkspacePanel>

      {selectedProject === null ? (
        <WorkspacePanel
          eyebrow="Project overview"
          title="Select a project"
          titleId="project-detail-title"
        >
          <MText as="p" mode="secondary">
            Choose a project to view its delivery progress and parent tasks.
          </MText>
        </WorkspacePanel>
      ) : (
        <ProjectDetail
          doneStatusIds={doneStatusIds}
          onArchiveProject={onArchiveProject}
          onCreateTask={onCreateTask}
          onUpdateProject={onUpdateProject}
          project={selectedProject}
          taskActionState={taskActionState}
          tasks={selectedProjectTasks}
        />
      )}
    </MOperationalContentGrid>
  );
}

function ProjectCatalogue({
  emptyMessage,
  onSelectProject,
  projects,
  title,
}: {
  emptyMessage: string;
  onSelectProject(projectId: string): void;
  projects: ReturnType<typeof buildProjectOverviewRows>;
  title: string;
}): ReactElement {
  return (
    <MFlex align="stretch" direction="column" gap="s">
      <MHeading mode="h4">{title}</MHeading>
      {projects.length === 0 ? (
        <MText as="p" mode="secondary">
          {emptyMessage}
        </MText>
      ) : (
        projects.map((project) => (
          <MFlex
            as="article"
            align="start"
            gap="m"
            justify="space-between"
            key={project.id}
            wrap="nowrap"
          >
            <MBox>
              <MButton
                justify="start"
                mode="transparent"
                noPadding
                onClick={() => onSelectProject(project.id)}
              >
                {project.title}
              </MButton>
              <MText as="p" mode="secondary">
                {project.description}
              </MText>
            </MBox>
            <MFlex align="end" direction="column" gap="xs">
              <MBadge mode="transparent">{project.statusLabel}</MBadge>
              <MText as="span" mode="secondary" size="s">
                {project.taskCount} tasks · updated {project.latestActivityLabel}
              </MText>
            </MFlex>
          </MFlex>
        ))
      )}
    </MFlex>
  );
}

function ProjectDetail({
  doneStatusIds,
  onArchiveProject,
  onCreateTask,
  onUpdateProject,
  project,
  taskActionState,
  tasks,
}: {
  doneStatusIds: ReadonlySet<string>;
  onArchiveProject(projectId: string): Promise<void>;
  onCreateTask(projectId: string, title: string): Promise<void>;
  onUpdateProject(projectId: string, input: ProjectUpdateInput): Promise<void>;
  project: ProjectSummary;
  taskActionState: ProjectActionState;
  tasks: TaskSummary[];
}): ReactElement {
  const summary = buildProjectDetailSummary(tasks, doneStatusIds);
  const parentTasks = buildProjectParentTaskProgress(tasks, doneStatusIds);
  const [mutationFeedback, setMutationFeedback] = useState<ProjectActionState>({ status: "idle" });

  return (
    <WorkspacePanel
      action={
        <MFlex gap="s">
          <ProjectEditForm
            onUpdateProject={onUpdateProject}
            onUpdateState={setMutationFeedback}
            project={project}
          />
          {!isArchivedProject(project) ? (
            <ArchiveProjectButton
              onArchiveProject={onArchiveProject}
              onUpdateState={setMutationFeedback}
              projectId={project.id}
            />
          ) : null}
        </MFlex>
      }
      eyebrow={isArchivedProject(project) ? "Archived project" : "Project overview"}
      title={project.title}
      titleId="project-detail-title"
    >
      <MText as="p" mode="secondary">
        {project.description ?? "No description"}
      </MText>
      <WorkspaceMetrics
        items={[
          { label: "Completed", value: `${summary.completedTaskCount}/${summary.taskCount}` },
          { label: "Parent tasks", value: summary.parentTaskCount },
          { label: "Unassigned", value: summary.unassignedTaskCount },
          { label: "Updated", value: project.updatedAt.slice(0, 10) },
        ]}
      />
      <ActionFeedback action="Project" state={mutationFeedback} />
      {!isArchivedProject(project) ? (
        <>
          <TaskCreateForm onCreateTask={onCreateTask} projectId={project.id} />
          <ActionFeedback action="Task" state={taskActionState} />
        </>
      ) : null}
      <MFlex align="stretch" direction="column" gap="s">
        <MHeading mode="h4">Parent task progress</MHeading>
        {parentTasks.length === 0 ? (
          <MText as="p" mode="secondary">
            No parent tasks in this project.
          </MText>
        ) : (
          parentTasks.map((task) => (
            <MFlex as="article" justify="space-between" key={task.id} wrap="nowrap">
              <MText as="span">{task.title}</MText>
              <MText as="span" mode="secondary">
                {task.completedTaskCount}/{task.totalTaskCount} · {task.updatedAtLabel}
              </MText>
            </MFlex>
          ))
        )}
      </MFlex>
    </WorkspacePanel>
  );
}

function ProjectCreateForm({
  onCreateProject,
}: {
  onCreateProject(title: string): Promise<void>;
}): ReactElement {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (normalizedTitle.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    void onCreateProject(normalizedTitle)
      .then(() => setTitle(""))
      .catch(() => undefined)
      .finally(() => setIsSubmitting(false));
  };

  return (
    <InlineForm onSubmit={submit}>
      <MInput
        aria-label="New project title"
        onChange={(event) => setTitle(event.currentTarget.value)}
        placeholder="New project"
        value={title}
      />
      <MButton
        before={<Plus aria-hidden="true" />}
        disabled={title.trim().length === 0 || isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creating" : "Project"}
      </MButton>
    </InlineForm>
  );
}

function TaskCreateForm({
  onCreateTask,
  projectId,
}: {
  onCreateTask(projectId: string, title: string): Promise<void>;
  projectId: string;
}): ReactElement {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (normalizedTitle.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    void onCreateTask(projectId, normalizedTitle)
      .then(() => setTitle(""))
      .catch(() => undefined)
      .finally(() => setIsSubmitting(false));
  };
  return (
    <InlineForm onSubmit={submit}>
      <MInput
        aria-label="New task title"
        onChange={(event) => setTitle(event.currentTarget.value)}
        placeholder="Add a task"
        value={title}
      />
      <MButton
        before={<Plus aria-hidden="true" />}
        disabled={title.trim().length === 0 || isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Creating" : "Task"}
      </MButton>
    </InlineForm>
  );
}

function ProjectEditForm({
  onUpdateProject,
  onUpdateState,
  project,
}: {
  onUpdateProject(projectId: string, input: ProjectUpdateInput): Promise<void>;
  onUpdateState(state: ProjectActionState): void;
  project: ProjectSummary;
}): ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    setTitle(project.title);
    setDescription(project.description ?? "");
    setIsEditing(false);
  }, [project.description, project.title]);
  if (!isEditing)
    return (
      <MButton
        before={<Pencil aria-hidden="true" />}
        mode="outlined"
        onClick={() => setIsEditing(true)}
      >
        Edit
      </MButton>
    );
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (title.trim().length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    onUpdateState({ status: "submitting" });
    void onUpdateProject(project.id, {
      description: description.trim().length === 0 ? null : description.trim(),
      title: title.trim(),
    })
      .then(() => {
        setIsEditing(false);
        onUpdateState({ message: "Changes saved.", status: "success" });
      })
      .catch((error: unknown) =>
        onUpdateState({ message: readActionError(error), status: "error" }),
      )
      .finally(() => setIsSubmitting(false));
  };
  return (
    <InlineForm onSubmit={submit}>
      <MInput
        aria-label="Project title"
        onChange={(event) => setTitle(event.currentTarget.value)}
        value={title}
      />
      <MInput
        aria-label="Project description"
        onChange={(event) => setDescription(event.currentTarget.value)}
        placeholder="Description"
        value={description}
      />
      <MButton disabled={title.trim().length === 0 || isSubmitting} type="submit">
        {isSubmitting ? "Saving" : "Save"}
      </MButton>
    </InlineForm>
  );
}

function ArchiveProjectButton({
  onArchiveProject,
  onUpdateState,
  projectId,
}: {
  onArchiveProject(projectId: string): Promise<void>;
  onUpdateState(state: ProjectActionState): void;
  projectId: string;
}): ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const archive = (): void => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onUpdateState({ status: "submitting" });
    void onArchiveProject(projectId)
      .then(() => onUpdateState({ message: "Project archived.", status: "success" }))
      .catch((error: unknown) =>
        onUpdateState({ message: readActionError(error), status: "error" }),
      )
      .finally(() => setIsSubmitting(false));
  };
  return (
    <MButton
      before={<Archive aria-hidden="true" />}
      disabled={isSubmitting}
      mode="outlined"
      onClick={archive}
    >
      {isSubmitting ? "Archiving" : "Archive"}
    </MButton>
  );
}

function InlineForm({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}): ReactElement {
  return (
    <MGrid
      alignItems="end"
      columnGap="s"
      columnTemplate="repeat(auto-fit, minmax(10rem, 1fr))"
      onSubmit={onSubmit}
      rowGap="s"
      tag="form"
    >
      {children}
    </MGrid>
  );
}

function ActionFeedback({
  action,
  state,
}: {
  action: string;
  state: ProjectActionState;
}): ReactElement | null {
  const message = formatProjectActionFeedback(action, state);
  if (message === null) return null;
  return <MBadge mode={state.status === "success" ? "success" : "error"}>{message}</MBadge>;
}

function readActionError(error: unknown): string {
  return error instanceof Error ? error.message : "The action could not be completed.";
}

function isArchived(projects: ProjectSummary[], projectId: string): boolean {
  const project = projects.find((candidate) => candidate.id === projectId);
  return project !== undefined && isArchivedProject(project);
}

function isArchivedProject(project: ProjectSummary): boolean {
  return (
    (project.archivedAt !== null && project.archivedAt !== undefined) ||
    project.status?.toLowerCase() === "archived"
  );
}
