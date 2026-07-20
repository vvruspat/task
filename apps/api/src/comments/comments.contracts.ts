export type TaskComment = {
  id: string;
  workspaceId: string;
  taskId: string;
  authorUserId: string;
  agentRunId: string | null;
  parentCommentId: string | null;
  mentionedUserIds: string[];
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTaskCommentInput = {
  body: string;
  parentCommentId?: string | null;
  mentionedUserIds?: string[];
};
