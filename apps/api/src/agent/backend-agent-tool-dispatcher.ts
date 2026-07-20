import { BadRequestException, Injectable } from "@nestjs/common";
import type { AttachmentsService } from "../attachments/attachments.service.js";
import type { ProjectsService } from "../projects/projects.service.js";
import type { StatusesService } from "../statuses/statuses.service.js";
import type { TaskSkillSummaryDto } from "../task-skills/task-skills.dto.js";
import type { TaskSkillsService } from "../task-skills/task-skills.service.js";
import type { TasksService } from "../tasks/tasks.service.js";
import type { WorkspacesService } from "../workspaces/workspaces.service.js";
import type { AgentRuntimeToolCall, TelegramAgentRuntimeContext } from "./agent.runtime.js";
import type {
  AgentToolOperationCall,
  AgentToolOperationDispatcher,
} from "./agent-tool-dispatcher.js";

type AgentProjectsService = Pick<ProjectsService, "createProject">;
type AgentTasksService = Pick<TasksService, "addTaskSubtasks" | "createTask"> &
  Partial<
    Pick<
      TasksService,
      "updateTask" | "updateTaskAssignee" | "updateTaskDueDate" | "updateTaskStatus"
    >
  >;
type AgentTaskSkillsService = Pick<TaskSkillsService, "applyTaskSkill" | "listActiveTaskSkills">;
type AgentWorkspacesService = Pick<WorkspacesService, "listMembers">;
type AgentStatusesService = Pick<StatusesService, "listStatuses">;
type AgentAttachmentsService = Pick<AttachmentsService, "createTaskLinkAttachment">;

type AgentProjectTaskInput = {
  title: string;
  description?: string | null;
};

type AgentCreateProjectInput = {
  title: string;
  description?: string | null;
  tasks?: AgentProjectTaskInput[];
  taskTypeHint?: string;
  taskSkillId?: string;
};

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

@Injectable()
export class BackendAgentToolOperationDispatcher implements AgentToolOperationDispatcher {
  constructor(
    private readonly projectsService: AgentProjectsService,
    private readonly tasksService: AgentTasksService,
    private readonly taskSkillsService: AgentTaskSkillsService,
    private readonly workspacesService?: AgentWorkspacesService,
    private readonly statusesService?: AgentStatusesService,
    private readonly attachmentsService?: AgentAttachmentsService,
  ) {}

  async dispatchToolCall(
    call: AgentToolOperationCall,
    context: TelegramAgentRuntimeContext,
  ): Promise<AgentRuntimeToolCall> {
    const result = await this.executeToolCall(call, context);

    return {
      toolName: call.toolName,
      arguments: call.arguments,
      result,
      status: "success",
      error: null,
      completedAt: new Date(),
    };
  }

