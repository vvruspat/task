import { randomUUID } from "node:crypto";
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type {
  IntegrationExternalResource,
  IntegrationExternalResourceStatus,
} from "../../integrations/integration-resources.contracts.js";

@Entity({ name: "integration_external_resources" })
@Check(
  "chk_integration_external_resources_status",
  `"status" IN ('active', 'deleted', 'unavailable')`,
)
@Index(
  "uq_integration_external_resources_connection_provider_id",
  ["connectionId", "providerResourceId"],
  { unique: true },
)
@Index("idx_integration_external_resources_kind_status", ["connectionId", "resourceKind", "status"])
export class IntegrationExternalResourceEntity implements IntegrationExternalResource {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "connection_id", type: "uuid" })
  connectionId = "";

  @Column({ length: 1024, name: "provider_resource_id", type: "varchar" })
  providerResourceId = "";

  @Column({ length: 128, name: "resource_kind", type: "varchar" })
  resourceKind = "";

  @Column({ length: 512, type: "varchar" })
  name = "";

  @Column({ length: 255, name: "mime_type", nullable: true, type: "varchar" })
  mimeType: string | null = null;

  @Column({ name: "web_url", nullable: true, type: "text" })
  webUrl: string | null = null;

  @Column({ length: 1024, name: "parent_provider_resource_id", nullable: true, type: "varchar" })
  parentProviderResourceId: string | null = null;

  @Column({ name: "version", nullable: true, type: "text" })
  version: string | null = null;

  @Column({ name: "modified_at", nullable: true, type: "timestamptz" })
  modifiedAt: Date | null = null;

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  metadata: Record<string, unknown> = {};

  @Column({ default: "active", type: "text" })
  status: IntegrationExternalResourceStatus = "active";

  @Column({ default: () => "now()", name: "last_synced_at", type: "timestamptz" })
  lastSyncedAt = new Date();

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
