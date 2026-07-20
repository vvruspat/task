import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type { CreateTaskCommentInput, TaskComment } from "./comments.contracts.js";
import { CommentsController } from "./comments.controller.js";
import { ParseCreateTaskCommentBodyPipe } from "./comments.dto.js";
import { CommentsService } from "./comments.service.js";
import type { TaskCommentCreateResult, TaskCommentsStore } from "./comments.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const commentId = "55555555-5555-4555-8555-555555555555";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const taskComment: TaskComment = {
  agentRunId: null,
  id: commentId,
  workspaceId,
  taskId,
  authorUserId: userId,
  parentCommentId: null,
  mentionedUserIds: [],
  body: "Bass take is ready.",
  createdAt,
  updatedAt: createdAt,
};

test("CommentsController uses trusted current user context for comment list reads", async () => {
  const controller = new CommentsController(
    new CommentsService(createCommentsStore({ comments: [taskComment] })),
  );

  const response = await controller.listTaskComments(workspaceId, projectId, taskId, userId);

  assert.equal(response.length, 1);
  assert.equal(response[0]?.id, commentId);
});

test("CommentsController uses trusted current user context for comment creates", async () => {
  const input: CreateTaskCommentInput = {
    body: "Ready for review.",
    mentionedUserIds: [],
    parentCommentId: null,
  };
  const controller = new CommentsController(
    new CommentsService(
      createCommentsStore({
        createResult: {
          comment: { ...taskComment, body: input.body },
          status: "created",
        },
      }),
    ),
  );

  const response = await controller.createTaskComment(
    workspaceId,
    projectId,
    taskId,
    userId,
    input,
  );

  assert.equal(response.body, input.body);
  assert.equal(response.authorUserId, userId);
});

test("ParseCreateTaskCommentBodyPipe validates and normalizes comment payloads", () => {
  const pipe = new ParseCreateTaskCommentBodyPipe();

  assert.deepEqual(pipe.transform({ body: "  Ready for review.  " }), {
    body: "Ready for review.",
    mentionedUserIds: [],
    parentCommentId: null,
  });

  assert.deepEqual(
    pipe.transform({
      body: "@Alex please review",
      mentionedUserIds: [userId, userId],
      parentCommentId: commentId,
    }),
    {
      body: "@Alex please review",
      mentionedUserIds: [userId],
      parentCommentId: commentId,
    },
  );

  assert.throws(() => pipe.transform({ body: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ body: 1 }), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
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
    createAgentReply: async (): Promise<TaskComment | null> => null,
  };
}
