import assert from "node:assert/strict";
import test from "node:test";
import {
  addProjectIntegrationResourceLinksSql,
  removeProjectIntegrationResourceLinksSql,
} from "./1783298580000-add-project-integration-resource-links.js";

test("project integration resource links are allowed by the database constraint", () => {
  const upSql = addProjectIntegrationResourceLinksSql.join("\n");
  const downSql = removeProjectIntegrationResourceLinksSql.join("\n");

  assert.match(upSql, /'workspace', 'project', 'task', 'comment', 'attachment'/u);
  assert.match(upSql, /CREATE UNIQUE INDEX "uq_integration_resource_links_managed_container"/u);
  assert.match(
    upSql,
    /WHERE "relation" = 'managed_container' AND "target_type" IN \('project', 'task'\)/u,
  );
  assert.match(downSql, /DROP INDEX "uq_integration_resource_links_managed_container"/u);
  assert.match(
    downSql,
    /DELETE FROM "integration_resource_links" WHERE "target_type" = 'project'/u,
  );
  assert.match(downSql, /'workspace', 'task', 'comment', 'attachment'/u);
});