  private async executeToolCall(
    call: AgentToolOperationCall,
    context: TelegramAgentRuntimeContext,
  ): Promise<Record<string, unknown>> {
    if (call.toolName === "project_create" || call.toolName === "project.create") {
      const { tasks, taskTypeHint, taskSkillId, ...input } = parseCreateProjectArguments(
        call.arguments,
      );
      if (tasks !== undefined && tasks.length > 0) {
        return this.createProjectWithTasks(input, tasks, taskTypeHint, taskSkillId, context);
      }
      const project = await this.projectsService.createProject(
        context.workspaceId,
        context.userId,
        input,
      );

      return {
        id: project.id,
        title: project.title,
        workspaceId: project.workspaceId,
      };
    }

    if (
      call.toolName === "task_create" ||
      call.toolName === "task.create" ||
      call.toolName === "tasks.create"
    ) {
      const { projectId, taskSkillId, ...input } = parseCreateTaskArguments(call.arguments);
      if (taskSkillId !== undefined) {
        return this.applyTaskSkill(taskSkillId, projectId, input.title, context);
      }
      const skills = await this.taskSkillsService.listActiveTaskSkills(
        context.workspaceId,
        context.userId,
      );
      const matches = findMatchingTaskSkills(skills, context.inputText ?? input.title);
      if (matches.length === 1 && matches[0] !== undefined) {
        return this.applyTaskSkill(matches[0].id, projectId, input.title, context);
      }
      if (matches.length > 1) {
        return {
          kind: "task_skill_selection_required",
          projectId,
          title: input.title,
          candidates: matches.map((skill) => ({
            id: skill.id,
            name: skill.name,
            description: skill.description,
          })),
        };
      }
      const task = await this.tasksService.createTask(
        context.workspaceId,
        projectId,
        context.userId,
        input,
      );

      return {
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        workspaceId: task.workspaceId,
      };
    }

    if (call.toolName === "task_add_subtasks" || call.toolName === "task.add_subtasks") {
      const { projectId, taskId, subtasks } = parseAddTaskSubtasksArguments(call.arguments);
      const createdSubtasks = await this.tasksService.addTaskSubtasks(
        context.workspaceId,
        projectId,
        taskId,
        context.userId,
        { subtasks },
      );

      return {
        createdCount: createdSubtasks.length,
        projectId,
        taskId,
        taskIds: createdSubtasks.map((task) => task.id),
        titles: createdSubtasks.map((task) => task.title),
        workspaceId: context.workspaceId,
      };
    }

    if (call.toolName === "task_update" || call.toolName === "task.update") {
      const { projectId, taskId, ...input } = parseUpdateTaskArguments(call.arguments);
      const task = await this.requireUpdateTask()(
        context.workspaceId,
        projectId,
        taskId,
        context.userId,
        input,
      );
      return {
        kind: "task_updated",
        id: task.id,
        projectId: task.projectId,
        taskId: task.id,
        title: task.title,
        description: task.description,
        workspaceId: task.workspaceId,
      };
    }

    if (call.toolName === "task_set_status" || call.toolName === "task.set_status") {
      const { projectId, taskId, statusName } = parseSetTaskStatusArguments(call.arguments);
      const statuses = await this.requireStatusesService().listStatuses(
        context.workspaceId,
        projectId,
        context.userId,
      );
      const matches = statusName === null ? [] : findMatchingNamedValues(statuses, statusName);
      if (statusName !== null && matches.length === 0) {
        throw new BadRequestException(`Project status "${statusName}" was not found.`);
      }
      if (matches.length > 1) {
        return {
          kind: "status_selection_required",
          projectId,
          taskId,
          query: statusName,
          candidates: matches.map((status) => ({
            id: status.id,
            name: status.name,
            color: status.color,
          })),
        };
      }
      const status = matches[0] ?? null;
      const task = await this.requireUpdateTaskStatus()(
        context.workspaceId,
        projectId,
        taskId,
        context.userId,
        { statusId: status?.id ?? null },
      );
      return {
        kind: "task_status_updated",
        id: task.id,
        projectId: task.projectId,
        taskId: task.id,
        statusId: task.statusId,
        statusName: status?.name ?? null,
        workspaceId: task.workspaceId,
      };
    }

    if (call.toolName === "task_set_assignee" || call.toolName === "task.set_assignee") {
      const { projectId, taskId, assignee } = parseSetTaskAssigneeArguments(call.arguments);
      const members = await this.requireWorkspacesService().listMembers(
        context.workspaceId,
        context.userId,
      );
      const matches = assignee === null ? [] : findMatchingWorkspaceMembers(members, assignee);
      if (assignee !== null && matches.length === 0) {
        throw new BadRequestException(`Workspace member "${assignee}" was not found.`);
      }
      if (matches.length > 1) {
        return {
          kind: "assignee_selection_required",
          projectId,
          taskId,
          query: assignee,
          candidates: matches.map((member) => ({
            userId: member.userId,
            displayName: member.displayName,
            email: member.email,
          })),
        };
      }
      const member = matches[0] ?? null;
      const task = await this.requireUpdateTaskAssignee()(
        context.workspaceId,
        projectId,
        taskId,
        context.userId,
        { assigneeUserId: member?.userId ?? null },
      );
      return {
        kind: "task_assignee_updated",
        id: task.id,
        projectId: task.projectId,
        taskId: task.id,
        assigneeUserId: task.assigneeUserId,
        assigneeName: member?.displayName ?? null,
        workspaceId: task.workspaceId,
      };
    }

    if (call.toolName === "task_set_due_date" || call.toolName === "task.set_due_date") {
      const { projectId, taskId, dueAt } = parseSetTaskDueDateArguments(call.arguments);
      const task = await this.requireUpdateTaskDueDate()(
        context.workspaceId,
        projectId,
        taskId,
        context.userId,
        { dueAt },
      );
      return {
        kind: "task_due_date_updated",
        id: task.id,
        projectId: task.projectId,
        taskId: task.id,
        dueAt: task.dueAt?.toISOString() ?? null,
        workspaceId: task.workspaceId,
      };
    }

    if (
      call.toolName === "task_add_link_attachment" ||
      call.toolName === "task.add_link_attachment"
    ) {
      const { projectId, taskId, ...input } = parseAddLinkAttachmentArguments(call.arguments);
      const attachment = await this.requireAttachmentsService().createTaskLinkAttachment(
        context.workspaceId,
        projectId,
        taskId,
        context.userId,
        input,
      );
      return {
        kind: "task_link_attachment_added",
        id: attachment.id,
        attachmentId: attachment.id,
        projectId,
        taskId,
        title: attachment.title,
        url: attachment.url,
        workspaceId: attachment.workspaceId,
      };
    }

    throw new BadRequestException(`Unsupported agent tool: ${call.toolName}`);
  }

