import { randomUUID } from "node:crypto";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { WorkspaceRecord } from "../types/core-persistence.types.js";

@Entity({ name: "workspaces" })
export class WorkspaceEntity implements WorkspaceRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ type: "text" })
  name = "";

  @Column({ type: "text", unique: true })
  slug = "";

  @Column({ nullable: true, type: "text" })
  description: string | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
