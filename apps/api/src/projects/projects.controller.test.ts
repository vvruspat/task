import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput,
} from "./projects.contracts.js";
import { ProjectsController } from "./projects.controller.js";
import { ParseCreateProjectBodyPipe, ParseUpdateProjectBodyPipe } from "./projects.dto.js";
import { ProjectsService } from "./projects.service.js";
import type {
  ProjectArchiveResult,
  ProjectCreateResult,
  ProjectDeleteResult,
  ProjectReadStore,
  ProjectUpdateResult,
} from "./projects.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const archivedAt = new Date("2026-01-04T00:00:00.000Z");

const projectSummary: ProjectSummary = {
  id: projectId,
  workspaceId,
  key: "AR",
  slug: "album-release",
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

test("ProjectsController uses trusted current user context for project archives", async () => {
  const controller = new ProjectsController(
    new ProjectsService(
      createReadStore({
        archiveResult: {
          project: { ...projectSummary, archivedAt },
          status: "archived",
        },
      }),
    ),
  );

  const response = await controller.archiveProject(workspaceId, projectId, userId);

  assert.equal(response.id, projectId);
  assert.equal(response.archivedAt?.toISOString(), archivedAt.toISOString());
});

test("ProjectsController uses trusted current user context for project updates", async () => {
  const input: UpdateProjectInput = { description: "Updated planning", status: null };
  const controller = new ProjectsController(
    new ProjectsService(
      createReadStore({
        updateResult: {
          project: {
            ...projectSummary,
            description: input.description ?? null,
            status: input.status ?? null,
          },
          status: "updated",
        },
      }),
    ),
  );

  const response = await controller.updateProject(workspaceId, projectId, userId, input);

  assert.equal(response.id, projectId);
  assert.equal(response.description, input.description);
  assert.equal(response.status, input.status);
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

test("ParseUpdateProjectBodyPipe validates and normalizes project update payloads", () => {
  const pipe = new ParseUpdateProjectBodyPipe();

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
  assert.deepEqual(pipe.transform({ status: null }), { status: null });

  assert.throws(() => pipe.transform({}), BadRequestException);
  assert.throws(() => pipe.transform({ title: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ position: "first" }), BadRequestException);
  assert.throws(() => pipe.transform({ status: 1 }), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
});

function createReadStore(options: {
  projects?: ProjectSummary[] | null;
  project?: ProjectDetail | null;
  createResult?: ProjectCreateResult;
  archiveResult?: ProjectArchiveResult;
  updateResult?: ProjectUpdateResult;
  deleteResult?: ProjectDeleteResult;
}): ProjectReadStore {
  return {
    listActiveForWorkspace: async (): Promise<ProjectSummary[] | null> => options.projects ?? [],
    getForWorkspace: async (): Promise<ProjectDetail | null> => options.project ?? null,
    createForWorkspace: async (): Promise<ProjectCreateResult> =>
      options.createResult ?? { status: "workspace_not_found" },
    updateForWorkspace: async (): Promise<ProjectUpdateResult> =>
      options.updateResult ?? { status: "project_not_found" },
    archiveForWorkspace: async (): Promise<ProjectArchiveResult> =>
      options.archiveResult ?? { status: "project_not_found" },
    deleteForWorkspace: async (): Promise<ProjectDeleteResult> =>
      options.deleteResult ?? { status: "project_not_found" },
  };
}
