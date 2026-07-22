import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import {
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
import { WorkspaceRoles } from "../workspaces/workspace-roles.decorator.js";
import { IntegrationCatalogItemDto, WorkspaceIntegrationDto } from "./integrations.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { IntegrationsService } from "./integrations.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("workspace integrations")
@ApiTrustedCurrentUser()
@WorkspaceRoles("owner", "admin")
@Controller("workspaces/:workspaceId/integrations")
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: "List available plugins and workspace installation states" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: IntegrationCatalogItemDto })
  @ApiForbiddenResponse({ description: "Current user cannot manage integrations." })
  listCatalog(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<IntegrationCatalogItemDto[]> {
    return this.integrationsService.listCatalog(workspaceId, userId);
  }

  @Post(":pluginKey/install")
  @ApiOperation({ summary: "Install an available plugin in a workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({
    name: "pluginKey",
    schema: { pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$", type: "string" },
  })
  @ApiCreatedResponse({ type: WorkspaceIntegrationDto })
  @ApiForbiddenResponse({ description: "Current user cannot install integrations." })
  @ApiNotFoundResponse({ description: "Integration plugin was not found." })
  install(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("pluginKey") pluginKey: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceIntegrationDto> {
    return this.integrationsService.install(workspaceId, pluginKey, userId);
  }

  @Delete(":integrationId")
  @HttpCode(200)
  @ApiOperation({ summary: "Uninstall a disconnected workspace plugin" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiOkResponse({ type: WorkspaceIntegrationDto })
  @ApiForbiddenResponse({ description: "Current user cannot uninstall integrations." })
  @ApiConflictResponse({ description: "Connected integration must be disconnected first." })
  @ApiNotFoundResponse({ description: "Workspace integration was not found." })
  uninstall(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<WorkspaceIntegrationDto> {
    return this.integrationsService.uninstall(workspaceId, integrationId, userId);
  }
}
