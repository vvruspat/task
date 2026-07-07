import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import type { TaskBackendClient } from "./backend-client.js";
import { createProjectToolHandlers, type ProjectToolHandlers } from "./project-tools.js";
import { createStatusToolHandlers, type StatusToolHandlers } from "./status-tools.js";
import { createTaskSkillToolHandlers, type TaskSkillToolHandlers } from "./task-skill-tools.js";
import { createTaskToolHandlers, type TaskToolHandlers } from "./task-tools.js";

const taskSkillApplyInputSchema = {
  workspaceId: z.string().uuid(),
  taskSkillId: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  rootTaskTitle: z.string().min(1),
  overrides: z
    .object({
      removeSubtasks: z.array(z.string().min(1)).optional(),
      addSubtasks: z.array(z.string().min(1)).optional(),
    })
    .optional(),
};

const projectSearchInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  query: z.string().min(1).optional(),
};

const statusListInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
};

const projectGetInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
};

const projectCreateInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1).nullable().optional(),
  status: z.string().min(1).nullable().optional(),
  position: z.string().min(1).nullable().optional(),
};

const taskSearchInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  query: z.string().min(1).optional(),
};

const taskGetInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
};

const taskCreateInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  parentTaskId: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
};

const taskSetStatusInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  statusId: z.string().uuid().nullable(),
};

const taskSetAssigneeInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  assigneeUserId: z.string().uuid().nullable(),
};

const taskSetDueDateInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  dueAt: z.string().datetime().nullable(),
};

type TaskSkillApplyMcpArgs = z.output<z.ZodObject<typeof taskSkillApplyInputSchema>>;
type StatusListMcpArgs = z.output<z.ZodObject<typeof statusListInputSchema>>;
type ProjectSearchMcpArgs = z.output<z.ZodObject<typeof projectSearchInputSchema>>;
type ProjectGetMcpArgs = z.output<z.ZodObject<typeof projectGetInputSchema>>;
type ProjectCreateMcpArgs = z.output<z.ZodObject<typeof projectCreateInputSchema>>;
type TaskSearchMcpArgs = z.output<z.ZodObject<typeof taskSearchInputSchema>>;
type TaskGetMcpArgs = z.output<z.ZodObject<typeof taskGetInputSchema>>;
type TaskCreateMcpArgs = z.output<z.ZodObject<typeof taskCreateInputSchema>>;
type TaskSetStatusMcpArgs = z.output<z.ZodObject<typeof taskSetStatusInputSchema>>;
type TaskSetAssigneeMcpArgs = z.output<z.ZodObject<typeof taskSetAssigneeInputSchema>>;
type TaskSetDueDateMcpArgs = z.output<z.ZodObject<typeof taskSetDueDateInputSchema>>;
type TaskMcpToolCallback = (
  args:
    | TaskSkillApplyMcpArgs
    | StatusListMcpArgs
    | ProjectSearchMcpArgs
    | ProjectGetMcpArgs
    | ProjectCreateMcpArgs
    | TaskSearchMcpArgs
    | TaskGetMcpArgs
    | TaskCreateMcpArgs
    | TaskSetStatusMcpArgs
    | TaskSetAssigneeMcpArgs
    | TaskSetDueDateMcpArgs,
) => Promise<CallToolResult>;

export type TaskMcpToolRegistrar = {
  registerTool(
    name: string,
    config: {
      title: string;
      description: string;
      inputSchema:
        | typeof taskSkillApplyInputSchema
        | typeof statusListInputSchema
        | typeof projectSearchInputSchema
        | typeof projectGetInputSchema
        | typeof projectCreateInputSchema
        | typeof taskSearchInputSchema
        | typeof taskGetInputSchema
        | typeof taskCreateInputSchema
        | typeof taskSetStatusInputSchema
        | typeof taskSetAssigneeInputSchema
        | typeof taskSetDueDateInputSchema;
    },
    callback: TaskMcpToolCallback,
  ): unknown;
};

export type TaskSkillToolRegistrar = TaskMcpToolRegistrar;

export type TaskMcpServerOptions = {
  backendClient: TaskBackendClient;
  name?: string;
  version?: string;
};

