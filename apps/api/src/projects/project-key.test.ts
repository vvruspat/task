import assert from "node:assert/strict";
import test from "node:test";
import { deriveProjectKeyBase, selectAvailableProjectKey } from "./project-key.js";

test("deriveProjectKeyBase creates short readable Latin project keys", () => {
  assert.equal(deriveProjectKeyBase("исекай"), "ISE");
  assert.equal(deriveProjectKeyBase("Запись альбома 2"), "ZA2");
  assert.equal(deriveProjectKeyBase("Album release"), "AR");
  assert.equal(deriveProjectKeyBase("  🎸  "), "PRJ");
});

test("selectAvailableProjectKey adds the shortest available numeric suffix", () => {
  assert.equal(selectAvailableProjectKey("исекай", new Set()), "ISE");
  assert.equal(selectAvailableProjectKey("исекай", new Set(["ISE"])), "ISE2");
  assert.equal(selectAvailableProjectKey("исекай", new Set(["ISE", "ISE2"])), "ISE3");
});
