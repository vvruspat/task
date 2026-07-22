import { randomUUID } from "node:crypto";
import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type {
  IntegrationResourceReference,
  IntegrationResourceReferenceSourceType,
  IntegrationResourceReferenceStatus,
} from "../../integrations/integration-resources.contracts.js";

@Entity({ name: "integration_resource_references" })
@Check(
  "chk_integration_resource_references_source_type",
  `"source_type" IN ('task_description', 'comment')`,
)
@Check(
  "chk_integration_resource_references_status",
  `"status" IN ('active', 'unresolved', 'removed')`,
)
@Index(
  "uq_integration_resource_references_source_url",
  ["connectionId", "sourceType", "sourceId", "urlHash"],
  { unique: true },
)
@Index("idx_integration_resource_references_source", ["sourceType", "sourceId", "status"])
@Index("idx_integration_resource_references_resource", ["externalResourceId"])
export class IntegrationResourceReferenceEntity implements IntegrationResourceReference {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "connection_id", type: "uuid" })
  connectionId = "";

  @Column({ name: "external_resource_id", nullable: true, type: "uuid" })
  externalResourceId: string | null = null;

  @Column({ name: "source_type", type: "text" })
  sourceType: IntegrationResourceReferenceSourceType = "task_description";

  @Column({ name: "source_id", type: "uuid" })
  sourceId = "";

  @Column({ length: 1024, name: "provider_resource_id", nullable: true, type: "varchar" })
  providerResourceId: string | null = null;

  @Column({ type: "text" })
  url = "";

  @Column({ length: 64, name: "url_hash", type: "varchar" })
  urlHash = "";

  @Column({ default: "unresolved", type: "text" })
  status: IntegrationResourceReferenceStatus = "unresolved";

  @Column({ default: () => "now()", name: "first_seen_at", type: "timestamptz" })
  firstSeenAt = new Date();

  @Column({ default: () => "now()", name: "last_seen_at", type: "timestamptz" })
  lastSeenAt = new Date();

  @Column({ name: "removed_at", nullable: true, type: "timestamptz" })
  removedAt: Date | null = null;

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  metadata: Record<string, unknown> = {};
}
