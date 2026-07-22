import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { IntegrationAgentToolDefinition } from "@task/integration-sdk";
import { IntegrationAgentToolsService } from "./integration-agent-tools.service.js";
import type {
  ExecuteIntegrationMcpToolInput,
  IntegrationMcpToolCallStore,
  IntegrationMcpToolDefinition,
  IntegrationMcpToolExecution,
} from "./integration-mcp-tools.contracts.js";
import { TypeOrmIntegrationMcpToolCallStore } from "./typeorm-integration-mcp-tool-call.store.js";

@Injectable()
export class IntegrationMcpToolsService {
  constructor(
    @Inject(IntegrationAgentToolsService)
    private readonly agentTools: Pick<IntegrationAgentToolsService, "executeTool" | "listTools">,
    @Inject(TypeOrmIntegrationMcpToolCallStore)
    private readonly auditStore: IntegrationMcpToolCallStore,
  ) {}

  async listTools(
    workspaceId: string,
    userId: string,
  ): Promise<readonly IntegrationMcpToolDefinition[]> {
    const tools = await this.agentTools.listTools(workspaceId, userId);
    return tools.filter(isReadOnlyTool);
  }

  async executeTool(
    input: ExecuteIntegrationMcpToolInput,
    workspaceId: string,
    userId: string,
  ): Promise<IntegrationMcpToolExecution> {
    const tools = await this.agentTools.listTools(workspaceId, userId);
    const tool = tools.find((candidate) => candidate.name === input.name);
    if (tool === undefined || !tool.readOnly) {
      throw new BadRequestException(`Unsupported read-only integration tool: ${input.name}`);
    }
    const toolCallId = await this.auditStore.start({
      arguments: { ...input.arguments },
      toolName: input.name,
      userId,
      workspaceId,
    });
    try {
      const result = await this.agentTools.executeTool(input, workspaceId, userId);
      await this.auditStore.succeed(toolCallId, result, new Date());
      return { name: input.name, result };
    } catch (error: unknown) {
      await this.auditStore.fail(toolCallId, formatMcpToolError(error), new Date());
      throw error;
    }
  }
}

function isReadOnlyTool(
  tool: IntegrationAgentToolDefinition,
): tool is IntegrationAgentToolDefinition & { readOnly: true } {
  return tool.readOnly;
}

export function formatMcpToolError(error: unknown): string {
  return (
    error instanceof Error ? `${error.name}: ${error.message}` : "Unknown MCP tool error"
  ).slice(0, 2_000);
}
