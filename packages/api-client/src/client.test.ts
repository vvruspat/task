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

test("createTaskApiClient deletes tasks with trusted user context", async () => {
  const fetcher = new RecordingFetch(single(archivedTaskSummary()));
  const client = createTaskApiClient({
    baseUrl: "https://task.example",
    fetch: fetcher.fetch,
    trustedUserId,
  });
  const taskId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

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

function taskSummary(): Record<string, unknown> {
  return {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
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
