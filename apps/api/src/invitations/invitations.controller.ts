import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
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
import { WorkspaceRoles } from "../workspaces/workspace-roles.decorator.js";
import type { CreateWorkspaceInvitationInput } from "./invitations.contracts.js";
import {
  AcceptInvitationResultDto,
  CreateWorkspaceInvitationDto,
  InvitationPreviewDto,
  ParseCreateWorkspaceInvitationBodyPipe,
  ParseInvitationTokenPipe,
  WorkspaceInvitationDto,
} from "./invitations.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { InvitationsService } from "./invitations.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("workspace invitations")
@ApiTrustedCurrentUser()
@WorkspaceRoles("owner", "admin")
@Controller("workspaces/:workspaceId/invitations")
export class WorkspaceInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get()
  @ApiOperation({ summary: "List invitations for a workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: WorkspaceInvitationDto })
  @ApiForbiddenResponse({ description: "Current user cannot view invitations." })
  list(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceInvitationDto[]> {
    return this.invitationsService.list(workspaceId, userId);
  }

  @Post()
  @ApiOperation({ summary: "Invite a workspace member by email" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiCreatedResponse({ type: WorkspaceInvitationDto })
  @ApiBody({ type: CreateWorkspaceInvitationDto })
  @ApiBadRequestResponse({ description: "Invitation payload is invalid." })
  @ApiConflictResponse({ description: "The user is already a member or already invited." })
  @ApiForbiddenResponse({ description: "Current user cannot invite members." })
  create(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateWorkspaceInvitationBodyPipe()) input: CreateWorkspaceInvitationInput,
  ): Promise<WorkspaceInvitationDto> {
    return this.invitationsService.create(workspaceId, userId, input);
  }

  @Delete(":invitationId")
  @HttpCode(200)
  @ApiOperation({ summary: "Revoke a workspace invitation" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "invitationId" })
  @ApiOkResponse({ type: WorkspaceInvitationDto })
  revoke(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("invitationId", uuidV4Pipe) invitationId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceInvitationDto> {
    return this.invitationsService.revoke(workspaceId, invitationId, userId);
  }
}

@ApiTags("workspace invitations")
@Controller("invitations")
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get(":token")
  @ApiOperation({ summary: "Preview an invitation from its one-time token" })
  @ApiOkResponse({ type: InvitationPreviewDto })
  @ApiNotFoundResponse({ description: "Invitation was not found." })
  preview(
    @Param("token", new ParseInvitationTokenPipe()) token: string,
  ): Promise<InvitationPreviewDto> {
    return this.invitationsService.getPreview(token);
  }

  @Post(":token/accept")
  @ApiTrustedCurrentUser()
  @ApiOperation({ summary: "Accept an invitation as the current user" })
  @ApiOkResponse({ type: AcceptInvitationResultDto })
  @ApiConflictResponse({ description: "Invitation was already used." })
  @ApiForbiddenResponse({ description: "Invitation belongs to another email address." })
  @ApiGoneResponse({ description: "Invitation expired or was revoked." })
  accept(
    @Param("token", new ParseInvitationTokenPipe()) token: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<AcceptInvitationResultDto> {
    return this.invitationsService.accept(token, userId);
  }
}
