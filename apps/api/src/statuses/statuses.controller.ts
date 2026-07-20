import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
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
  CreateWorkspaceStatusInput,
  ReorderWorkspaceStatusesInput,
  UpdateWorkspaceStatusInput,
} from "./statuses.contracts.js";
import {
  CreateWorkspaceStatusDto,
  ParseCreateWorkspaceStatusBodyPipe,
  ParseReorderWorkspaceStatusesBodyPipe,
  ParseUpdateWorkspaceStatusBodyPipe,
  ReorderWorkspaceStatusesDto,
  UpdateWorkspaceStatusDto,
  WorkspaceStatusDto,
} from "./statuses.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { StatusesService } from "./statuses.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("statuses")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/projects/:projectId/statuses")
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Get()
  @ApiOperation({ summary: "List statuses for one visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiOkResponse({ isArray: true, type: WorkspaceStatusDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listStatuses(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceStatusDto[]> {
    return this.statusesService.listStatuses(workspaceId, projectId, userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a status in one project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiBody({ type: CreateWorkspaceStatusDto })
  @ApiCreatedResponse({ type: WorkspaceStatusDto })
  @ApiBadRequestResponse({ description: "Status payload is invalid." })
  @ApiConflictResponse({ description: "A workspace status with this name already exists." })
  @ApiForbiddenResponse({ description: "Current user cannot manage statuses in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  createStatus(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateWorkspaceStatusBodyPipe()) input: CreateWorkspaceStatusInput,
  ): Promise<WorkspaceStatusDto> {
    return this.statusesService.createStatus(workspaceId, projectId, userId, input);
  }

  @Patch("reorder")
  @ApiOperation({ summary: "Reorder every status in one project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiBody({ type: ReorderWorkspaceStatusesDto })
  @ApiOkResponse({ isArray: true, type: WorkspaceStatusDto })
  @ApiBadRequestResponse({ description: "Status order is incomplete or invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot manage statuses in this workspace." })
  reorderStatuses(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseReorderWorkspaceStatusesBodyPipe()) input: ReorderWorkspaceStatusesInput,
  ): Promise<WorkspaceStatusDto[]> {
    return this.statusesService.reorderStatuses(workspaceId, projectId, userId, input);
  }

  @Patch(":statusId")
  @ApiOperation({ summary: "Update a status in one workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "statusId" })
  @ApiBody({ type: UpdateWorkspaceStatusDto })
  @ApiOkResponse({ type: WorkspaceStatusDto })
  @ApiBadRequestResponse({ description: "Status payload is invalid." })
  @ApiConflictResponse({ description: "A workspace status with this name already exists." })
  @ApiForbiddenResponse({ description: "Current user cannot manage statuses in this workspace." })
  @ApiNotFoundResponse({
    description: "Workspace status is missing or not visible to the current user.",
  })
  updateStatus(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("statusId", uuidV4Pipe) statusId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateWorkspaceStatusBodyPipe()) input: UpdateWorkspaceStatusInput,
  ): Promise<WorkspaceStatusDto> {
    return this.statusesService.updateStatus(workspaceId, projectId, statusId, userId, input);
  }

  @Delete(":statusId")
  @ApiOperation({ summary: "Delete a status from one workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "statusId" })
  @ApiOkResponse({ type: WorkspaceStatusDto })
  @ApiForbiddenResponse({ description: "Current user cannot manage statuses in this workspace." })
  @ApiNotFoundResponse({
    description: "Workspace status is missing or not visible to the current user.",
  })
  deleteStatus(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("statusId", uuidV4Pipe) statusId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceStatusDto> {
    return this.statusesService.deleteStatus(workspaceId, projectId, statusId, userId);
  }
}
