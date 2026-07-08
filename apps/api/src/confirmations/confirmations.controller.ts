import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import type { CreateConfirmationRequestInput } from "./confirmations.contracts.js";
import {
  ConfirmationRequestDetailDto,
  ConfirmationRequestSummaryDto,
  CreateConfirmationRequestDto,
  ParseCreateConfirmationRequestBodyPipe,
} from "./confirmations.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { ConfirmationsService } from "./confirmations.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("confirmations")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/confirmations")
export class ConfirmationsController {
  constructor(private readonly confirmationsService: ConfirmationsService) {}

  @Get()
  @ApiOperation({ summary: "List pending confirmation requests for one visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: ConfirmationRequestSummaryDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listPendingConfirmationRequests(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<ConfirmationRequestSummaryDto[]> {
    return this.confirmationsService.listPendingConfirmationRequests(workspaceId, userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a pending confirmation request for an agent run" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiBody({ type: CreateConfirmationRequestDto })
  @ApiCreatedResponse({ type: ConfirmationRequestDetailDto })
  @ApiBadRequestResponse({ description: "Confirmation request payload is invalid." })
  @ApiForbiddenResponse({
    description: "Current user cannot create confirmation requests in this workspace.",
  })
  @ApiNotFoundResponse({
    description: "Workspace or agent run is missing or not visible to the current user.",
  })
  createConfirmationRequest(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateConfirmationRequestBodyPipe()) input: CreateConfirmationRequestInput,
  ): Promise<ConfirmationRequestDetailDto> {
    return this.confirmationsService.createConfirmationRequest(workspaceId, userId, input);
  }

  @Get(":confirmationRequestId")
  @ApiOperation({ summary: "Get one visible confirmation request" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "confirmationRequestId" })
  @ApiOkResponse({ type: ConfirmationRequestDetailDto })
  @ApiNotFoundResponse({
    description: "Workspace or confirmation request is missing or not visible to the current user.",
  })
  getConfirmationRequest(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("confirmationRequestId", uuidV4Pipe) confirmationRequestId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<ConfirmationRequestDetailDto> {
    return this.confirmationsService.getConfirmationRequest(
      workspaceId,
      confirmationRequestId,
      userId,
    );
  }

  @Patch(":confirmationRequestId/cancel")
  @ApiOperation({ summary: "Cancel one pending confirmation request" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "confirmationRequestId" })
  @ApiOkResponse({ type: ConfirmationRequestDetailDto })
  @ApiForbiddenResponse({
    description: "Current user cannot cancel confirmation requests in this workspace.",
  })
  @ApiNotFoundResponse({
    description: "Workspace or pending confirmation request is missing or not visible.",
  })
  cancelConfirmationRequest(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("confirmationRequestId", uuidV4Pipe) confirmationRequestId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<ConfirmationRequestDetailDto> {
    return this.confirmationsService.cancelConfirmationRequest(
      workspaceId,
      confirmationRequestId,
      userId,
    );
  }
}
