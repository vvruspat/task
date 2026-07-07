import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type {
  CreateTaskSkillInput,
  TaskSkillDetail,
  TaskSkillSummary,
} from "./task-skills.contracts.js";
import { TaskSkillDetailDto, TaskSkillSummaryDto } from "./task-skills.dto.js";
import { TaskSkillsService } from "./task-skills.service.js";
import type { TaskSkillCreateResult, TaskSkillsReadStore } from "./task-skills.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const skillId = "33333333-3333-4333-8333-333333333333";
const versionId = "44444444-4444-4444-8444-444444444444";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-01-02T00:00:00.000Z");

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

const createInput: CreateTaskSkillInput = {
  name: "Song",
  description: "Creates a song task tree.",
  aliases: ["track"],
  definition: {
    subtasks: [{ title: "Lyrics" }],
  },
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

test("TaskSkillsService hides missing or inaccessible workspaces", async () => {
  const service = new TaskSkillsService(
    createReadStore({ createResult: { status: "workspace_not_found" }, skill: null, skills: null }),
  );

  await assert.rejects(() => service.listActiveTaskSkills(workspaceId, userId), NotFoundException);
  await assert.rejects(() => service.getTaskSkill(workspaceId, skillId, userId), NotFoundException);
  await assert.rejects(
    () => service.createTaskSkill(workspaceId, userId, createInput),
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

test("TaskSkillsService rejects duplicate task skill names", async () => {
  const service = new TaskSkillsService(
    createReadStore({ createResult: { status: "duplicate_name" } }),
  );

  await assert.rejects(
    () => service.createTaskSkill(workspaceId, userId, createInput),
    BadRequestException,
  );
});

function createReadStore(options: {
  createResult?: TaskSkillCreateResult;
  skill?: TaskSkillDetail | null;
  skills?: TaskSkillSummary[] | null;
}): TaskSkillsReadStore {
  return {
    listActiveForWorkspace: async (): Promise<TaskSkillSummary[] | null> => options.skills ?? null,
    getActiveForWorkspace: async (): Promise<TaskSkillDetail | null> => options.skill ?? null,
    createForWorkspace: async (): Promise<TaskSkillCreateResult> =>
      options.createResult ?? { status: "workspace_not_found" },
  };
}
