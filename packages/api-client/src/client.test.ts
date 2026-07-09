import assert from "node:assert/strict";
import test from "node:test";
import {
  createTaskApiClient,
  TaskApiClientError,
  type TaskApiFetch,
  type TaskApiRequestInit,
} from "./client.js";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const projectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const taskId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const trustedUserId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

test("createTaskApiClient fetches health without trusted user context", async () => {
  const fetcher = new RecordingFetch(single({ status: "ok", service: "api", version: "0.0.0" }));
  const client = createTaskApiClient({
    baseUrl: "https://task.example/api/",
    fetch: fetcher.fetch,
  });

  assert.deepEqual(await client.getHealth(), {
    status: "ok",
    service: "api",
    version: "0.0.0",
  });
  assert.equal(fetcher.calls[0]?.url, "https://task.example/api/health");
  assert.equal(fetcher.calls[0]?.init.headers.accept, "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], undefined);
});

test("createTaskApiClient sends trusted user context for workspace requests", async () => {
  const fetcher = new RecordingFetch(single([workspaceSummary()]));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  assert.deepEqual(await client.listWorkspaces(), [workspaceSummary()]);
  assert.equal(fetcher.calls[0]?.url, "https://task.example/workspaces");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
});

test("createTaskApiClient exposes Settings and Telegram link endpoints with trusted context", async () => {
  const fetcher = new RecordingFetch(
    sequence([
      workspaceDetail(),
      [workspaceMember()],
      telegramIdentityLinkStatus(),
      { telegramId: "123456789", userId: trustedUserId },
    ]),
  );
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  await client.getWorkspace({ workspaceId });
  await client.listWorkspaceMembers({ workspaceId });
  await client.getTelegramIdentityLinkStatus();
  await client.linkTelegramMiniAppIdentity({ body: { initData: "query=value" } });

  assert.deepEqual(
    fetcher.calls.map((call) => [call.url, call.init.method, call.init.headers["x-task-user-id"]]),
    [
      [`https://task.example/workspaces/${workspaceId}`, "GET", trustedUserId],
      [`https://task.example/workspaces/${workspaceId}/members`, "GET", trustedUserId],
      ["https://task.example/telegram/mini-app/identity/link-status", "GET", trustedUserId],
      ["https://task.example/telegram/mini-app/identity/link", "POST", trustedUserId],
    ],
  );
  assert.equal(fetcher.calls[3]?.init.body, JSON.stringify({ initData: "query=value" }));
});

test("createTaskApiClient posts project creation payloads with trusted user context", async () => {
  const fetcher = new RecordingFetch(single(projectSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  const body = {
    description: "Release planning board.",
    position: "1000",
    status: "active",
    title: "Album release",
  };

  assert.deepEqual(await client.createProject({ body, workspaceId }), projectSummary());
  assert.equal(fetcher.calls[0]?.url, `https://task.example/workspaces/${workspaceId}/projects`);
  assert.equal(fetcher.calls[0]?.init.method, "POST");
  assert.equal(fetcher.calls[0]?.init.headers.accept, "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
  assert.equal(fetcher.calls[0]?.init.body, JSON.stringify(body));
});

test("createTaskApiClient deletes projects with trusted user context", async () => {
  const fetcher = new RecordingFetch(single(archivedProjectSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  assert.deepEqual(
    await client.archiveProject({ projectId, workspaceId }),
    archivedProjectSummary(),
  );
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "DELETE");
  assert.equal(fetcher.calls[0]?.init.headers.accept, "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["content-type"], undefined);
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
  assert.equal(fetcher.calls[0]?.init.body, undefined);
});

test("createTaskApiClient patches project updates with trusted user context", async () => {
  const fetcher = new RecordingFetch(single(projectSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  const body = {
    description: "Updated release planning.",
    status: null,
    title: "Updated album release",
  };

  assert.deepEqual(await client.updateProject({ body, projectId, workspaceId }), projectSummary());
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "PATCH");
  assert.equal(fetcher.calls[0]?.init.headers.accept, "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
  assert.equal(fetcher.calls[0]?.init.body, JSON.stringify(body));
});

test("createTaskApiClient fetches a project matrix with trusted user context", async () => {
  const fetcher = new RecordingFetch(single(projectMatrix()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  assert.deepEqual(await client.getProjectMatrix({ projectId, workspaceId }), projectMatrix());
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/matrix`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "GET");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
});

test("createTaskApiClient serializes explicit unassigned task-table filters", async () => {
  const fetcher = new RecordingFetch(
    single({ items: [taskSummary()], page: 1, pageSize: 50, total: 1 }),
  );
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  await client.listTaskTable({
    assigneeFilter: "unassigned",
    projectId,
    statusFilter: "unassigned",
    workspaceId,
  });

  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/table?statusFilter=unassigned&assigneeFilter=unassigned`,
  );
});

test("createTaskApiClient builds project-scoped endpoint paths", async () => {
  const fetcher = new RecordingFetch(single([taskSummary()]));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  assert.deepEqual(await client.listTasks({ projectId, workspaceId }), [taskSummary()]);
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks`,
  );
});

test("createTaskApiClient lists workspace agent runs with trusted user context", async () => {
  const fetcher = new RecordingFetch(single([agentRunSummary()]));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  assert.deepEqual(await client.listAgentRuns({ workspaceId }), [agentRunSummary()]);
  assert.equal(fetcher.calls[0]?.url, `https://task.example/workspaces/${workspaceId}/agent/runs`);
  assert.equal(fetcher.calls[0]?.init.method, "GET");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
});

test("createTaskApiClient posts task creation payloads with trusted user context", async () => {
  const fetcher = new RecordingFetch(single(taskSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  const body = {
    description: "Open the release.",
    dueAt: "2026-07-18T10:00:00.000Z",
    metadata: {
      source: "web",
    },
    parentTaskId: null,
    position: "1000",
    title: "Intro",
  };

  assert.deepEqual(await client.createTask({ body, projectId, workspaceId }), taskSummary());
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "POST");
  assert.equal(fetcher.calls[0]?.init.headers.accept, "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
  assert.equal(fetcher.calls[0]?.init.body, JSON.stringify(body));
});

test("createTaskApiClient patches task updates with trusted user context", async () => {
  const fetcher = new RecordingFetch(single(taskSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  const body = {
    description: "Updated task notes.",
    metadata: { take: 2 },
    title: "Updated task",
  };

  assert.deepEqual(
    await client.updateTask({
      body,
      projectId,
      taskId,
      workspaceId,
    }),
    taskSummary(),
  );
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "PATCH");
  assert.equal(fetcher.calls[0]?.init.headers.accept, "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
  assert.equal(fetcher.calls[0]?.init.body, JSON.stringify(body));
});

test("createTaskApiClient deletes tasks with trusted user context", async () => {
  const fetcher = new RecordingFetch(single(archivedTaskSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  assert.deepEqual(
    await client.archiveTask({ projectId, taskId, workspaceId }),
    archivedTaskSummary(),
  );
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "DELETE");
  assert.equal(fetcher.calls[0]?.init.headers.accept, "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["content-type"], undefined);
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
  assert.equal(fetcher.calls[0]?.init.body, undefined);
});

test("createTaskApiClient reads task detail and activity with trusted user context", async () => {
  const fetcher = new RecordingFetch(sequence([taskSummary(), [taskActivityEvent()]]));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  assert.deepEqual(await client.getTask({ projectId, taskId, workspaceId }), taskSummary());
  assert.deepEqual(await client.listTaskActivity({ projectId, taskId, workspaceId }), [
    taskActivityEvent(),
  ]);
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "GET");
  assert.equal(
    fetcher.calls[1]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/activity`,
  );
  assert.equal(fetcher.calls[1]?.init.method, "GET");
});

test("createTaskApiClient provides all task detail mutations", async () => {
  const fetcher = new RecordingFetch(
    sequence([[taskSummary()], taskSummary(), taskSummary(), taskSummary(), taskSummary()]),
  );
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  await client.addTaskSubtasks({
    body: { subtasks: [{ title: "Mix" }] },
    projectId,
    taskId,
    workspaceId,
  });
  await client.moveTask({
    body: { parentTaskId: null, position: "2000" },
    projectId,
    taskId,
    workspaceId,
  });
  await client.updateTaskStatus({ body: { statusId: null }, projectId, taskId, workspaceId });
  await client.updateTaskAssignee({
    body: { assigneeUserId: null },
    projectId,
    taskId,
    workspaceId,
  });
  await client.updateTaskDueDate({ body: { dueAt: null }, projectId, taskId, workspaceId });

  const basePath = `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`;
  assert.deepEqual(
    fetcher.calls.map((call) => [call.url, call.init.method]),
    [
      [`${basePath}/subtasks`, "POST"],
      [`${basePath}/move`, "PATCH"],
      [`${basePath}/status`, "PATCH"],
      [`${basePath}/assignee`, "PATCH"],
      [`${basePath}/due-date`, "PATCH"],
    ],
  );
});

test("createTaskApiClient lists task comments and attachments with trusted user context", async () => {
  const fetcher = new RecordingFetch(sequence([[taskComment()], [taskAttachment()]]));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  assert.deepEqual(await client.listTaskComments({ projectId, taskId, workspaceId }), [
    taskComment(),
  ]);
  assert.deepEqual(await client.listTaskAttachments({ projectId, taskId, workspaceId }), [
    taskAttachment(),
  ]);
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "GET");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
  assert.equal(
    fetcher.calls[1]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments`,
  );
  assert.equal(fetcher.calls[1]?.init.method, "GET");
  assert.equal(fetcher.calls[1]?.init.headers["x-task-user-id"], trustedUserId);
});

test("createTaskApiClient creates task comments with trusted user context", async () => {
  const fetcher = new RecordingFetch(single(taskComment()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  const body = {
    body: "Bass take is ready.",
  };

  assert.deepEqual(
    await client.createTaskComment({ body, projectId, taskId, workspaceId }),
    taskComment(),
  );
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "POST");
  assert.equal(fetcher.calls[0]?.init.headers.accept, "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetcher.calls[0]?.init.headers["x-task-user-id"], trustedUserId);
  assert.equal(fetcher.calls[0]?.init.body, JSON.stringify(body));
});

test("createTaskApiClient creates task attachments with trusted user context", async () => {
  const fetcher = new RecordingFetch(
    sequence([
      taskAttachment({ kind: "link", title: "Bass take", url: "https://example.com/bass" }),
      taskAttachment({ kind: "file", storageKey: "workspaces/studio/bass.wav" }),
      taskAttachment({
        kind: "telegram_file",
        telegramFileId: "BQACAgIAAxkBAAIBR2Z",
      }),
    ]),
  );
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  assert.deepEqual(
    await client.createTaskLinkAttachment({
      body: {
        title: "Bass take",
        url: "https://example.com/bass",
      },
      projectId,
      taskId,
      workspaceId,
    }),
    taskAttachment({ kind: "link", title: "Bass take", url: "https://example.com/bass" }),
  );
  assert.deepEqual(
    await client.createTaskFileAttachment({
      body: {
        storageKey: "workspaces/studio/bass.wav",
      },
      projectId,
      taskId,
      workspaceId,
    }),
    taskAttachment({ kind: "file", storageKey: "workspaces/studio/bass.wav" }),
  );
  assert.deepEqual(
    await client.createTaskTelegramFileAttachment({
      body: {
        telegramFileId: "BQACAgIAAxkBAAIBR2Z",
      },
      projectId,
      taskId,
      workspaceId,
    }),
    taskAttachment({
      kind: "telegram_file",
      telegramFileId: "BQACAgIAAxkBAAIBR2Z",
    }),
  );
  assert.equal(
    fetcher.calls[0]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments/links`,
  );
  assert.equal(fetcher.calls[0]?.init.method, "POST");
  assert.equal(
    fetcher.calls[0]?.init.body,
    JSON.stringify({
      title: "Bass take",
      url: "https://example.com/bass",
    }),
  );
  assert.equal(
    fetcher.calls[1]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments/files`,
  );
  assert.equal(fetcher.calls[1]?.init.method, "POST");
  assert.equal(
    fetcher.calls[1]?.init.body,
    JSON.stringify({ storageKey: "workspaces/studio/bass.wav" }),
  );
  assert.equal(
    fetcher.calls[2]?.url,
    `https://task.example/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments/telegram-files`,
  );
  assert.equal(fetcher.calls[2]?.init.method, "POST");
  assert.equal(
    fetcher.calls[2]?.init.body,
    JSON.stringify({ telegramFileId: "BQACAgIAAxkBAAIBR2Z" }),
  );
});

test("createTaskApiClient validates supported list responses", async () => {
  const fetcher = new RecordingFetch(
    sequence([[projectSummary()], [taskSkillSummary()], [workspaceStatus()]]),
  );
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  assert.deepEqual(await client.listProjects({ workspaceId }), [projectSummary()]);
  assert.deepEqual(await client.listTaskSkills({ workspaceId }), [taskSkillSummary()]);
  assert.deepEqual(await client.listStatuses({ workspaceId }), [workspaceStatus()]);
});

test("createTaskApiClient exposes task skill operations with typed request paths and payloads", async () => {
  const fetcher = new RecordingFetch(
    sequence([
      taskSkillDetail(),
      taskSkillDetail(),
      taskSkillDetail(),
      taskSkillDetail(),
      taskSkillDetail(),
      taskSkillDetail(),
      taskSkillApplyPreview(),
      taskSkillApplyResult(),
    ]),
  );
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  const taskSkillId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const createBody = { definition: { subtasks: ["Record vocals"] }, name: "Song" };
  const cloneBody = { name: "Song copy" };
  const metadataBody = { aliases: ["track"], description: "Song workflow", name: "Song" };
  const definitionBody = { definition: { subtasks: ["Mix vocals"] } };
  const applyBody = {
    projectId,
    rootTaskTitle: "Intro",
    overrides: { addSubtasks: ["Share preview"], removeSubtasks: ["Record vocals"] },
  };

  await client.createTaskSkill({ body: createBody, workspaceId });
  await client.cloneTaskSkill({ body: cloneBody, taskSkillId, workspaceId });
  await client.getTaskSkill({ taskSkillId, workspaceId });
  await client.archiveTaskSkill({ taskSkillId, workspaceId });
  await client.updateTaskSkillMetadata({ body: metadataBody, taskSkillId, workspaceId });
  await client.updateTaskSkillDefinition({ body: definitionBody, taskSkillId, workspaceId });
  await client.previewTaskSkillApply({ body: applyBody, taskSkillId, workspaceId });
  await client.applyTaskSkill({ body: applyBody, taskSkillId, workspaceId });

  assert.deepEqual(
    fetcher.calls.map((call) => ({
      body: call.init.body,
      method: call.init.method,
      url: call.url,
    })),
    [
      {
        body: JSON.stringify(createBody),
        method: "POST",
        url: `https://task.example/workspaces/${workspaceId}/task-skills`,
      },
      {
        body: JSON.stringify(cloneBody),
        method: "POST",
        url: `https://task.example/workspaces/${workspaceId}/task-skills/${taskSkillId}/clone`,
      },
      {
        body: undefined,
        method: "GET",
        url: `https://task.example/workspaces/${workspaceId}/task-skills/${taskSkillId}`,
      },
      {
        body: undefined,
        method: "DELETE",
        url: `https://task.example/workspaces/${workspaceId}/task-skills/${taskSkillId}`,
      },
      {
        body: JSON.stringify(metadataBody),
        method: "PATCH",
        url: `https://task.example/workspaces/${workspaceId}/task-skills/${taskSkillId}`,
      },
      {
        body: JSON.stringify(definitionBody),
        method: "PATCH",
        url: `https://task.example/workspaces/${workspaceId}/task-skills/${taskSkillId}/definition`,
      },
      {
        body: JSON.stringify(applyBody),
        method: "POST",
        url: `https://task.example/workspaces/${workspaceId}/task-skills/${taskSkillId}/preview-apply`,
      },
      {
        body: JSON.stringify(applyBody),
        method: "POST",
        url: `https://task.example/workspaces/${workspaceId}/task-skills/${taskSkillId}/apply`,
      },
    ],
  );
  for (const call of fetcher.calls) {
    assert.equal(call.init.headers["x-task-user-id"], trustedUserId);
  }
});

test("createTaskApiClient rejects malformed task skill responses", async () => {
  const taskSkillId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const fetcher = new RecordingFetch(
    sequence([
      { ...taskSkillDetail(), versions: [{ id: taskSkillId }] },
      { ...taskSkillApplyPreview(), subtasks: [{ title: "Missing source" }] },
      { ...taskSkillApplyResult(), rootTask: { id: taskId } },
    ]),
  );
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  const applyBody = { projectId, rootTaskTitle: "Intro" };

  await assert.rejects(() => client.getTaskSkill({ taskSkillId, workspaceId }), {
    message: "Task API returned malformed task skill detail.",
    name: "TaskApiClientError",
    status: 200,
  });
  await assert.rejects(
    () => client.previewTaskSkillApply({ body: applyBody, taskSkillId, workspaceId }),
    {
      message: "Task API returned malformed task skill apply preview.",
      name: "TaskApiClientError",
      status: 200,
    },
  );
  await assert.rejects(() => client.applyTaskSkill({ body: applyBody, taskSkillId, workspaceId }), {
    message: "Task API returned malformed task skill apply result.",
    name: "TaskApiClientError",
    status: 200,
  });
});

test("createTaskApiClient rejects protected requests without trusted user context", async () => {
  const fetcher = new RecordingFetch(single([]));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
  });

  await assert.rejects(() => client.listWorkspaces(), {
    message: "Task API trustedUserId is required for workspace requests.",
    name: "TaskApiClientError",
    status: null,
  });
  assert.equal(fetcher.calls.length, 0);
});

test("createTaskApiClient rejects agent run listing without trusted user context", async () => {
  const fetcher = new RecordingFetch(single([agentRunSummary()]));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
  });

  await assert.rejects(() => client.listAgentRuns({ workspaceId }), {
    message: "Task API trustedUserId is required for workspace requests.",
    name: "TaskApiClientError",
    status: null,
  });
  assert.equal(fetcher.calls.length, 0);
});

test("createTaskApiClient rejects Settings and Telegram link requests without trusted user context", async () => {
  const fetcher = new RecordingFetch(single(workspaceDetail()));
  const client = createTaskApiClient({ baseUrl: "https://task.example", fetch: fetcher.fetch });

  await assert.rejects(() => client.getWorkspace({ workspaceId }), { name: "TaskApiClientError" });
  await assert.rejects(() => client.getTelegramIdentityLinkStatus(), { name: "TaskApiClientError" });
  await assert.rejects(
    () => client.linkTelegramMiniAppIdentity({ body: { initData: "query=value" } }),
    { name: "TaskApiClientError" },
  );
  assert.equal(fetcher.calls.length, 0);
});

test("createTaskApiClient rejects malformed Settings and Telegram link responses", async () => {
  const fetcher = new RecordingFetch(sequence([{ id: workspaceId }, { telegramId: 123 }]));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  await assert.rejects(() => client.getWorkspace({ workspaceId }), {
    message: "Task API returned malformed workspace detail.",
    name: "TaskApiClientError",
  });
  await assert.rejects(() => client.getTelegramIdentityLinkStatus(), {
    message: "Task API returned malformed Telegram identity link status.",
    name: "TaskApiClientError",
  });
});

test("createTaskApiClient rejects project matrix reads without trusted user context", async () => {
  const fetcher = new RecordingFetch(single(projectMatrix()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
  });

  await assert.rejects(() => client.getProjectMatrix({ projectId, workspaceId }), {
    message: "Task API trustedUserId is required for workspace requests.",
    name: "TaskApiClientError",
    status: null,
  });
  assert.equal(fetcher.calls.length, 0);
});

test("createTaskApiClient rejects task creation without trusted user context", async () => {
  const fetcher = new RecordingFetch(single(taskSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
  });

  await assert.rejects(
    () => client.createTask({ body: { title: "Intro" }, projectId, workspaceId }),
    {
      message: "Task API trustedUserId is required for workspace requests.",
      name: "TaskApiClientError",
      status: null,
    },
  );
  assert.equal(fetcher.calls.length, 0);
});

test("createTaskApiClient rejects task archives without trusted user context", async () => {
  const fetcher = new RecordingFetch(single(taskSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
  });

  await assert.rejects(
    () =>
      client.archiveTask({
        projectId,
        taskId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        workspaceId,
      }),
    {
      message: "Task API trustedUserId is required for workspace requests.",
      name: "TaskApiClientError",
      status: null,
    },
  );
  assert.equal(fetcher.calls.length, 0);
});

test("createTaskApiClient rejects project creation without trusted user context", async () => {
  const fetcher = new RecordingFetch(single(projectSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
  });

  await assert.rejects(
    () => client.createProject({ body: { title: "Album release" }, workspaceId }),
    {
      message: "Task API trustedUserId is required for workspace requests.",
      name: "TaskApiClientError",
      status: null,
    },
  );
  assert.equal(fetcher.calls.length, 0);
});

test("createTaskApiClient rejects project archives without trusted user context", async () => {
  const fetcher = new RecordingFetch(single(projectSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
  });

  await assert.rejects(() => client.archiveProject({ projectId, workspaceId }), {
    message: "Task API trustedUserId is required for workspace requests.",
    name: "TaskApiClientError",
    status: null,
  });
  assert.equal(fetcher.calls.length, 0);
});

test("createTaskApiClient throws typed errors for non-2xx responses", async () => {
  const fetcher = new RecordingFetch(single([]), {
    ok: false,
    status: 403,
    text: "Forbidden",
  });
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  await assert.rejects(
    async () => client.listWorkspaces(),
    (error: unknown): boolean => {
      assert.ok(error instanceof TaskApiClientError);
      assert.equal(error.message, "Task API request failed with status 403.");
      assert.equal(error.status, 403);
      assert.equal(error.responseBody, "Forbidden");
      return true;
    },
  );
});

test("createTaskApiClient rejects malformed success responses", async () => {
  const fetcher = new RecordingFetch(
    sequence([
      [{ id: workspaceId }],
      { id: workspaceId },
      { id: workspaceId },
      [{ id: workspaceId }],
      [{ id: workspaceId }],
      [{ id: workspaceId }],
    ]),
  );
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  await assert.rejects(() => client.listWorkspaces(), {
    message: "Task API returned malformed workspace summary list.",
    name: "TaskApiClientError",
    status: 200,
  });
  await assert.rejects(
    () => client.createTask({ body: { title: "Intro" }, projectId, workspaceId }),
    {
      message: "Task API returned malformed task detail.",
      name: "TaskApiClientError",
      status: 200,
    },
  );
  await assert.rejects(
    () => client.createProject({ body: { title: "Album release" }, workspaceId }),
    {
      message: "Task API returned malformed project detail.",
      name: "TaskApiClientError",
      status: 200,
    },
  );
  await assert.rejects(() => client.listAgentRuns({ workspaceId }), {
    message: "Task API returned malformed agent run summary list.",
    name: "TaskApiClientError",
    status: 200,
  });
  await assert.rejects(() => client.listTaskComments({ projectId, taskId, workspaceId }), {
    message: "Task API returned malformed task comment list.",
    name: "TaskApiClientError",
    status: 200,
  });
  await assert.rejects(() => client.listTaskAttachments({ projectId, taskId, workspaceId }), {
    message: "Task API returned malformed task attachment list.",
    name: "TaskApiClientError",
    status: 200,
  });
});

test("createTaskApiClient rejects malformed nested dashboard response objects", async () => {
  const malformedResponses: unknown[] = [
    { ...dashboardOverview(), activeProjects: [{ id: projectId }] },
    { ...dashboardOverview(), taskCounts: { assigned: -1, overdue: 0, dueSoon: 0 } },
    { ...dashboardOverview(), recentActivity: [{ id: taskId }] },
    { ...dashboardOverview(), pendingConfirmations: [{ id: taskId }] },
    { ...dashboardOverview(), recentAgentRuns: [{ id: taskId }] },
  ];
  const fetcher = new RecordingFetch(sequence(malformedResponses));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  for (const _response of malformedResponses) {
    await assert.rejects(() => client.getDashboardOverview({ workspaceId }), {
      message: "Task API returned malformed dashboard overview.",
      name: "TaskApiClientError",
      status: 200,
    });
  }
});

test("createTaskApiClient rejects malformed project matrices", async () => {
  const matrix = projectMatrix();
  const malformedResponses: unknown[] = [
    { ...matrix, columns: [taskSummary(), taskSummary()] },
    { ...matrix, stages: [matrix.stages[0], matrix.stages[0]] },
    { ...matrix, cells: [matrix.cells[0], matrix.cells[0]] },
    { ...matrix, cells: matrix.cells.slice(0, 1) },
    {
      ...matrix,
      cells: [
        { ...matrix.cells[0], columnTaskId: "00000000-0000-4000-8000-000000000000" },
        matrix.cells[1],
      ],
    },
    {
      ...matrix,
      cells: [
        matrix.cells[0],
        { ...matrix.cells[1], stageId: "00000000-0000-4000-8000-000000000000" },
      ],
    },
  ];
  const fetcher = new RecordingFetch(sequence(malformedResponses));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });

  for (const _response of malformedResponses) {
    await assert.rejects(() => client.getProjectMatrix({ projectId, workspaceId }), {
      message: "Task API returned malformed project matrix.",
      name: "TaskApiClientError",
      status: 200,
    });
  }
});

test("createTaskApiClient rejects malformed nested my-task page items", async () => {
  const fetcher = new RecordingFetch(
    single({
      items: [{ id: taskId, projectId, projectTitle: "Album" }],
      page: 1,
      pageSize: 25,
      total: 1,
    }),
  );
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  await assert.rejects(() => client.listMyTasks({ workspaceId }), {
    message: "Task API returned malformed my tasks page.",
    name: "TaskApiClientError",
    status: 200,
  });
});

type FetchCall = {
  init: TaskApiRequestInit;
  url: string;
};

type MockResponseOptions = {
  ok?: boolean;
  status?: number;
  statusText?: string;
  text?: string;
};

class RecordingFetch {
  readonly calls: FetchCall[] = [];
  private responseIndex = 0;

  constructor(
    private readonly bodies: RecordedBodies,
    private readonly options: MockResponseOptions = {},
  ) {}

  readonly fetch: TaskApiFetch = async (url: string, init: TaskApiRequestInit) => {
    this.calls.push({ url, init });

    return {
      json: async (): Promise<unknown> => this.readBody(),
      ok: this.options.ok ?? true,
      status: this.options.status ?? 200,
      statusText: this.options.statusText ?? "OK",
      text: async (): Promise<string> => this.options.text ?? "",
    };
  };

  private readBody(): unknown {
    if (this.bodies.kind === "single") {
      return this.bodies.body;
    }

    const body = this.bodies.bodies[this.responseIndex];
    this.responseIndex += 1;

    if (body === undefined) {
      throw new Error("No recorded response body for fetch call.");
    }

    return body;
  }
}

type RecordedBodies =
  | {
      body: unknown;
      kind: "single";
    }
  | {
      bodies: unknown[];
      kind: "sequence";
    };

function single(body: unknown): RecordedBodies {
  return {
    body,
    kind: "single",
  };
}

function sequence(bodies: unknown[]): RecordedBodies {
  return {
    bodies,
    kind: "sequence",
  };
}

function workspaceSummary(): unknown {
  return {
    id: workspaceId,
    name: "Studio",
    slug: "studio",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function workspaceMember(): unknown {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    workspaceId,
    userId: trustedUserId,
    role: "owner",
    displayName: "Alex",
    email: null,
    avatarUrl: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function workspaceDetail(): unknown {
  return {
    id: workspaceId,
    name: "Studio",
    slug: "studio",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
    members: [workspaceMember()],
  };
}

function telegramIdentityLinkStatus(): unknown {
  return {
    telegramId: "123456789",
    linkedAt: "2026-07-10T08:00:00.000Z",
    lastSeenAt: null,
  };
}

function projectSummary(): unknown {
  return {
    id: projectId,
    workspaceId,
    title: "Album release",
    description: null,
    status: "active",
    position: "1000",
    createdByUserId: trustedUserId,
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function archivedProjectSummary(): unknown {
  return {
    id: projectId,
    workspaceId,
    title: "Album release",
    description: null,
    status: "active",
    position: "1000",
    createdByUserId: trustedUserId,
    archivedAt: "2026-07-08T10:30:00.000Z",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

type ProjectMatrixFixture = {
  cells: Array<{ columnTaskId: string; stageId: string | null; tasks: Record<string, unknown>[] }>;
  columns: Record<string, unknown>[];
  stages: Array<{
    color: string | null;
    id: string | null;
    isDone: boolean;
    name: string;
    position: string;
  }>;
};

function projectMatrix(): ProjectMatrixFixture {
  return {
    columns: [taskSummary()],
    stages: [
      { id: null, name: "Unassigned", color: null, position: "-1", isDone: false },
      {
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        name: "In progress",
        color: "#3b82f6",
        position: "1000",
        isDone: false,
      },
    ],
    cells: [
      { columnTaskId: taskId, stageId: null, tasks: [] },
      { columnTaskId: taskId, stageId: "ffffffff-ffff-4fff-8fff-ffffffffffff", tasks: [] },
    ],
  };
}

function agentRunSummary(): unknown {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    workspaceId,
    userId: trustedUserId,
    source: "telegram",
    sourceMessageId: "42",
    model: "openai/gpt-4.1-mini",
    inputText: "@task what is next?",
    finalResponse: "Already handled.",
    status: "completed",
    error: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:01:00.000Z",
  };
}

function dashboardOverview(): Record<string, unknown> {
  return {
    activeProjects: [
      { id: projectId, title: "Album", status: null, updatedAt: "2026-07-08T10:00:00.000Z" },
    ],
    taskCounts: { assigned: 1, overdue: 0, dueSoon: 1 },
    recentActivity: [
      {
        id: taskId,
        eventType: "task.created",
        entityType: "task",
        entityId: taskId,
        actorUserId: null,
        createdAt: "2026-07-08T10:00:00.000Z",
      },
    ],
    pendingConfirmations: [
      {
        id: taskId,
        agentRunId: taskId,
        kind: "task.create",
        expiresAt: "2026-07-08T10:10:00.000Z",
        createdAt: "2026-07-08T10:00:00.000Z",
      },
    ],
    recentAgentRuns: [
      {
        id: taskId,
        source: "web",
        status: "completed",
        inputText: "Create a task",
        createdAt: "2026-07-08T10:00:00.000Z",
      },
    ],
  };
}

function taskSummary(): Record<string, unknown> {
  return {
    id: taskId,
    workspaceId,
    projectId,
    parentTaskId: null,
    title: "Intro",
    description: null,
    statusId: null,
    assigneeUserId: null,
    createdByUserId: trustedUserId,
    position: "1000",
    dueAt: null,
    sourceSkillId: null,
    sourceSkillVersionId: null,
    metadata: {},
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function archivedTaskSummary(): unknown {
  return {
    ...taskSummary(),
    archivedAt: "2026-07-08T10:30:00.000Z",
  };
}

function taskSkillSummary(): unknown {
  return {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    workspaceId,
    name: "Song",
    description: null,
    aliases: ["track"],
    createdByUserId: trustedUserId,
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function taskSkillDetail(): Record<string, unknown> {
  const skill = taskSkillSummary();
  if (typeof skill !== "object" || skill === null || Array.isArray(skill)) {
    throw new Error("Task skill fixture must be an object.");
  }

  return {
    ...skill,
    versions: [
      {
        id: "99999999-9999-4999-8999-999999999999",
        workspaceId,
        taskSkillId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        version: 1,
        definition: { subtasks: ["Record vocals"] },
        createdByUserId: trustedUserId,
        createdAt: "2026-07-08T10:00:00.000Z",
      },
    ],
  };
}

function taskSkillApplyPreview(): Record<string, unknown> {
  return {
    workspaceId,
    projectId,
    taskSkillId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    taskSkillVersionId: "99999999-9999-4999-8999-999999999999",
    taskSkillVersion: 1,
    rootTaskTitle: "Intro",
    subtasks: [{ source: "skill", title: "Record vocals" }],
  };
}

function taskSkillApplyResult(): Record<string, unknown> {
  return {
    ...taskSkillApplyPreview(),
    rootTask: taskSummary(),
    subtasks: [taskSummary()],
  };
}

function workspaceStatus(): unknown {
  return {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    workspaceId,
    name: "In progress",
    color: "#3b82f6",
    position: "1000",
    isDone: false,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function taskComment(): unknown {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    workspaceId,
    taskId,
    authorUserId: trustedUserId,
    body: "Bass take is ready.",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function taskAttachment(
  overrides: Partial<{
    kind: "file" | "link" | "telegram_file";
    storageKey: string | null;
    telegramFileId: string | null;
    title: string | null;
    url: string | null;
  }> = {},
): unknown {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    workspaceId,
    targetType: "task",
    targetId: taskId,
    kind: overrides.kind ?? "link",
    title: overrides.title ?? "Bass take",
    url: overrides.url ?? "https://example.com/bass",
    storageKey: overrides.storageKey ?? null,
    telegramFileId: overrides.telegramFileId ?? null,
    mimeType: null,
    sizeBytes: null,
    createdByUserId: trustedUserId,
    createdAt: "2026-07-08T10:00:00.000Z",
  };
}

function taskActivityEvent(): unknown {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    actorUserId: trustedUserId,
    eventType: "task.updated",
    entityId: taskId,
    entityType: "task",
    payload: { projectId },
    createdAt: "2026-07-08T10:00:00.000Z",
  };
}
