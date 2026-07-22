import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
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
import type { CompleteTelegramChatConnectionInput } from "./telegram-connect.contracts.js";
import {
  CompleteTelegramChatConnectionDto,
  ParseCompleteTelegramChatConnectionPipe,
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
  @ApiConflictResponse({ description: "Telegram is already connected." })
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

  @Post("connect")
  @ApiOperation({ summary: "Connect a Telegram chat using a one-time workspace token" })
  @ApiBody({ type: CompleteTelegramChatConnectionDto })
  @ApiOkResponse({ type: TelegramChatConnectionDto })
  @ApiBadRequestResponse({ description: "Telegram connect token or payload is invalid." })
  @ApiForbiddenResponse({ description: "Telegram identity does not own the token." })
  @ApiConflictResponse({ description: "Telegram chat or integration is already connected." })
  @ApiUnauthorizedResponse({ description: "Telegram bot shared secret is missing or invalid." })
  complete(
    @Body(ParseCompleteTelegramChatConnectionPipe) input: CompleteTelegramChatConnectionInput,
  ): Promise<TelegramChatConnectionDto> {
    return this.service.completeConnection(input);
  }
}
