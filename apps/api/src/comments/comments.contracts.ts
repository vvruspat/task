export type TaskComment = {
  id: string;
  workspaceId: string;
  taskId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTaskCommentInput = {
  body: string;
};
