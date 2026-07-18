import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import type { AgentRunStatus } from "../persistence/types/core-persistence.types.js";
import type {
  AgentRunConfirmationLink,
  AgentRunDetail,
  AgentRunIntakeResponse,
  AgentRunPendingConfirmationRequest,
  AgentRunSummary,
  AgentRunToolCallAudit,
  CreateTelegramAgentRunInput,
  CreateWebAgentChatInput,
  TelegramAgentRunAttachmentInput,
  TelegramAgentRunDocumentAttachmentInput,
  TelegramAgentRunPhotoAttachmentInput,
  WebAgentChatMessage,
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

export class WebAgentChatMessageDto implements WebAgentChatMessage {
  @ApiProperty({ enum: ["user", "assistant"] })
  readonly role: "assistant" | "user" = "user";

  @ApiProperty()
  readonly content = "";
}

export class CreateWebAgentChatDto implements CreateWebAgentChatInput {
  @ApiProperty({ isArray: true, type: WebAgentChatMessageDto })
  readonly messages: WebAgentChatMessage[] = [];

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  readonly projectId?: string | null;
}

export class ParseCreateWebAgentChatBodyPipe
  implements PipeTransform<unknown, CreateWebAgentChatInput>
{
  transform(value: unknown): CreateWebAgentChatInput {
    return parseCreateWebAgentChatInput(value);
  }
}

export class ParseCreateTelegramAgentRunBodyPipe
  implements PipeTransform<unknown, CreateTelegramAgentRunInput>
{
  transform(value: unknown): CreateTelegramAgentRunInput {
    return parseCreateTelegramAgentRunInput(value);
  }
}

export class AgentRunPendingConfirmationRequestDto implements AgentRunPendingConfirmationRequest {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ example: "task_skill.apply" })
  readonly kind: string;

  @ApiProperty({ additionalProperties: true, type: "object" })
  readonly preview: Record<string, unknown>;

  @ApiProperty({ format: "date-time" })
  readonly expiresAt: string;

  constructor(request: AgentRunPendingConfirmationRequest) {
    this.id = request.id;
    this.kind = request.kind;
    this.preview = request.preview;
    this.expiresAt = request.expiresAt;
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

  @ApiProperty({ isArray: true, type: AgentRunPendingConfirmationRequestDto })
  readonly pendingConfirmationRequests: AgentRunPendingConfirmationRequestDto[];

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
    this.pendingConfirmationRequests = response.pendingConfirmationRequests.map(
      (request) => new AgentRunPendingConfirmationRequestDto(request),
    );
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

export class AgentRunToolCallAuditDto implements AgentRunToolCallAudit {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty() readonly toolName: string;
  @ApiProperty({ additionalProperties: true, type: "object" }) readonly arguments: Record<
    string,
    unknown
  >;
  @ApiPropertyOptional({ additionalProperties: true, nullable: true, type: "object" })
  readonly result: Record<string, unknown> | null;
  @ApiProperty({ enum: ["pending", "success", "error"] })
  readonly status: AgentRunToolCallAudit["status"];
  @ApiPropertyOptional({ nullable: true, type: String }) readonly error: string | null;
  @ApiProperty({ format: "date-time" }) readonly createdAt: string;
  @ApiPropertyOptional({ format: "date-time", nullable: true, type: String }) readonly completedAt:
    | string
    | null;

  constructor(value: AgentRunToolCallAudit) {
    this.id = value.id;
    this.toolName = value.toolName;
    this.arguments = value.arguments;
    this.result = value.result;
    this.status = value.status;
    this.error = value.error;
    this.createdAt = value.createdAt;
    this.completedAt = value.completedAt;
  }
}

export class AgentRunConfirmationLinkDto implements AgentRunConfirmationLink {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty() readonly kind: string;
  @ApiProperty({ additionalProperties: true, type: "object" }) readonly preview: Record<
    string,
    unknown
  >;
  @ApiProperty({ enum: ["pending", "confirmed", "cancelled", "expired"] })
  readonly status: AgentRunConfirmationLink["status"];
  @ApiProperty({ format: "date-time" }) readonly expiresAt: string;
  @ApiProperty({ format: "date-time" }) readonly createdAt: string;
  @ApiProperty({ format: "date-time" }) readonly updatedAt: string;

  constructor(value: AgentRunConfirmationLink) {
    this.id = value.id;
    this.kind = value.kind;
    this.preview = value.preview;
    this.status = value.status;
    this.expiresAt = value.expiresAt;
    this.createdAt = value.createdAt;
    this.updatedAt = value.updatedAt;
  }
}

export class AgentRunDetailDto extends AgentRunSummaryDto implements AgentRunDetail {
  @ApiProperty({ isArray: true, type: AgentRunToolCallAuditDto })
  readonly toolCalls: AgentRunToolCallAuditDto[];

  @ApiProperty({ isArray: true, type: AgentRunConfirmationLinkDto })
  readonly confirmationRequests: AgentRunConfirmationLinkDto[];

  constructor(value: AgentRunDetail) {
    super(value);
    this.toolCalls = value.toolCalls.map((toolCall) => new AgentRunToolCallAuditDto(toolCall));
    this.confirmationRequests = value.confirmationRequests.map(
      (request) => new AgentRunConfirmationLinkDto(request),
    );
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

export function parseCreateWebAgentChatInput(value: unknown): CreateWebAgentChatInput {
  if (
    !isUnknownRecord(value) ||
    !Array.isArray(value["messages"]) ||
    value["messages"].length === 0
  ) {
    throw new BadRequestException("messages must be a non-empty array.");
  }

  const messages = value["messages"].map(parseWebAgentChatMessage);
  const lastMessage = messages.at(-1);

  if (lastMessage?.role !== "user") {
    throw new BadRequestException("The last message must be from the user.");
  }

  return {
    messages,
    ...(value["projectId"] === undefined
      ? {}
      : { projectId: readNullableUuid(value["projectId"], "projectId") }),
  };
}

function parseWebAgentChatMessage(value: unknown): WebAgentChatMessage {
  if (!isUnknownRecord(value) || (value["role"] !== "user" && value["role"] !== "assistant")) {
    throw new BadRequestException("Each message must have a valid role.");
  }

  if (typeof value["content"] !== "string" || value["content"].trim().length === 0) {
    throw new BadRequestException("Each message must have non-empty content.");
  }

  return { role: value["role"], content: value["content"].trim() };
}

function readNullableUuid(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !webUuidV4Pattern.test(value)) {
    throw new BadRequestException(`${field} must be a UUID v4 or null.`);
  }
  return value;
}

const webUuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

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