  private requireUpdateTask(): TasksService["updateTask"] {
    const method = this.tasksService.updateTask;
    if (method === undefined)
      throw new BadRequestException("Agent task update service is unavailable.");
    return method.bind(this.tasksService);
  }

  private requireUpdateTaskAssignee(): TasksService["updateTaskAssignee"] {
    const method = this.tasksService.updateTaskAssignee;
    if (method === undefined) {
      throw new BadRequestException("Agent task assignee service is unavailable.");
    }
    return method.bind(this.tasksService);
  }

  private requireUpdateTaskDueDate(): TasksService["updateTaskDueDate"] {
    const method = this.tasksService.updateTaskDueDate;
    if (method === undefined) {
      throw new BadRequestException("Agent task due date service is unavailable.");
    }
    return method.bind(this.tasksService);
  }

  private requireUpdateTaskStatus(): TasksService["updateTaskStatus"] {
    const method = this.tasksService.updateTaskStatus;
    if (method === undefined) {
      throw new BadRequestException("Agent task status service is unavailable.");
    }
    return method.bind(this.tasksService);
  }

  private requireWorkspacesService(): AgentWorkspacesService {
    if (this.workspacesService === undefined) {
      throw new BadRequestException("Agent workspace member service is unavailable.");
    }
    return this.workspacesService;
  }

  private requireStatusesService(): AgentStatusesService {
    if (this.statusesService === undefined) {
      throw new BadRequestException("Agent project status service is unavailable.");
    }
    return this.statusesService;
  }

  private requireAttachmentsService(): AgentAttachmentsService {
    if (this.attachmentsService === undefined) {
      throw new BadRequestException("Agent attachment service is unavailable.");
    }
    return this.attachmentsService;
  }

