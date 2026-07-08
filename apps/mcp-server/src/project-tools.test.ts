import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  CreateProjectRequest,
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
  createProjectToolHandlers,
  ProjectToolInputError,
  parseProjectCreateToolInput,
  parseProjectGetToolInput,
  parseProjectSearchToolInput,
} from "./project-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "55555555-5555-4555-8555-555555555555";
const projectId = "22222222-2222-4222-8222-222222222222";
const secondProjectId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-01-01T00:00:00.000Z";

const albumProject: ProjectSummaryResponse = {
  id: projectId,
  workspaceId,
  title: "Album Release",
  description: null,
  status: "active",
  position: "1000",
  createdByUserId: userId,
  archivedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const projects: ProjectSummaryResponse[] = [
  albumProject,
  {
    id: secondProjectId,
    workspaceId,
    title: "Tour Prep",
    createdByUserId: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const projectDetail: ProjectDetailResponse = {
  ...albumProject,
};

test("parseProjectCreateToolInput validates and normalizes project create payloads", () => {
  assert.deepEqual(
    parseProjectCreateToolInput({
      workspaceId,
      userId,
      title: "  Album Release  ",
      description: "  Release plan  ",
      status: null,
      position: " 1000 ",
    }),
    {
      workspaceId,
      userId,
      title: "Album Release",
      description: "Release plan",
      status: null,
      position: "1000",
    },
  );

  assert.throws(
    () => parseProjectCreateToolInput({ workspaceId, userId, title: "" }),
    ProjectToolInputError,
  );
  assert.throws(
    () => parseProjectCreateToolInput({ workspaceId, userId, title: "Album", description: "" }),
    ProjectToolInputError,
  );
});

test("parseProjectGetToolInput validates project get payloads", () => {
  assert.deepEqual(parseProjectGetToolInput({ workspaceId, projectId, userId }), {
    workspaceId,
    projectId,
    userId,
  });

  assert.throws(
    () => parseProjectGetToolInput({ workspaceId, projectId: "bad", userId }),
    ProjectToolInputError,
  );
});

test("parseProjectSearchToolInput validates and normalizes project search payloads", () => {
  assert.deepEqual(
    parseProjectSearchToolInput({
      workspaceId,
      userId,
      query: "  album  ",
    }),
    {
      workspaceId,
      userId,
      query: "album",
    },
  );

  assert.deepEqual(parseProjectSearchToolInput({ workspaceId, userId }), {
    workspaceId,
    userId,
  });

  assert.throws(
    () => parseProjectSearchToolInput({ workspaceId, userId, query: "" }),
    ProjectToolInputError,
  );
  assert.throws(
    () => parseProjectSearchToolInput({ workspaceId: "bad", userId }),
    ProjectToolInputError,
  );
});

test("project search handler lists active projects when query is absent", async () => {
  const client = createBackendClientStub(projects);
  const handlers = createProjectToolHandlers(client);

  assert.deepEqual(await handlers.search({ workspaceId, userId }), projects);
});

test("project search handler filters active projects by title", async () => {
  const client = createBackendClientStub(projects);
  const handlers = createProjectToolHandlers(client);

  assert.deepEqual(await handlers.search({ workspaceId, userId, query: "album" }), [albumProject]);
});

test("project get handler forwards project identifiers to the backend client", async () => {
  const calls: Array<{ workspaceId: string; projectId: string; userId: string }> = [];
  const client = createBackendClientStub(projects, calls);
  const handlers = createProjectToolHandlers(client);

  assert.deepEqual(await handlers.get({ workspaceId, projectId, userId }), projectDetail);
  assert.deepEqual(calls, [{ workspaceId, projectId, userId }]);
});

test("project create handler forwards project payloads to the backend client", async () => {
  const calls: CreateProjectRequest[] = [];
  const client = createBackendClientStub(projects, [], calls);
  const handlers = createProjectToolHandlers(client);

  assert.deepEqual(
    await handlers.create({
      workspaceId,
      userId,
      title: "Album Release",
      description: null,
      status: "active",
      position: "1000",
    }),
    projectDetail,
  );
  assert.deepEqual(calls, [
    {
      workspaceId,
      userId,
      body: {
        title: "Album Release",
        description: null,
        status: "active",
        position: "1000",
      },
    },
  ]);
});

function createBackendClientStub(
  projects: ProjectSummaryResponse[],
  getProjectCalls: Array<{ workspaceId: string; projectId: string; userId: string }> = [],
  createProjectCalls: CreateProjectRequest[] = [],
): TaskBackendClient {
  return {
    listWorkspaces: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    getWorkspace: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listWorkspaceMembers: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listWorkspaceStatuses: async (): Promise<WorkspaceStatusResponse[]> => {
      throw new Error("Not implemented.");
    },
    listPendingConfirmationRequests: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    getConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    createConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    cancelConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    confirmConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listTaskSkills: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    getTaskSkill: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    createTaskSkill: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateTaskSkillMetadata: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateTaskSkillDefinition: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listTaskComments: async (): Promise<TaskCommentResponse[]> => {
      throw new Error("Not implemented.");
    },
    createTaskComment: async (): Promise<TaskCommentResponse> => {
      throw new Error("Not implemented.");
    },
    listTaskAttachments: async (): Promise<TaskAttachmentResponse[]> => {
      throw new Error("Not implemented.");
    },
    createTaskLinkAttachment: async (): Promise<TaskAttachmentResponse> => {
      throw new Error("Not implemented.");
    },
    createProject: async (request): Promise<ProjectDetailResponse> => {
      createProjectCalls.push(request);

      return projectDetail;
    },
    getProject: async (request): Promise<ProjectDetailResponse> => {
      getProjectCalls.push(request);

      return projectDetail;
    },
    listActiveProjects: async (): Promise<ProjectSummaryResponse[]> => projects,
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
