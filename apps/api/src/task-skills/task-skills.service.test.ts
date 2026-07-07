import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { TaskSkillSummary } from "./task-skills.contracts.js";
import { TaskSkillSummaryDto } from "./task-skills.dto.js";
import { TaskSkillsService } from "./task-skills.service.js";
import type { TaskSkillsReadStore } from "./task-skills.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const skillId = "33333333-3333-4333-8333-333333333333";
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

test("TaskSkillsService hides missing or inaccessible workspaces", async () => {
  const service = new TaskSkillsService(createReadStore({ skills: null }));

  await assert.rejects(() => service.listActiveTaskSkills(workspaceId, userId), NotFoundException);
});

function createReadStore(options: { skills?: TaskSkillSummary[] | null }): TaskSkillsReadStore {
  return {
    listActiveForWorkspace: async (): Promise<TaskSkillSummary[] | null> => options.skills ?? null,
  };
}
