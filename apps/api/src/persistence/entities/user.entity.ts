import { randomUUID } from "node:crypto";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { UserRecord } from "../types/core-persistence.types.js";

@Entity({ name: "users" })
export class UserEntity implements UserRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "display_name", type: "text" })
  displayName = "";

  @Column({ nullable: true, type: "text" })
  email: string | null = null;

  @Column({ name: "avatar_url", nullable: true, type: "text" })
  avatarUrl: string | null = null;

  @Column({ nullable: true, type: "text" })
  locale: "en" | "ru" | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
