import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import type {
  CompleteTelegramBrowserConnectInput,
  CompleteTelegramChatConnectionInput,
  CreateTelegramBrowserConnectIntentInput,
  TelegramBrowserConnectAuthInput,
  TelegramBrowserConnectIntent,
  TelegramBrowserConnectPreview,
  TelegramBrowserConnectResult,
  TelegramBrowserConnectWorkspace,
  TelegramChatConnection,
  TelegramConnectToken,
} from "./telegram-connect.contracts.js";

const telegramChatIdPattern = /^-?\d{1,20}$/u;
const telegramUserIdPattern = /^\d{1,20}$/u;
const connectTokenPattern = /^[A-Za-z0-9_-]{43}$/u;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

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

export class CreateTelegramBrowserConnectIntentDto
  implements CreateTelegramBrowserConnectIntentInput
{
  @ApiProperty() readonly telegramChatId: string;
  @ApiProperty() readonly telegramId: string;
  @ApiProperty({ nullable: true, type: String }) readonly title: string | null;

  constructor(value: CreateTelegramBrowserConnectIntentInput) {
    this.telegramChatId = value.telegramChatId;
    this.telegramId = value.telegramId;
    this.title = value.title;
  }
}

export class TelegramBrowserConnectIntentDto implements TelegramBrowserConnectIntent {
  @ApiProperty({ format: "uri" }) readonly loginUrl: string;
  @ApiProperty({ format: "date-time" }) readonly expiresAt: Date;

  constructor(value: TelegramBrowserConnectIntent) {
    this.loginUrl = value.loginUrl;
    this.expiresAt = value.expiresAt;
  }
}

export class TelegramBrowserConnectAuthDto implements TelegramBrowserConnectAuthInput {
  @ApiProperty({ maxLength: 4096 }) readonly authData: string;

  constructor(value: TelegramBrowserConnectAuthInput) {
    this.authData = value.authData;
  }
}

export class CompleteTelegramBrowserConnectDto
  extends TelegramBrowserConnectAuthDto
  implements CompleteTelegramBrowserConnectInput
{
  @ApiProperty({ format: "uuid", required: false }) readonly workspaceId?: string;

  constructor(value: CompleteTelegramBrowserConnectInput) {
    super(value);
    if (value.workspaceId !== undefined) this.workspaceId = value.workspaceId;
  }
}

export class TelegramBrowserConnectWorkspaceDto implements TelegramBrowserConnectWorkspace {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty() readonly name: string;
  @ApiProperty() readonly slug: string;

  constructor(value: TelegramBrowserConnectWorkspace) {
    this.id = value.id;
    this.name = value.name;
    this.slug = value.slug;
  }
}

export class TelegramBrowserConnectPreviewDto implements TelegramBrowserConnectPreview {
  @ApiProperty({ enum: ["link_identity", "connect_chat"] })
  readonly mode: "link_identity" | "connect_chat";
  @ApiProperty({ nullable: true, type: String }) readonly chatTitle: string | null;
  @ApiProperty({ format: "date-time" }) readonly expiresAt: Date;
  @ApiProperty({ nullable: true, type: TelegramBrowserConnectWorkspaceDto })
  readonly workspace: TelegramBrowserConnectWorkspaceDto | null;
  @ApiProperty({ isArray: true, type: TelegramBrowserConnectWorkspaceDto })
  readonly workspaces: TelegramBrowserConnectWorkspaceDto[];

  constructor(value: TelegramBrowserConnectPreview) {
    this.mode = value.mode;
    this.chatTitle = value.chatTitle;
    this.expiresAt = value.expiresAt;
    this.workspace =
      value.workspace === null ? null : new TelegramBrowserConnectWorkspaceDto(value.workspace);
    this.workspaces = value.workspaces.map(
      (workspace) => new TelegramBrowserConnectWorkspaceDto(workspace),
    );
  }
}

export class TelegramBrowserConnectResultDto implements TelegramBrowserConnectResult {
  @ApiProperty({ enum: ["identity_linked", "chat_connected"] })
  readonly status: "identity_linked" | "chat_connected";
  @ApiProperty({ nullable: true, type: String }) readonly chatTitle: string | null;
  @ApiProperty({ type: TelegramBrowserConnectWorkspaceDto })
  readonly workspace: TelegramBrowserConnectWorkspaceDto;

  constructor(value: TelegramBrowserConnectResult) {
    this.status = value.status;
    this.chatTitle = value.chatTitle;
    this.workspace = new TelegramBrowserConnectWorkspaceDto(value.workspace);
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

export class ParseCreateTelegramBrowserConnectIntentPipe
  implements PipeTransform<unknown, CreateTelegramBrowserConnectIntentDto>
{
  transform(value: unknown): CreateTelegramBrowserConnectIntentDto {
    if (!isRecord(value)) throw invalidConnection();
    const telegramChatId = value["telegramChatId"];
    const telegramId = value["telegramId"];
    const title = value["title"];
    if (
      typeof telegramChatId !== "string" ||
      !telegramChatIdPattern.test(telegramChatId) ||
      typeof telegramId !== "string" ||
      !telegramUserIdPattern.test(telegramId) ||
      (title !== null && (typeof title !== "string" || title.length === 0 || title.length > 256))
    ) {
      throw invalidConnection();
    }
    return new CreateTelegramBrowserConnectIntentDto({ telegramChatId, telegramId, title });
  }
}

export class ParseTelegramBrowserConnectAuthPipe
  implements PipeTransform<unknown, TelegramBrowserConnectAuthDto>
{
  transform(value: unknown): TelegramBrowserConnectAuthDto {
    if (!isRecord(value)) throw invalidBrowserConnection();
    const authData = value["authData"];
    if (typeof authData !== "string" || authData.length === 0 || authData.length > 4_096) {
      throw invalidBrowserConnection();
    }
    return new TelegramBrowserConnectAuthDto({ authData });
  }
}

export class ParseCompleteTelegramBrowserConnectPipe
  implements PipeTransform<unknown, CompleteTelegramBrowserConnectDto>
{
  transform(value: unknown): CompleteTelegramBrowserConnectDto {
    const authInput = new ParseTelegramBrowserConnectAuthPipe().transform(value);
    if (!isRecord(value)) throw invalidBrowserConnection();
    const workspaceId = value["workspaceId"];
    if (
      workspaceId !== undefined &&
      (typeof workspaceId !== "string" || !uuidPattern.test(workspaceId))
    ) {
      throw invalidBrowserConnection();
    }
    return new CompleteTelegramBrowserConnectDto({
      authData: authInput.authData,
      ...(typeof workspaceId === "string" ? { workspaceId } : {}),
    });
  }
}

function invalidConnection(): BadRequestException {
  return new BadRequestException("Telegram chat connection payload is invalid.");
}

function invalidBrowserConnection(): BadRequestException {
  return new BadRequestException("Telegram browser connection payload is invalid.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
