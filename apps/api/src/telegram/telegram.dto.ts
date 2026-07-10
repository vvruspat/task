import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  LinkedTelegramIdentity,
  ResolveTelegramContextInput,
  TelegramConfirmationCallbackInput,
  TelegramConfirmationCallbackResult,
  TelegramContextResolution,
  TelegramIdentityLinkStatus,
  VerifiedTelegramMiniAppInitData,
  VerifyTelegramMiniAppInitDataInput,
} from "./telegram.contracts.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const telegramUserIdPattern = /^\d+$/u;
const telegramChatIdPattern = /^-?\d+$/u;
const maxInitDataLength = 8192;

type TelegramMiniAppInitDataPayload = {
  initData?: unknown;
};

export class ResolveTelegramContextDto implements ResolveTelegramContextInput {
  @ApiProperty({ example: "123456789" })
  readonly telegramId: string = "";

  @ApiProperty({ example: "-100987654321" })
  readonly telegramChatId: string = "";
}

export class ParseResolveTelegramContextBodyPipe
  implements PipeTransform<unknown, ResolveTelegramContextInput>
{
  transform(value: unknown): ResolveTelegramContextInput {
    return parseResolveTelegramContextInput(value);
  }
}

export class VerifyTelegramMiniAppInitDataDto implements VerifyTelegramMiniAppInitDataInput {
  @ApiProperty({
    description: "Raw Telegram.WebApp.initData query string.",
    maxLength: maxInitDataLength,
  })
  readonly initData: string = "";
}

export class ParseVerifyTelegramMiniAppInitDataBodyPipe
  implements PipeTransform<unknown, VerifyTelegramMiniAppInitDataInput>
{
  transform(value: unknown): VerifyTelegramMiniAppInitDataInput {
    return parseVerifyTelegramMiniAppInitDataInput(value);
  }
}

export class TelegramConfirmationCallbackDto implements TelegramConfirmationCallbackInput {
  @ApiProperty({ example: "123456789" })
  readonly telegramId: string = "";

  @ApiProperty({ example: "-100987654321" })
  readonly telegramChatId: string = "";

  @ApiProperty({ format: "uuid" })
  readonly confirmationRequestId: string = "";

  @ApiProperty({ enum: ["confirm", "cancel"] })
  readonly action: TelegramConfirmationCallbackInput["action"] = "confirm";
}

export class ParseTelegramConfirmationCallbackBodyPipe
  implements PipeTransform<unknown, TelegramConfirmationCallbackInput>
{
  transform(value: unknown): TelegramConfirmationCallbackInput {
    return parseTelegramConfirmationCallbackInput(value);
  }
}

export class TelegramConfirmationCallbackResultDto implements TelegramConfirmationCallbackResult {
  @ApiProperty({ format: "uuid" })
  readonly confirmationRequestId: string;

  @ApiProperty({ enum: ["confirm", "cancel"] })
  readonly action: TelegramConfirmationCallbackResult["action"];

  @ApiProperty({ enum: ["confirmed", "cancelled"] })
  readonly status: TelegramConfirmationCallbackResult["status"];

  constructor(result: TelegramConfirmationCallbackResult) {
    this.confirmationRequestId = result.confirmationRequestId;
    this.action = result.action;
    this.status = result.status;
  }
}

export class TelegramContextResolutionDto {
  @ApiProperty({
    enum: [
      "resolved",
      "telegram_user_unlinked",
      "telegram_chat_unlinked",
      "user_not_in_chat_workspace",
    ],
  })
  readonly status: TelegramContextResolution["status"];

  @ApiPropertyOptional({ format: "uuid", type: String })
  readonly userId?: string;

  @ApiPropertyOptional({ format: "uuid", type: String })
  readonly workspaceId?: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true, type: String })
  readonly defaultProjectId?: string | null;

  constructor(resolution: TelegramContextResolution) {
    this.status = resolution.status;

    if ("userId" in resolution) {
      this.userId = resolution.userId;
    }

    if ("workspaceId" in resolution) {
      this.workspaceId = resolution.workspaceId;
    }

    if ("defaultProjectId" in resolution) {
      this.defaultProjectId = resolution.defaultProjectId;
    }
  }
}

