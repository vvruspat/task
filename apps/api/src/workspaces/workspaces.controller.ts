import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
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
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  UpdateWorkspaceMemberRoleInput,
} from "./workspaces.contracts.js";
import {
  CreateWorkspaceDto,
  ParseCreateWorkspaceBodyPipe,
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

  @Post()
  @ApiOperation({ summary: "Create a workspace owned by the current user" })
  @ApiBody({ type: CreateWorkspaceDto })
  @ApiCreatedResponse({ type: WorkspaceDetailDto })
  @ApiBadRequestResponse({ description: "Workspace payload is invalid." })
  createWorkspace(
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateWorkspaceBodyPipe()) input: CreateWorkspaceInput,
  ): Promise<WorkspaceDetailDto> {
    return this.workspacesService.createWorkspace(userId, input);
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

  @Delete(":workspaceId")
  @ApiOperation({ summary: "Permanently delete a workspace and its data" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ type: WorkspaceSummaryDto })
  @ApiForbiddenResponse({ description: "Only the workspace owner can delete it." })
  @ApiNotFoundResponse({ description: "Workspace was not found." })
  deleteWorkspace(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceSummaryDto> {
    return this.workspacesService.deleteWorkspace(workspaceId, userId);
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
