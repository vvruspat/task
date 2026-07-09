import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateTaskFileAttachmentInput,
  CreateTaskLinkAttachmentInput,
  CreateTaskTelegramFileAttachmentInput,
  TaskAttachment,
} from "./attachments.contracts.js";

export class CreateTaskLinkAttachmentDto implements CreateTaskLinkAttachmentInput {
  @ApiProperty({ example: "https://example.com/bass-take" })
  readonly url: string = "";

  @ApiPropertyOptional({ nullable: true, type: String, example: "Bass take reference" })
  readonly title?: string | null;
}

export class CreateTaskFileAttachmentDto implements CreateTaskFileAttachmentInput {
  @ApiProperty({ example: "workspaces/acme/tasks/bass-take.wav" })
  readonly storageKey: string = "";

  @ApiPropertyOptional({ nullable: true, type: String, example: "Bass take.wav" })
  readonly title?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "audio/wav" })
  readonly mimeType?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "18432000" })
  readonly sizeBytes?: string | null;
}

export class CreateTaskTelegramFileAttachmentDto implements CreateTaskTelegramFileAttachmentInput {
  @ApiProperty({ example: "BQACAgIAAxkBAAIBR2Z..." })
  readonly telegramFileId: string = "";

  @ApiPropertyOptional({ nullable: true, type: String, example: "Bass take.wav" })
  readonly title?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "audio/wav" })
  readonly mimeType?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "18432000" })
  readonly sizeBytes?: string | null;
}

export class ParseCreateTaskLinkAttachmentBodyPipe
  implements PipeTransform<unknown, CreateTaskLinkAttachmentInput>
{
  transform(value: unknown): CreateTaskLinkAttachmentInput {
    return parseCreateTaskLinkAttachmentInput(value);
  }
}

export class ParseCreateTaskFileAttachmentBodyPipe
  implements PipeTransform<unknown, CreateTaskFileAttachmentInput>
{
  transform(value: unknown): CreateTaskFileAttachmentInput {
    return parseCreateTaskFileAttachmentInput(value);
  }
}

export class ParseCreateTaskTelegramFileAttachmentBodyPipe
  implements PipeTransform<unknown, CreateTaskTelegramFileAttachmentInput>
{
  transform(value: unknown): CreateTaskTelegramFileAttachmentInput {
    return parseCreateTaskTelegramFileAttachmentInput(value);
  }
}

export class TaskAttachmentDto implements TaskAttachment {
  @ApiProperty({ format: "uuid" })
  readonly id: string;

  @ApiProperty({ format: "uuid" })
  readonly workspaceId: string;

  @ApiProperty({ enum: ["task", "project", "comment"] })
  readonly targetType: "task" | "project" | "comment";

  @ApiProperty({ format: "uuid" })
  readonly targetId: string;

  @ApiProperty({ enum: ["file", "link", "telegram_file"] })
  readonly kind: "file" | "link" | "telegram_file";

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly title: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly url: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly storageKey: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly telegramFileId: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly mimeType: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  readonly sizeBytes: string | null;

  @ApiProperty({ format: "uuid" })
  readonly createdByUserId: string;

  @ApiProperty({ format: "date-time" })
  readonly createdAt: Date;

  constructor(attachment: TaskAttachment) {
    this.id = attachment.id;
    this.workspaceId = attachment.workspaceId;
    this.targetType = attachment.targetType;
    this.targetId = attachment.targetId;
    this.kind = attachment.kind;
    this.title = attachment.title;
    this.url = attachment.url;
    this.storageKey = attachment.storageKey;
    this.telegramFileId = attachment.telegramFileId;
    this.mimeType = attachment.mimeType;
    this.sizeBytes = attachment.sizeBytes;
    this.createdByUserId = attachment.createdByUserId;
    this.createdAt = attachment.createdAt;
  }
}

function parseCreateTaskLinkAttachmentInput(value: unknown): CreateTaskLinkAttachmentInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Attachment payload must be an object.");
  }

  const url = readRequiredUrl(value, "url");
  const title = readOptionalNullableString(value, "title");
  const input: CreateTaskLinkAttachmentInput = { url };

  if (title !== undefined) {
    input.title = title;
  }

  return input;
}

function parseCreateTaskFileAttachmentInput(value: unknown): CreateTaskFileAttachmentInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Attachment payload must be an object.");
  }

  const storageKey = readRequiredString(value, "storageKey");
  const title = readOptionalNullableString(value, "title");
  const mimeType = readOptionalNullableString(value, "mimeType");
  const sizeBytes = readOptionalNullableSizeBytes(value, "sizeBytes");
  const input: CreateTaskFileAttachmentInput = { storageKey };

  if (title !== undefined) {
    input.title = title;
  }

  if (mimeType !== undefined) {
    input.mimeType = mimeType;
  }

  if (sizeBytes !== undefined) {
    input.sizeBytes = sizeBytes;
  }

  return input;
}

function parseCreateTaskTelegramFileAttachmentInput(
  value: unknown,
): CreateTaskTelegramFileAttachmentInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Attachment payload must be an object.");
  }

  const telegramFileId = readRequiredString(value, "telegramFileId");
  const title = readOptionalNullableString(value, "title");
  const mimeType = readOptionalNullableString(value, "mimeType");
  const sizeBytes = readOptionalNullableSizeBytes(value, "sizeBytes");
  const input: CreateTaskTelegramFileAttachmentInput = { telegramFileId };

  if (title !== undefined) {
    input.title = title;
  }

  if (mimeType !== undefined) {
    input.mimeType = mimeType;
  }

  if (sizeBytes !== undefined) {
    input.sizeBytes = sizeBytes;
  }

  return input;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Attachment ${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    throw new BadRequestException(`Attachment ${propertyName} must not be empty.`);
  }

  return trimmedValue;
}

function readRequiredUrl(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Attachment ${propertyName} must be a string.`);
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    throw new BadRequestException(`Attachment ${propertyName} must not be empty.`);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    throw new BadRequestException(`Attachment ${propertyName} must be a valid URL.`);
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new BadRequestException(`Attachment ${propertyName} must use http or https.`);
  }

  return parsedUrl.toString();
}

function readOptionalNullableString(
  value: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const propertyValue = value[propertyName];

  if (propertyValue === undefined || propertyValue === null) {
    return propertyValue;
  }

  if (typeof propertyValue !== "string") {
    throw new BadRequestException(`Attachment ${propertyName} must be a string or null.`);
  }

  const trimmedValue = propertyValue.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}

function readOptionalNullableSizeBytes(
  value: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const propertyValue = readOptionalNullableString(value, propertyName);

  if (propertyValue === undefined || propertyValue === null) {
    return propertyValue;
  }

  if (!/^(0|[1-9][0-9]*)$/.test(propertyValue)) {
    throw new BadRequestException(`Attachment ${propertyName} must be a non-negative integer.`);
  }

  return propertyValue;
}
