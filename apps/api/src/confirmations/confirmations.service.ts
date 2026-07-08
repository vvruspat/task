import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateConfirmationRequestInput } from "./confirmations.contracts.js";
import {
  ConfirmationRequestDetailDto,
  ConfirmationRequestSummaryDto,
} from "./confirmations.dto.js";
import type { ConfirmationRequestsStore } from "./confirmations.store.js";

@Injectable()
export class ConfirmationsService {
  constructor(private readonly store: ConfirmationRequestsStore) {}

  async listPendingConfirmationRequests(
    workspaceId: string,
    userId: string,
  ): Promise<ConfirmationRequestSummaryDto[]> {
    const requests = await this.store.listPendingForWorkspace(workspaceId, userId);

    if (requests === null) {
      throw new NotFoundException("Workspace was not found.");
    }

    return requests.map((request) => new ConfirmationRequestSummaryDto(request));
  }

  async getConfirmationRequest(
    workspaceId: string,
    confirmationRequestId: string,
    userId: string,
  ): Promise<ConfirmationRequestDetailDto> {
    const request = await this.store.getForWorkspace(workspaceId, confirmationRequestId, userId);

    if (request === null) {
      throw new NotFoundException("Confirmation request was not found.");
    }

    return new ConfirmationRequestDetailDto(request);
  }

  async createConfirmationRequest(
    workspaceId: string,
    userId: string,
    input: CreateConfirmationRequestInput,
  ): Promise<ConfirmationRequestDetailDto> {
    const result = await this.store.createForWorkspace(workspaceId, userId, input);

    if (result.status === "workspace_not_found") {
      throw new NotFoundException("Workspace was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot create confirmation requests.");
    }

    if (result.status === "agent_run_not_found") {
      throw new NotFoundException("Agent run was not found.");
    }

    return new ConfirmationRequestDetailDto(result.confirmationRequest);
  }

  async cancelConfirmationRequest(
    workspaceId: string,
    confirmationRequestId: string,
    userId: string,
  ): Promise<ConfirmationRequestDetailDto> {
    const result = await this.store.cancelForWorkspace(workspaceId, confirmationRequestId, userId);

    if (result.status === "workspace_not_found") {
      throw new NotFoundException("Workspace was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot cancel confirmation requests.");
    }

    if (result.status === "confirmation_request_not_found") {
      throw new NotFoundException("Confirmation request was not found.");
    }

    return new ConfirmationRequestDetailDto(result.confirmationRequest);
  }

  async confirmConfirmationRequest(
    workspaceId: string,
    confirmationRequestId: string,
    userId: string,
  ): Promise<ConfirmationRequestDetailDto> {
    const result = await this.store.confirmForWorkspace(workspaceId, confirmationRequestId, userId);

    if (result.status === "workspace_not_found") {
      throw new NotFoundException("Workspace was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot confirm confirmation requests.");
    }

    if (result.status === "confirmation_request_not_found") {
      throw new NotFoundException("Confirmation request was not found.");
    }

    return new ConfirmationRequestDetailDto(result.confirmationRequest);
  }
}
