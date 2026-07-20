import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "notification_read_states" })
export class NotificationReadStateEntity {
  @PrimaryColumn({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @PrimaryColumn({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ name: "last_read_at", type: "timestamptz" })
  lastReadAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
