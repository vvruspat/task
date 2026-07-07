import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type {
  CreateTaskSkillInput,
  TaskSkillDetail,
  TaskSkillSummary,
  UpdateTaskSkillMetadataInput,
} from "./task-skills.contracts.js";
import { TaskSkillsController } from "./task-skills.controller.js";
import {
  ParseCreateTaskSkillBodyPipe,
  ParseUpdateTaskSkillMetadataBodyPipe,
} from "./task-skills.dto.js";
import { TaskSkillsService } from "./task-skills.service.js";
import type {
  TaskSkillCreateResult,
  TaskSkillMetadataUpdateResult,
  TaskSkillsReadStore,
} from "./task-skills.store.js";

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

test("TaskSkillsController uses trusted current user context for task skill creates", async () => {
  const controller = new TaskSkillsController(
    new TaskSkillsService(
      createReadStore({ createResult: { status: "created", taskSkill: taskSkillDetail } }),
    ),
  );

  const response = await controller.createTaskSkill(workspaceId, userId, createInput);

  assert.equal(response.id, skillId);
  assert.equal(response.createdByUserId, userId);
  assert.equal(response.versions[0]?.version, 1);
});

test("TaskSkillsController uses trusted current user context for task skill metadata updates", async () => {
  const controller = new TaskSkillsController(
    new TaskSkillsService(
      createReadStore({
        metadataUpdateResult: { status: "updated", taskSkill: taskSkillDetail },
      }),
    ),
  );

  const response = await controller.updateTaskSkillMetadata(
    workspaceId,
    skillId,
    userId,
    metadataUpdateInput,
  );

  assert.equal(response.id, skillId);
  assert.equal(response.versions[0]?.taskSkillId, skillId);
});

test("ParseCreateTaskSkillBodyPipe validates and normalizes task skill payloads", () => {
  const pipe = new ParseCreateTaskSkillBodyPipe();

  assert.deepEqual(
    pipe.transform({
      name: "  Song  ",
      description: "",
      aliases: [" track ", "track"],
      definition: {
        subtasks: [{ title: " Lyrics " }],
      },
    }),
    {
      name: "Song",
      description: null,
      aliases: ["track"],
      definition: {
        subtasks: [{ title: " Lyrics " }],
      },
    },
  );

  assert.throws(
    () => pipe.transform({ name: "", definition: createInput.definition }),
    BadRequestException,
  );
  assert.throws(() => pipe.transform({ name: "Song" }), BadRequestException);
  assert.throws(
    () => pipe.transform({ name: "Song", definition: { subtasks: [] } }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ name: "Song", definition: { subtasks: [{ title: "" }] } }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ name: "Song", aliases: [1], definition: createInput.definition }),
    BadRequestException,
  );
  assert.throws(() => pipe.transform(null), BadRequestException);
});

test("ParseUpdateTaskSkillMetadataBodyPipe validates and normalizes task skill payloads", () => {
  const pipe = new ParseUpdateTaskSkillMetadataBodyPipe();

  assert.deepEqual(
    pipe.transform({
      name: "  Single  ",
      description: "",
      aliases: [" single ", "single", "track"],
    }),
    {
      name: "Single",
      description: null,
      aliases: ["single", "track"],
    },
  );

  assert.deepEqual(pipe.transform({ description: null }), { description: null });
  assert.deepEqual(pipe.transform({ aliases: [] }), { aliases: [] });

  assert.throws(() => pipe.transform({}), BadRequestException);
  assert.throws(() => pipe.transform({ name: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ description: 1 }), BadRequestException);
  assert.throws(() => pipe.transform({ aliases: [1] }), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
});

function createReadStore(options: {
  createResult?: TaskSkillCreateResult;
  metadataUpdateResult?: TaskSkillMetadataUpdateResult;
  skill?: TaskSkillDetail | null;
  skills?: TaskSkillSummary[] | null;
}): TaskSkillsReadStore {
  return {
    listActiveForWorkspace: async (): Promise<TaskSkillSummary[] | null> => options.skills ?? null,
    getActiveForWorkspace: async (): Promise<TaskSkillDetail | null> => options.skill ?? null,
    createForWorkspace: async (): Promise<TaskSkillCreateResult> =>
      options.createResult ?? { status: "workspace_not_found" },
    updateMetadataForWorkspace: async (): Promise<TaskSkillMetadataUpdateResult> =>
      options.metadataUpdateResult ?? { status: "workspace_not_found" },
  };
}
