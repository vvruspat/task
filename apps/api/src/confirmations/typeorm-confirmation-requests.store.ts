import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  AgentRunEntity,
  ConfirmationRequestEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
  ConfirmationRequestRecord,
  WorkspaceMemberRole,
} from "../persistence/types/core-persistence.types.js";
import type {
  ConfirmationRequestDetail,
  ConfirmationRequestSummary,
  CreateConfirmationRequestInput,
} from "./confirmations.contracts.js";
import type {
  ConfirmationRequestCancelResult,
  ConfirmationRequestCreateResult,
  ConfirmationRequestsStore,
} from "./confirmations.store.js";

const confirmationWriteRoles: ReadonlySet<WorkspaceMemberRole> = new Set([
  "owner",
  "admin",
  "member",
]);

@Injectable()
export class TypeOrmConfirmationRequestsStore implements ConfirmationRequestsStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listPendingForWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<ConfirmationRequestSummary[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return null;
    }

    const requests = await dataSource.getRepository(ConfirmationRequestEntity).find({
      order: { createdAt: "DESC" },
      where: {
        status: "pending",
        userId,
        workspaceId,
      },
    });

    return requests.map(toConfirmationRequestSummary);
  }

  async getForWorkspace(
    workspaceId: string,
    confirmationRequestId: string,
    userId: string,
  ): Promise<ConfirmationRequestDetail | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return null;
    }

    const request = await dataSource.getRepository(ConfirmationRequestEntity).findOneBy({
      id: confirmationRequestId,
      userId,
      workspaceId,
    });

    return request === null ? null : toConfirmationRequestDetail(request);
  }

  async createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateConfirmationRequestInput,
  ): Promise<ConfirmationRequestCreateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "workspace_not_found" };
    }

    if (!confirmationWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const agentRun = await dataSource.getRepository(AgentRunEntity).findOneBy({
      id: input.agentRunId,
      userId,
      workspaceId,
    });

    if (agentRun === null) {
      return { status: "agent_run_not_found" };
    }

    const repository = dataSource.getRepository(ConfirmationRequestEntity);
    const request = repository.create({
      workspaceId,
      agentRunId: input.agentRunId,
      userId,
      kind: input.kind,
      preview: input.preview,
      status: "pending",
      expiresAt: new Date(input.expiresAt),
    });
    const savedRequest = await repository.save(request);

    return {
      status: "created",
      confirmationRequest: toConfirmationRequestDetail(savedRequest),
    };
  }

  async cancelForWorkspace(
    workspaceId: string,
    confirmationRequestId: string,
    userId: string,
  ): Promise<ConfirmationRequestCancelResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "workspace_not_found" };
    }

    if (!confirmationWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const repository = dataSource.getRepository(ConfirmationRequestEntity);
    const request = await repository.findOneBy({
      id: confirmationRequestId,
      status: "pending",
      userId,
      workspaceId,
    });

    if (request === null) {
      return { status: "confirmation_request_not_found" };
    }

    request.status = "cancelled";
    const savedRequest = await repository.save(request);

    return {
      status: "cancelled",
      confirmationRequest: toConfirmationRequestDetail(savedRequest),
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

function toConfirmationRequestSummary(
  request: ConfirmationRequestRecord,
): ConfirmationRequestSummary {
  return {
    id: request.id,
    workspaceId: request.workspaceId,
    agentRunId: request.agentRunId,
    userId: request.userId,
    kind: request.kind,
    preview: request.preview,
    status: request.status,
    expiresAt: request.expiresAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function toConfirmationRequestDetail(
  request: ConfirmationRequestRecord,
): ConfirmationRequestDetail {
  return toConfirmationRequestSummary(request);
}
