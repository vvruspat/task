import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import { AgentRunSummaryDto } from "./agent.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { AgentService } from "./agent.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("agent")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/agent/runs")
export class AgentRunsController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  @ApiOperation({ summary: "List current user agent run history in a visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: AgentRunSummaryDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listWorkspaceRuns(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<AgentRunSummaryDto[]> {
    return this.agentService.listWorkspaceRuns(workspaceId, userId);
  }
}
