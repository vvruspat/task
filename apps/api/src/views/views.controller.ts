import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
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
import type { CreateSavedViewInput, UpdateSavedViewInput } from "./views.contracts.js";
import {
  CreateSavedViewDto,
  ParseCreateSavedViewBodyPipe,
  ParseUpdateSavedViewBodyPipe,
  SavedViewDto,
  UpdateSavedViewDto,
} from "./views.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ViewsService } from "./views.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("views")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/views")
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's saved workspace views" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: SavedViewDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible." })
  list(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<SavedViewDto[]> {
    return this.viewsService.list(workspaceId, userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a personal saved workspace view" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiBody({ type: CreateSavedViewDto })
  @ApiCreatedResponse({ type: SavedViewDto })
  @ApiBadRequestResponse({ description: "View payload is invalid." })
  @ApiNotFoundResponse({
    description: "Workspace or project is missing or not visible.",
  })
  create(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateSavedViewBodyPipe()) input: CreateSavedViewInput,
  ): Promise<SavedViewDto> {
    return this.viewsService.create(workspaceId, userId, input);
  }

  @Patch(":viewId")
  @ApiOperation({ summary: "Update a personal saved workspace view" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "viewId" })
  @ApiBody({ type: UpdateSavedViewDto })
  @ApiOkResponse({ type: SavedViewDto })
  @ApiBadRequestResponse({ description: "View payload is invalid." })
  @ApiNotFoundResponse({
    description: "Workspace, project, or view is missing or not visible.",
  })
  update(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("viewId", uuidV4Pipe) viewId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateSavedViewBodyPipe()) input: UpdateSavedViewInput,
  ): Promise<SavedViewDto> {
    return this.viewsService.update(workspaceId, viewId, userId, input);
  }

  @Delete(":viewId")
  @ApiOperation({ summary: "Delete a personal saved workspace view" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "viewId" })
  @ApiOkResponse({ type: SavedViewDto })
  @ApiNotFoundResponse({
    description: "Workspace or view is missing or not visible.",
  })
  delete(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("viewId", uuidV4Pipe) viewId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<SavedViewDto> {
    return this.viewsService.delete(workspaceId, viewId, userId);
  }
}
