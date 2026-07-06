import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type { CreateProjectInput, ProjectDetail, ProjectSummary } from "./projects.contracts.js";
import { ProjectsController } from "./projects.controller.js";
import { ParseCreateProjectBodyPipe } from "./projects.dto.js";
import { ProjectsService } from "./projects.service.js";
import type { ProjectCreateResult, ProjectReadStore } from "./projects.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const projectSummary: ProjectSummary = {
  id: projectId,
  workspaceId,
  title: "Album release",
  description: null,
  status: "active",
  position: "1000",
  createdByUserId: userId,
  archivedAt: null,
  createdAt,
  updatedAt: createdAt,
};

test("ProjectsController uses trusted current user context for project list reads", async () => {
  const controller = new ProjectsController(
    new ProjectsService(createReadStore({ projects: [projectSummary] })),
  );

  const response = await controller.listActiveProjects(workspaceId, userId);

  assert.equal(response.length, 1);
  assert.equal(response[0]?.id, projectId);
});

test("ProjectsController uses trusted current user context for project detail reads", async () => {
  const controller = new ProjectsController(
    new ProjectsService(createReadStore({ project: projectSummary })),
  );

  const response = await controller.getProject(workspaceId, projectId, userId);

  assert.equal(response.id, projectId);
  assert.equal(response.workspaceId, workspaceId);
});

test("ProjectsController uses trusted current user context for project creates", async () => {
  const input: CreateProjectInput = { title: "Next release" };
  const controller = new ProjectsController(
    new ProjectsService(
      createReadStore({
        createResult: {
          project: { ...projectSummary, title: input.title },
          status: "created",
        },
      }),
    ),
  );

  const response = await controller.createProject(workspaceId, userId, input);

  assert.equal(response.title, input.title);
  assert.equal(response.createdByUserId, userId);
});

test("ParseCreateProjectBodyPipe validates and normalizes project create payloads", () => {
  const pipe = new ParseCreateProjectBodyPipe();

  assert.deepEqual(
    pipe.transform({
      title: "  Next release  ",
      description: "",
      status: " active ",
      position: "2000",
    }),
    {
      title: "Next release",
      description: null,
      status: "active",
      position: "2000",
    },
  );

  assert.throws(() => pipe.transform({ title: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ title: "Next", position: "first" }), BadRequestException);
  assert.throws(() => pipe.transform({ title: "Next", status: 1 }), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
});

function createReadStore(options: {
  projects?: ProjectSummary[] | null;
  project?: ProjectDetail | null;
  createResult?: ProjectCreateResult;
}): ProjectReadStore {
  return {
    listActiveForWorkspace: async (): Promise<ProjectSummary[] | null> => options.projects ?? [],
    getForWorkspace: async (): Promise<ProjectDetail | null> => options.project ?? null,
    createForWorkspace: async (): Promise<ProjectCreateResult> =>
      options.createResult ?? { status: "workspace_not_found" },
  };
}
