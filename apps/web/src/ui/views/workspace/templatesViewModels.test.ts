import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCreateTaskSkillInput,
  buildTaskSkillApplyInput,
  shouldAcceptTaskSkillSettlement,
  splitTaskSkillList,
} from "./templatesViewModels.js";

test("shouldAcceptTaskSkillSettlement rejects a fetch that settles after selection switches", () => {
  assert.equal(
    shouldAcceptTaskSkillSettlement({
      currentSelectionVersion: 2,
      detailId: "skill-a",
      requestSelectionVersion: 1,
      selectedSkillId: "skill-b",
    }),
    false,
  );
});

test("shouldAcceptTaskSkillSettlement rejects a mutation response for an unselected detail", () => {
  assert.equal(
    shouldAcceptTaskSkillSettlement({
      currentSelectionVersion: 3,
      detailId: "skill-a",
      requestSelectionVersion: 3,
      selectedSkillId: "skill-b",
    }),
    false,
  );
});

test("splitTaskSkillList trims, de-duplicates, and ignores empty values", () => {
  assert.deepEqual(splitTaskSkillList(" record vocals, , mix, record vocals "), [
    "record vocals",
    "mix",
  ]);
});

test("buildCreateTaskSkillInput creates a validated skill definition", () => {
  assert.deepEqual(
    buildCreateTaskSkillInput({
      aliases: "song, track",
      description: " Creates a song tree ",
      name: " Song ",
      subtasks: "Write, Record",
    }),
    {
      aliases: ["song", "track"],
      definition: { subtasks: [{ title: "Write" }, { title: "Record" }] },
      description: "Creates a song tree",
      name: "Song",
    },
  );
});

test("buildTaskSkillApplyInput omits empty override collections", () => {
  assert.deepEqual(
    buildTaskSkillApplyInput({
      addedSubtasks: "",
      projectId: "project-id",
      removedSubtasks: "",
      rootTaskTitle: " Intro ",
    }),
    { projectId: "project-id", rootTaskTitle: "Intro" },
  );
});
