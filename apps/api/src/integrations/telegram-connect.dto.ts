import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import type {
  CompleteTelegramChatConnectionInput,
  TelegramChatConnection,
  TelegramConnectToken,
} from "./telegram-connect.contracts.js";

const telegramChatIdPattern = /^-?\d{1,20}$/u;
const telegramUserIdPattern = /^\d{1,20}$/u;
const connectTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

export class TelegramConnectTokenDto implements TelegramConnectToken {
  @ApiProperty({ description: "Command to send in the Telegram chat that should be connected." })
  readonly command: string;
  @ApiProperty({ format: "date-time" }) readonly expiresAt: Date;

  constructor(value: TelegramConnectToken) {
    this.command = value.command;
    this.expiresAt = value.expiresAt;
  }
}

export class CompleteTelegramChatConnectionDto implements CompleteTelegramChatConnectionInput {
  @ApiProperty() readonly telegramChatId: string;
  @ApiProperty() readonly telegramId: string;
  @ApiProperty({ nullable: true, type: String }) readonly title: string | null;
  @ApiProperty({ minLength: 43, maxLength: 43 }) readonly token: string;

  constructor(value: CompleteTelegramChatConnectionInput) {
    this.telegramChatId = value.telegramChatId;
    this.telegramId = value.telegramId;
    this.title = value.title;
    this.token = value.token;
  }
}

export class TelegramChatConnectionDto implements TelegramChatConnection {
  @ApiProperty({ format: "uuid" }) readonly integrationId: string;
  @ApiProperty({ enum: ["connected"] }) readonly status = "connected" as const;
  @ApiProperty() readonly telegramChatId: string;
  @ApiProperty({ format: "uuid" }) readonly workspaceId: string;

  constructor(value: TelegramChatConnection) {
    this.integrationId = value.integrationId;
    this.telegramChatId = value.telegramChatId;
    this.workspaceId = value.workspaceId;
  }
}

export class ParseCompleteTelegramChatConnectionPipe
  implements PipeTransform<unknown, CompleteTelegramChatConnectionDto>
{
  transform(value: unknown): CompleteTelegramChatConnectionDto {
    if (!isRecord(value)) throw invalidConnection();
    const telegramChatId = value["telegramChatId"];
    const telegramId = value["telegramId"];
    const title = value["title"];
    const token = value["token"];
    if (
      typeof telegramChatId !== "string" ||
      !telegramChatIdPattern.test(telegramChatId) ||
      typeof telegramId !== "string" ||
      !telegramUserIdPattern.test(telegramId) ||
      (title !== null && (typeof title !== "string" || title.length === 0 || title.length > 256)) ||
      typeof token !== "string" ||
      !connectTokenPattern.test(token)
    ) {
      throw invalidConnection();
    }
    return new CompleteTelegramChatConnectionDto({ telegramChatId, telegramId, title, token });
  }
}

function invalidConnection(): BadRequestException {
  return new BadRequestException("Telegram chat connection payload is invalid.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
