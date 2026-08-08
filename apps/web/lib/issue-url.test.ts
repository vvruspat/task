import assert from "node:assert/strict";
import test from "node:test";
import { isCanonicalIssueRoute, issueHref, issueTitleSlug } from "./issue-url.ts";

test("issue routes use a readable identifier and encoded title slug", () => {
  assert.equal(issueTitleSlug("Написание текста и музыки"), "написание-текста-и-музыки");
  assert.equal(
    issueHref("SMP", 35, "Написание текста и музыки"),
    `/issue/SMP-35/${encodeURIComponent("написание-текста-и-музыки")}`,
  );
});

test("canonical issue route comparison accepts encoded and decoded slugs", () => {
  const title = "Написание текста и музыки";
  const slug = issueTitleSlug(title);

  assert.equal(isCanonicalIssueRoute("SMP-35", slug, "SMP", 35, title), true);
  assert.equal(isCanonicalIssueRoute("SMP-35", encodeURIComponent(slug), "SMP", 35, title), true);
});

test("canonical issue route comparison rejects stale route parts", () => {
  const title = "Написание текста и музыки";

  assert.equal(isCanonicalIssueRoute("SMP-34", issueTitleSlug(title), "SMP", 35, title), false);
  assert.equal(isCanonicalIssueRoute("SMP-35", null, "SMP", 35, title), false);
  assert.equal(isCanonicalIssueRoute("SMP-35", "old-title", "SMP", 35, title), false);
});
