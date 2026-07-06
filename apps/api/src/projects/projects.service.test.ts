import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { ProjectDetail, ProjectSummary } from "./projects.contracts.js";
import { ProjectDetailDto, ProjectSummaryDto } from "./projects.dto.js";
import { ProjectsService } from "./projects.service.js";
import type { ProjectReadStore } from "./projects.store.js";

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

test("ProjectsService hides inaccessible workspaces and missing projects", async () => {
  const service = new ProjectsService(createReadStore({ project: null, projects: null }));

  await assert.rejects(() => service.listActiveProjects(workspaceId, userId), NotFoundException);
  await assert.rejects(() => service.getProject(workspaceId, projectId, userId), NotFoundException);
});

function createReadStore(options: {
  projects?: ProjectSummary[] | null;
  project?: ProjectDetail | null;
}): ProjectReadStore {
  return {
    listActiveForWorkspace: async (): Promise<ProjectSummary[] | null> =>
      options.projects === undefined ? [] : options.projects,
    getForWorkspace: async (): Promise<ProjectDetail | null> =>
      options.project === undefined ? null : options.project,
  };
}
