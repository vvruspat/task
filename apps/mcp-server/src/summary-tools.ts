import type {
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskAttachmentResponse,
  TaskBackendClient,
  TaskCommentResponse,
  TaskDetailResponse,
  TaskSkillSummaryResponse,
  TaskSummaryResponse,
  WorkspaceDetailResponse,
  WorkspaceMemberResponse,
  WorkspaceStatusResponse,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const recentItemLimit = 5;

export type TaskSummaryToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
};

export type ProjectSummaryToolInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
};

export type WorkspaceSummaryToolInput = {
  userId: string;
  workspaceId?: string;
};

export type UserSummaryToolInput = {
  workspaceId: string;
  userId: string;
  targetUserId?: string;
};

export type WorkspaceSummaryWorkspace = {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
};

export type WorkspaceSummaryProject = {
  id: string;
  title: string;
  status: string;
  archivedAt: string | null;
  updatedAt: string;
};

export type WorkspaceSummaryToolResponse = {
  workspace: WorkspaceSummaryWorkspace;
  counts: {
    members: number;
    projects: number;
    statuses: number;
    taskSkills: number;
  };
  members: Array<{
    userId: string;
    role: WorkspaceMemberResponse["role"];
    displayName: string;
  }>;
  recentProjects: WorkspaceSummaryProject[];
  statuses: Array<{
    id: string;
    name: string;
    isDone: boolean;
  }>;
  taskSkills: Array<{
    id: string;
    name: string;
    aliases: string[];
  }>;
};

export type UserSummaryMember = {
  userId: string;
  role: WorkspaceMemberResponse["role"];
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
};

export type UserSummaryAssignedTask = {
  id: string;
  projectId: string;
  projectTitle: string;
  parentTaskId: string | null;
  title: string;
  statusId: string | null;
  statusName: string | null;
  isDone: boolean;
  dueAt: string | null;
  updatedAt: string;
};

export type UserSummaryToolResponse = {
  user: UserSummaryMember;
  counts: {
    assignedTasks: number;
    openAssignedTasks: number;
    doneAssignedTasks: number;
    dueAssignedTasks: number;
    projectsWithAssignedTasks: number;
  };
  recentAssignedTasks: UserSummaryAssignedTask[];
};

export type ProjectSummaryProject = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string;
  archivedAt: string | null;
  updatedAt: string;
};

export type ProjectSummaryTask = {
  id: string;
  parentTaskId: string | null;
  title: string;
  statusId: string | null;
  assigneeUserId: string | null;
  dueAt: string | null;
  updatedAt: string;
};

export type ProjectSummaryToolResponse = {
  project: ProjectSummaryProject;
  counts: {
    tasks: number;
    parentTasks: number;
    subtasks: number;
    assignedTasks: number;
    unassignedTasks: number;
    dueTasks: number;
  };
  recentTasks: ProjectSummaryTask[];
};

export type TaskSummaryTask = {
  id: string;
  workspaceId: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  statusId: string | null;
  assigneeUserId: string | null;
  dueAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
};

export type TaskSummaryComment = {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

export type TaskSummaryAttachment = {
  id: string;
  kind: TaskAttachmentResponse["kind"];
  title: string | null;
  url: string | null;
  storageKey: string | null;
  telegramFileId: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  createdAt: string;
};

export type TaskSummaryToolResponse = {
  task: TaskSummaryTask;
  counts: {
    comments: number;
    attachments: number;
  };
  recentComments: TaskSummaryComment[];
  recentAttachments: TaskSummaryAttachment[];
};

export type SummaryToolHandlers = {
  project(input: unknown): Promise<ProjectSummaryToolResponse>;
  task(input: unknown): Promise<TaskSummaryToolResponse>;
  user(input: unknown): Promise<UserSummaryToolResponse>;
  workspace(input: unknown): Promise<WorkspaceSummaryToolResponse>;
};

export class SummaryToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SummaryToolInputError";
  }
}

