import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "password_credentials" })
export class PasswordCredentialEntity {
  @PrimaryColumn({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ name: "password_hash", type: "text" })
  passwordHash = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
