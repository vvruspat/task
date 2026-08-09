import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
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
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ApiBotSharedSecret, BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import { WorkspaceRoles } from "../workspaces/workspace-roles.decorator.js";
import type {
  CompleteTelegramBrowserConnectInput,
  CompleteTelegramChatConnectionInput,
  CreateTelegramBrowserConnectIntentInput,
  TelegramBrowserConnectAuthInput,
} from "./telegram-connect.contracts.js";
import {
  CompleteTelegramBrowserConnectDto,
  CompleteTelegramChatConnectionDto,
  CreateTelegramBrowserConnectIntentDto,
  ParseCompleteTelegramBrowserConnectPipe,
  ParseCompleteTelegramChatConnectionPipe,
  ParseCreateTelegramBrowserConnectIntentPipe,
  ParseTelegramBrowserConnectAuthPipe,
  TelegramBrowserConnectAuthDto,
  TelegramBrowserConnectIntentDto,
  TelegramBrowserConnectPreviewDto,
  TelegramBrowserConnectResultDto,
  TelegramChatConnectionDto,
  TelegramConnectTokenDto,
} from "./telegram-connect.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { TelegramConnectService } from "./telegram-connect.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("integrations")
@ApiTrustedCurrentUser()
@WorkspaceRoles("owner", "admin")
@Controller("workspaces/:workspaceId/integrations")
export class TelegramConnectController {
  constructor(private readonly service: TelegramConnectService) {}

  @Post(":integrationId/telegram/connect-token")
  @HttpCode(200)
  @ApiOperation({ summary: "Create a one-time Telegram workspace chat connect command" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "integrationId" })
  @ApiOkResponse({ type: TelegramConnectTokenDto })
  @ApiForbiddenResponse({ description: "Current user cannot connect integrations." })
  @ApiNotFoundResponse({ description: "Telegram workspace integration was not found." })
  createToken(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("integrationId", uuidV4Pipe) integrationId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TelegramConnectTokenDto> {
    return this.service.createConnectToken(workspaceId, integrationId, userId);
  }
}

@ApiTags("integrations")
@ApiBotSharedSecret()
@UseGuards(BotSharedSecretGuard)
@Controller("internal/integrations/telegram")
export class TelegramInternalConnectController {
  constructor(private readonly service: TelegramConnectService) {}

  @Post("connect-intents")
  @ApiOperation({ summary: "Create a one-time Telegram browser connection link" })
  @ApiBody({ type: CreateTelegramBrowserConnectIntentDto })
  @ApiCreatedResponse({ type: TelegramBrowserConnectIntentDto })
  @ApiBadRequestResponse({ description: "Telegram chat or sender payload is invalid." })
  @ApiUnauthorizedResponse({ description: "Telegram bot shared secret is missing or invalid." })
  createBrowserIntent(
    @Body(ParseCreateTelegramBrowserConnectIntentPipe)
    input: CreateTelegramBrowserConnectIntentInput,
  ): Promise<TelegramBrowserConnectIntentDto> {
    return this.service.createBrowserConnectIntent(input);
  }

  @Post("connect")
  @ApiOperation({
    summary: "Pair the Telegram sender and connect its chat using a one-time workspace token",
  })
  @ApiBody({ type: CompleteTelegramChatConnectionDto })
  @ApiOkResponse({ type: TelegramChatConnectionDto })
  @ApiBadRequestResponse({ description: "Telegram connect token or payload is invalid." })
  @ApiForbiddenResponse({ description: "Telegram identity does not own the token." })
  @ApiConflictResponse({ description: "Telegram chat is connected to another workspace." })
  @ApiUnauthorizedResponse({ description: "Telegram bot shared secret is missing or invalid." })
  complete(
    @Body(ParseCompleteTelegramChatConnectionPipe) input: CompleteTelegramChatConnectionInput,
  ): Promise<TelegramChatConnectionDto> {
    return this.service.completeConnection(input);
  }
}

@ApiTags("integrations")
@ApiTrustedCurrentUser()
@Controller("integrations/telegram/browser-connect/:token")
export class TelegramBrowserConnectController {
  constructor(private readonly service: TelegramConnectService) {}

  @Post("preview")
  @HttpCode(200)
  @ApiOperation({ summary: "Preview a Telegram browser connection for the signed-in user" })
  @ApiParam({ name: "token" })
  @ApiBody({ type: TelegramBrowserConnectAuthDto })
  @ApiOkResponse({ type: TelegramBrowserConnectPreviewDto })
  @ApiBadRequestResponse({ description: "Telegram authorization or connect link is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot access the connected workspace." })
  previewBrowserConnection(
    @Param("token") token: string,
    @Body(ParseTelegramBrowserConnectAuthPipe) input: TelegramBrowserConnectAuthInput,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TelegramBrowserConnectPreviewDto> {
    return this.service.previewBrowserConnection(token, input, userId);
  }

  @Post("complete")
  @HttpCode(200)
  @ApiOperation({ summary: "Link a Telegram identity and connect its chat when needed" })
  @ApiParam({ name: "token" })
  @ApiBody({ type: CompleteTelegramBrowserConnectDto })
  @ApiOkResponse({ type: TelegramBrowserConnectResultDto })
  @ApiBadRequestResponse({ description: "Telegram authorization or connect link is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot access or manage the workspace." })
  @ApiConflictResponse({ description: "Telegram identity or chat is already linked elsewhere." })
  completeBrowserConnection(
    @Param("token") token: string,
    @Body(ParseCompleteTelegramBrowserConnectPipe) input: CompleteTelegramBrowserConnectInput,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TelegramBrowserConnectResultDto> {
    return this.service.completeBrowserConnection(token, input, userId);
  }
}
