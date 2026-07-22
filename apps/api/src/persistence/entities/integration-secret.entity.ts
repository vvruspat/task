import { randomUUID } from "node:crypto";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "integration_secrets" })
export class IntegrationSecretEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ default: "aes-256-gcm", type: "text" })
  algorithm = "aes-256-gcm";

  @Column({ default: 1, name: "key_version", type: "integer" })
  keyVersion = 1;

  @Column({ name: "initialization_vector", type: "text" })
  initializationVector = "";

  @Column({ name: "authentication_tag", type: "text" })
  authenticationTag = "";

  @Column({ type: "text" })
  ciphertext = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
