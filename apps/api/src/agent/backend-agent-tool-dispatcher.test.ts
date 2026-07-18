import assert from "node:assert/strict";
import test from "node:test";
import { ProjectDetailDto } from "../projects/projects.dto.js";
import { TaskDetailDto } from "../tasks/tasks.dto.js";
import { BackendAgentToolOperationDispatcher } from "./backend-agent-tool-dispatcher.js";

const workspaceId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const projectId = "44444444-4444-4444-8444-444444444444";
const taskId = "55555555-5555-4555-8555-555555555555";
const now = new Date("2026-07-18T09:00:00.000Z");

test("BackendAgentToolOperationDispatcher creates a project through the service layer", async () => {
  const calls: unknown[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject(actualWorkspaceId, actualUserId, input) {
        calls.push({ actualWorkspaceId, actualUserId, input });
        return new ProjectDetailDto({
          id: projectId,
          workspaceId,
          title: input.title,
          description: input.description ?? null,
          status: null,
          position: null,
          createdByUserId: userId,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("Unexpected task call.");
      },
    },
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-project-create",
      toolName: "project_create",
      arguments: { title: "Album recording", workspaceId: "untrusted" },
    },
    { workspaceId, userId },
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, { id: projectId, title: "Album recording", workspaceId });
  assert.deepEqual(calls, [
    {
      actualWorkspaceId: workspaceId,
      actualUserId: userId,
      input: { title: "Album recording" },
    },
  ]);
});

test("BackendAgentToolOperationDispatcher creates a task in the selected project", async () => {
  const calls: unknown[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask(actualWorkspaceId, actualProjectId, actualUserId, input) {
        calls.push({ actualWorkspaceId, actualProjectId, actualUserId, input });
        return new TaskDetailDto({
          id: taskId,
          workspaceId,
          projectId,
          parentTaskId: null,
          title: input.title,
          description: input.description ?? null,
          statusId: null,
          assigneeUserId: null,
          createdByUserId: userId,
          position: "1000",
          dueAt: null,
          sourceSkillId: null,
          sourceSkillVersionId: null,
          metadata: {},
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      },
    },
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-task-create",
      toolName: "task_create",
      arguments: { projectId, title: "Record vocals" },
    },
    { workspaceId, userId },
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, { id: taskId, projectId, title: "Record vocals", workspaceId });
  assert.deepEqual(calls, [
    {
      actualWorkspaceId: workspaceId,
      actualProjectId: projectId,
      actualUserId: userId,
      input: { title: "Record vocals" },
    },
  ]);
});

test("BackendAgentToolOperationDispatcher creates validated subtasks through TasksService", async () => {
  const calls: unknown[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks(actualWorkspaceId, actualProjectId, actualTaskId, actualUserId, input) {
        calls.push({
          actualWorkspaceId,
          actualProjectId,
          actualTaskId,
          actualUserId,
          input,
        });
        return input.subtasks.map(
          (subtask, index) =>
            new TaskDetailDto({
              id: `60000000-0000-4000-8000-00000000000${index}`,
              workspaceId,
              projectId,
              parentTaskId: taskId,
              title: subtask.title,
              description: subtask.description ?? null,
              statusId: null,
              assigneeUserId: null,
              createdByUserId: userId,
              position: String(index),
              dueAt: null,
              sourceSkillId: null,
              sourceSkillVersionId: null,
              metadata: {},
              archivedAt: null,
              createdAt: now,
              updatedAt: now,
            }),
        );
      },
      async createTask() {
        throw new Error("Unexpected task create call.");
      },
    },
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-add-subtasks",
      toolName: "task_add_subtasks",
      arguments: {
        projectId,
        taskId,
        subtasks: [{ title: "Vocals" }, { title: "Mix", description: "Final mix" }],
      },
    },
    { workspaceId, userId },
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, {
    createdCount: 2,
    projectId,
    taskId,
    taskIds: ["60000000-0000-4000-8000-000000000000", "60000000-0000-4000-8000-000000000001"],
    titles: ["Vocals", "Mix"],
    workspaceId,
  });
  assert.deepEqual(calls, [
    {
      actualWorkspaceId: workspaceId,
      actualProjectId: projectId,
      actualTaskId: taskId,
      actualUserId: userId,
      input: {
        subtasks: [{ title: "Vocals" }, { title: "Mix", description: "Final mix" }],
      },
    },
  ]);
});
