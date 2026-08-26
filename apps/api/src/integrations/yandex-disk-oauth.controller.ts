import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import { WorkspaceRoles } from "../workspaces/workspace-roles.decorator.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { YandexDiskFolderAssignmentService } from "./yandex-disk-folder-assignment.service.js";
import type {
  CompleteYandexDiskOAuthInput,
  SelectYandexDiskFolderInput,
  SelectYandexDiskRootFolderInput,
  YandexDiskFolderTargetType,
} from "./yandex-disk-oauth.contracts.js";
import {
  CompleteYandexDiskOAuthDto,
  ParseCompleteYandexDiskOAuthPipe,
  ParseSelectYandexDiskFolderPipe,
  ParseSelectYandexDiskRootFolderPipe,
  ParseYandexDiskFolderTargetTypePipe,
  SelectYandexDiskFolderDto,
  SelectYandexDiskRootFolderDto,
  YandexDiskAuthorizationStartDto,
  YandexDiskFolderAssignmentDto,
  YandexDiskFolderAssignmentResponseDto,
  YandexDiskOAuthCompletionDto,
  YandexDiskRootFolderDto,
} from "./yandex-disk-oauth.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { YandexDiskOAuthService } from "./yandex-disk-oauth.service.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { YandexDiskRootService } from "./yandex-disk-root.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("integrations")
@ApiTrustedCurrentUser()
@WorkspaceRoles("owner", "admin")
@Controller("workspaces/:workspaceId/integrations")
export class YandexDiskOAuthController {
  constructor(
    private readonly oauthService: YandexDiskOAuthService,
    private readonly rootService: YandexDiskRootService,
    private readonly folderAssignmentService: YandexDiskFolderAssignmentService,
  ) {}

  @Post(":integrationId/yandex-disk/connect")
  @ApiOperation({ summary: "Start a workspace Yandex Disk OAuth connection" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiCreatedResponse({ type: YandexDiskAuthorizationStartDto })
  @ApiForbiddenResponse({ description: "Current user cannot connect integrations." })
  @ApiNotFoundResponse({ description: "Yandex Disk workspace integration was not found." })
  @ApiConflictResponse({ description: "Yandex Disk is already connected." })
  @ApiServiceUnavailableResponse({
    description: "Yandex Disk OAuth or encryption is not configured.",
  })
  start(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<YandexDiskAuthorizationStartDto> {
    return this.oauthService.start(workspaceId, integrationId, userId);
  }

  @Put(":integrationId/yandex-disk/root-folder")
  @ApiOperation({ summary: "Select the managed Yandex Disk workspace root folder" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiBody({ type: SelectYandexDiskRootFolderDto })
  @ApiOkResponse({ type: YandexDiskRootFolderDto })
  @ApiBadRequestResponse({ description: "Selected Yandex Disk path is not a folder." })
  @ApiForbiddenResponse({ description: "Current user cannot configure integrations." })
  @ApiNotFoundResponse({ description: "Yandex Disk workspace integration was not found." })
  @ApiConflictResponse({ description: "Yandex Disk is not connected." })
  @ApiBadGatewayResponse({ description: "Yandex Disk is unavailable." })
  selectRootFolder(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @Body(ParseSelectYandexDiskRootFolderPipe) input: SelectYandexDiskRootFolderInput,
    @TrustedCurrentUserId() userId: string,
  ): Promise<YandexDiskRootFolderDto> {
    return this.rootService.selectRootFolder(workspaceId, integrationId, input.path, userId);
  }

  @Get(":integrationId/yandex-disk/folders/:targetType/:targetId")
  @ApiOperation({ summary: "Get the Yandex Disk folder assigned to a project or task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiParam({ enum: ["project", "task"], name: "targetType" })
  @ApiParam({ format: "uuid", name: "targetId" })
  @ApiOkResponse({ type: YandexDiskFolderAssignmentResponseDto })
  @ApiForbiddenResponse({ description: "Current user cannot configure integrations." })
  @ApiNotFoundResponse({ description: "Yandex Disk integration or target was not found." })
  @ApiConflictResponse({ description: "Yandex Disk is not connected." })
  getFolderAssignment(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @Param("targetType", ParseYandexDiskFolderTargetTypePipe)
    targetType: YandexDiskFolderTargetType,
    @Param("targetId", uuidV4Pipe) targetId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<YandexDiskFolderAssignmentResponseDto> {
    return this.folderAssignmentService.getAssignment(
      workspaceId,
      integrationId,
      targetType,
      targetId,
      userId,
    );
  }

  @Put(":integrationId/yandex-disk/folders/:targetType/:targetId")
  @ApiOperation({ summary: "Assign a Yandex Disk folder to a project or task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiParam({ enum: ["project", "task"], name: "targetType" })
  @ApiParam({ format: "uuid", name: "targetId" })
  @ApiBody({ type: SelectYandexDiskFolderDto })
  @ApiOkResponse({ type: YandexDiskFolderAssignmentDto })
  @ApiBadRequestResponse({ description: "Selected Yandex Disk path is not a folder." })
  @ApiForbiddenResponse({ description: "Current user cannot configure integrations." })
  @ApiNotFoundResponse({ description: "Yandex Disk integration or target was not found." })
  @ApiConflictResponse({
    description: "Yandex Disk is not connected or the folder is already assigned.",
  })
  selectFolder(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @Param("targetType", ParseYandexDiskFolderTargetTypePipe)
    targetType: YandexDiskFolderTargetType,
    @Param("targetId", uuidV4Pipe) targetId: string,
    @Body(ParseSelectYandexDiskFolderPipe) input: SelectYandexDiskFolderInput,
    @TrustedCurrentUserId() userId: string,
  ): Promise<YandexDiskFolderAssignmentDto> {
    return this.folderAssignmentService.selectFolder(
      workspaceId,
      integrationId,
      targetType,
      targetId,
      input.path,
      userId,
    );
  }
}

@ApiTags("integrations")
@ApiTrustedCurrentUser()
@Controller("integrations/oauth/yandex-disk")
export class YandexDiskOAuthCallbackController {
  constructor(private readonly oauthService: YandexDiskOAuthService) {}

  @Post("callback")
  @ApiOperation({ summary: "Complete a Yandex Disk OAuth connection" })
  @ApiBody({ type: CompleteYandexDiskOAuthDto })
  @ApiCreatedResponse({ type: YandexDiskOAuthCompletionDto })
  @ApiBadRequestResponse({ description: "OAuth state or callback payload is invalid." })
  @ApiForbiddenResponse({ description: "The initiating user no longer manages the workspace." })
  @ApiBadGatewayResponse({ description: "Yandex rejected the authorization." })
  complete(
    @Body(ParseCompleteYandexDiskOAuthPipe) input: CompleteYandexDiskOAuthInput,
    @TrustedCurrentUserId() userId: string,
  ): Promise<YandexDiskOAuthCompletionDto> {
    return this.oauthService.complete(input, userId);
  }
}
