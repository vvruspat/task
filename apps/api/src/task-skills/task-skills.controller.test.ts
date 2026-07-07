import assert from "node:assert/strict";
import test from "node:test";
import type { TaskSkillDetail, TaskSkillSummary } from "./task-skills.contracts.js";
import { TaskSkillsController } from "./task-skills.controller.js";
import { TaskSkillsService } from "./task-skills.service.js";
import type { TaskSkillsReadStore } from "./task-skills.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const skillId = "33333333-3333-4333-8333-333333333333";
const versionId = "44444444-4444-4444-8444-444444444444";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const taskSkill: TaskSkillSummary = {
  id: skillId,
  workspaceId,
  name: "Song",
  description: "Creates a song task tree.",
  aliases: ["track"],
  createdByUserId: userId,
  archivedAt: null,
  createdAt,
  updatedAt: createdAt,
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

test("TaskSkillsController uses trusted current user context for task skill list reads", async () => {
  const controller = new TaskSkillsController(
    new TaskSkillsService(createReadStore({ skills: [taskSkill] })),
  );

  const response = await controller.listActiveTaskSkills(workspaceId, userId);

  assert.equal(response.length, 1);
  assert.equal(response[0]?.id, skillId);
});

test("TaskSkillsController uses trusted current user context for task skill detail reads", async () => {
  const controller = new TaskSkillsController(
    new TaskSkillsService(createReadStore({ skill: taskSkillDetail })),
  );

  const response = await controller.getTaskSkill(workspaceId, skillId, userId);

  assert.equal(response.id, skillId);
  assert.equal(response.versions.length, 1);
  assert.equal(response.versions[0]?.id, versionId);
});

function createReadStore(options: {
  skill?: TaskSkillDetail | null;
  skills?: TaskSkillSummary[] | null;
}): TaskSkillsReadStore {
  return {
    listActiveForWorkspace: async (): Promise<TaskSkillSummary[] | null> => options.skills ?? null,
    getActiveForWorkspace: async (): Promise<TaskSkillDetail | null> => options.skill ?? null,
  };
}
