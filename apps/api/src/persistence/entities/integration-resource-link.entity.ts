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
  IntegrationResourceLink,
  IntegrationResourceLinkRelation,
  IntegrationResourceLinkTargetType,
} from "../../integrations/integration-resources.contracts.js";

@Entity({ name: "integration_resource_links" })
@Check(
  "chk_integration_resource_links_target_type",
  `"target_type" IN ('workspace', 'task', 'comment', 'attachment')`,
)
@Check(
  "chk_integration_resource_links_relation",
  `"relation" IN ('managed_root', 'managed_container', 'reference', 'export')`,
)
@Index(
  "uq_integration_resource_links_resource_target_relation",
  ["externalResourceId", "targetType", "targetId", "relation"],
  { unique: true },
)
@Index("idx_integration_resource_links_target", ["targetType", "targetId", "relation"])
export class IntegrationResourceLinkEntity implements IntegrationResourceLink {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "external_resource_id", type: "uuid" })
  externalResourceId = "";

  @Column({ name: "target_type", type: "text" })
  targetType: IntegrationResourceLinkTargetType = "task";

  @Column({ name: "target_id", type: "uuid" })
  targetId = "";

  @Column({ type: "text" })
  relation: IntegrationResourceLinkRelation = "reference";

  @Column({ name: "created_by_user_id", nullable: true, type: "uuid" })
  createdByUserId: string | null = null;

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  metadata: Record<string, unknown> = {};

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
