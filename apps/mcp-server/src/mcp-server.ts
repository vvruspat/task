import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import { type AttachmentToolHandlers, createAttachmentToolHandlers } from "./attachment-tools.js";
import type { TaskBackendClient } from "./backend-client.js";
import { type CommentToolHandlers, createCommentToolHandlers } from "./comment-tools.js";
import {
  type ConfirmationToolHandlers,
  createConfirmationToolHandlers,
} from "./confirmation-tools.js";
import { createProjectToolHandlers, type ProjectToolHandlers } from "./project-tools.js";
import { createStatusToolHandlers, type StatusToolHandlers } from "./status-tools.js";
import { createSummaryToolHandlers, type SummaryToolHandlers } from "./summary-tools.js";
import { createTaskSkillToolHandlers, type TaskSkillToolHandlers } from "./task-skill-tools.js";
import { createTaskToolHandlers, type TaskToolHandlers } from "./task-tools.js";
import { createWorkspaceToolHandlers, type WorkspaceToolHandlers } from "./workspace-tools.js";

const workspaceGetCurrentInputSchema = {
  userId: z.string().uuid(),
  workspaceId: z.string().uuid().optional(),
};

const workspaceMemberListInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
};

const workspaceUserResolveInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  query: z.string().min(1),
  limit: z.number().int().min(1).max(20).optional(),
};

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

const taskSkillSearchInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  query: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(20).optional(),
};

const taskSkillGetInputSchema = {
  workspaceId: z.string().uuid(),
  taskSkillId: z.string().uuid(),
  userId: z.string().uuid(),
};

const taskSkillCreateInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1).nullable().optional(),
  aliases: z.array(z.string().min(1)).optional(),
  definition: z.record(z.string(), z.unknown()),
};

const taskSkillCloneInputSchema = {
  workspaceId: z.string().uuid(),
  taskSkillId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1).nullable().optional(),
  aliases: z.array(z.string().min(1)).optional(),
};

const taskSkillUpdateMetadataInputSchema = {
  workspaceId: z.string().uuid(),
  taskSkillId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).nullable().optional(),
  aliases: z.array(z.string().min(1)).optional(),
};

const taskSkillUpdateDefinitionInputSchema = {
  workspaceId: z.string().uuid(),
  taskSkillId: z.string().uuid(),
  userId: z.string().uuid(),
  definition: z.record(z.string(), z.unknown()),
};

const confirmationListPendingInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
};

const confirmationGetInputSchema = {
  workspaceId: z.string().uuid(),
  confirmationRequestId: z.string().uuid(),
  userId: z.string().uuid(),
};

const confirmationCreateInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  agentRunId: z.string().uuid(),
  kind: z.string().min(1),
  preview: z.record(z.string(), z.unknown()),
  expiresAt: z.string().datetime(),
};

const confirmationCancelInputSchema = confirmationGetInputSchema;

const projectSearchInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  query: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(20).optional(),
};

const statusListInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
};

const commentListInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
};

const commentCreateInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  body: z.string().min(1),
};

const attachmentListInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
};

const taskSummaryInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
};

const projectSummaryInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
};

const workspaceSummaryInputSchema = {
  userId: z.string().uuid(),
  workspaceId: z.string().uuid().optional(),
};

const userSummaryInputSchema = {
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
};

const attachmentCreateLinkInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  url: z.string().url(),
  title: z.string().nullable().optional(),
};

const attachmentCreateFileInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  storageKey: z.string().min(1),
  title: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.string().nullable().optional(),
};

const attachmentCreateTelegramFileInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  telegramFileId: z.string().min(1),
  title: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.string().nullable().optional(),
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

const projectUpdateInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).nullable().optional(),
  status: z.string().min(1).nullable().optional(),
  position: z.string().min(1).nullable().optional(),
};

const taskSearchInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  query: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(20).optional(),
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

const taskUpdateInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
};

const taskAddSubtasksInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  subtasks: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        position: z
          .string()
          .regex(/^-?\d+(\.\d+)?$/)
          .nullable()
          .optional(),
        dueAt: z.string().datetime().nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1),
};

