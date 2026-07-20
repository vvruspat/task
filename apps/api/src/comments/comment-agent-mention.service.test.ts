import assert from "node:assert/strict";
import test from "node:test";
import type { CreateWebAgentChatInput } from "../agent/agent.contracts.js";
import {
  CommentAgentMentionService,
  formatTaskAgentPrompt,
  mentionsTaskAgent,
} from "./comment-agent-mention.service.js";
import type { TaskComment } from "./comments.contracts.js";
import type { CreateAgentTaskCommentInput } from "./comments.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const rootCommentId = "55555555-5555-4555-8555-555555555555";
const requestCommentId = "66666666-6666-4666-8666-666666666666";
const agentRunId = "77777777-7777-4777-8777-777777777777";
const createdAt = new Date("2026-07-19T12:00:00.000Z");

const rootComment = comment({ id: rootCommentId, body: "Can we ship today?" });
const requestComment = comment({
  body: "@task move this task to Done",
  id: requestCommentId,
  parentCommentId: rootCommentId,
});

test("mentionsTaskAgent recognizes only a standalone @task mention", () => {
  assert.equal(mentionsTaskAgent("@task do this"), true);
  assert.equal(mentionsTaskAgent("please ask @TASK, thanks"), true);
  assert.equal(mentionsTaskAgent("email@example.com"), false);
  assert.equal(mentionsTaskAgent("@taskforce"), false);
});

test("formatTaskAgentPrompt includes task context and marks the invoking comment", () => {
  const prompt = formatTaskAgentPrompt({
    comments: [rootComment, requestComment],
    invokingCommentId: requestCommentId,
    memberNames: new Map([[userId, "Alex"]]),
    projectId,
    projectName: "Album",
    taskDescription: "Record the final take",
    taskId,
    taskIdentifier: "ALB-4",
    taskTitle: "Vocals",
    workspaceId,
  });

  assert.match(prompt, /Task: ALB-4 — Vocals/);
  assert.match(prompt, /Description: Record the final take/);
  assert.match(prompt, /Alex: Can we ship today\?/);
  assert.match(prompt, /Alex \[current request\]: @task move this task to Done/);
});

test("CommentAgentMentionService sends one discussion thread and stores the agent reply", async () => {
  const unrelatedComment = comment({
    body: "This belongs to another root",
    id: "88888888-8888-4888-8888-888888888888",
  });
  const agentInputs: CreateWebAgentChatInput[] = [];
  const savedReplies: CreateAgentTaskCommentInput[] = [];
  const service = new CommentAgentMentionService(
    {
      listForTask: async () => [rootComment, requestComment, unrelatedComment],
      createAgentReply: async (_workspace, _project, _task, _user, input) => {
        savedReplies.push(input);
        return null;
      },
    },
    {
      createWebRun: async (_workspace, _user, input) => {
        agentInputs.push(input);
        return { agentRunId, responseText: "Moved to Done." };
      },
    },
    {
      getProject: async () => ({ id: projectId, key: "ALB", title: "Album" }),
    },
    {
      getTask: async () => ({
        description: "Record the final take",
        id: taskId,
        number: 4,
        title: "Vocals",
      }),
    },
    {
      listMembers: async () => [{ displayName: "Alex", userId }],
    },
  );

  await service.handleMention({
    comment: requestComment,
    projectId,
    taskId,
    userId,
    workspaceId,
  });

  assert.equal(agentInputs.length, 1);
  assert.equal(agentInputs[0]?.projectId, projectId);
  assert.doesNotMatch(agentInputs[0]?.messages[0]?.content ?? "", /another root/);
  assert.deepEqual(savedReplies, [
    {
      agentRunId,
      body: "Moved to Done.",
      parentCommentId: rootCommentId,
    },
  ]);
});

function comment(input: {
  body: string;
  id: string;
  parentCommentId?: string | null;
}): TaskComment {
  return {
    agentRunId: null,
    authorUserId: userId,
    body: input.body,
    createdAt,
    id: input.id,
    mentionedUserIds: [],
    parentCommentId: input.parentCommentId ?? null,
    taskId,
    updatedAt: createdAt,
    workspaceId,
  };
}