export function createSummaryToolHandlers(client: TaskBackendClient): SummaryToolHandlers {
  return {
    project: async (input) => {
      const parsedInput = parseProjectSummaryToolInput(input);
      const [project, tasks] = await Promise.all([
        client.getProject({
          workspaceId: parsedInput.workspaceId,
          projectId: parsedInput.projectId,
          userId: parsedInput.userId,
        }),
        client.listActiveTasks({
          workspaceId: parsedInput.workspaceId,
          projectId: parsedInput.projectId,
          userId: parsedInput.userId,
        }),
      ]);

      return buildProjectSummary(project, tasks);
    },
    task: async (input) => {
      const parsedInput = parseTaskSummaryToolInput(input);
      const [task, comments, attachments] = await Promise.all([
        client.getTask({
          workspaceId: parsedInput.workspaceId,
          projectId: parsedInput.projectId,
          taskId: parsedInput.taskId,
          userId: parsedInput.userId,
        }),
        client.listTaskComments({
          workspaceId: parsedInput.workspaceId,
          projectId: parsedInput.projectId,
          taskId: parsedInput.taskId,
          userId: parsedInput.userId,
        }),
        client.listTaskAttachments({
          workspaceId: parsedInput.workspaceId,
          projectId: parsedInput.projectId,
          taskId: parsedInput.taskId,
          userId: parsedInput.userId,
        }),
      ]);

      return buildTaskSummary(task, comments, attachments);
    },
    user: async (input) => {
      const parsedInput = parseUserSummaryToolInput(input);
      const [members, projects, statuses] = await Promise.all([
        client.listWorkspaceMembers({
          workspaceId: parsedInput.workspaceId,
          userId: parsedInput.userId,
        }),
        client.listActiveProjects({
          workspaceId: parsedInput.workspaceId,
          userId: parsedInput.userId,
        }),
        client.listWorkspaceStatuses({
          workspaceId: parsedInput.workspaceId,
          userId: parsedInput.userId,
        }),
      ]);
      const projectTaskSummaries = await Promise.all(
        projects.map(async (project) => ({
          project,
          tasks: await client.listActiveTasks({
            workspaceId: parsedInput.workspaceId,
            projectId: project.id,
            userId: parsedInput.userId,
          }),
        })),
      );

      return buildUserSummary(parsedInput, members, projectTaskSummaries, statuses);
    },
    workspace: async (input) => {
      const parsedInput = parseWorkspaceSummaryToolInput(input);
      const workspaceId = await resolveWorkspaceId(client, parsedInput);
      const [workspace, members, projects, statuses, taskSkills] = await Promise.all([
        client.getWorkspace({
          workspaceId,
          userId: parsedInput.userId,
        }),
        client.listWorkspaceMembers({
          workspaceId,
          userId: parsedInput.userId,
        }),
        client.listActiveProjects({
          workspaceId,
          userId: parsedInput.userId,
        }),
        client.listWorkspaceStatuses({
          workspaceId,
          userId: parsedInput.userId,
        }),
        client.listTaskSkills({
          workspaceId,
          userId: parsedInput.userId,
        }),
      ]);

      return buildWorkspaceSummary(workspace, members, projects, statuses, taskSkills);
    },
  };
}

export function parseUserSummaryToolInput(input: unknown): UserSummaryToolInput {
  const record = readRecord(input, "user summary tool input");
  const parsedInput: UserSummaryToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    userId: readRequiredUuid(record, "userId"),
  };
  const targetUserId = readOptionalUuid(record, "targetUserId");

  if (targetUserId !== undefined) {
    parsedInput.targetUserId = targetUserId;
  }

  return parsedInput;
}

export function parseWorkspaceSummaryToolInput(input: unknown): WorkspaceSummaryToolInput {
  const record = readRecord(input, "workspace summary tool input");
  const parsedInput: WorkspaceSummaryToolInput = {
    userId: readRequiredUuid(record, "userId"),
  };
  const workspaceId = readOptionalUuid(record, "workspaceId");

  if (workspaceId !== undefined) {
    parsedInput.workspaceId = workspaceId;
  }

  return parsedInput;
}

