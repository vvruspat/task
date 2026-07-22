import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
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
import {
  ExecuteIntegrationMcpToolDto,
  IntegrationMcpToolDefinitionDto,
  IntegrationMcpToolExecutionDto,
  ParseExecuteIntegrationMcpToolBodyPipe,
} from "./integration-mcp-tools.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { IntegrationMcpToolsService } from "./integration-mcp-tools.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("workspace integration tools")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/integration-tools")
export class IntegrationMcpToolsController {
  constructor(private readonly service: IntegrationMcpToolsService) {}

  @Get()
  @ApiOperation({ summary: "List read-only tools from connected workspace integrations" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: IntegrationMcpToolDefinitionDto })
  async listTools(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<IntegrationMcpToolDefinitionDto[]> {
    return (await this.service.listTools(workspaceId, userId)).map(
      (tool) => new IntegrationMcpToolDefinitionDto(tool),
    );
  }

  @Post("execute")
  @HttpCode(200)
  @ApiOperation({ summary: "Execute one audited read-only workspace integration tool" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiBody({ type: ExecuteIntegrationMcpToolDto })
  @ApiOkResponse({ type: IntegrationMcpToolExecutionDto })
  @ApiBadRequestResponse({ description: "Tool name or arguments are invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot use this workspace integration." })
  @ApiServiceUnavailableResponse({ description: "Tool call audit is unavailable." })
  async executeTool(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(ParseExecuteIntegrationMcpToolBodyPipe) input: ExecuteIntegrationMcpToolDto,
  ): Promise<IntegrationMcpToolExecutionDto> {
    return new IntegrationMcpToolExecutionDto(
      await this.service.executeTool(input, workspaceId, userId),
    );
  }
}
