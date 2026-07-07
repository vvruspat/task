import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  TelegramChatEntity,
  TelegramIdentityEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
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
