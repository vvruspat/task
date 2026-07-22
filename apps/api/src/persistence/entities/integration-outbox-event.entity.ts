import { randomUUID } from "node:crypto";
import type { IntegrationDomainEventName } from "@task/integration-sdk";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { IntegrationOutboxEvent } from "../../integrations/integration-outbox.contracts.js";

@Entity({ name: "integration_outbox_events" })
@Index("uq_integration_outbox_events_activity_event_id", ["activityEventId"], { unique: true })
@Index("idx_integration_outbox_events_unpublished", ["publishedAt", "occurredAt"])
@Index("idx_integration_outbox_events_workspace_id", ["workspaceId"])
export class IntegrationOutboxEventEntity implements IntegrationOutboxEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "activity_event_id", nullable: true, type: "uuid" })
  activityEventId: string | null = null;

  @Column({ name: "event_name", type: "text" })
  eventName: IntegrationDomainEventName = "task.updated.v1";

  @Column({ name: "actor_user_id", nullable: true, type: "uuid" })
  actorUserId: string | null = null;

  @Column({ name: "entity_type", type: "text" })
  entityType = "";

  @Column({ name: "entity_id", type: "uuid" })
  entityId = "";

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  payload: Record<string, unknown> = {};

  @Column({ name: "occurred_at", type: "timestamptz" })
  occurredAt = new Date();

  @Column({ name: "published_at", nullable: true, type: "timestamptz" })
  publishedAt: Date | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();
}
