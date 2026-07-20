import assert from "node:assert/strict";
import test from "node:test";
import { parseIssueIdentifier } from "./issue-identifier.js";

test("parseIssueIdentifier parses canonical identifiers case-insensitively", () => {
  assert.deepEqual(parseIssueIdentifier("ise-42"), {
    projectKey: "ISE",
    taskNumber: 42,
  });
});

test("parseIssueIdentifier rejects malformed or unsafe identifiers", () => {
  assert.equal(parseIssueIdentifier("ISE-0"), null);
  assert.equal(parseIssueIdentifier("I-1"), null);
  assert.equal(parseIssueIdentifier("ISE-not-a-number"), null);
  assert.equal(parseIssueIdentifier("ISE-999999999999999999999"), null);
});
