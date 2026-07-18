import { Readable } from "node:stream";
import {
  Body,
  Controller,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import type { WebAgentStreamEvent } from "./agent.contracts.js";
import { CreateWebAgentChatDto, ParseCreateWebAgentChatBodyPipe } from "./agent.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { AgentService } from "./agent.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("agent")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/agent/chat")
export class WebAgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post("stream")
  @Header("Cache-Control", "no-cache, no-transform")
  @Header("Connection", "keep-alive")
  @ApiOperation({ summary: "Stream a trusted web user's agent response" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiBody({ type: CreateWebAgentChatDto })
  @ApiProduces("text/event-stream")
  @ApiBadRequestResponse({ description: "Chat messages are invalid." })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  async streamWebChat(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateWebAgentChatBodyPipe()) input: CreateWebAgentChatDto,
  ): Promise<StreamableFile> {
    const result = await this.agentService.createWebRun(workspaceId, userId, input);
    return new StreamableFile(Readable.from(toSseFrames(result)), {
      type: "text/event-stream; charset=utf-8",
    });
  }
}

function* toSseFrames(result: {
  agentRunId: string;
  responseText: string;
  status: "completed" | "failed" | "running" | "waiting_confirmation";
}): Generator<string> {
  const chunks = result.responseText.match(/\S+\s*/gu) ?? [result.responseText];
  for (const delta of chunks) {
    const event: WebAgentStreamEvent = { type: "text-delta", delta };
    yield encodeSseEvent(event);
  }
  const done: WebAgentStreamEvent = {
    type: "done",
    agentRunId: result.agentRunId,
    status: result.status,
  };
  yield encodeSseEvent(done);
}

function encodeSseEvent(event: WebAgentStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
