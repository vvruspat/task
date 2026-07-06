import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { CreateTaskCommentInput, TaskComment } from "./comments.contracts.js";
import { TaskCommentDto } from "./comments.dto.js";
import { CommentsService } from "./comments.service.js";
import type { TaskCommentCreateResult, TaskCommentsStore } from "./comments.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const commentId = "55555555-5555-4555-8555-555555555555";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const taskComment: TaskComment = {
  id: commentId,
  workspaceId,
  taskId,
  authorUserId: userId,
  body: "Bass take is ready.",
  createdAt,
  updatedAt: createdAt,
};

test("CommentsService maps visible task comments to DTOs", async () => {
  const service = new CommentsService(createCommentsStore({ comments: [taskComment] }));

  const response = await service.listTaskComments(workspaceId, projectId, taskId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof TaskCommentDto);
  assert.equal(response[0]?.id, commentId);
  assert.equal(response[0]?.body, taskComment.body);
});

test("CommentsService creates task comments for writable workspace members", async () => {
  const input: CreateTaskCommentInput = { body: "Ready for review." };
  const service = new CommentsService(
    createCommentsStore({
      createResult: {
        comment: { ...taskComment, body: input.body },
        status: "created",
      },
    }),
  );

  const response = await service.createTaskComment(workspaceId, projectId, taskId, userId, input);

  assert.ok(response instanceof TaskCommentDto);
  assert.equal(response.body, input.body);
  assert.equal(response.authorUserId, userId);
});

test("CommentsService hides inaccessible or missing tasks", async () => {
  const service = new CommentsService(createCommentsStore({ comments: null }));

  await assert.rejects(
    () => service.listTaskComments(workspaceId, projectId, taskId, userId),
    NotFoundException,
  );
  await assert.rejects(
    () => service.createTaskComment(workspaceId, projectId, taskId, userId, { body: "Hidden" }),
    NotFoundException,
  );
});

test("CommentsService rejects task comments without write permission", async () => {
  const service = new CommentsService(
    createCommentsStore({ createResult: { status: "forbidden" } }),
  );

  await assert.rejects(
    () => service.createTaskComment(workspaceId, projectId, taskId, userId, { body: "Hidden" }),
    ForbiddenException,
  );
});

function createCommentsStore(options: {
  comments?: TaskComment[] | null;
  createResult?: TaskCommentCreateResult;
}): TaskCommentsStore {
  return {
    listForTask: async (): Promise<TaskComment[] | null> =>
      options.comments === undefined ? [] : options.comments,
    createForTask: async (): Promise<TaskCommentCreateResult> =>
      options.createResult ?? { status: "task_not_found" },
  };
}
