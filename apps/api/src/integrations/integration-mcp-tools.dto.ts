import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import type { IntegrationAgentToolDefinition } from "@task/integration-sdk";
import type {
  ExecuteIntegrationMcpToolInput,
  IntegrationMcpToolDefinition,
  IntegrationMcpToolExecution,
} from "./integration-mcp-tools.contracts.js";
import { isBoundedIntegrationToolJsonObject } from "./integration-tool-json.js";

const qualifiedToolNamePattern = /^[a-z][a-z0-9_]{0,63}$/u;
const maxMcpToolArgumentsBytes = 32 * 1_024;

export class IntegrationMcpToolDefinitionDto implements IntegrationMcpToolDefinition {
  @ApiProperty({ maxLength: 64, pattern: qualifiedToolNamePattern.source }) readonly name: string;
  @ApiProperty({ maxLength: 1_000 }) readonly description: string;
  @ApiProperty({ enum: [true] }) readonly readOnly: true = true;
  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly inputSchema: IntegrationAgentToolDefinition["inputSchema"];

  constructor(value: IntegrationAgentToolDefinition & { readOnly: true }) {
    this.name = value.name;
    this.description = value.description;
    this.inputSchema = value.inputSchema;
  }
}

export class ExecuteIntegrationMcpToolDto implements ExecuteIntegrationMcpToolInput {
  @ApiProperty({ maxLength: 64, pattern: qualifiedToolNamePattern.source }) readonly name: string =
    "";
  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly arguments: Readonly<Record<string, unknown>> = {};
}

export class IntegrationMcpToolExecutionDto implements IntegrationMcpToolExecution {
  @ApiProperty({ maxLength: 64, pattern: qualifiedToolNamePattern.source }) readonly name: string;
  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly result: Record<string, unknown>;

  constructor(value: IntegrationMcpToolExecution) {
    this.name = value.name;
    this.result = value.result;
  }
}

export class ParseExecuteIntegrationMcpToolBodyPipe
  implements PipeTransform<unknown, ExecuteIntegrationMcpToolInput>
{
  transform(value: unknown): ExecuteIntegrationMcpToolInput {
    if (
      !isRecord(value) ||
      Object.keys(value).some((key) => !["arguments", "name"].includes(key))
    ) {
      throw new BadRequestException("Integration MCP tool call must be an object.");
    }
    const name = value["name"];
    const argumentsValue = value["arguments"];
    if (typeof name !== "string" || !qualifiedToolNamePattern.test(name)) {
      throw new BadRequestException("Integration MCP tool name is invalid.");
    }
    if (!isBoundedIntegrationToolJsonObject(argumentsValue, maxMcpToolArgumentsBytes)) {
      throw new BadRequestException(
        "Integration MCP tool arguments must be a bounded JSON object.",
      );
    }
    return { arguments: argumentsValue, name };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
