import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ApiBotSharedSecret, BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import type { ResolveTelegramContextInput } from "./telegram.contracts.js";
import {
  ParseResolveTelegramContextBodyPipe,
  ResolveTelegramContextDto,
  TelegramContextResolutionDto,
} from "./telegram.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { TelegramService } from "./telegram.service.js";

@ApiTags("telegram")
@ApiBotSharedSecret()
@UseGuards(BotSharedSecretGuard)
@Controller("internal/telegram/context")
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post("resolve")
  @ApiOperation({ summary: "Resolve Telegram bot message identity and chat context" })
  @ApiBody({ type: ResolveTelegramContextDto })
  @ApiOkResponse({ type: TelegramContextResolutionDto })
  @ApiBadRequestResponse({ description: "Telegram context payload is invalid." })
  @ApiUnauthorizedResponse({ description: "Telegram bot shared secret is missing or invalid." })
  resolveContext(
    @Body(new ParseResolveTelegramContextBodyPipe()) input: ResolveTelegramContextInput,
  ): Promise<TelegramContextResolutionDto> {
    return this.telegramService.resolveContext(input);
  }
}
