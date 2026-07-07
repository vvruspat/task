import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ApiBotSharedSecret, BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import {
  AgentRunIntakeResponseDto,
  CreateTelegramAgentRunDto,
  ParseCreateTelegramAgentRunBodyPipe,
} from "./agent.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { AgentService } from "./agent.service.js";

@ApiTags("agent")
@ApiBotSharedSecret()
@UseGuards(BotSharedSecretGuard)
@Controller("internal/agent/telegram")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post("runs")
  @ApiOperation({ summary: "Record a Telegram-originated agent request" })
  @ApiBody({ type: CreateTelegramAgentRunDto })
  @ApiCreatedResponse({ type: AgentRunIntakeResponseDto })
  @ApiBadRequestResponse({ description: "Agent request payload is invalid." })
  @ApiUnauthorizedResponse({ description: "Telegram bot shared secret is missing or invalid." })
  @ApiForbiddenResponse({ description: "User is not a member of the workspace." })
  @ApiNotFoundResponse({ description: "Telegram user or chat is not linked." })
  createTelegramRun(
    @Body(new ParseCreateTelegramAgentRunBodyPipe()) input: CreateTelegramAgentRunInput,
  ): Promise<AgentRunIntakeResponseDto> {
    return this.agentService.createTelegramRun(input);
  }
}
