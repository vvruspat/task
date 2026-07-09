import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import type { AgentRunStatus } from "../persistence/types/core-persistence.types.js";
import type {
  AgentRunIntakeResponse,
  AgentRunSummary,
  CreateTelegramAgentRunInput,
  TelegramAgentRunAttachmentInput,
  TelegramAgentRunDocumentAttachmentInput,
  TelegramAgentRunPhotoAttachmentInput,
} from "./agent.contracts.js";

const telegramUserIdPattern = /^\d+$/u;
const telegramChatIdPattern = /^-?\d+$/u;
const maxInputTextLength = 8000;
const maxSourceMessageIdLength = 128;
const maxAttachments = 10;
const maxTelegramFileIdLength = 512;
const maxTelegramFileUniqueIdLength = 256;
const maxTelegramFileNameLength = 255;
const maxTelegramMimeTypeLength = 255;
const maxTelegramSizeBytesLength = 32;
const sizeBytesPattern = /^\d+$/u;

type TelegramAgentRunPayloadRecord = Record<string, unknown> & {
  attachments?: unknown;
};

type TelegramAttachmentPayloadRecord = Record<string, unknown> & {
  kind?: unknown;
};

export class TelegramAgentRunDocumentAttachmentDto
  implements TelegramAgentRunDocumentAttachmentInput
{
  @ApiProperty({ enum: ["document"] })
  readonly kind: "document" = "document";

  @ApiProperty({ maxLength: maxTelegramFileIdLength })
  readonly fileId: string = "";

  @ApiProperty({ nullable: true, type: String, maxLength: maxTelegramFileUniqueIdLength })
  readonly fileUniqueId: string | null = null;

  @ApiProperty({ nullable: true, type: String, maxLength: maxTelegramFileNameLength })
  readonly fileName: string | null = null;

  @ApiProperty({ nullable: true, type: String, maxLength: maxTelegramMimeTypeLength })
  readonly mimeType: string | null = null;

  @ApiProperty({
    nullable: true,
    type: String,
    maxLength: maxTelegramSizeBytesLength,
    pattern: sizeBytesPattern.source,
  })
  readonly sizeBytes: string | null = null;
}

export class TelegramAgentRunPhotoAttachmentDto implements TelegramAgentRunPhotoAttachmentInput {
  @ApiProperty({ enum: ["photo"] })
  readonly kind: "photo" = "photo";

  @ApiProperty({ maxLength: maxTelegramFileIdLength })
  readonly fileId: string = "";

  @ApiProperty({ nullable: true, type: String, maxLength: maxTelegramFileUniqueIdLength })
  readonly fileUniqueId: string | null = null;

  @ApiProperty({ minimum: 1 })
  readonly width: number = 1;

  @ApiProperty({ minimum: 1 })
  readonly height: number = 1;

  @ApiProperty({
    nullable: true,
    type: String,
    maxLength: maxTelegramSizeBytesLength,
    pattern: sizeBytesPattern.source,
  })
  readonly sizeBytes: string | null = null;
}

@ApiExtraModels(TelegramAgentRunDocumentAttachmentDto, TelegramAgentRunPhotoAttachmentDto)
export class CreateTelegramAgentRunDto implements CreateTelegramAgentRunInput {
  @ApiProperty({ example: "123456789" })
  readonly telegramId: string = "";

  @ApiProperty({ example: "-100987654321" })
  readonly telegramChatId: string = "";

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly sourceMessageId?: string | null;

  @ApiProperty({ example: "@task what is next for the album?", minLength: 1 })
  readonly inputText: string = "";

