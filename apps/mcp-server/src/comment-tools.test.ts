import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  CreateTaskCommentRequest,
  PreviewTaskSkillApplyResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskAttachmentResponse,
  TaskBackendClient,
  TaskCommentResponse,
  TaskDetailResponse,
  TaskSummaryResponse,
  WorkspaceStatusResponse,
} from "./backend-client.js";
import {
  CommentToolInputError,
  createCommentToolHandlers,
  parseCommentCreateToolInput,
  parseCommentListToolInput,
} from "./comment-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskId = "66666666-6666-4666-8666-666666666666";
const userId = "55555555-5555-4555-8555-555555555555";
const commentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const timestamp = "2026-01-01T00:00:00.000Z";

const taskComment: TaskCommentResponse = {
  id: commentId,
  workspaceId,
  taskId,
  authorUserId: userId,
  body: "Bass take is ready for review.",
  createdAt: timestamp,
  updatedAt: timestamp,
};

test("parseCommentCreateToolInput validates and normalizes comment create payloads", () => {
  assert.deepEqual(
    parseCommentCreateToolInput({
      workspaceId,
      projectId,
      taskId,
      userId,
      body: "  Bass take is ready for review.  ",
    }),
    {
      workspaceId,
      projectId,
      taskId,
      userId,
      body: "Bass take is ready for review.",
    },
  );

  assert.throws(
    () => parseCommentCreateToolInput({ workspaceId, projectId, taskId, userId, body: "" }),
    CommentToolInputError,
  );
  assert.throws(
    () => parseCommentCreateToolInput({ workspaceId, projectId, taskId, userId }),
    CommentToolInputError,
  );
});

test("parseCommentListToolInput validates and normalizes comment list payloads", () => {
  assert.deepEqual(
    parseCommentListToolInput({
      workspaceId: ` ${workspaceId} `,
      projectId,
      taskId,
      userId,
    }),
    {
      workspaceId,
      projectId,
      taskId,
      userId,
    },
  );

  assert.throws(
    () => parseCommentListToolInput({ workspaceId, projectId: "bad", taskId, userId }),
    CommentToolInputError,
  );
  assert.throws(
    () => parseCommentListToolInput({ workspaceId, projectId, userId }),
    CommentToolInputError,
  );
});

test("comment list handler forwards task identifiers to the backend client", async () => {
  const calls: Array<{ workspaceId: string; projectId: string; taskId: string; userId: string }> =
    [];
  const handlers = createCommentToolHandlers(createBackendClientStub([taskComment], calls));

  assert.deepEqual(await handlers.list({ workspaceId, projectId, taskId, userId }), [taskComment]);
  assert.deepEqual(calls, [{ workspaceId, projectId, taskId, userId }]);
});

test("comment create handler forwards comment payloads to the backend client", async () => {
  const calls: CreateTaskCommentRequest[] = [];
  const handlers = createCommentToolHandlers(createBackendClientStub([taskComment], [], calls));

  assert.deepEqual(
    await handlers.create({
      workspaceId,
      projectId,
      taskId,
      userId,
      body: "  Bass take is ready for review.  ",
    }),
    taskComment,
  );
  assert.deepEqual(calls, [
    {
      workspaceId,
      projectId,
      taskId,
      userId,
      body: {
        body: "Bass take is ready for review.",
      },
    },
  ]);
});

function createBackendClientStub(
  comments: TaskCommentResponse[],
  listTaskCommentsCalls: Array<{
    workspaceId: string;
    projectId: string;
    taskId: string;
    userId: string;
  }> = [],
  createTaskCommentCalls: CreateTaskCommentRequest[] = [],
): TaskBackendClient {
  return {
    listWorkspaceStatuses: async (): Promise<WorkspaceStatusResponse[]> => {
      throw new Error("Not implemented.");
    },
    listTaskComments: async (request): Promise<TaskCommentResponse[]> => {
      listTaskCommentsCalls.push(request);

      return comments;
    },
    createTaskComment: async (request): Promise<TaskCommentResponse> => {
      createTaskCommentCalls.push(request);

      return taskComment;
    },
    listTaskAttachments: async (): Promise<TaskAttachmentResponse[]> => {
      throw new Error("Not implemented.");
    },
    createProject: async (): Promise<ProjectDetailResponse> => {
      throw new Error("Not implemented.");
    },
    getProject: async (): Promise<ProjectDetailResponse> => {
      throw new Error("Not implemented.");
    },
    listActiveProjects: async (): Promise<ProjectSummaryResponse[]> => {
      throw new Error("Not implemented.");
    },
    listActiveTasks: async (): Promise<TaskSummaryResponse[]> => {
      throw new Error("Not implemented.");
    },
    getTask: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    createTask: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskStatus: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskAssignee: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskDueDate: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    previewTaskSkillApply: async (): Promise<PreviewTaskSkillApplyResponse> => {
      throw new Error("Not implemented.");
    },
    applyTaskSkill: async (): Promise<ApplyTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
  };
}
