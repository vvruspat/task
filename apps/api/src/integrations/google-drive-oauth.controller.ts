import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from "@nestjs/common";
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
import { GoogleDriveFolderAssignmentService } from "./google-drive-folder-assignment.service.js";
import type {
  CompleteGoogleDriveOAuthInput,
  GoogleDriveFolderTargetType,
  SelectGoogleDriveFolderInput,
  SelectGoogleDriveRootFolderInput,
} from "./google-drive-oauth.contracts.js";
import {
  CompleteGoogleDriveOAuthDto,
  GoogleDriveAuthorizationStartDto,
  GoogleDriveFolderAssignmentDto,
  GoogleDriveFolderAssignmentResponseDto,
  GoogleDriveOAuthCompletionDto,
  GoogleDrivePickerSessionDto,
  GoogleDriveRootFolderDto,
  ParseCompleteGoogleDriveOAuthPipe,
  ParseGoogleDriveFolderTargetTypePipe,
  ParseSelectGoogleDriveFolderPipe,
  ParseSelectGoogleDriveRootFolderPipe,
  SelectGoogleDriveFolderDto,
  SelectGoogleDriveRootFolderDto,
} from "./google-drive-oauth.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { GoogleDriveOAuthService } from "./google-drive-oauth.service.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { GoogleDriveRootService } from "./google-drive-root.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("integrations")
@ApiTrustedCurrentUser()
@WorkspaceRoles("owner", "admin")
@Controller("workspaces/:workspaceId/integrations")
export class GoogleDriveOAuthController {
  constructor(
    private readonly oauthService: GoogleDriveOAuthService,
    private readonly rootService: GoogleDriveRootService,
    private readonly folderAssignmentService: GoogleDriveFolderAssignmentService,
  ) {}