export function createTaskMcpServer(options: TaskMcpServerOptions): McpServer {
  const server = new McpServer({
    name: options.name ?? "task-mcp-server",
    version: options.version ?? "0.0.0",
  });

  registerStatusTools(server, createStatusToolHandlers(options.backendClient));
  registerProjectTools(server, createProjectToolHandlers(options.backendClient));
  registerTaskTools(server, createTaskToolHandlers(options.backendClient));
  registerTaskSkillApplyTools(server, createTaskSkillToolHandlers(options.backendClient));

  return server;
}

export function registerStatusTools(
  registrar: TaskMcpToolRegistrar,
  handlers: StatusToolHandlers,
): void {
  registrar.registerTool(
    "status.list",
    {
      title: "List statuses",
      description: "List statuses for one visible workspace.",
      inputSchema: statusListInputSchema,
    },
    async (input) => toToolResult(await handlers.list(input)),
  );
}

export function registerProjectTools(
  registrar: TaskMcpToolRegistrar,
  handlers: ProjectToolHandlers,
): void {
  registrar.registerTool(
    "project.create",
    {
      title: "Create project",
      description: "Create a project in a visible workspace.",
      inputSchema: projectCreateInputSchema,
    },
    async (input) => toToolResult(await handlers.create(input)),
  );

  registrar.registerTool(
    "project.get",
    {
      title: "Get project",
      description: "Get one visible project in a workspace.",
      inputSchema: projectGetInputSchema,
    },
    async (input) => toToolResult(await handlers.get(input)),
  );

  registrar.registerTool(
    "project.search",
    {
      title: "Search projects",
      description: "Search active projects in a workspace by title.",
      inputSchema: projectSearchInputSchema,
    },
    async (input) => toToolResult(await handlers.search(input)),
  );
}

export function registerTaskTools(
  registrar: TaskMcpToolRegistrar,
  handlers: TaskToolHandlers,
): void {
  registrar.registerTool(
    "task.create",
    {
      title: "Create task",
      description: "Create a task in a visible project.",
      inputSchema: taskCreateInputSchema,
    },
    async (input) => toToolResult(await handlers.create(input)),
  );

  registrar.registerTool(
    "task.set_status",
    {
      title: "Set task status",
      description: "Set or clear one visible task status.",
      inputSchema: taskSetStatusInputSchema,
    },
    async (input) => toToolResult(await handlers.setStatus(input)),
  );

  registrar.registerTool(
    "task.set_assignee",
    {
      title: "Set task assignee",
      description: "Set or clear one visible task assignee.",
      inputSchema: taskSetAssigneeInputSchema,
    },
    async (input) => toToolResult(await handlers.setAssignee(input)),
  );

  registrar.registerTool(
    "task.set_due_date",
    {
      title: "Set task due date",
      description: "Set or clear one visible task due date.",
      inputSchema: taskSetDueDateInputSchema,
    },
    async (input) => toToolResult(await handlers.setDueDate(input)),
  );

  registrar.registerTool(
    "task.get",
    {
      title: "Get task",
      description: "Get one visible task in a project.",
      inputSchema: taskGetInputSchema,
    },
    async (input) => toToolResult(await handlers.get(input)),
  );

  registrar.registerTool(
    "task.search",
    {
      title: "Search tasks",
      description: "Search active tasks in a project by title.",
      inputSchema: taskSearchInputSchema,
    },
    async (input) => toToolResult(await handlers.search(input)),
  );
}

export function registerTaskSkillApplyTools(
  registrar: TaskMcpToolRegistrar,
  handlers: TaskSkillToolHandlers,
): void {
  registrar.registerTool(
    "skill.preview_apply",
    {
      title: "Preview task skill application",
      description: "Preview applying a task skill to a project without creating tasks.",
      inputSchema: taskSkillApplyInputSchema,
    },
    async (input) => toToolResult(await handlers.previewApply(input)),
  );

  registrar.registerTool(
    "skill.apply",
    {
      title: "Apply task skill",
      description: "Apply a task skill to a project and create the resulting task tree.",
      inputSchema: taskSkillApplyInputSchema,
    },
    async (input) => toToolResult(await handlers.apply(input)),
  );
}

export async function connectTaskMcpServerToStdio(server: McpServer): Promise<void> {
  await server.connect(new StdioServerTransport());
}

function toToolResult(value: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}