  private async createProjectWithTasks(
    projectInput: Pick<AgentCreateProjectInput, "description" | "title">,
    tasks: AgentProjectTaskInput[],
    taskTypeHint: string | undefined,
    taskSkillId: string | undefined,
    context: TelegramAgentRuntimeContext,
  ): Promise<Record<string, unknown>> {
    let resolvedTaskSkillId = taskSkillId;
    if (resolvedTaskSkillId === undefined) {
      const skills = await this.taskSkillsService.listActiveTaskSkills(
        context.workspaceId,
        context.userId,
      );
      const matchingText =
        taskTypeHint ?? context.inputText ?? tasks.map((task) => task.title).join(" ");
      const matches = findMatchingTaskSkills(skills, matchingText);
      if (matches.length > 1) {
        return {
          kind: "task_skill_selection_required",
          title: projectInput.title,
          taskTypeHint: taskTypeHint ?? null,
          candidates: matches.map((skill) => ({
            id: skill.id,
            name: skill.name,
            description: skill.description,
          })),
        };
      }
      resolvedTaskSkillId = matches[0]?.id;
    }

    const project = await this.projectsService.createProject(
      context.workspaceId,
      context.userId,
      projectInput,
    );
    const createdTasks: Array<{
      id: string;
      title: string;
      createdSubtaskCount: number;
    }> = [];

    for (const taskInput of tasks) {
      if (resolvedTaskSkillId !== undefined) {
        const result = await this.taskSkillsService.applyTaskSkill(
          context.workspaceId,
          resolvedTaskSkillId,
          context.userId,
          { projectId: project.id, rootTaskTitle: taskInput.title },
        );
        createdTasks.push({
          id: result.rootTask.id,
          title: result.rootTask.title,
          createdSubtaskCount: result.subtasks.length,
        });
        continue;
      }

      const task = await this.tasksService.createTask(
        context.workspaceId,
        project.id,
        context.userId,
        taskInput,
      );
      createdTasks.push({ id: task.id, title: task.title, createdSubtaskCount: 0 });
    }

    return {
      kind: "project_with_tasks_created",
      id: project.id,
      title: project.title,
      workspaceId: project.workspaceId,
      createdTaskCount: createdTasks.length,
      createdSubtaskCount: createdTasks.reduce(
        (total, task) => total + task.createdSubtaskCount,
        0,
      ),
      tasks: createdTasks,
      ...(resolvedTaskSkillId === undefined ? {} : { taskSkillId: resolvedTaskSkillId }),
    };
  }

  private async applyTaskSkill(
    taskSkillId: string,
    projectId: string,
    rootTaskTitle: string,
    context: TelegramAgentRuntimeContext,
  ): Promise<Record<string, unknown>> {
    const result = await this.taskSkillsService.applyTaskSkill(
      context.workspaceId,
      taskSkillId,
      context.userId,
      { projectId, rootTaskTitle },
    );
    return {
      kind: "task_skill_applied",
      id: result.rootTask.id,
      projectId: result.projectId,
      title: result.rootTask.title,
      workspaceId: result.workspaceId,
      taskSkillId: result.taskSkillId,
      taskSkillVersion: result.taskSkillVersion,
      createdSubtaskCount: result.subtasks.length,
    };
  }
}

function parseAddTaskSubtasksArguments(value: Record<string, unknown>): {
  projectId: string;
  taskId: string;
  subtasks: Array<{ title: string; description?: string | null }>;
} {
  const projectId = readUuid(value, "projectId");
  const taskId = readUuid(value, "taskId");
  // biome-ignore lint/complexity/useLiteralKeys: strict index-signature access requires brackets.
  const candidateSubtasks = value["subtasks"];

  if (!Array.isArray(candidateSubtasks) || candidateSubtasks.length === 0) {
    throw new BadRequestException("Agent tool subtasks must be a non-empty array.");
  }

  const subtasks = candidateSubtasks.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new BadRequestException(`Agent tool subtasks[${index}] must be an object.`);
    }

    const title = readRequiredString(candidate, "title");
    const description = readOptionalNullableString(candidate, "description");
    return description === undefined ? { title } : { title, description };
  });

  return { projectId, taskId, subtasks };
}

function parseCreateProjectArguments(value: Record<string, unknown>): AgentCreateProjectInput {
  const title = readRequiredString(value, "title");
  const description = readOptionalNullableString(value, "description");
  const taskTypeHint = readOptionalString(value, "taskTypeHint");
  const taskSkillId = readOptionalUuid(value, "taskSkillId");
  const tasks = readOptionalProjectTasks(value);

  return {
    title,
    ...(description === undefined ? {} : { description }),
    ...(taskTypeHint === undefined ? {} : { taskTypeHint }),
    ...(taskSkillId === undefined ? {} : { taskSkillId }),
    ...(tasks === undefined ? {} : { tasks }),
  };
}

