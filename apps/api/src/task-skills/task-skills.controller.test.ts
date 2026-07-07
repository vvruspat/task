import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type {
  CreateTaskSkillInput,
  PreviewTaskSkillApplyInput,
  TaskSkillApplyPreview,
  TaskSkillApplyResult,
  TaskSkillDetail,
  TaskSkillSummary,
  UpdateTaskSkillDefinitionInput,
  UpdateTaskSkillMetadataInput,
} from "./task-skills.contracts.js";
import { TaskSkillsController } from "./task-skills.controller.js";
import {
  ParseCreateTaskSkillBodyPipe,
  ParsePreviewTaskSkillApplyBodyPipe,
  ParseUpdateTaskSkillDefinitionBodyPipe,
  ParseUpdateTaskSkillMetadataBodyPipe,
} from "./task-skills.dto.js";
import { TaskSkillsService } from "./task-skills.service.js";
import type {
  TaskSkillApplyForWorkspaceResult,
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
const rootTaskId = "77777777-7777-4777-8777-777777777777";
const subtaskId = "88888888-8888-4888-8888-888888888888";
const skillId = "33333333-3333-4333-8333-333333333333";
const versionId = "44444444-4444-4444-8444-444444444444";
const nextVersionId = "55555555-5555-4555-8555-555555555555";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
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

const applyResult: TaskSkillApplyResult = {
  workspaceId,
  projectId,
  taskSkillId: skillId,
  taskSkillVersionId: versionId,
  taskSkillVersion: 1,
  rootTask: {
    id: rootTaskId,
    workspaceId,
    projectId,
    parentTaskId: null,
    title: "Intro",
    description: null,
    statusId: null,
    assigneeUserId: null,
    createdByUserId: userId,
    position: "0",
    dueAt: null,
    sourceSkillId: skillId,
    sourceSkillVersionId: versionId,
    metadata: {},
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
  },
  subtasks: [
    {
      id: subtaskId,
      workspaceId,
      projectId,
      parentTaskId: rootTaskId,
      title: "Strings",
      description: null,
      statusId: null,
      assigneeUserId: null,
      createdByUserId: userId,
      position: "1",
      dueAt: null,
      sourceSkillId: skillId,
      sourceSkillVersionId: versionId,
      metadata: { taskSkillSubtaskSource: "added" },
      archivedAt: null,
      createdAt,
      updatedAt: createdAt,
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

test("TaskSkillsController uses trusted current user context for task skill definition updates", async () => {
  const controller = new TaskSkillsController(
    new TaskSkillsService(
      createReadStore({
        definitionUpdateResult: {
          status: "updated",
          taskSkill: taskSkillDetailWithNewVersion,
        },
      }),
    ),
  );

  const response = await controller.updateTaskSkillDefinition(
    workspaceId,
    skillId,
    userId,
    definitionUpdateInput,
  );

  assert.equal(response.id, skillId);
  assert.equal(response.versions[0]?.version, 2);
  assert.equal(response.versions[1]?.version, 1);
});

test("TaskSkillsController uses trusted current user context for task skill archives", async () => {
  const controller = new TaskSkillsController(
    new TaskSkillsService(
      createReadStore({
        archiveResult: {
          status: "archived",
          taskSkill: archivedTaskSkillDetail,
        },
      }),
    ),
  );

  const response = await controller.archiveTaskSkill(workspaceId, skillId, userId);

  assert.equal(response.id, skillId);
  assert.equal(response.archivedAt?.toISOString(), archivedAt.toISOString());
  assert.equal(response.versions[0]?.version, 1);
});

test("TaskSkillsController uses trusted current user context for task skill apply previews", async () => {
  const controller = new TaskSkillsController(
    new TaskSkillsService(
      createReadStore({
        applyPreviewResult: {
          status: "previewed",
          preview: applyPreview,
        },
      }),
    ),
  );

  const response = await controller.previewTaskSkillApply(
    workspaceId,
    skillId,
    userId,
    previewInput,
  );

  assert.equal(response.taskSkillId, skillId);
  assert.equal(response.taskSkillVersion, 1);
  assert.deepEqual(
    response.subtasks.map((subtask) => subtask.title),
    ["Strings"],
  );
});

test("TaskSkillsController uses trusted current user context for task skill applies", async () => {
  const controller = new TaskSkillsController(
    new TaskSkillsService(
      createReadStore({
        applyResult: {
          status: "applied",
          result: applyResult,
        },
      }),
    ),
  );

  const response = await controller.applyTaskSkill(workspaceId, skillId, userId, previewInput);

  assert.equal(response.taskSkillId, skillId);
  assert.equal(response.rootTask.id, rootTaskId);
  assert.deepEqual(
    response.subtasks.map((subtask) => subtask.parentTaskId),
    [rootTaskId],
  );
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

test("ParseUpdateTaskSkillDefinitionBodyPipe validates task skill definition payloads", () => {
  const pipe = new ParseUpdateTaskSkillDefinitionBodyPipe();

  assert.deepEqual(
    pipe.transform({
      definition: {
        subtasks: [{ title: " Record vocals " }],
      },
    }),
    {
      definition: {
        subtasks: [{ title: " Record vocals " }],
      },
    },
  );

  assert.throws(() => pipe.transform({}), BadRequestException);
  assert.throws(() => pipe.transform({ definition: { subtasks: [] } }), BadRequestException);
  assert.throws(
    () => pipe.transform({ definition: { subtasks: [{ title: "" }] } }),
    BadRequestException,
  );
  assert.throws(() => pipe.transform(null), BadRequestException);
});

test("ParsePreviewTaskSkillApplyBodyPipe validates and normalizes preview payloads", () => {
  const pipe = new ParsePreviewTaskSkillApplyBodyPipe();

  assert.deepEqual(
    pipe.transform({
      projectId,
      rootTaskTitle: " Intro ",
      overrides: {
        removeSubtasks: [" Lyrics ", "Lyrics"],
        addSubtasks: [" Strings "],
      },
    }),
    {
      projectId,
      rootTaskTitle: "Intro",
      overrides: {
        removeSubtasks: ["Lyrics"],
        addSubtasks: ["Strings"],
      },
    },
  );

  assert.throws(() => pipe.transform({ projectId, rootTaskTitle: "" }), BadRequestException);
  assert.throws(
    () => pipe.transform({ projectId: "bad", rootTaskTitle: "Intro" }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ projectId, rootTaskTitle: "Intro", overrides: [] }),
    BadRequestException,
  );
  assert.throws(
    () =>
      pipe.transform({
        projectId,
        rootTaskTitle: "Intro",
        overrides: { addSubtasks: [1] },
      }),
    BadRequestException,
  );
  assert.throws(() => pipe.transform(null), BadRequestException);
});

function createReadStore(options: {
  archiveResult?: TaskSkillArchiveResult;
  applyResult?: TaskSkillApplyForWorkspaceResult;
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
    applyForWorkspace: async (): Promise<TaskSkillApplyForWorkspaceResult> =>
      options.applyResult ?? { status: "not_found" },
    createForWorkspace: async (): Promise<TaskSkillCreateResult> =>
      options.createResult ?? { status: "workspace_not_found" },
    updateDefinitionForWorkspace: async (): Promise<TaskSkillDefinitionUpdateResult> =>
      options.definitionUpdateResult ?? { status: "workspace_not_found" },
    updateMetadataForWorkspace: async (): Promise<TaskSkillMetadataUpdateResult> =>
      options.metadataUpdateResult ?? { status: "workspace_not_found" },
  };
}
