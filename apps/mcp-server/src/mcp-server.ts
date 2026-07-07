import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import type { TaskBackendClient } from "./backend-client.js";
import { createProjectToolHandlers, type ProjectToolHandlers } from "./project-tools.js";
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

type TaskSkillApplyMcpArgs = z.output<z.ZodObject<typeof taskSkillApplyInputSchema>>;
type ProjectSearchMcpArgs = z.output<z.ZodObject<typeof projectSearchInputSchema>>;
type ProjectGetMcpArgs = z.output<z.ZodObject<typeof projectGetInputSchema>>;
type ProjectCreateMcpArgs = z.output<z.ZodObject<typeof projectCreateInputSchema>>;
type TaskSearchMcpArgs = z.output<z.ZodObject<typeof taskSearchInputSchema>>;
type TaskMcpToolCallback = (
  args:
    | TaskSkillApplyMcpArgs
    | ProjectSearchMcpArgs
    | ProjectGetMcpArgs
    | ProjectCreateMcpArgs
    | TaskSearchMcpArgs,
) => Promise<CallToolResult>;

export type TaskMcpToolRegistrar = {
  registerTool(
    name: string,
    config: {
      title: string;
      description: string;
      inputSchema:
        | typeof taskSkillApplyInputSchema
        | typeof projectSearchInputSchema
        | typeof projectGetInputSchema
        | typeof projectCreateInputSchema
        | typeof taskSearchInputSchema;
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

  registerProjectTools(server, createProjectToolHandlers(options.backendClient));
  registerTaskTools(server, createTaskToolHandlers(options.backendClient));
  registerTaskSkillApplyTools(server, createTaskSkillToolHandlers(options.backendClient));

  return server;
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
