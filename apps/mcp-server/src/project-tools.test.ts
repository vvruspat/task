import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  PreviewTaskSkillApplyResponse,
  ProjectSummaryResponse,
  TaskBackendClient,
} from "./backend-client.js";
import {
  createProjectToolHandlers,
  ProjectToolInputError,
  parseProjectSearchToolInput,
} from "./project-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "55555555-5555-4555-8555-555555555555";
const projectId = "22222222-2222-4222-8222-222222222222";
const secondProjectId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-01-01T00:00:00.000Z";

const projects: ProjectSummaryResponse[] = [
  {
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
  },
  {
    id: secondProjectId,
    workspaceId,
    title: "Tour Prep",
    createdByUserId: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

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

  assert.deepEqual(await handlers.search({ workspaceId, userId, query: "album" }), [projects[0]]);
});

function createBackendClientStub(projects: ProjectSummaryResponse[]): TaskBackendClient {
  return {
    listActiveProjects: async (): Promise<ProjectSummaryResponse[]> => projects,
    previewTaskSkillApply: async (): Promise<PreviewTaskSkillApplyResponse> => {
      throw new Error("Not implemented.");
    },
    applyTaskSkill: async (): Promise<ApplyTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
  };
}
