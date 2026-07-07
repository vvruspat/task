import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type {
  CreateTaskSkillInput,
  PreviewTaskSkillApplyInput,
  TaskSkillApplyPreview,
  TaskSkillDetail,
  TaskSkillSummary,
  UpdateTaskSkillDefinitionInput,
  UpdateTaskSkillMetadataInput,
} from "./task-skills.contracts.js";
import { TaskSkillDetailDto, TaskSkillSummaryDto } from "./task-skills.dto.js";
import { TaskSkillsService } from "./task-skills.service.js";
import type {
  TaskSkillApplyPreviewResult,
  TaskSkillArchiveResult,
  TaskSkillCreateResult,
  TaskSkillDefinitionUpdateResult,
  TaskSkillMetadataUpdateResult,
  TaskSkillsReadStore,
} from "./task-skills.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const projectId = "66666666-6666-4666-8666-666666666666";
const skillId = "33333333-3333-4333-8333-333333333333";
const versionId = "44444444-4444-4444-8444-444444444444";
const nextVersionId = "55555555-5555-4555-8555-555555555555";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-01-02T00:00:00.000Z");
const archivedAt = new Date("2026-01-03T00:00:00.000Z");

const taskSkill: TaskSkillSummary = {
  id: skillId,
  workspaceId,
  name: "Song",
  description: "Creates a song task tree.",
  aliases: ["track"],
  createdByUserId: userId,
  archivedAt: null,
  createdAt,
  updatedAt,
};

const taskSkillDetail: TaskSkillDetail = {
  ...taskSkill,
  versions: [
    {
      id: versionId,
      workspaceId,
      taskSkillId: skillId,
      version: 1,
      definition: {
        subtasks: [{ title: "Lyrics" }],
      },
      createdByUserId: userId,
      createdAt,
    },
  ],
};

const taskSkillDetailWithNewVersion: TaskSkillDetail = {
  ...taskSkill,
  versions: [
    {
      id: nextVersionId,
      workspaceId,
      taskSkillId: skillId,
      version: 2,
      definition: {
        subtasks: [{ title: "Record vocals" }],
      },
      createdByUserId: userId,
      createdAt,
    },
    ...taskSkillDetail.versions,
  ],
};

const archivedTaskSkillDetail: TaskSkillDetail = {
  ...taskSkillDetail,
  archivedAt,
};

const createInput: CreateTaskSkillInput = {
  name: "Song",
  description: "Creates a song task tree.",
  aliases: ["track"],
  definition: {
    subtasks: [{ title: "Lyrics" }],
  },
};

const metadataUpdateInput: UpdateTaskSkillMetadataInput = {
  name: "Single",
  description: "Updated skill metadata.",
  aliases: ["track", "single"],
};

const definitionUpdateInput: UpdateTaskSkillDefinitionInput = {
  definition: {
    subtasks: [{ title: "Record vocals" }],
  },
};

const previewInput: PreviewTaskSkillApplyInput = {
  projectId,
  rootTaskTitle: "Intro",
  overrides: {
    removeSubtasks: ["Lyrics"],
    addSubtasks: ["Strings"],
  },
};

const applyPreview: TaskSkillApplyPreview = {
  workspaceId,
  projectId,
  taskSkillId: skillId,
  taskSkillVersionId: versionId,
  taskSkillVersion: 1,
  rootTaskTitle: "Intro",
  subtasks: [{ title: "Strings", source: "added" }],
};

test("TaskSkillsService maps visible workspace task skills to DTOs", async () => {
  const service = new TaskSkillsService(createReadStore({ skills: [taskSkill] }));

  const response = await service.listActiveTaskSkills(workspaceId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof TaskSkillSummaryDto);
  assert.equal(response[0]?.id, taskSkill.id);
  assert.equal(response[0]?.workspaceId, taskSkill.workspaceId);
  assert.equal(response[0]?.name, taskSkill.name);
  assert.equal(response[0]?.description, taskSkill.description);
  assert.deepEqual(response[0]?.aliases, taskSkill.aliases);
  assert.equal(response[0]?.createdByUserId, taskSkill.createdByUserId);
});

test("TaskSkillsService returns one visible task skill with versions", async () => {
  const service = new TaskSkillsService(createReadStore({ skill: taskSkillDetail }));

  const response = await service.getTaskSkill(workspaceId, skillId, userId);

  assert.ok(response instanceof TaskSkillDetailDto);
  assert.equal(response.id, taskSkillDetail.id);
  assert.equal(response.versions.length, 1);
  assert.equal(response.versions[0]?.taskSkillId, skillId);
  assert.deepEqual(response.versions[0]?.definition, taskSkillDetail.versions[0]?.definition);
});

