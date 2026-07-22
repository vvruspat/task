import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { IntegrationSecretProvider, IntegrationSecretReference } from "@task/integration-sdk";
import type { DataSource, EntityManager } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import { IntegrationSecretEntity } from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the config provider value at runtime.
import { IntegrationsConfigProvider } from "./integrations.config.js";

const algorithm = "aes-256-gcm";
const keyVersion = 1;
const referencePrefix = "database-integration-secret:";
const referencePattern =
  /^database-integration-secret:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/u;

export type EncryptedIntegrationSecret = {
  authenticationTag: string;
  ciphertext: string;
  initializationVector: string;
};

@Injectable()
export class DatabaseIntegrationSecretProvider implements IntegrationSecretProvider {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly configProvider: IntegrationsConfigProvider,
  ) {}

  async put(value: string): Promise<IntegrationSecretReference> {
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => this.putUsingManager(manager, value));
  }

  async putUsingManager(
    manager: EntityManager,
    value: string,
  ): Promise<IntegrationSecretReference> {
    const id = randomUUID();
    const encrypted = encryptIntegrationSecret(value, this.getEncryptionKey(), id);
    const entity = manager.getRepository(IntegrationSecretEntity).create({
      ...encrypted,
      algorithm,
      id,
      keyVersion,
    });
    await manager.getRepository(IntegrationSecretEntity).save(entity);
    return `${referencePrefix}${id}`;
  }

  async read(reference: IntegrationSecretReference): Promise<string | null> {
    const id = parseSecretReference(reference);
    if (id === null) return null;
    const dataSource = await this.getInitializedDataSource();
    const entity = await dataSource.getRepository(IntegrationSecretEntity).findOneBy({ id });
    if (entity === null) return null;
    if (entity.algorithm !== algorithm || entity.keyVersion !== keyVersion) {
      throw new Error(`Integration secret ${id} uses an unsupported encryption version.`);
    }
    return decryptIntegrationSecret(entity, this.getEncryptionKey(), id);
  }

  async delete(reference: IntegrationSecretReference): Promise<void> {
    const id = parseSecretReference(reference);
    if (id === null) return;
    const dataSource = await this.getInitializedDataSource();
    await this.deleteUsingManager(dataSource.manager, reference);
  }

  async deleteUsingManager(
    manager: EntityManager,
    reference: IntegrationSecretReference,
  ): Promise<void> {
    const id = parseSecretReference(reference);
    if (id === null) return;
    await manager.getRepository(IntegrationSecretEntity).delete({ id });
  }

  private getEncryptionKey(): Buffer {
    const key = this.configProvider.getConfig().secretEncryptionKey;
    if (key === null) {
      throw new ServiceUnavailableException("Integration secret encryption is not configured.");
    }
    return key;
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
    if (dataSource.isInitialized) return dataSource;
    this.initialization ??= dataSource.initialize();
    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

export function encryptIntegrationSecret(
  value: string,
  key: Buffer,
  secretId: string,
): EncryptedIntegrationSecret {
  assertEncryptionKey(key);
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, initializationVector);
  cipher.setAAD(secretAad(secretId));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    authenticationTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    initializationVector: initializationVector.toString("base64"),
  };
}

export function decryptIntegrationSecret(
  encrypted: EncryptedIntegrationSecret,
  key: Buffer,
  secretId: string,
): string {
  assertEncryptionKey(key);
  const decipher = createDecipheriv(
    algorithm,
    key,
    Buffer.from(encrypted.initializationVector, "base64"),
  );
  decipher.setAAD(secretAad(secretId));
  decipher.setAuthTag(Buffer.from(encrypted.authenticationTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function parseSecretReference(reference: IntegrationSecretReference): string | null {
  return referencePattern.exec(reference)?.[1] ?? null;
}

function secretAad(secretId: string): Buffer {
  return Buffer.from(`task:integration-secret:v${keyVersion}:${secretId}`, "utf8");
}

function assertEncryptionKey(key: Buffer): void {
  if (key.length !== 32)
    throw new Error("Integration secret encryption key must contain 32 bytes.");
}
