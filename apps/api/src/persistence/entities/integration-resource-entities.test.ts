import assert from "node:assert/strict";
import test from "node:test";
import { getMetadataArgsStorage } from "typeorm";
import {
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
  IntegrationResourceReferenceEntity,
  IntegrationSubscriptionEntity,
} from "./index.js";

const integrationResourceEntities = [
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
  IntegrationResourceReferenceEntity,
  IntegrationSubscriptionEntity,
] as const;

test("integration resource entities use provider-neutral table names", () => {
  const tables = getMetadataArgsStorage()
    .tables.filter((table) => integrationResourceEntities.some((entity) => table.target === entity))
    .map((table) => table.name)
    .sort();

  assert.deepEqual(tables, [
    "integration_external_resources",
    "integration_resource_links",
    "integration_resource_references",
    "integration_subscriptions",
  ]);
});

test("integration resource entities register identity, lookup, and renewal indexes", () => {
  const indexes = getMetadataArgsStorage()
    .indices.filter((index) =>
      integrationResourceEntities.some((entity) => index.target === entity),
    )
    .map((index) => index.name)
    .sort();

  assert.deepEqual(indexes, [
    "idx_integration_external_resources_kind_status",
    "idx_integration_resource_links_target",
    "idx_integration_resource_references_resource",
    "idx_integration_resource_references_source",
    "idx_integration_subscriptions_renewal",
    "idx_integration_subscriptions_resource",
    "uq_integration_external_resources_connection_provider_id",
    "uq_integration_resource_links_resource_target_relation",
    "uq_integration_resource_references_source_url",
    "uq_integration_subscriptions_connection_provider_id",
  ]);
});

test("integration resource entities assign UUIDs before transactional saves", () => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  for (const entity of integrationResourceEntities) {
    assert.match(new entity().id, uuidPattern);
  }
});
