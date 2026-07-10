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
  UpdateWorkspaceStatusInput,
} from "./statuses.contracts.js";
import {
  CreateWorkspaceStatusDto,
  ParseCreateWorkspaceStatusBodyPipe,
  ParseUpdateWorkspaceStatusBodyPipe,
  UpdateWorkspaceStatusDto,
  WorkspaceStatusDto,
} from "./statuses.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { StatusesService } from "./statuses.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("statuses")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/statuses")
export class StatusesController {
  constructor(private readonly statusesService: StatusesService) {}

  @Get()
  @ApiOperation({ summary: "List statuses for one visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: WorkspaceStatusDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listStatuses(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceStatusDto[]> {
    return this.statusesService.listStatuses(workspaceId, userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a status in one workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiBody({ type: CreateWorkspaceStatusDto })
  @ApiCreatedResponse({ type: WorkspaceStatusDto })
  @ApiBadRequestResponse({ description: "Status payload is invalid." })
  @ApiConflictResponse({ description: "A workspace status with this name already exists." })
  @ApiForbiddenResponse({ description: "Current user cannot manage statuses in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  createStatus(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateWorkspaceStatusBodyPipe()) input: CreateWorkspaceStatusInput,
  ): Promise<WorkspaceStatusDto> {
    return this.statusesService.createStatus(workspaceId, userId, input);
  }

  @Patch(":statusId")
  @ApiOperation({ summary: "Update a status in one workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
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
    @Param("statusId", uuidV4Pipe) statusId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateWorkspaceStatusBodyPipe()) input: UpdateWorkspaceStatusInput,
  ): Promise<WorkspaceStatusDto> {
    return this.statusesService.updateStatus(workspaceId, statusId, userId, input);
  }

  @Delete(":statusId")
  @ApiOperation({ summary: "Delete a status from one workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "statusId" })
  @ApiOkResponse({ type: WorkspaceStatusDto })
  @ApiForbiddenResponse({ description: "Current user cannot manage statuses in this workspace." })
  @ApiNotFoundResponse({
    description: "Workspace status is missing or not visible to the current user.",
  })
  deleteStatus(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("statusId", uuidV4Pipe) statusId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceStatusDto> {
    return this.statusesService.deleteStatus(workspaceId, statusId, userId);
  }
}
