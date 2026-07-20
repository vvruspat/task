import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
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
import type {
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberRoleInput,
} from "./workspaces.contracts.js";
import {
  ParseUpdateWorkspaceBodyPipe,
  ParseUpdateWorkspaceMemberRoleBodyPipe,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberRoleDto,
  WorkspaceDetailDto,
  WorkspaceMemberDto,
  WorkspaceSummaryDto,
} from "./workspaces.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { WorkspacesService } from "./workspaces.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("workspaces")
@ApiTrustedCurrentUser()
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: "List workspaces visible to the current user" })
  @ApiOkResponse({ isArray: true, type: WorkspaceSummaryDto })
  listWorkspaces(@TrustedCurrentUserId() userId: string): Promise<WorkspaceSummaryDto[]> {
    return this.workspacesService.listWorkspaces(userId);
  }

  @Get(":workspaceId")
  @ApiOperation({ summary: "Get one workspace with members" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ type: WorkspaceDetailDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  getWorkspace(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceDetailDto> {
    return this.workspacesService.getWorkspace(workspaceId, userId);
  }

  @Patch(":workspaceId")
  @ApiOperation({ summary: "Update one workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiBody({ type: UpdateWorkspaceDto })
  @ApiOkResponse({ type: WorkspaceDetailDto })
  @ApiBadRequestResponse({ description: "Workspace payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot update this workspace." })
  @ApiNotFoundResponse({ description: "Workspace was not found." })
  updateWorkspace(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateWorkspaceBodyPipe()) input: UpdateWorkspaceInput,
  ): Promise<WorkspaceDetailDto> {
    return this.workspacesService.updateWorkspace(workspaceId, userId, input);
  }

  @Get(":workspaceId/members")
  @ApiOperation({ summary: "List members for one visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: WorkspaceMemberDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listMembers(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceMemberDto[]> {
    return this.workspacesService.listMembers(workspaceId, userId);
  }

  @Patch(":workspaceId/members/:memberId/role")
  @ApiOperation({ summary: "Update one workspace member role" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "memberId" })
  @ApiBody({ type: UpdateWorkspaceMemberRoleDto })
  @ApiOkResponse({ type: WorkspaceMemberDto })
  @ApiBadRequestResponse({ description: "Workspace member role payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot update this workspace member role." })
  @ApiNotFoundResponse({
    description: "Workspace member is missing or not visible to the current user.",
  })
  updateMemberRole(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("memberId", uuidV4Pipe) memberId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateWorkspaceMemberRoleBodyPipe()) input: UpdateWorkspaceMemberRoleInput,
  ): Promise<WorkspaceMemberDto> {
    return this.workspacesService.updateMemberRole(workspaceId, memberId, userId, input);
  }
}
