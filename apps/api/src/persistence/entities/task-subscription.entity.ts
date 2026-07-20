import { CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

@Entity({ name: "task_subscriptions" })
@Index("idx_task_subscriptions_workspace_user", ["workspaceId", "userId"])
export class TaskSubscriptionEntity {
  @PrimaryColumn({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @PrimaryColumn({ name: "task_id", type: "uuid" })
  taskId = "";

  @PrimaryColumn({ name: "user_id", type: "uuid" })
  userId = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();
}