export function parseProjectSummaryToolInput(input: unknown): ProjectSummaryToolInput {
  const record = readRecord(input, "project summary tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

export function parseTaskSummaryToolInput(input: unknown): TaskSummaryToolInput {
  const record = readRecord(input, "task summary tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

async function resolveWorkspaceId(
  client: TaskBackendClient,
  input: WorkspaceSummaryToolInput,
): Promise<string> {
  if (input.workspaceId !== undefined) {
    return input.workspaceId;
  }

  const workspaces = await client.listWorkspaces({ userId: input.userId });
  const firstWorkspace = workspaces[0];

  if (firstWorkspace === undefined) {
    throw new SummaryToolInputError("No visible workspaces were found for userId.");
  }

  return firstWorkspace.id;
}

function buildUserSummary(
  input: UserSummaryToolInput,
  members: WorkspaceMemberResponse[],
  projectTaskSummaries: Array<{
    project: ProjectSummaryResponse;
    tasks: TaskSummaryResponse[];
  }>,
  statuses: WorkspaceStatusResponse[],
): UserSummaryToolResponse {
  const targetUserId = input.targetUserId ?? input.userId;
  const targetMember = members.find((member) => member.userId === targetUserId);

  if (targetMember === undefined) {
    throw new SummaryToolInputError("targetUserId must be a visible workspace member.");
  }

  const statusById = new Map(statuses.map((status) => [status.id, status]));
  const assignedTasks = projectTaskSummaries.flatMap(({ project, tasks }) =>
    tasks
      .filter((task) => task.assigneeUserId === targetUserId)
      .map((task) => ({
        project,
        task,
      })),
  );
  const doneAssignedTasks = assignedTasks.filter(({ task }) => isTaskDone(task, statusById));
  const projectsWithAssignedTasks = new Set(assignedTasks.map(({ project }) => project.id)).size;

  return {
    user: toUserSummaryMember(targetMember),
    counts: {
      assignedTasks: assignedTasks.length,
      openAssignedTasks: assignedTasks.length - doneAssignedTasks.length,
      doneAssignedTasks: doneAssignedTasks.length,
      dueAssignedTasks: assignedTasks.filter(
        ({ task }) => task.dueAt !== null && task.dueAt !== undefined,
      ).length,
      projectsWithAssignedTasks,
    },
    recentAssignedTasks: assignedTasks
      .slice()
      .sort((left, right) => right.task.updatedAt.localeCompare(left.task.updatedAt))
      .slice(0, recentItemLimit)
      .map(({ project, task }) => toUserSummaryAssignedTask(project, task, statusById)),
  };
}

function buildWorkspaceSummary(
  workspace: WorkspaceDetailResponse,
  members: WorkspaceMemberResponse[],
  projects: ProjectSummaryResponse[],
  statuses: WorkspaceStatusResponse[],
  taskSkills: TaskSkillSummaryResponse[],
): WorkspaceSummaryToolResponse {
  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      updatedAt: workspace.updatedAt,
    },
    counts: {
      members: members.length,
      projects: projects.length,
      statuses: statuses.length,
      taskSkills: taskSkills.length,
    },
    members: members.map(toWorkspaceSummaryMember),
    recentProjects: projects
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, recentItemLimit)
      .map(toWorkspaceSummaryProject),
    statuses: statuses.map(toWorkspaceSummaryStatus),
    taskSkills: taskSkills.map(toWorkspaceSummaryTaskSkill),
  };
}

function buildProjectSummary(
  project: ProjectDetailResponse,
  tasks: TaskSummaryResponse[],
): ProjectSummaryToolResponse {
  return {
    project: {
      id: project.id,
      workspaceId: project.workspaceId,
      title: project.title,
      description: project.description ?? null,
      status: project.status ?? "unknown",
      archivedAt: project.archivedAt ?? null,
      updatedAt: project.updatedAt,
    },
    counts: {
      tasks: tasks.length,
      parentTasks: tasks.filter(
        (task) => task.parentTaskId === null || task.parentTaskId === undefined,
      ).length,
      subtasks: tasks.filter(
        (task) => task.parentTaskId !== null && task.parentTaskId !== undefined,
      ).length,
      assignedTasks: tasks.filter(
        (task) => task.assigneeUserId !== null && task.assigneeUserId !== undefined,
      ).length,
      unassignedTasks: tasks.filter(
        (task) => task.assigneeUserId === null || task.assigneeUserId === undefined,
      ).length,
      dueTasks: tasks.filter((task) => task.dueAt !== null && task.dueAt !== undefined).length,
    },
    recentTasks: tasks
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, recentItemLimit)
      .map(toProjectSummaryTask),
  };
}

function buildTaskSummary(
  task: TaskDetailResponse,
  comments: TaskCommentResponse[],
  attachments: TaskAttachmentResponse[],
): TaskSummaryToolResponse {
  return {
    task: {
      id: task.id,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      parentTaskId: task.parentTaskId ?? null,
      title: task.title,
      description: task.description ?? null,
      statusId: task.statusId ?? null,
      assigneeUserId: task.assigneeUserId ?? null,
      dueAt: task.dueAt ?? null,
      archivedAt: task.archivedAt ?? null,
      updatedAt: task.updatedAt,
    },
    counts: {
      comments: comments.length,
      attachments: attachments.length,
    },
    recentComments: comments
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, recentItemLimit)
      .map(toTaskSummaryComment),
    recentAttachments: attachments
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, recentItemLimit)
      .map(toTaskSummaryAttachment),
  };
}

