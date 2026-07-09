import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  TelegramChatEntity,
  TelegramIdentityEntity,
  UserEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
  LinkTelegramIdentityInput,
  LinkTelegramIdentityResult,
  ResolveTelegramContextInput,
  TelegramContextResolution,
} from "./telegram.contracts.js";
import type { TelegramContextStore } from "./telegram.store.js";

@Injectable()
export class TypeOrmTelegramContextStore implements TelegramContextStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolution> {
    const dataSource = await this.getInitializedDataSource();
    const identity = await dataSource.getRepository(TelegramIdentityEntity).findOneBy({
      telegramId: input.telegramId,
    });

    if (identity === null) {
      return { status: "telegram_user_unlinked" };
    }

    const chat = await dataSource.getRepository(TelegramChatEntity).findOneBy({
      telegramChatId: input.telegramChatId,
    });

    if (chat === null) {
      return {
        status: "telegram_chat_unlinked",
        userId: identity.userId,
      };
    }

    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      userId: identity.userId,
      workspaceId: chat.workspaceId,
    });

    if (membership === null) {
      return {
        status: "user_not_in_chat_workspace",
        userId: identity.userId,
        workspaceId: chat.workspaceId,
      };
    }

    return {
      status: "resolved",
      userId: identity.userId,
      workspaceId: chat.workspaceId,
      defaultProjectId: chat.defaultProjectId,
    };
  }

  async linkIdentity(input: LinkTelegramIdentityInput): Promise<LinkTelegramIdentityResult> {
    const dataSource = await this.getInitializedDataSource();

    return dataSource.transaction(async (entityManager) => {
      const user = await entityManager.getRepository(UserEntity).findOneBy({ id: input.userId });

      if (user === null) {
        return { status: "user_not_found" };
      }

      const identityRepository = entityManager.getRepository(TelegramIdentityEntity);
      const identity = await identityRepository.findOneBy({ telegramId: input.telegramId });
      const now = new Date();

      if (identity !== null) {
        if (identity.userId !== input.userId) {
          return {
            status: "telegram_identity_linked_to_different_user",
            telegramId: input.telegramId,
          };
        }

        identity.lastSeenAt = now;
        await identityRepository.save(identity);

        return {
          status: "linked",
          identity: {
            telegramId: identity.telegramId,
            userId: identity.userId,
          },
        };
      }

      const linkedIdentity = identityRepository.create({
        userId: input.userId,
        telegramId: input.telegramId,
        linkedAt: now,
        lastSeenAt: now,
      });
      let savedIdentity: TelegramIdentityEntity;

      try {
        savedIdentity = await identityRepository.save(linkedIdentity);
      } catch (error) {
        if (!isUniqueConstraintViolation(error)) {
          throw error;
        }

        const conflictingIdentity = await identityRepository.findOneBy({
          telegramId: input.telegramId,
        });

        if (conflictingIdentity === null || conflictingIdentity.userId !== input.userId) {
          return {
            status: "telegram_identity_linked_to_different_user",
            telegramId: input.telegramId,
          };
        }

        conflictingIdentity.lastSeenAt = now;
        savedIdentity = await identityRepository.save(conflictingIdentity);
      }

      return {
        status: "linked",
        identity: {
          telegramId: savedIdentity.telegramId,
          userId: savedIdentity.userId,
        },
      };
    });
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();

    if (dataSource === null) {
      throw new ServiceUnavailableException("Database is not configured.");
    }

    if (dataSource.isInitialized) {
      return dataSource;
    }

    this.initialization ??= dataSource.initialize();

    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