test("TaskSkillsService creates task skills for writable workspace members", async () => {
  const service = new TaskSkillsService(
    createReadStore({ createResult: { status: "created", taskSkill: taskSkillDetail } }),
  );

  const response = await service.createTaskSkill(workspaceId, userId, createInput);

  assert.ok(response instanceof TaskSkillDetailDto);
  assert.equal(response.id, taskSkillDetail.id);
  assert.equal(response.versions[0]?.version, 1);
});

test("TaskSkillsService updates task skill metadata for writable workspace members", async () => {
  const service = new TaskSkillsService(
    createReadStore({
      metadataUpdateResult: { status: "updated", taskSkill: taskSkillDetail },
    }),
  );

  const response = await service.updateTaskSkillMetadata(
    workspaceId,
    skillId,
    userId,
    metadataUpdateInput,
  );

  assert.ok(response instanceof TaskSkillDetailDto);
  assert.equal(response.id, taskSkillDetail.id);
  assert.equal(response.versions[0]?.version, 1);
});

test("TaskSkillsService creates new task skill definition versions for writable workspace members", async () => {
  const service = new TaskSkillsService(
    createReadStore({
      definitionUpdateResult: {
        status: "updated",
        taskSkill: taskSkillDetailWithNewVersion,
      },
    }),
  );

  const response = await service.updateTaskSkillDefinition(
    workspaceId,
    skillId,
    userId,
    definitionUpdateInput,
  );

  assert.ok(response instanceof TaskSkillDetailDto);
  assert.equal(response.id, taskSkillDetail.id);
  assert.equal(response.versions[0]?.version, 2);
  assert.equal(response.versions[1]?.version, 1);
});

test("TaskSkillsService archives task skills for writable workspace members", async () => {
  const service = new TaskSkillsService(
    createReadStore({
      archiveResult: {
        status: "archived",
        taskSkill: archivedTaskSkillDetail,
      },
    }),
  );

  const response = await service.archiveTaskSkill(workspaceId, skillId, userId);

  assert.ok(response instanceof TaskSkillDetailDto);
  assert.equal(response.id, taskSkillDetail.id);
  assert.equal(response.archivedAt?.toISOString(), archivedAt.toISOString());
  assert.equal(response.versions[0]?.version, 1);
});

test("TaskSkillsService previews task skill application for visible projects", async () => {
  const service = new TaskSkillsService(
    createReadStore({
      applyPreviewResult: {
        status: "previewed",
        preview: applyPreview,
      },
    }),
  );

  const response = await service.previewTaskSkillApply(workspaceId, skillId, userId, previewInput);

  assert.equal(response.projectId, projectId);
  assert.equal(response.taskSkillVersion, 1);
  assert.deepEqual(
    response.subtasks.map((subtask) => subtask.source),
    ["added"],
  );
});

test("TaskSkillsService hides missing task skills during metadata updates", async () => {
  const service = new TaskSkillsService(
    createReadStore({ metadataUpdateResult: { status: "task_skill_not_found" } }),
  );

  await assert.rejects(
    () => service.updateTaskSkillMetadata(workspaceId, skillId, userId, metadataUpdateInput),
    NotFoundException,
  );
});

test("TaskSkillsService hides missing task skills during definition updates", async () => {
  const service = new TaskSkillsService(
    createReadStore({ definitionUpdateResult: { status: "task_skill_not_found" } }),
  );

  await assert.rejects(
    () => service.updateTaskSkillDefinition(workspaceId, skillId, userId, definitionUpdateInput),
    NotFoundException,
  );
});

test("TaskSkillsService hides missing task skills during archives", async () => {
  const service = new TaskSkillsService(
    createReadStore({ archiveResult: { status: "task_skill_not_found" } }),
  );

  await assert.rejects(
    () => service.archiveTaskSkill(workspaceId, skillId, userId),
    NotFoundException,
  );
});

test("TaskSkillsService hides missing apply preview targets", async () => {
  const service = new TaskSkillsService(
    createReadStore({ applyPreviewResult: { status: "not_found" } }),
  );

  await assert.rejects(
    () => service.previewTaskSkillApply(workspaceId, skillId, userId, previewInput),
    NotFoundException,
  );
});

test("TaskSkillsService rejects invalid task skill definitions during apply previews", async () => {
  const service = new TaskSkillsService(
    createReadStore({ applyPreviewResult: { status: "invalid_definition" } }),
  );

  await assert.rejects(
    () => service.previewTaskSkillApply(workspaceId, skillId, userId, previewInput),
    BadRequestException,
  );
});

