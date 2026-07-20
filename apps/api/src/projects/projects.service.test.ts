import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput,
} from "./projects.contracts.js";
import { ProjectDetailDto, ProjectSummaryDto } from "./projects.dto.js";
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

test("ProjectsService maps visible active projects to DTOs", async () => {
  const service = new ProjectsService(createReadStore({ projects: [projectSummary] }));

  const response = await service.listActiveProjects(workspaceId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof ProjectSummaryDto);
  assert.equal(response[0]?.id, projectId);
  assert.equal(response[0]?.title, projectSummary.title);
});

test("ProjectsService returns one visible project DTO", async () => {
  const service = new ProjectsService(createReadStore({ project: projectSummary }));

  const response = await service.getProject(workspaceId, projectId, userId);

  assert.ok(response instanceof ProjectDetailDto);
  assert.equal(response.id, projectId);
  assert.equal(response.workspaceId, workspaceId);
});

test("ProjectsService creates a project for writable workspace members", async () => {
  const input: CreateProjectInput = {
    title: "Next release",
    description: "Release planning",
    status: "active",
    position: "2000",
  };
  const service = new ProjectsService(
    createReadStore({
      createResult: {
        project: {
          ...projectSummary,
          title: input.title,
          description: input.description ?? null,
          position: input.position ?? null,
        },
        status: "created",
      },
    }),
  );

  const response = await service.createProject(workspaceId, userId, input);

  assert.ok(response instanceof ProjectDetailDto);
  assert.equal(response.title, input.title);
  assert.equal(response.createdByUserId, userId);
});

test("ProjectsService archives projects for writable workspace members", async () => {
  const service = new ProjectsService(
    createReadStore({
      archiveResult: {
        project: {
          ...projectSummary,
          archivedAt,
        },
        status: "archived",
      },
    }),
  );

  const response = await service.archiveProject(workspaceId, projectId, userId);

  assert.ok(response instanceof ProjectDetailDto);
  assert.equal(response.id, projectId);
  assert.equal(response.archivedAt?.toISOString(), archivedAt.toISOString());
});

test("ProjectsService permanently deletes projects", async () => {
  const service = new ProjectsService(
    createReadStore({ deleteResult: { project: projectSummary, status: "deleted" } }),
  );
  const response = await service.deleteProject(workspaceId, projectId, userId);
  assert.equal(response.id, projectId);
});

test("ProjectsService updates projects for writable workspace members", async () => {
  const input: UpdateProjectInput = {
    title: "Updated release",
    description: "Updated planning",
    status: null,
    position: "3000",
  };
  const service = new ProjectsService(
    createReadStore({
      updateResult: {
        project: {
          ...projectSummary,
          title: input.title ?? projectSummary.title,
          description: input.description ?? null,
          status: input.status ?? null,
          position: input.position ?? null,
        },
        status: "updated",
      },
    }),
  );

  const response = await service.updateProject(workspaceId, projectId, userId, input);

  assert.ok(response instanceof ProjectDetailDto);
  assert.equal(response.id, projectId);
  assert.equal(response.title, input.title);
  assert.equal(response.description, input.description);
  assert.equal(response.status, input.status);
  assert.equal(response.position, input.position);
});

test("ProjectsService hides inaccessible workspaces and missing projects", async () => {
  const service = new ProjectsService(createReadStore({ project: null, projects: null }));

  await assert.rejects(() => service.listActiveProjects(workspaceId, userId), NotFoundException);
  await assert.rejects(() => service.getProject(workspaceId, projectId, userId), NotFoundException);
  await assert.rejects(
    () => service.createProject(workspaceId, userId, { title: "Hidden" }),
    NotFoundException,
  );
  await assert.rejects(
    () => service.archiveProject(workspaceId, projectId, userId),
    NotFoundException,
  );
  await assert.rejects(
    () => service.updateProject(workspaceId, projectId, userId, { title: "Hidden" }),
    NotFoundException,
  );
});

test("ProjectsService rejects project creation without write permission", async () => {
  const service = new ProjectsService(createReadStore({ createResult: { status: "forbidden" } }));

  await assert.rejects(
    () => service.createProject(workspaceId, userId, { title: "Hidden" }),
    ForbiddenException,
  );
});

test("ProjectsService rejects project archives without write permission", async () => {
  const service = new ProjectsService(createReadStore({ archiveResult: { status: "forbidden" } }));

  await assert.rejects(
    () => service.archiveProject(workspaceId, projectId, userId),
    ForbiddenException,
  );
});

test("ProjectsService rejects project updates without write permission", async () => {
  const service = new ProjectsService(createReadStore({ updateResult: { status: "forbidden" } }));

  await assert.rejects(
    () => service.updateProject(workspaceId, projectId, userId, { title: "Hidden" }),
    ForbiddenException,
  );
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
    listActiveForWorkspace: async (): Promise<ProjectSummary[] | null> =>
      options.projects === undefined ? [] : options.projects,
    getForWorkspace: async (): Promise<ProjectDetail | null> =>
      options.project === undefined ? null : options.project,
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
