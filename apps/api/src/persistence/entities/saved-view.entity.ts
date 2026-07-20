import { randomUUID } from "node:crypto";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { SavedViewLayout, SavedViewSettings } from "../../views/views.contracts.js";

@Entity({ name: "saved_views" })
@Index("idx_saved_views_workspace_id_user_id", ["workspaceId", "userId"])
@Index("idx_saved_views_project_id", ["projectId"])
@Index("uq_saved_views_workspace_user_system_key", ["workspaceId", "userId", "systemKey"], {
  unique: true,
})
@Index("uq_saved_views_workspace_id_slug", ["workspaceId", "slug"], {
  unique: true,
})
export class SavedViewEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ type: "text" })
  slug = "";

  @Column({ name: "project_id", nullable: true, type: "uuid" })
  projectId: string | null = null;

  @Column({ name: "system_key", nullable: true, type: "text" })
  systemKey: string | null = null;

  @Column({ type: "text" })
  name = "";

  @Column({ nullable: true, type: "text" })
  description: string | null = null;

  @Column({ type: "text" })
  layout: SavedViewLayout = "list";

  @Column({ type: "jsonb" })
  settings: SavedViewSettings = {
    grouping: "status",
    subGrouping: "none",
    ordering: "manual",
    orderDirection: "asc",
    showSubtasks: true,
    showEmptyGroups: false,
    displayProperties: ["status", "project", "due_at"],
    filters: [],
  };

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
