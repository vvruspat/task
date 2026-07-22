import {
  Body,
  Controller,
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
import type {
  CompleteGoogleDriveOAuthInput,
  SelectGoogleDriveRootFolderInput,
} from "./google-drive-oauth.contracts.js";
import {
  CompleteGoogleDriveOAuthDto,
  GoogleDriveAuthorizationStartDto,
  GoogleDriveOAuthCompletionDto,
  GoogleDrivePickerSessionDto,
  GoogleDriveRootFolderDto,
  ParseCompleteGoogleDriveOAuthPipe,
  ParseSelectGoogleDriveRootFolderPipe,
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
