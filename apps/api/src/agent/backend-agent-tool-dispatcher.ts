import { BadRequestException, Injectable } from "@nestjs/common";
import type { ProjectsService } from "../projects/projects.service.js";
import type { TasksService } from "../tasks/tasks.service.js";
import type { AgentRuntimeToolCall, TelegramAgentRuntimeContext } from "./agent.runtime.js";
import type {
  AgentToolOperationCall,
  AgentToolOperationDispatcher,
} from "./agent-tool-dispatcher.js";

type AgentProjectsService = Pick<ProjectsService, "createProject">;
type AgentTasksService = Pick<TasksService, "addTaskSubtasks" | "createTask">;

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

@Injectable()
export class BackendAgentToolOperationDispatcher implements AgentToolOperationDispatcher {
  constructor(
    private readonly projectsService: AgentProjectsService,
    private readonly tasksService: AgentTasksService,
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
      const input = parseCreateProjectArguments(call.arguments);
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
      const { projectId, ...input } = parseCreateTaskArguments(call.arguments);
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

    throw new BadRequestException(`Unsupported agent tool: ${call.toolName}`);
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

function parseCreateProjectArguments(value: Record<string, unknown>): {
  title: string;
  description?: string | null;
} {
  const title = readRequiredString(value, "title");
  const description = readOptionalNullableString(value, "description");

  return description === undefined ? { title } : { title, description };
}

function parseCreateTaskArguments(value: Record<string, unknown>): {
  projectId: string;
  title: string;
  description?: string | null;
} {
  const projectId = readUuid(value, "projectId");

  const title = readRequiredString(value, "title");
  const description = readOptionalNullableString(value, "description");

  return description === undefined ? { projectId, title } : { projectId, title, description };
}

function readUuid(value: Record<string, unknown>, key: string): string {
  const candidate = readRequiredString(value, key);
  if (!uuidV4Pattern.test(candidate)) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
