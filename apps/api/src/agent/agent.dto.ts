import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { AgentRunStatus } from "../persistence/types/core-persistence.types.js";
import type { AgentRunIntakeResponse, CreateTelegramAgentRunInput } from "./agent.contracts.js";

const telegramUserIdPattern = /^\d+$/u;
const telegramChatIdPattern = /^-?\d+$/u;
const maxInputTextLength = 8000;
const maxSourceMessageIdLength = 128;

export class CreateTelegramAgentRunDto implements CreateTelegramAgentRunInput {
  @ApiProperty({ example: "123456789" })
  readonly telegramId: string = "";

  @ApiProperty({ example: "-100987654321" })
  readonly telegramChatId: string = "";

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly sourceMessageId?: string | null;

  @ApiProperty({ example: "@task what is next for the album?", minLength: 1 })
  readonly inputText: string = "";
}

export class ParseCreateTelegramAgentRunBodyPipe
  implements PipeTransform<unknown, CreateTelegramAgentRunInput>
{
  transform(value: unknown): CreateTelegramAgentRunInput {
    return parseCreateTelegramAgentRunInput(value);
  }
}

export class AgentRunIntakeResponseDto implements AgentRunIntakeResponse {
  @ApiProperty({ format: "uuid" })
  readonly agentRunId: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly userId: string;

  @ApiProperty({ enum: ["telegram", "web", "mini_app"] })
  readonly source: AgentRunIntakeResponse["source"];

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly sourceMessageId: string | null;

  @ApiProperty({ enum: ["running", "waiting_confirmation", "completed", "failed"] })
  readonly status: AgentRunStatus;

  @ApiProperty({ example: "Request recorded. Agent execution is not connected yet." })
  readonly responseText: string;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: string;

  constructor(response: AgentRunIntakeResponse) {
    this.agentRunId = response.agentRunId;
    this.workspaceId = response.workspaceId;
    this.userId = response.userId;
    this.source = response.source;
    this.sourceMessageId = response.sourceMessageId;
    this.status = response.status;
    this.responseText = response.responseText;
    this.createdAt = response.createdAt;
  }
}

export function parseCreateTelegramAgentRunInput(value: unknown): CreateTelegramAgentRunInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Agent request payload must be an object.");
  }

  return {
    telegramId: readPatternString(value, "telegramId", telegramUserIdPattern),
    telegramChatId: readPatternString(value, "telegramChatId", telegramChatIdPattern),
    sourceMessageId: readOptionalTrimmedString(value, "sourceMessageId", maxSourceMessageIdLength),
    inputText: readRequiredTrimmedString(value, "inputText", maxInputTextLength),
  };
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPatternString(
  value: Record<string, unknown>,
  propertyName: string,
  pattern: RegExp,
): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string" || !pattern.test(propertyValue)) {
    throw new BadRequestException(`${propertyName} must be an integer string.`);
  }

  return propertyValue;
}

function readRequiredTrimmedString(
  value: Record<string, unknown>,
  propertyName: string,
  maxLength: number,
): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0 || trimmedValue.length > maxLength) {
    throw new BadRequestException(`${propertyName} length is invalid.`);
  }

  return trimmedValue;
}

function readOptionalTrimmedString(
  value: Record<string, unknown>,
  propertyName: string,
  maxLength: number,
): string | null {
  const propertyValue = value[propertyName];

  if (propertyValue === undefined || propertyValue === null) {
    return null;
  }

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`${propertyName} must be a string or null.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  if (trimmedValue.length > maxLength) {
    throw new BadRequestException(`${propertyName} length is invalid.`);
  }

  return trimmedValue;
}