  @ApiProperty({
    isArray: true,
    maxItems: maxAttachments,
    oneOf: [
      { $ref: getSchemaPath(TelegramAgentRunDocumentAttachmentDto) },
      { $ref: getSchemaPath(TelegramAgentRunPhotoAttachmentDto) },
    ],
  })
  readonly attachments: TelegramAgentRunAttachmentInput[] = [];
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

export class AgentRunSummaryDto implements AgentRunSummary {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ format: "uuid" })
  readonly userId: string;

  @ApiProperty({ enum: ["telegram", "web", "mini_app"] })
  readonly source: AgentRunSummary["source"];

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly sourceMessageId: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly model: string | null;

  @ApiProperty({ example: "@task what is next for the album?" })
  readonly inputText: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly finalResponse: string | null;

  @ApiProperty({ enum: ["running", "waiting_confirmation", "completed", "failed"] })
  readonly status: AgentRunStatus;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly error: string | null;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: string;

  @ApiProperty({ format: "date-time" })
  readonly updatedAt: string;

  constructor(summary: AgentRunSummary) {
    this.id = summary.id;
    this.workspaceId = summary.workspaceId;
    this.userId = summary.userId;
    this.source = summary.source;
    this.sourceMessageId = summary.sourceMessageId;
    this.model = summary.model;
    this.inputText = summary.inputText;
    this.finalResponse = summary.finalResponse;
    this.status = summary.status;
    this.error = summary.error;
    this.createdAt = summary.createdAt;
    this.updatedAt = summary.updatedAt;
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
    attachments: readAttachments(value),
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

function readAttachments(value: TelegramAgentRunPayloadRecord): TelegramAgentRunAttachmentInput[] {
  const propertyValue = value.attachments;

  if (propertyValue === undefined) {
    return [];
  }

  if (!Array.isArray(propertyValue)) {
    throw new BadRequestException("attachments must be an array.");
  }

  if (propertyValue.length > maxAttachments) {
    throw new BadRequestException("attachments has too many items.");
  }

  return propertyValue.map(readAttachment);
}

function readAttachment(value: unknown): TelegramAgentRunAttachmentInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("attachment must be an object.");
  }

  return readAttachmentRecord(value);
}

function readAttachmentRecord(
  value: TelegramAttachmentPayloadRecord,
): TelegramAgentRunAttachmentInput {
  const kind = value.kind;

  if (kind === "document") {
    return readDocumentAttachment(value);
  }

  if (kind === "photo") {
    return readPhotoAttachment(value);
  }

  throw new BadRequestException("attachment kind is invalid.");
}

function readDocumentAttachment(
  value: Record<string, unknown>,
): TelegramAgentRunDocumentAttachmentInput {
  return {
    kind: "document",
    fileId: readRequiredTrimmedString(value, "fileId", maxTelegramFileIdLength),
    fileUniqueId: readOptionalTrimmedString(value, "fileUniqueId", maxTelegramFileUniqueIdLength),
    fileName: readOptionalTrimmedString(value, "fileName", maxTelegramFileNameLength),
    mimeType: readOptionalTrimmedString(value, "mimeType", maxTelegramMimeTypeLength),
    sizeBytes: readOptionalPatternString(value, "sizeBytes", maxTelegramSizeBytesLength),
  };
}

function readPhotoAttachment(value: Record<string, unknown>): TelegramAgentRunPhotoAttachmentInput {
  return {
    kind: "photo",
    fileId: readRequiredTrimmedString(value, "fileId", maxTelegramFileIdLength),
    fileUniqueId: readOptionalTrimmedString(value, "fileUniqueId", maxTelegramFileUniqueIdLength),
    width: readPositiveInteger(value, "width"),
    height: readPositiveInteger(value, "height"),
    sizeBytes: readOptionalPatternString(value, "sizeBytes", maxTelegramSizeBytesLength),
  };
}

function readOptionalPatternString(
  value: Record<string, unknown>,
  propertyName: string,
  maxLength: number,
): string | null {
  const trimmedValue = readOptionalTrimmedString(value, propertyName, maxLength);

  if (trimmedValue === null) {
    return null;
  }

  if (!sizeBytesPattern.test(trimmedValue)) {
    throw new BadRequestException(`${propertyName} must be an integer string or null.`);
  }

  return trimmedValue;
}

function readPositiveInteger(value: Record<string, unknown>, propertyName: string): number {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "number" || !Number.isInteger(propertyValue) || propertyValue < 1) {
    throw new BadRequestException(`${propertyName} must be a positive integer.`);
  }

  return propertyValue;
}