function toUserSummaryMember(member: WorkspaceMemberResponse): UserSummaryMember {
  return {
    userId: member.userId,
    role: member.role,
    displayName: member.displayName,
    email: member.email ?? null,
    avatarUrl: member.avatarUrl ?? null,
  };
}

function toUserSummaryAssignedTask(
  project: ProjectSummaryResponse,
  task: TaskSummaryResponse,
  statusById: Map<string, WorkspaceStatusResponse>,
): UserSummaryAssignedTask {
  const status =
    task.statusId === null || task.statusId === undefined
      ? undefined
      : statusById.get(task.statusId);

  return {
    id: task.id,
    projectId: project.id,
    projectTitle: project.title,
    parentTaskId: task.parentTaskId ?? null,
    title: task.title,
    statusId: task.statusId ?? null,
    statusName: status?.name ?? null,
    isDone: status?.isDone ?? false,
    dueAt: task.dueAt ?? null,
    updatedAt: task.updatedAt,
  };
}

function isTaskDone(
  task: TaskSummaryResponse,
  statusById: Map<string, WorkspaceStatusResponse>,
): boolean {
  if (task.statusId === null || task.statusId === undefined) {
    return false;
  }

  return statusById.get(task.statusId)?.isDone ?? false;
}

function toWorkspaceSummaryMember(
  member: WorkspaceMemberResponse,
): WorkspaceSummaryToolResponse["members"][number] {
  return {
    userId: member.userId,
    role: member.role,
    displayName: member.displayName,
  };
}

function toWorkspaceSummaryProject(project: ProjectSummaryResponse): WorkspaceSummaryProject {
  return {
    id: project.id,
    title: project.title,
    status: project.status ?? "unknown",
    archivedAt: project.archivedAt ?? null,
    updatedAt: project.updatedAt,
  };
}

function toWorkspaceSummaryStatus(
  status: WorkspaceStatusResponse,
): WorkspaceSummaryToolResponse["statuses"][number] {
  return {
    id: status.id,
    name: status.name,
    isDone: status.isDone,
  };
}

function toWorkspaceSummaryTaskSkill(
  taskSkill: TaskSkillSummaryResponse,
): WorkspaceSummaryToolResponse["taskSkills"][number] {
  return {
    id: taskSkill.id,
    name: taskSkill.name,
    aliases: taskSkill.aliases,
  };
}

function toProjectSummaryTask(task: TaskSummaryResponse): ProjectSummaryTask {
  return {
    id: task.id,
    parentTaskId: task.parentTaskId ?? null,
    title: task.title,
    statusId: task.statusId ?? null,
    assigneeUserId: task.assigneeUserId ?? null,
    dueAt: task.dueAt ?? null,
    updatedAt: task.updatedAt,
  };
}

function toTaskSummaryComment(comment: TaskCommentResponse): TaskSummaryComment {
  return {
    id: comment.id,
    authorUserId: comment.authorUserId,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

function toTaskSummaryAttachment(attachment: TaskAttachmentResponse): TaskSummaryAttachment {
  return {
    id: attachment.id,
    kind: attachment.kind,
    title: attachment.title ?? null,
    url: attachment.url ?? null,
    storageKey: attachment.storageKey ?? null,
    telegramFileId: attachment.telegramFileId ?? null,
    mimeType: attachment.mimeType ?? null,
    sizeBytes: attachment.sizeBytes ?? null,
    createdAt: attachment.createdAt,
  };
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new SummaryToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new SummaryToolInputError(`${propertyName} must be a string.`);
  }
  const trimmedValue = value.trim();

  if (!uuidV4Pattern.test(trimmedValue)) {
    throw new SummaryToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return trimmedValue;
}

function readOptionalUuid(
  record: Record<string, unknown>,
  propertyName: string,
): string | undefined {
  const value = record[propertyName];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new SummaryToolInputError(`${propertyName} must be a string.`);
  }
  const trimmedValue = value.trim();

  if (!uuidV4Pattern.test(trimmedValue)) {
    throw new SummaryToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return trimmedValue;
}
