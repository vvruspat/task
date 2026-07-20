import { PassThrough } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
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
import type { CreateWebAgentChatTurnInput, WebAgentStreamEvent } from "./agent.contracts.js";
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
  streamWebChat(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateWebAgentChatBodyPipe()) input: CreateWebAgentChatTurnInput,
  ): StreamableFile {
    const stream = new PassThrough();
    setImmediate(() => {
      let requestPrepared = false;
      stream.write(
        encodeSseEvent({
          type: "status",
          id: "request",
          label: "Готовлю запрос",
          state: "running",
        }),
      );
      void this.agentService
        .createWebChatTurn(workspaceId, userId, input, (progress) => {
          if (!requestPrepared) {
            requestPrepared = true;
            stream.write(
              encodeSseEvent({
                type: "status",
                id: "request",
                label: "Запрос подготовлен",
                state: "complete",
              }),
            );
          }
          stream.write(encodeSseEvent({ type: "status", ...progress }));
        })
        .then((result) => streamCompletedResult(stream, result))
        .catch((error: unknown) => {
          stream.write(
            encodeSseEvent({
              type: "error",
              message: readErrorMessage(error),
            }),
          );
          stream.end();
        });
    });
    return new StreamableFile(stream, {
      type: "text/event-stream; charset=utf-8",
    });
  }
}

async function streamCompletedResult(
  stream: PassThrough,
  result: {
    response: {
      agentRunId: string;
      responseText: string;
      status: "completed" | "failed" | "running" | "waiting_confirmation";
    };
    chat: { id: string; title: string };
  },
): Promise<void> {
  stream.write(
    encodeSseEvent({
      type: "status",
      id: "response",
      label: "Формирую ответ",
      state: "running",
    }),
  );
  const chunks = result.response.responseText.match(/\S+\s*/gu) ?? [result.response.responseText];
  for (const delta of chunks) {
    const event: WebAgentStreamEvent = { type: "text-delta", delta };
    stream.write(encodeSseEvent(event));
    await delay(18);
  }
  stream.write(
    encodeSseEvent({
      type: "status",
      id: "response",
      label: "Ответ готов",
      state: "complete",
    }),
  );
  const done: WebAgentStreamEvent = {
    type: "done",
    agentRunId: result.response.agentRunId,
    chatId: result.chat.id,
    chatTitle: result.chat.title,
    status: result.response.status,
  };
  stream.end(encodeSseEvent(done));
}

function encodeSseEvent(event: WebAgentStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "Agent execution failed.";
}