const taskMoveInputSchema = {
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  userId: z.string().uuid(),
  parentTaskId: z.string().uuid().nullable(),
  position: z.string().regex(/^-?\d+(\.\d+)?$/),
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
type TaskSkillCreateMcpArgs = z.output<z.ZodObject<typeof taskSkillCreateInputSchema>>;
type TaskSkillUpdateMetadataMcpArgs = z.output<
  z.ZodObject<typeof taskSkillUpdateMetadataInputSchema>
>;
type TaskSkillUpdateDefinitionMcpArgs = z.output<
  z.ZodObject<typeof taskSkillUpdateDefinitionInputSchema>
>;
type TaskSkillSearchMcpArgs = z.output<z.ZodObject<typeof taskSkillSearchInputSchema>>;
type TaskSkillGetMcpArgs = z.output<z.ZodObject<typeof taskSkillGetInputSchema>>;
type ConfirmationListPendingMcpArgs = z.output<
  z.ZodObject<typeof confirmationListPendingInputSchema>
>;
type ConfirmationGetMcpArgs = z.output<z.ZodObject<typeof confirmationGetInputSchema>>;
type ConfirmationCreateMcpArgs = z.output<z.ZodObject<typeof confirmationCreateInputSchema>>;
type WorkspaceGetCurrentMcpArgs = z.output<z.ZodObject<typeof workspaceGetCurrentInputSchema>>;
type WorkspaceMemberListMcpArgs = z.output<z.ZodObject<typeof workspaceMemberListInputSchema>>;
type WorkspaceUserResolveMcpArgs = z.output<z.ZodObject<typeof workspaceUserResolveInputSchema>>;
type UserSummaryMcpArgs = z.output<z.ZodObject<typeof userSummaryInputSchema>>;
type StatusListMcpArgs = z.output<z.ZodObject<typeof statusListInputSchema>>;
type CommentListMcpArgs = z.output<z.ZodObject<typeof commentListInputSchema>>;
type CommentCreateMcpArgs = z.output<z.ZodObject<typeof commentCreateInputSchema>>;
type AttachmentListMcpArgs = z.output<z.ZodObject<typeof attachmentListInputSchema>>;
type AttachmentCreateLinkMcpArgs = z.output<z.ZodObject<typeof attachmentCreateLinkInputSchema>>;
type AttachmentCreateFileMcpArgs = z.output<z.ZodObject<typeof attachmentCreateFileInputSchema>>;
type ProjectSearchMcpArgs = z.output<z.ZodObject<typeof projectSearchInputSchema>>;
type ProjectGetMcpArgs = z.output<z.ZodObject<typeof projectGetInputSchema>>;
type ProjectArchiveMcpArgs = z.output<z.ZodObject<typeof projectGetInputSchema>>;
type ProjectCreateMcpArgs = z.output<z.ZodObject<typeof projectCreateInputSchema>>;
type ProjectUpdateMcpArgs = z.output<z.ZodObject<typeof projectUpdateInputSchema>>;
type TaskSearchMcpArgs = z.output<z.ZodObject<typeof taskSearchInputSchema>>;
type TaskGetMcpArgs = z.output<z.ZodObject<typeof taskGetInputSchema>>;
type TaskArchiveMcpArgs = z.output<z.ZodObject<typeof taskGetInputSchema>>;
type TaskCreateMcpArgs = z.output<z.ZodObject<typeof taskCreateInputSchema>>;
type TaskAddSubtasksMcpArgs = z.output<z.ZodObject<typeof taskAddSubtasksInputSchema>>;
type TaskUpdateMcpArgs = z.output<z.ZodObject<typeof taskUpdateInputSchema>>;
type TaskMoveMcpArgs = z.output<z.ZodObject<typeof taskMoveInputSchema>>;
type TaskSetStatusMcpArgs = z.output<z.ZodObject<typeof taskSetStatusInputSchema>>;
type TaskSetAssigneeMcpArgs = z.output<z.ZodObject<typeof taskSetAssigneeInputSchema>>;
type TaskSetDueDateMcpArgs = z.output<z.ZodObject<typeof taskSetDueDateInputSchema>>;
type TaskMcpToolCallback = (
  args:
    | TaskSkillApplyMcpArgs
    | TaskSkillCreateMcpArgs
    | TaskSkillUpdateMetadataMcpArgs
    | TaskSkillUpdateDefinitionMcpArgs
    | TaskSkillSearchMcpArgs
    | TaskSkillGetMcpArgs
    | ConfirmationListPendingMcpArgs
    | ConfirmationGetMcpArgs
    | ConfirmationCreateMcpArgs
    | WorkspaceGetCurrentMcpArgs
    | WorkspaceMemberListMcpArgs
    | WorkspaceUserResolveMcpArgs
    | UserSummaryMcpArgs
    | StatusListMcpArgs
    | CommentListMcpArgs
    | CommentCreateMcpArgs
    | AttachmentListMcpArgs
    | AttachmentCreateLinkMcpArgs
    | AttachmentCreateFileMcpArgs
    | ProjectSearchMcpArgs
    | ProjectGetMcpArgs
    | ProjectArchiveMcpArgs
    | ProjectCreateMcpArgs
    | ProjectUpdateMcpArgs
    | TaskSearchMcpArgs
    | TaskGetMcpArgs
    | TaskArchiveMcpArgs
    | TaskCreateMcpArgs
    | TaskAddSubtasksMcpArgs
    | TaskUpdateMcpArgs
    | TaskMoveMcpArgs
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
        | typeof taskSkillSearchInputSchema
        | typeof taskSkillGetInputSchema
        | typeof confirmationListPendingInputSchema
        | typeof confirmationGetInputSchema
        | typeof confirmationCreateInputSchema
        | typeof workspaceGetCurrentInputSchema
        | typeof workspaceMemberListInputSchema
        | typeof workspaceUserResolveInputSchema
        | typeof userSummaryInputSchema
        | typeof statusListInputSchema
        | typeof commentListInputSchema
        | typeof commentCreateInputSchema
        | typeof attachmentListInputSchema
        | typeof attachmentCreateLinkInputSchema
        | typeof attachmentCreateFileInputSchema
        | typeof projectSearchInputSchema
        | typeof projectGetInputSchema
        | typeof projectCreateInputSchema
        | typeof projectUpdateInputSchema
        | typeof taskSearchInputSchema
        | typeof taskGetInputSchema
        | typeof taskCreateInputSchema
        | typeof taskAddSubtasksInputSchema
        | typeof taskUpdateInputSchema
        | typeof taskMoveInputSchema
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

  registerWorkspaceTools(server, createWorkspaceToolHandlers(options.backendClient));
  registerStatusTools(server, createStatusToolHandlers(options.backendClient));
  registerProjectTools(server, createProjectToolHandlers(options.backendClient));
  registerTaskTools(server, createTaskToolHandlers(options.backendClient));
  registerCommentTools(server, createCommentToolHandlers(options.backendClient));
  registerAttachmentTools(server, createAttachmentToolHandlers(options.backendClient));
  registerSummaryTools(server, createSummaryToolHandlers(options.backendClient));
  registerTaskSkillApplyTools(server, createTaskSkillToolHandlers(options.backendClient));
  registerConfirmationTools(server, createConfirmationToolHandlers(options.backendClient));

  return server;
}

export function registerWorkspaceTools(
  registrar: TaskMcpToolRegistrar,
  handlers: WorkspaceToolHandlers,
): void {
  registrar.registerTool(
    "workspace.get_current",
    {
      title: "Get current workspace",
      description: "Get one visible workspace by id, or the first visible workspace for a user.",
      inputSchema: workspaceGetCurrentInputSchema,
    },
    async (input) => toToolResult(await handlers.getCurrent(input)),
  );

  registrar.registerTool(
    "user.list_workspace_members",
    {
      title: "List workspace members",
      description: "List members for one visible workspace.",
      inputSchema: workspaceMemberListInputSchema,
    },
    async (input) => toToolResult(await handlers.listMembers(input)),
  );

  registrar.registerTool(
    "user.resolve",
    {
      title: "Resolve user",
      description: "Resolve visible workspace members by display name, email, or user id.",
      inputSchema: workspaceUserResolveInputSchema,
    },
    async (input) => toToolResult(await handlers.resolveUser(input)),
  );
}

export function registerAttachmentTools(
  registrar: TaskMcpToolRegistrar,
  handlers: AttachmentToolHandlers,
): void {
  registrar.registerTool(
    "attachment.add_link",
    {
      title: "Add link attachment",
      description: "Attach one http or https link to a writable task.",
      inputSchema: attachmentCreateLinkInputSchema,
    },
    async (input) => toToolResult(await handlers.createLink(input)),
  );

  registrar.registerTool(
    "attachment.create_link",
    {
      title: "Create link attachment",
      description: "Attach one http or https link to a writable task.",
      inputSchema: attachmentCreateLinkInputSchema,
    },
    async (input) => toToolResult(await handlers.createLink(input)),
  );

  registrar.registerTool(
    "attachment.add_file",
    {
      title: "Add file attachment",
      description: "Attach already-stored file metadata to a writable task.",
      inputSchema: attachmentCreateFileInputSchema,
    },
    async (input) => toToolResult(await handlers.createFile(input)),
  );

  registrar.registerTool(
    "attachment.add_telegram_file",
    {
      title: "Add Telegram file attachment",
      description:
        "Attach Telegram file metadata from resolved Telegram context to a writable task.",
      inputSchema: attachmentCreateTelegramFileInputSchema,
    },
    async (input) => toToolResult(await handlers.createTelegramFile(input)),
  );

  registrar.registerTool(
    "attachment.resolve_pending_telegram_file",
    {
      title: "Resolve pending Telegram file attachment",
      description:
        "Attach Telegram file metadata from resolved Telegram context to a writable task.",
      inputSchema: attachmentCreateTelegramFileInputSchema,
    },
    async (input) => toToolResult(await handlers.createTelegramFile(input)),
  );

  registrar.registerTool(
    "attachment.list",
    {
      title: "List attachments",
      description: "List attachments for one visible task.",
      inputSchema: attachmentListInputSchema,
    },
    async (input) => toToolResult(await handlers.list(input)),
  );
}

export function registerSummaryTools(
  registrar: TaskMcpToolRegistrar,
  handlers: SummaryToolHandlers,
): void {
  registrar.registerTool(
    "summary.project",
    {
      title: "Summarize project",
      description: "Summarize one visible project with active task counts and recent tasks.",
      inputSchema: projectSummaryInputSchema,
    },
    async (input) => toToolResult(await handlers.project(input)),
  );

  registrar.registerTool(
    "summary.task",
    {
      title: "Summarize task",
      description: "Summarize one visible task with recent comments and attachments.",
      inputSchema: taskSummaryInputSchema,
    },
    async (input) => toToolResult(await handlers.task(input)),
  );

  registrar.registerTool(
    "summary.user",
    {
      title: "Summarize user",
      description:
        "Summarize one visible workspace member with assigned task counts and recent assigned tasks.",
      inputSchema: userSummaryInputSchema,
    },
    async (input) => toToolResult(await handlers.user(input)),
  );

  registrar.registerTool(
    "summary.workspace",
    {
      title: "Summarize workspace",
      description:
        "Summarize one visible workspace with members, projects, statuses, and task skills.",
      inputSchema: workspaceSummaryInputSchema,
    },
    async (input) => toToolResult(await handlers.workspace(input)),
  );
}

export function registerCommentTools(
  registrar: TaskMcpToolRegistrar,
  handlers: CommentToolHandlers,
): void {
  registrar.registerTool(
    "comment.create",
    {
      title: "Create comment",
      description: "Create a comment on one writable task.",
      inputSchema: commentCreateInputSchema,
    },
    async (input) => toToolResult(await handlers.create(input)),
  );

  registrar.registerTool(
    "task.comment",
    {
      title: "Comment on task",
      description: "Create a comment on one writable task.",
      inputSchema: commentCreateInputSchema,
    },
    async (input) => toToolResult(await handlers.create(input)),
  );

  registrar.registerTool(
    "comment.list",
    {
      title: "List comments",
      description: "List comments for one visible task.",
      inputSchema: commentListInputSchema,
    },
    async (input) => toToolResult(await handlers.list(input)),
  );
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
    "project.archive",
    {
      title: "Archive project",
      description: "Archive one active project in a visible workspace.",
      inputSchema: projectGetInputSchema,
    },
    async (input) => toToolResult(await handlers.archive(input)),
  );

  registrar.registerTool(
    "project.update",
    {
      title: "Update project",
      description: "Update one active project in a visible workspace.",
      inputSchema: projectUpdateInputSchema,
    },
    async (input) => toToolResult(await handlers.update(input)),
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
    "task.update",
    {
      title: "Update task",
      description: "Update one visible task title, description, or metadata.",
      inputSchema: taskUpdateInputSchema,
    },
    async (input) => toToolResult(await handlers.update(input)),
  );

  registrar.registerTool(
    "task.add_subtasks",
    {
      title: "Add subtasks",
      description: "Create one or more subtasks under an active task.",
      inputSchema: taskAddSubtasksInputSchema,
    },
    async (input) => toToolResult(await handlers.addSubtasks(input)),
  );

  registrar.registerTool(
    "task.move",
    {
      title: "Move task",
      description: "Move one active task under a new parent and position.",
      inputSchema: taskMoveInputSchema,
    },
    async (input) => toToolResult(await handlers.move(input)),
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
    "task.assign",
    {
      title: "Assign task",
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
    "task.archive",
    {
      title: "Archive task",
      description: "Archive one active task in a visible project.",
      inputSchema: taskGetInputSchema,
    },
    async (input) => toToolResult(await handlers.archive(input)),
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
    "skill.search",
    {
      title: "Search task skills",
      description: "Search active task skills in a visible workspace by name or alias.",
      inputSchema: taskSkillSearchInputSchema,
    },
    async (input) => toToolResult(await handlers.search(input)),
  );

  registrar.registerTool(
    "skill.get",
    {
      title: "Get task skill",
      description: "Get one visible task skill with versions.",
      inputSchema: taskSkillGetInputSchema,
    },
    async (input) => toToolResult(await handlers.get(input)),
  );

  registrar.registerTool(
    "skill.create",
    {
      title: "Create task skill",
      description: "Create a workspace-scoped task skill template.",
      inputSchema: taskSkillCreateInputSchema,
    },
    async (input) => toToolResult(await handlers.create(input)),
  );

  registrar.registerTool(
    "skill.clone",
    {
      title: "Clone task skill",
      description: "Clone one active task skill into a new workspace-scoped skill.",
      inputSchema: taskSkillCloneInputSchema,
    },
    async (input) => toToolResult(await handlers.clone(input)),
  );

  registrar.registerTool(
    "skill.archive",
    {
      title: "Archive task skill",
      description: "Archive one active task skill in a visible workspace.",
      inputSchema: taskSkillGetInputSchema,
    },
    async (input) => toToolResult(await handlers.archive(input)),
  );

  registrar.registerTool(
    "skill.update_metadata",
    {
      title: "Update task skill metadata",
      description: "Update one visible task skill name, description, or aliases.",
      inputSchema: taskSkillUpdateMetadataInputSchema,
    },
    async (input) => toToolResult(await handlers.updateMetadata(input)),
  );

  registrar.registerTool(
    "skill.update_definition",
    {
      title: "Update task skill definition",
      description: "Replace one visible task skill definition.",
      inputSchema: taskSkillUpdateDefinitionInputSchema,
    },
    async (input) => toToolResult(await handlers.updateDefinition(input)),
  );

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

export function registerConfirmationTools(
  registrar: TaskMcpToolRegistrar,
  handlers: ConfirmationToolHandlers,
): void {
  registrar.registerTool(
    "confirmation.list_pending",
    {
      title: "List pending confirmations",
      description: "List pending confirmation requests for one visible workspace.",
      inputSchema: confirmationListPendingInputSchema,
    },
    async (input) => toToolResult(await handlers.listPending(input)),
  );

  registrar.registerTool(
    "confirmation.get",
    {
      title: "Get confirmation",
      description: "Get one visible confirmation request.",
      inputSchema: confirmationGetInputSchema,
    },
    async (input) => toToolResult(await handlers.get(input)),
  );

  registrar.registerTool(
    "confirmation.create",
    {
      title: "Create confirmation",
      description: "Create a pending confirmation request for one agent run.",
      inputSchema: confirmationCreateInputSchema,
    },
    async (input) => toToolResult(await handlers.create(input)),
  );

  registrar.registerTool(
    "confirmation.cancel",
    {
      title: "Cancel confirmation",
      description: "Cancel one pending confirmation request.",
      inputSchema: confirmationCancelInputSchema,
    },
    async (input) => toToolResult(await handlers.cancel(input)),
  );

  registrar.registerTool(
    "confirmation.commit",
    {
      title: "Commit confirmation",
      description: "Mark one pending confirmation request as confirmed.",
      inputSchema: confirmationGetInputSchema,
    },
    async (input) => toToolResult(await handlers.commit(input)),
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