export class VerifiedTelegramMiniAppInitDataDto implements VerifiedTelegramMiniAppInitData {
  @ApiProperty({ example: "123456789" })
  readonly telegramId: string;

  @ApiProperty({ example: "1720468800" })
  readonly authDate: string;

  constructor(result: VerifiedTelegramMiniAppInitData) {
    this.telegramId = result.telegramId;
    this.authDate = result.authDate;
  }
}

export class LinkedTelegramIdentityDto implements LinkedTelegramIdentity {
  @ApiProperty({ example: "123456789" })
  readonly telegramId: string;

  @ApiProperty({ format: "uuid" })
  readonly userId: string;

  constructor(identity: LinkedTelegramIdentity) {
    this.telegramId = identity.telegramId;
    this.userId = identity.userId;
  }
}

export class TelegramIdentityLinkStatusDto implements TelegramIdentityLinkStatus {
  @ApiProperty({ example: "123456789" })
  readonly telegramId: string;

  @ApiProperty({ format: "date-time" })
  readonly linkedAt: Date;

  @ApiPropertyOptional({ format: "date-time", nullable: true, type: String })
  readonly lastSeenAt: Date | null;

  constructor(status: TelegramIdentityLinkStatus) {
    this.telegramId = status.telegramId;
    this.linkedAt = status.linkedAt;
    this.lastSeenAt = status.lastSeenAt;
  }
}

function parseResolveTelegramContextInput(value: unknown): ResolveTelegramContextInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Telegram context payload must be an object.");
  }

  return {
    telegramId: readTelegramId(value, "telegramId", telegramUserIdPattern),
    telegramChatId: readTelegramId(value, "telegramChatId", telegramChatIdPattern),
  };
}

function parseVerifyTelegramMiniAppInitDataInput(
  value: unknown,
): VerifyTelegramMiniAppInitDataInput {
  if (!isTelegramMiniAppInitDataPayload(value)) {
    throw new BadRequestException("Telegram Mini App initData payload must be an object.");
  }

  const initData = value.initData;

  if (
    typeof initData !== "string" ||
    initData.trim() !== initData ||
    initData.length === 0 ||
    initData.length > maxInitDataLength
  ) {
    throw new BadRequestException(
      `Telegram Mini App initData must be a non-empty string up to ${maxInitDataLength} characters without surrounding whitespace.`,
    );
  }

  return { initData };
}

function parseTelegramConfirmationCallbackInput(value: unknown): TelegramConfirmationCallbackInput {
  if (!isUnknownRecord(value)) {
    throw new BadRequestException("Telegram confirmation callback payload must be an object.");
  }

  return {
    telegramId: readTelegramId(value, "telegramId", telegramUserIdPattern),
    telegramChatId: readTelegramId(value, "telegramChatId", telegramChatIdPattern),
    confirmationRequestId: readRequiredUuid(value, "confirmationRequestId"),
    action: readConfirmationCallbackAction(value, "action"),
  };
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTelegramMiniAppInitDataPayload(value: unknown): value is TelegramMiniAppInitDataPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTelegramId(
  value: Record<string, unknown>,
  propertyName: string,
  pattern: RegExp,
): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string" || !pattern.test(propertyValue)) {
    throw new BadRequestException(`Telegram ${propertyName} must be an integer string.`);
  }

  return propertyValue;
}

function readRequiredUuid(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName];

  if (typeof propertyValue !== "string" || !uuidV4Pattern.test(propertyValue)) {
    throw new BadRequestException(`Telegram ${propertyName} must be a UUID v4 string.`);
  }

  return propertyValue;
}

function readConfirmationCallbackAction(
  value: Record<string, unknown>,
  propertyName: string,
): TelegramConfirmationCallbackInput["action"] {
  const propertyValue = value[propertyName];

  if (propertyValue !== "confirm" && propertyValue !== "cancel") {
    throw new BadRequestException("Telegram confirmation callback action is invalid.");
  }

  return propertyValue;
}
