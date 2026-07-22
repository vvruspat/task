import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import { IntegrationMcpToolCallEntity } from "../persistence/entities/index.js";
import type {
  IntegrationMcpToolCallStore,
  StartIntegrationMcpToolCallInput,
} from "./integration-mcp-tools.contracts.js";

@Injectable()
export class TypeOrmIntegrationMcpToolCallStore implements IntegrationMcpToolCallStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async start(input: StartIntegrationMcpToolCallInput): Promise<string> {
    const repository = (await this.getInitializedDataSource()).getRepository(
      IntegrationMcpToolCallEntity,
    );
    const entity = new IntegrationMcpToolCallEntity();
    entity.workspaceId = input.workspaceId;
    entity.userId = input.userId;
    entity.toolName = input.toolName;
    entity.arguments = input.arguments;
    await repository.save(entity);
    return entity.id;
  }

  async succeed(
    toolCallId: string,
    result: Record<string, unknown>,
    completedAt: Date,
  ): Promise<void> {
    await this.finish(toolCallId, { completedAt, error: null, result, status: "success" });
  }

  async fail(toolCallId: string, error: string, completedAt: Date): Promise<void> {
    await this.finish(toolCallId, { completedAt, error, result: null, status: "error" });
  }

  private async finish(
    toolCallId: string,
    update: Pick<IntegrationMcpToolCallEntity, "completedAt" | "error" | "result" | "status">,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager): Promise<void> => {
      const repository = manager.getRepository(IntegrationMcpToolCallEntity);
      const entity = await repository.findOne({
        lock: { mode: "pessimistic_write" },
        where: { id: toolCallId, status: "running" },
      });
      if (entity === null) {
        throw new ServiceUnavailableException("Integration MCP tool audit could not be completed.");
      }
      entity.completedAt = update.completedAt;
      entity.error = update.error;
      entity.result = update.result;
      entity.status = update.status;
      await repository.save(entity);
    });
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