  @Post(":integrationId/connect")
  @ApiOperation({ summary: "Start a workspace Google Drive OAuth connection" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiCreatedResponse({ type: GoogleDriveAuthorizationStartDto })
  @ApiForbiddenResponse({ description: "Current user cannot connect integrations." })
  @ApiNotFoundResponse({ description: "Google Drive workspace integration was not found." })
  @ApiConflictResponse({ description: "Google Drive is already connected." })
  @ApiServiceUnavailableResponse({
    description: "Google Drive OAuth or encryption is not configured.",
  })
  start(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<GoogleDriveAuthorizationStartDto> {
    return this.oauthService.start(workspaceId, integrationId, userId);
  }

  @Post(":integrationId/google-drive/picker-session")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @Header("Pragma", "no-cache")
  @ApiOperation({ summary: "Create a short-lived Google Drive Picker session" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiOkResponse({ type: GoogleDrivePickerSessionDto })
  @ApiForbiddenResponse({ description: "Current user cannot configure integrations." })
  @ApiNotFoundResponse({ description: "Google Drive workspace integration was not found." })
  @ApiConflictResponse({ description: "Google Drive is not connected." })
  @ApiBadGatewayResponse({ description: "Google credentials could not be refreshed." })
  @ApiServiceUnavailableResponse({ description: "Google Picker is not configured." })
  createPickerSession(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<GoogleDrivePickerSessionDto> {
    return this.rootService.createPickerSession(workspaceId, integrationId, userId);
  }

  @Put(":integrationId/google-drive/root-folder")
  @ApiOperation({ summary: "Select the managed Google Drive workspace root folder" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiBody({ type: SelectGoogleDriveRootFolderDto })
  @ApiOkResponse({ type: GoogleDriveRootFolderDto })
  @ApiBadRequestResponse({ description: "Selected Drive item is not a writable folder." })
  @ApiForbiddenResponse({ description: "Current user cannot configure integrations." })
  @ApiNotFoundResponse({ description: "Google Drive workspace integration was not found." })
  @ApiConflictResponse({ description: "Google Drive is not connected." })
  @ApiBadGatewayResponse({ description: "Google Drive is unavailable." })
  selectRootFolder(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @Body(ParseSelectGoogleDriveRootFolderPipe) input: SelectGoogleDriveRootFolderInput,
    @TrustedCurrentUserId() userId: string,
  ): Promise<GoogleDriveRootFolderDto> {
    return this.rootService.selectRootFolder(workspaceId, integrationId, input.folderId, userId);
  }

  @Get(":integrationId/google-drive/folders/:targetType/:targetId")
  @ApiOperation({ summary: "Get the Google Drive folder assigned to a project or task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiParam({ enum: ["project", "task"], name: "targetType" })
  @ApiParam({ format: "uuid", name: "targetId" })
  @ApiOkResponse({
    description: "The assigned folder, or a null folder when this target has no folder yet.",
    type: GoogleDriveFolderAssignmentResponseDto,
  })
  @ApiForbiddenResponse({ description: "Current user cannot configure integrations." })
  @ApiNotFoundResponse({ description: "Google Drive integration or target was not found." })
  @ApiConflictResponse({ description: "Google Drive is not connected." })
  @ApiBadGatewayResponse({ description: "Google Drive credentials could not be refreshed." })
  getFolderAssignment(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @Param("targetType", ParseGoogleDriveFolderTargetTypePipe)
    targetType: GoogleDriveFolderTargetType,
    @Param("targetId", uuidV4Pipe) targetId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<GoogleDriveFolderAssignmentResponseDto> {
    return this.folderAssignmentService.getAssignment(
      workspaceId,
      integrationId,
      targetType,
      targetId,
      userId,
    );
  }

  @Put(":integrationId/google-drive/folders/:targetType/:targetId")
  @ApiOperation({ summary: "Assign a writable Google Drive folder to a project or task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiParam({ enum: ["project", "task"], name: "targetType" })
  @ApiParam({ format: "uuid", name: "targetId" })
  @ApiBody({ type: SelectGoogleDriveFolderDto })
  @ApiOkResponse({ type: GoogleDriveFolderAssignmentDto })
  @ApiBadRequestResponse({ description: "Selected Drive item is not a writable folder." })
  @ApiForbiddenResponse({ description: "Current user cannot configure integrations." })
  @ApiNotFoundResponse({ description: "Google Drive integration or target was not found." })
  @ApiConflictResponse({
    description: "Google Drive is not connected or the folder is already assigned elsewhere.",
  })
  @ApiBadGatewayResponse({ description: "Google Drive is unavailable." })
  selectFolder(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @Param("targetType", ParseGoogleDriveFolderTargetTypePipe)
    targetType: GoogleDriveFolderTargetType,
    @Param("targetId", uuidV4Pipe) targetId: string,
    @Body(ParseSelectGoogleDriveFolderPipe) input: SelectGoogleDriveFolderInput,
    @TrustedCurrentUserId() userId: string,
  ): Promise<GoogleDriveFolderAssignmentDto> {
    return this.folderAssignmentService.selectFolder(
      workspaceId,
      integrationId,
      targetType,
      targetId,
      input.folderId,
      userId,
    );
  }
}

@ApiTags("integrations")
@ApiTrustedCurrentUser()
@Controller("integrations/oauth/google-drive")
export class GoogleDriveOAuthCallbackController {
  constructor(private readonly oauthService: GoogleDriveOAuthService) {}

  @Post("callback")
  @ApiOperation({ summary: "Complete a Google Drive OAuth connection" })
  @ApiBody({ type: CompleteGoogleDriveOAuthDto })
  @ApiCreatedResponse({ type: GoogleDriveOAuthCompletionDto })
  @ApiBadRequestResponse({ description: "OAuth state or callback payload is invalid." })
  @ApiForbiddenResponse({ description: "The initiating user no longer manages the workspace." })
  @ApiBadGatewayResponse({ description: "Google rejected the authorization." })
  complete(
    @Body(ParseCompleteGoogleDriveOAuthPipe) input: CompleteGoogleDriveOAuthInput,
    @TrustedCurrentUserId() userId: string,
  ): Promise<GoogleDriveOAuthCompletionDto> {
    return this.oauthService.complete(input, userId);
  }
}