test("TaskSkillsService hides missing or inaccessible workspaces", async () => {
  const service = new TaskSkillsService(
    createReadStore({
      archiveResult: { status: "workspace_not_found" },
      createResult: { status: "workspace_not_found" },
      definitionUpdateResult: { status: "workspace_not_found" },
      metadataUpdateResult: { status: "workspace_not_found" },
      skill: null,
      skills: null,
    }),
  );

  await assert.rejects(() => service.listActiveTaskSkills(workspaceId, userId), NotFoundException);
  await assert.rejects(() => service.getTaskSkill(workspaceId, skillId, userId), NotFoundException);
  await assert.rejects(
    () => service.createTaskSkill(workspaceId, userId, createInput),
    NotFoundException,
  );
  await assert.rejects(
    () => service.updateTaskSkillMetadata(workspaceId, skillId, userId, metadataUpdateInput),
    NotFoundException,
  );
  await assert.rejects(
    () => service.updateTaskSkillDefinition(workspaceId, skillId, userId, definitionUpdateInput),
    NotFoundException,
  );
  await assert.rejects(
    () => service.archiveTaskSkill(workspaceId, skillId, userId),
    NotFoundException,
  );
});

test("TaskSkillsService rejects task skill creation without write permission", async () => {
  const service = new TaskSkillsService(createReadStore({ createResult: { status: "forbidden" } }));

  await assert.rejects(
    () => service.createTaskSkill(workspaceId, userId, createInput),
    ForbiddenException,
  );
});

test("TaskSkillsService rejects task skill metadata updates without write permission", async () => {
  const service = new TaskSkillsService(
    createReadStore({ metadataUpdateResult: { status: "forbidden" } }),
  );

  await assert.rejects(
    () => service.updateTaskSkillMetadata(workspaceId, skillId, userId, metadataUpdateInput),
    ForbiddenException,
  );
});

test("TaskSkillsService rejects task skill definition updates without write permission", async () => {
  const service = new TaskSkillsService(
    createReadStore({ definitionUpdateResult: { status: "forbidden" } }),
  );

  await assert.rejects(
    () => service.updateTaskSkillDefinition(workspaceId, skillId, userId, definitionUpdateInput),
    ForbiddenException,
  );
});

test("TaskSkillsService rejects task skill archives without write permission", async () => {
  const service = new TaskSkillsService(
    createReadStore({ archiveResult: { status: "forbidden" } }),
  );

  await assert.rejects(
    () => service.archiveTaskSkill(workspaceId, skillId, userId),
    ForbiddenException,
  );
});

test("TaskSkillsService rejects duplicate task skill names", async () => {
  const service = new TaskSkillsService(
    createReadStore({ createResult: { status: "duplicate_name" } }),
  );

  await assert.rejects(
    () => service.createTaskSkill(workspaceId, userId, createInput),
    BadRequestException,
  );
});

test("TaskSkillsService rejects duplicate task skill names during metadata updates", async () => {
  const service = new TaskSkillsService(
    createReadStore({ metadataUpdateResult: { status: "duplicate_name" } }),
  );

  await assert.rejects(
    () => service.updateTaskSkillMetadata(workspaceId, skillId, userId, metadataUpdateInput),
    BadRequestException,
  );
});

function createReadStore(options: {
  archiveResult?: TaskSkillArchiveResult;
  applyPreviewResult?: TaskSkillApplyPreviewResult;
  createResult?: TaskSkillCreateResult;
  definitionUpdateResult?: TaskSkillDefinitionUpdateResult;
  metadataUpdateResult?: TaskSkillMetadataUpdateResult;
  skill?: TaskSkillDetail | null;
  skills?: TaskSkillSummary[] | null;
}): TaskSkillsReadStore {
  return {
    listActiveForWorkspace: async (): Promise<TaskSkillSummary[] | null> => options.skills ?? null,
    getActiveForWorkspace: async (): Promise<TaskSkillDetail | null> => options.skill ?? null,
    archiveForWorkspace: async (): Promise<TaskSkillArchiveResult> =>
      options.archiveResult ?? { status: "workspace_not_found" },
    previewApplyForWorkspace: async (): Promise<TaskSkillApplyPreviewResult> =>
      options.applyPreviewResult ?? { status: "not_found" },
    createForWorkspace: async (): Promise<TaskSkillCreateResult> =>
      options.createResult ?? { status: "workspace_not_found" },
    updateDefinitionForWorkspace: async (): Promise<TaskSkillDefinitionUpdateResult> =>
      options.definitionUpdateResult ?? { status: "workspace_not_found" },
    updateMetadataForWorkspace: async (): Promise<TaskSkillMetadataUpdateResult> =>
      options.metadataUpdateResult ?? { status: "workspace_not_found" },
  };
}
