import { randomUUID } from "node:crypto";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "auth_sessions" })
@Index("uq_auth_sessions_token_hash", ["tokenHash"], { unique: true })
@Index("idx_auth_sessions_user_id", ["userId"])
@Index("idx_auth_sessions_expires_at", ["expiresAt"])
export class AuthSessionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ name: "token_hash", type: "text" })
  tokenHash = "";

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt = new Date(0);

  @Column({ name: "revoked_at", nullable: true, type: "timestamptz" })
  revokedAt: Date | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);
}