function readOptionalProjectTasks(
  value: Record<string, unknown>,
): AgentProjectTaskInput[] | undefined {
  const candidate = value["tasks"];
  if (candidate === undefined) return undefined;
  if (!Array.isArray(candidate) || candidate.length > 100) {
    throw new BadRequestException("Agent tool tasks must contain no more than 100 items.");
  }
  return candidate.map((item, index) => {
    if (!isRecord(item)) {
      throw new BadRequestException(`Agent tool tasks[${index}] must be an object.`);
    }
    const title = readRequiredString(item, "title");
    const description = readOptionalNullableString(item, "description");
    return description === undefined ? { title } : { title, description };
  });
}

function parseCreateTaskArguments(value: Record<string, unknown>): {
  projectId: string;
  title: string;
  description?: string | null;
  taskSkillId?: string;
} {
  const projectId = readUuid(value, "projectId");
  const title = readRequiredString(value, "title");
  const description = readOptionalNullableString(value, "description");
  const taskSkillId = readOptionalUuid(value, "taskSkillId");
  return {
    projectId,
    title,
    ...(description === undefined ? {} : { description }),
    ...(taskSkillId === undefined ? {} : { taskSkillId }),
  };
}

function parseUpdateTaskArguments(value: Record<string, unknown>): {
  projectId: string;
  taskId: string;
  title?: string;
  description?: string | null;
} {
  const projectId = readUuid(value, "projectId");
  const taskId = readUuid(value, "taskId");
  const title = readOptionalString(value, "title");
  const description = readOptionalNullableString(value, "description");
  if (title === undefined && description === undefined) {
    throw new BadRequestException("Agent tool task_update must include title or description.");
  }
  return {
    projectId,
    taskId,
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
  };
}

function parseSetTaskStatusArguments(value: Record<string, unknown>): {
  projectId: string;
  taskId: string;
  statusName: string | null;
} {
  return {
    projectId: readUuid(value, "projectId"),
    taskId: readUuid(value, "taskId"),
    statusName: readRequiredNullableString(value, "statusName"),
  };
}

function parseSetTaskAssigneeArguments(value: Record<string, unknown>): {
  projectId: string;
  taskId: string;
  assignee: string | null;
} {
  return {
    projectId: readUuid(value, "projectId"),
    taskId: readUuid(value, "taskId"),
    assignee: readRequiredNullableString(value, "assignee"),
  };
}

function parseSetTaskDueDateArguments(value: Record<string, unknown>): {
  projectId: string;
  taskId: string;
  dueAt: string | null;
} {
  const dueAt = readRequiredNullableString(value, "dueAt");
  if (dueAt !== null && Number.isNaN(Date.parse(dueAt))) {
    throw new BadRequestException("Agent tool dueAt must be an ISO 8601 date-time or null.");
  }
  return {
    projectId: readUuid(value, "projectId"),
    taskId: readUuid(value, "taskId"),
    dueAt,
  };
}

function parseAddLinkAttachmentArguments(value: Record<string, unknown>): {
  projectId: string;
  taskId: string;
  url: string;
  title?: string | null;
} {
  const url = readRequiredString(value, "url");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new BadRequestException("Agent tool url must be a valid HTTP or HTTPS URL.");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new BadRequestException("Agent tool url must use HTTP or HTTPS.");
  }
  const title = readOptionalNullableString(value, "title");
  return {
    projectId: readUuid(value, "projectId"),
    taskId: readUuid(value, "taskId"),
    url: parsedUrl.toString(),
    ...(title === undefined ? {} : { title }),
  };
}

export function findMatchingTaskSkills(
  skills: TaskSkillSummaryDto[],
  requestText: string,
): TaskSkillSummaryDto[] {
  const requestTokens = tokenize(requestText);
  return skills.filter((skill) => {
    const skillTokens = tokenize([skill.name, ...skill.aliases].join(" ")).filter(
      (token) => !ignoredSkillTokens.has(token),
    );
    return skillTokens.some((skillToken) =>
      requestTokens.some((requestToken) => tokensMatch(skillToken, requestToken)),
    );
  });
}

export function findMatchingWorkspaceMembers<
  TMember extends { displayName: string; email: string | null; userId: string },
>(members: TMember[], query: string): TMember[] {
  return rankHumanReadableMatches(members, query, (member) => [
    member.displayName,
    member.email,
    member.userId,
  ]);
}

