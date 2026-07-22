import assert from "node:assert/strict";
import test from "node:test";
import { isBoundedIntegrationToolJsonObject } from "./integration-tool-json.js";

test("integration tool JSON accepts bounded plain data", () => {
  assert.equal(
    isBoundedIntegrationToolJsonObject(
      { files: [{ id: "drive-file", modifiedAt: null, version: 7 }], incomplete: false },
      1_024,
    ),
    true,
  );
});

test("integration tool JSON rejects runtime objects, cycles, and oversized values", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic["self"] = cyclic;

  assert.equal(isBoundedIntegrationToolJsonObject({ createdAt: new Date() }, 1_024), false);
  assert.equal(isBoundedIntegrationToolJsonObject(cyclic, 1_024), false);
  assert.equal(isBoundedIntegrationToolJsonObject({ value: "x".repeat(2_000) }, 1_024), false);
});
