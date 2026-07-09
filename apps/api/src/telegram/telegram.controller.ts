import { Body, Controller, ForbiddenException, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ApiBotSharedSecret, BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { ConfirmationsService } from "../confirmations/confirmations.service.js";
import type {
  ResolveTelegramContextInput,
  TelegramConfirmationCallbackInput,
} from "./telegram.contracts.js";
import {
  ParseResolveTelegramContextBodyPipe,
  ParseTelegramConfirmationCallbackBodyPipe,
  ResolveTelegramContextDto,
  TelegramConfirmationCallbackDto,
  TelegramConfirmationCallbackResultDto,
  TelegramContextResolutionDto,
} from "./telegram.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { TelegramService } from "./telegram.service.js";

@ApiTags("telegram")
@ApiBotSharedSecret()
@UseGuards(BotSharedSecretGuard)
@Controller("internal/telegram")
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly confirmationsService: ConfirmationsService,
  ) {}

  @Post("context/resolve")
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

  @Post("confirmations/callback")
  @ApiOperation({ summary: "Apply a Telegram confirmation callback action" })
  @ApiBody({ type: TelegramConfirmationCallbackDto })
  @ApiOkResponse({ type: TelegramConfirmationCallbackResultDto })
  @ApiBadRequestResponse({ description: "Telegram confirmation callback payload is invalid." })
  @ApiForbiddenResponse({
    description: "Telegram user or chat is not linked to a workspace visible to the user.",
  })
  @ApiNotFoundResponse({ description: "Confirmation request is missing or not visible." })
  @ApiUnauthorizedResponse({ description: "Telegram bot shared secret is missing or invalid." })
  async handleConfirmationCallback(
    @Body(new ParseTelegramConfirmationCallbackBodyPipe())
    input: TelegramConfirmationCallbackInput,
  ): Promise<TelegramConfirmationCallbackResultDto> {
    const context = await this.telegramService.resolveContext(input);

    if (!isResolvedTelegramContext(context)) {
      throw new ForbiddenException("Telegram context is not linked to this workspace.");
    }

    const confirmationRequest =
      input.action === "confirm"
        ? await this.confirmationsService.confirmConfirmationRequest(
            context.workspaceId,
            input.confirmationRequestId,
            context.userId,
          )
        : await this.confirmationsService.cancelConfirmationRequest(
            context.workspaceId,
            input.confirmationRequestId,
            context.userId,
          );

    return new TelegramConfirmationCallbackResultDto({
      confirmationRequestId: confirmationRequest.id,
      action: input.action,
      status: input.action === "confirm" ? "confirmed" : "cancelled",
    });
  }
}

type ResolvedTelegramContextDto = TelegramContextResolutionDto & {
  status: "resolved";
  userId: string;
  workspaceId: string;
};

function isResolvedTelegramContext(
  context: TelegramContextResolutionDto,
): context is ResolvedTelegramContextDto {
  return (
    context.status === "resolved" &&
    typeof context.userId === "string" &&
    typeof context.workspaceId === "string"
  );
}
