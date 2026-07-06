import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { ActivityEventRecord } from "../types/core-persistence.types.js";

@Entity({ name: "activity_events" })
@Index("idx_activity_events_workspace_id_created_at", ["workspaceId", "createdAt"])
@Index("idx_activity_events_workspace_id_entity", ["workspaceId", "entityType", "entityId"])
@Index("idx_activity_events_workspace_id_actor_user_id", ["workspaceId", "actorUserId"])
export class ActivityEventEntity implements ActivityEventRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "actor_user_id", nullable: true, type: "uuid" })
  actorUserId: string | null = null;

  @Column({ name: "event_type", type: "text" })
  eventType = "";

  @Column({ name: "entity_type", type: "text" })
  entityType = "";

  @Column({ name: "entity_id", type: "uuid" })
  entityId = "";

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  payload: Record<string, unknown> = {};

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);
}
