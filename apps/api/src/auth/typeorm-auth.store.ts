import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { QueryFailedError } from "typeorm";
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  AuthSessionEntity,
  PasswordCredentialEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
  AuthSessionInfo,
  AuthUser,
  CreateAccountRecord,
  CreateAccountResult,
  StoredPasswordCredential,
  UpdateProfileInput,
} from "./auth.contracts.js";
import { AuthStore } from "./auth.store.js";

@Injectable()
export class TypeOrmAuthStore extends AuthStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    @Inject(ApiDataSourceProvider) private readonly dataSourceProvider: ApiDataSourceProvider,
  ) {
    super();
  }

  async createAccount(input: CreateAccountRecord): Promise<CreateAccountResult> {
    const dataSource = await this.getInitializedDataSource();
    try {
      return await dataSource.transaction(async (manager): Promise<CreateAccountResult> => {
        const user = manager.getRepository(UserEntity).create({
          displayName: input.displayName,
          email: input.email,
          avatarUrl: null,
          locale: null,
        });
        const savedUser = await manager.getRepository(UserEntity).save(user);
        await manager.getRepository(PasswordCredentialEntity).save(
          manager.getRepository(PasswordCredentialEntity).create({
            userId: savedUser.id,
            passwordHash: input.passwordHash,
          }),
        );
        const workspace = await manager.getRepository(WorkspaceEntity).save(
          manager.getRepository(WorkspaceEntity).create({
            name: `${input.displayName}'s workspace`,
            slug: input.workspaceSlug,
          }),
        );
        await manager.getRepository(WorkspaceMemberEntity).save(
          manager.getRepository(WorkspaceMemberEntity).create({
            workspaceId: workspace.id,
            userId: savedUser.id,
            role: "owner",
          }),
        );
        await manager.getRepository(AuthSessionEntity).save(
          manager.getRepository(AuthSessionEntity).create({
            userId: savedUser.id,
            tokenHash: input.sessionTokenHash,
            expiresAt: input.sessionExpiresAt,
          }),
        );
        return { status: "created", user: toAuthUser(savedUser) };
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) return { status: "email_taken" };
      throw error;
    }
  }

  async findPasswordCredential(email: string): Promise<StoredPasswordCredential | null> {
    const dataSource = await this.getInitializedDataSource();
    const user = await dataSource
      .getRepository(UserEntity)
      .createQueryBuilder("user")
      .where("LOWER(user.email) = :email", { email })
      .getOne();
    if (user === null || user.email === null) return null;
    const credential = await dataSource
      .getRepository(PasswordCredentialEntity)
      .findOneBy({ userId: user.id });
    return credential === null
      ? null
      : { passwordHash: credential.passwordHash, user: toAuthUser(user) };
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(AuthSessionEntity)
      .save(dataSource.getRepository(AuthSessionEntity).create({ userId, tokenHash, expiresAt }));
  }

  async findSession(tokenHash: string, now: Date): Promise<AuthSessionInfo | null> {
    const dataSource = await this.getInitializedDataSource();
    const session = await dataSource
      .getRepository(AuthSessionEntity)
      .createQueryBuilder("session")
      .where("session.token_hash = :tokenHash", { tokenHash })
      .andWhere("session.revoked_at IS NULL")
      .andWhere("session.expires_at > :now", { now })
      .getOne();
    if (session === null) return null;
    const user = await dataSource.getRepository(UserEntity).findOneBy({ id: session.userId });
    if (user === null || user.email === null) return null;
    return { expiresAt: session.expiresAt, user: toAuthUser(user) };
  }

  async revokeSession(tokenHash: string, revokedAt: Date): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(AuthSessionEntity)
      .createQueryBuilder()
      .update()
      .set({ revokedAt })
      .where("token_hash = :tokenHash", { tokenHash })
      .andWhere("revoked_at IS NULL")
      .execute();
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUser | null> {
    const dataSource = await this.getInitializedDataSource();
    const repository = dataSource.getRepository(UserEntity);
    const user = await repository.findOneBy({ id: userId });
    if (user === null || user.email === null) return null;
    user.displayName = input.displayName;
    user.locale = input.locale;
    return toAuthUser(await repository.save(user));
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
    if (dataSource.isInitialized) return dataSource;
    this.initialization ??= dataSource.initialize();
    try {
      return await this.initialization;
    } catch (error: unknown) {
      this.initialization = null;
      throw error;
    }
  }
}

function toAuthUser(user: UserEntity): AuthUser {
  if (user.email === null) throw new Error("Password-authenticated users must have an email.");
  return { id: user.id, displayName: user.displayName, email: user.email, locale: user.locale };
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === "object" &&
    driverError !== null &&
    "code" in driverError &&
    driverError.code === "23505" &&
    "constraint" in driverError &&
    driverError.constraint === "uq_users_normalized_email"
  );
}
