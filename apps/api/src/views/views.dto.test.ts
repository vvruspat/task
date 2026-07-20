import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ParseCreateSavedViewBodyPipe, ParseUpdateSavedViewBodyPipe } from "./views.dto.js";

const projectId = "33333333-3333-4333-8333-333333333333";
const settings = {
  grouping: "status",
  subGrouping: "none",
  ordering: "title",
  orderDirection: "asc",
  showSubtasks: true,
  showEmptyGroups: false,
  displayProperties: ["status", "project", "status"],
  filters: [
    {
      field: "status",
      operator: "is",
      value: "44444444-4444-4444-8444-444444444444",
    },
    { field: "content", operator: "contains", value: "  release  " },
  ],
};

test("saved view create payload is normalized and de-duplicates display fields", () => {
  const result = new ParseCreateSavedViewBodyPipe().transform({
    name: "  Release board ",
    description: "",
    projectId,
    layout: "board",
    settings,
  });
  assert.deepEqual(result, {
    name: "Release board",
    description: null,
    projectId,
    layout: "board",
    settings: {
      ...settings,
      displayProperties: ["status", "project"],
      filters: [settings.filters[0], { field: "content", operator: "contains", value: "release" }],
    },
  });
});

test("saved view create payload accepts a template matrix", () => {
  const templateId = "55555555-5555-4555-8555-555555555555";
  const result = new ParseCreateSavedViewBodyPipe().transform({
    name: "  Songs matrix ",
    layout: "matrix",
    settings: {
      ...settings,
      filters: [{ field: "template", operator: "is", value: templateId }],
    },
  });

  assert.equal(result.layout, "matrix");
  assert.deepEqual(result.settings.filters, [
    { field: "template", operator: "is", value: templateId },
  ]);
});

test("saved view pipes reject malformed settings and empty updates", () => {
  const createPipe = new ParseCreateSavedViewBodyPipe();
  const updatePipe = new ParseUpdateSavedViewBodyPipe();
  assert.throws(
    () => createPipe.transform({ name: "Board", layout: "calendar", settings }),
    BadRequestException,
  );
  assert.throws(
    () =>
      createPipe.transform({
        name: "Board",
        layout: "board",
        settings: {
          ...settings,
          filters: [{ field: "status", operator: "contains", value: projectId }],
        },
      }),
    BadRequestException,
  );
  assert.throws(
    () =>
      createPipe.transform({
        name: "Board",
        layout: "board",
        settings: { ...settings, grouping: "owner" },
      }),
    BadRequestException,
  );
  assert.throws(() => updatePipe.transform({}), BadRequestException);
  assert.deepEqual(updatePipe.transform({ projectId: null }), {
    projectId: null,
  });
});
