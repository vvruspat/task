export type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserRecord = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceMemberRole = "owner" | "admin" | "member" | "guest";

export type WorkspaceMemberRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  createdAt: Date;
  updatedAt: Date;
};

export type StatusRecord = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  position: string;
  isDone: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectRecord = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string | null;
  position: string | null;
  createdByUserId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskRecord = {
  id: string;
  workspaceId: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  statusId: string | null;
  assigneeUserId: string | null;
  createdByUserId: string;
  position: string;
  dueAt: Date | null;
  sourceSkillId: string | null;
  sourceSkillVersionId: string | null;
  metadata: Record<string, unknown>;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskSkillRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  aliases: string[];
  createdByUserId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskSkillVersionRecord = {
  id: string;
  workspaceId: string;
  taskSkillId: string;
  version: number;
  definition: Record<string, unknown>;
  createdByUserId: string;
  createdAt: Date;
};

export type CommentRecord = {
  id: string;
  workspaceId: string;
  taskId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AttachmentTargetType = "task" | "project" | "comment";

export type AttachmentKind = "file" | "link" | "telegram_file";

export type AttachmentRecord = {
  id: string;
  workspaceId: string;
  targetType: AttachmentTargetType;
  targetId: string;
  kind: AttachmentKind;
  title: string | null;
  url: string | null;
  storageKey: string | null;
  telegramFileId: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  createdByUserId: string;
  createdAt: Date;
};

export type ActivityEventRecord = {
  id: string;
  workspaceId: string;
  actorUserId: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type AgentRunSource = "telegram" | "web" | "mini_app";

export type AgentRunStatus = "running" | "waiting_confirmation" | "completed" | "failed";

export type AgentRunRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  source: AgentRunSource;
  sourceMessageId: string | null;
  model: string | null;
  inputText: string;
  normalizedIntent: Record<string, unknown> | null;
  finalResponse: string | null;
  status: AgentRunStatus;
  tokenUsage: Record<string, unknown> | null;
  cost: Record<string, unknown> | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AgentToolCallStatus = "pending" | "success" | "error";

export type AgentToolCallRecord = {
  id: string;
  agentRunId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: AgentToolCallStatus;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
};