function findMatchingNamedValues<TValue extends { name: string }>(
  values: TValue[],
  query: string,
): TValue[] {
  return rankHumanReadableMatches(values, query, (value) => [value.name]);
}

function rankHumanReadableMatches<TValue>(
  values: TValue[],
  query: string,
  selectSearchValues: (value: TValue) => Array<string | null>,
): TValue[] {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenize(normalizedQuery);
  return values
    .map((value, index) => ({
      value,
      index,
      rank: getHumanReadableMatchRank(
        selectSearchValues(value).filter((item): item is string => item !== null),
        normalizedQuery,
        queryTokens,
      ),
    }))
    .filter(
      (candidate): candidate is { value: TValue; index: number; rank: number } =>
        candidate.rank !== null,
    )
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((candidate) => candidate.value);
}

function getHumanReadableMatchRank(
  values: string[],
  normalizedQuery: string,
  queryTokens: string[],
): number | null {
  const normalizedValues = values.map(normalizeSearchText);
  if (normalizedValues.some((value) => value === normalizedQuery)) return 0;
  const valueTokens = normalizedValues.flatMap(tokenize);
  if (
    queryTokens.length > 0 &&
    queryTokens.every((queryToken) =>
      valueTokens.some((valueToken) => tokensMatch(valueToken, queryToken)),
    )
  ) {
    return 1;
  }
  if (normalizedValues.some((value) => value.startsWith(normalizedQuery))) return 2;
  if (normalizedValues.some((value) => value.includes(normalizedQuery))) return 3;
  return null;
}

function readUuid(value: Record<string, unknown>, key: string): string {
  const candidate = readRequiredString(value, key);
  if (!uuidV4Pattern.test(candidate)) {
    throw new BadRequestException(`Agent tool ${key} must be a UUID v4.`);
  }

  return candidate;
}

function readOptionalUuid(value: Record<string, unknown>, key: string): string | undefined {
  const candidate = value[key];
  if (candidate === undefined) return undefined;
  if (typeof candidate !== "string" || !uuidV4Pattern.test(candidate)) {
    throw new BadRequestException(`Agent tool ${key} must be a UUID v4.`);
  }
  return candidate;
}

function readRequiredString(value: Record<string, unknown>, key: string): string {
  const candidate = value[key];
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new BadRequestException(`Agent tool ${key} must be a non-empty string.`);
  }

  return candidate.trim();
}

function readOptionalNullableString(
  value: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const candidate = value[key];
  if (candidate === undefined || candidate === null) {
    return candidate;
  }

  if (typeof candidate !== "string") {
    throw new BadRequestException(`Agent tool ${key} must be a string or null.`);
  }

  return candidate;
}

function readRequiredNullableString(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  if (candidate === null) return null;
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new BadRequestException(`Agent tool ${key} must be a non-empty string or null.`);
  }
  return candidate.trim();
}

function readOptionalString(value: Record<string, unknown>, key: string): string | undefined {
  const candidate = value[key];
  if (candidate === undefined) return undefined;
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new BadRequestException(`Agent tool ${key} must be a non-empty string.`);
  }
  return candidate.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ignoredSkillTokens = new Set([
  "задача",
  "задачи",
  "задачу",
  "проект",
  "проекта",
  "шаблон",
  "шаблона",
  "task",
  "template",
]);

function tokenize(value: string): string[] {
  return (
    value
      .normalize("NFKC")
      .toLocaleLowerCase("ru")
      .replaceAll("ё", "е")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

function normalizeSearchText(value: string): string {
  return tokenize(value).join(" ");
}

function tokensMatch(skillToken: string, requestToken: string): boolean {
  if (skillToken === requestToken) return true;
  if (skillToken.length < 4 || requestToken.length < 4) return false;
  const shorterLength = Math.min(skillToken.length, requestToken.length);
  let commonPrefixLength = 0;
  while (
    commonPrefixLength < shorterLength &&
    skillToken[commonPrefixLength] === requestToken[commonPrefixLength]
  ) {
    commonPrefixLength += 1;
  }
  return commonPrefixLength >= Math.max(4, shorterLength - 1);
}
