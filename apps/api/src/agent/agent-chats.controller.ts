import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Query } from "@nestjs/common";
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import type { UpdateAgentChatInput } from "./agent.contracts.js";
import {
  AgentChatDetailDto,
  AgentChatSummaryDto,
  ParseUpdateAgentChatBodyPipe,
  UpdateAgentChatDto,
} from "./agent.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { AgentService } from "./agent.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("agent chats")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/agent/chats")
export class AgentChatsController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's agent chats" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiQuery({ name: "query", required: false })
  @ApiOkResponse({ isArray: true, type: AgentChatSummaryDto })
  list(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Query("query") query?: string,
  ): Promise<AgentChatSummaryDto[]> {
    return this.agentService.listChats(workspaceId, userId, query ?? "");
  }

  @Get(":chatId")
  @ApiOperation({ summary: "Get an agent chat with its messages" })
  @ApiOkResponse({ type: AgentChatDetailDto })
  @ApiNotFoundResponse({ description: "Chat was not found." })
  get(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("chatId", uuidV4Pipe) chatId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<AgentChatDetailDto> {
    return this.agentService.getChat(workspaceId, chatId, userId);
  }

  @Patch(":chatId")
  @ApiOperation({ summary: "Rename an agent chat" })
  @ApiBody({ type: UpdateAgentChatDto })
  @ApiOkResponse({ type: AgentChatSummaryDto })
  update(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("chatId", uuidV4Pipe) chatId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateAgentChatBodyPipe()) input: UpdateAgentChatInput,
  ): Promise<AgentChatSummaryDto> {
    return this.agentService.updateChat(workspaceId, chatId, userId, input);
  }

  @Delete(":chatId")
  @ApiOperation({ summary: "Delete an agent chat" })
  @ApiOkResponse({ type: AgentChatSummaryDto })
  remove(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("chatId", uuidV4Pipe) chatId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<AgentChatSummaryDto> {
    return this.agentService.deleteChat(workspaceId, chatId, userId);
  }
}
