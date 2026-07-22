export type TelegramUserContext = {
  telegramId: string;
  isBot: boolean;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type TelegramChatContext = {
  telegramChatId: string;
  type: string;
  title: string | null;
};

export type TelegramMessageEntityContext = {
  type: string;
  offset: number;
  length: number;
  url: string | null;
};

export type TelegramDocumentAttachmentContext = {
  kind: "document";
  fileId: string;
  fileUniqueId: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
};

export type TelegramPhotoAttachmentContext = {
  kind: "photo";
  fileId: string;
  fileUniqueId: string | null;
  width: number;
  height: number;
  sizeBytes: string | null;
};

export type TelegramAttachmentContext =
  | TelegramDocumentAttachmentContext
  | TelegramPhotoAttachmentContext;

export type TelegramMessageContext = {
  updateId: string;
  messageId: string;
  sender: TelegramUserContext;
  chat: TelegramChatContext;
  text: string | null;
  entities: TelegramMessageEntityContext[];
  replyToMessageId: string | null;
  attachments: TelegramAttachmentContext[];
};

export type TelegramConfirmationCallbackAction = "confirm" | "cancel";

export type TelegramConfirmationCallbackContext = {
  updateId: string;
  callbackQueryId: string;
  confirmationRequestId: string;
  action: TelegramConfirmationCallbackAction;
  sender: TelegramUserContext;
  chat: TelegramChatContext;
  messageId: string;
};

export type TelegramReplyTarget = {
  telegramChatId: string;
  messageId: string;
};

export class TelegramUpdateParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramUpdateParseError";
  }
}

export function parseTelegramMessageContext(update: unknown): TelegramMessageContext {
  const updateRecord = readRecord(update, "telegram update");
  const message = readRecord(readRequiredProperty(updateRecord, "message"), "telegram message");
  const sender = readTelegramUser(readRequiredProperty(message, "from"));
  const chat = readTelegramChat(readRequiredProperty(message, "chat"));

  return {
    attachments: readAttachments(message),
    chat,
    entities: readMessageEntities(message),
    messageId: readTelegramIntegerAsString(message, "message_id"),
    replyToMessageId: readReplyToMessageId(message),
    sender,
    text: readOptionalText(message),
    updateId: readTelegramIntegerAsString(updateRecord, "update_id"),
  };
}

export function parseTelegramConfirmationCallbackContext(
  update: unknown,
): TelegramConfirmationCallbackContext {
  const updateRecord = readRecord(update, "telegram update");
  const callbackQuery = readRecord(
    readRequiredProperty(updateRecord, "callback_query"),
    "telegram callback query",
  );
  const callbackMessage = readRecord(
    readRequiredProperty(callbackQuery, "message"),
    "telegram callback message",
  );
  const callbackPayload = readConfirmationCallbackPayload(readString(callbackQuery, "data"));

  return {
    action: callbackPayload.action,
    callbackQueryId: readString(callbackQuery, "id"),
    chat: readTelegramChat(readRequiredProperty(callbackMessage, "chat")),
    confirmationRequestId: callbackPayload.confirmationRequestId,
    messageId: readTelegramIntegerAsString(callbackMessage, "message_id"),
    sender: readTelegramUser(readRequiredProperty(callbackQuery, "from")),
    updateId: readTelegramIntegerAsString(updateRecord, "update_id"),
  };
}

export function isTelegramAgentInvocation(
  message: TelegramMessageContext,
  botUsername: string | null,
): boolean {
  if (message.chat.type === "private") return true;
  if (message.text === null) return false;
  for (const entity of message.entities) {
    const entityText = message.text.slice(entity.offset, entity.offset + entity.length);
    if (entity.type === "bot_command" && isTaskCommand(entityText, botUsername)) return true;
    if (
      entity.type === "mention" &&
      botUsername !== null &&
      entityText.toLowerCase() === `@${botUsername.toLowerCase()}`
    ) {
      return true;
    }
  }
  return false;
}

export function readTelegramCallbackReplyTarget(update: unknown): TelegramReplyTarget | null {
  if (!isUnknownRecord(update)) return null;
  const callbackQuery = readProperty(update, "callback_query");
  if (!isUnknownRecord(callbackQuery)) return null;
  const message = readProperty(callbackQuery, "message");
  if (!isUnknownRecord(message)) return null;
  const chat = readProperty(message, "chat");
  if (!isUnknownRecord(chat)) return null;
  const messageId = readTelegramIntegerString(readProperty(message, "message_id"));
  const telegramChatId = readTelegramIntegerString(readProperty(chat, "id"));
  return messageId === null || telegramChatId === null ? null : { messageId, telegramChatId };
}

function isTaskCommand(value: string, botUsername: string | null): boolean {
  const match = /^\/task(?:@([A-Za-z0-9_]{5,32}))?$/u.exec(value);
  if (match === null) return false;
  const addressedUsername = match[1];
  return (
    addressedUsername === undefined ||
    (botUsername !== null && addressedUsername.toLowerCase() === botUsername.toLowerCase())
  );
}

function readTelegramUser(value: unknown): TelegramUserContext {
  const record = readRecord(value, "telegram user");
  return {
    firstName: readOptionalNullableStringAsNull(record, "first_name"),
    isBot: readBoolean(record, "is_bot"),
    lastName: readOptionalNullableStringAsNull(record, "last_name"),
    telegramId: readTelegramIntegerAsString(record, "id"),
    username: readOptionalNullableStringAsNull(record, "username"),
  };
}

function readConfirmationCallbackPayload(data: string): ConfirmationCallbackPayload {
  const parts = data.split(":");
  const namespace = parts[0];
  const resource = parts[1];
  const confirmationRequestId = parts[2];
  const action = parts[3];
  if (
    parts.length !== 4 ||
    namespace !== "task" ||
    resource !== "confirmation" ||
    confirmationRequestId === undefined ||
    !uuidV4Pattern.test(confirmationRequestId)
  ) {
    throw new TelegramUpdateParseError("callback confirmation payload is invalid.");
  }
  if (action !== "confirm" && action !== "cancel") {
    throw new TelegramUpdateParseError("callback confirmation action is invalid.");
  }
  return { action, confirmationRequestId };
}

function readTelegramChat(value: unknown): TelegramChatContext {
  const record = readRecord(value, "telegram chat");
  return {
    telegramChatId: readTelegramIntegerAsString(record, "id"),
    title: readOptionalNullableStringAsNull(record, "title"),
    type: readString(record, "type"),
  };
}

function readOptionalText(message: Record<string, unknown>): string | null {
  const text = readOptionalNullableString(message, "text");
  const caption = readOptionalNullableString(message, "caption");
  return text ?? caption ?? null;
}

function readMessageEntities(message: Record<string, unknown>): TelegramMessageEntityContext[] {
  const entities =
    readOptionalArray(message, "entities") ?? readOptionalArray(message, "caption_entities");
  return entities?.map(readMessageEntity) ?? [];
}

function readMessageEntity(value: unknown): TelegramMessageEntityContext {
  const record = readRecord(value, "telegram message entity");
  return {
    length: readNonNegativeInteger(record, "length"),
    offset: readNonNegativeInteger(record, "offset"),
    type: readString(record, "type"),
    url: readOptionalNullableString(record, "url") ?? null,
  };
}

function readReplyToMessageId(message: Record<string, unknown>): string | null {
  const replyToMessage = readProperty(message, "reply_to_message");
  if (replyToMessage === undefined || replyToMessage === null) return null;
  return readTelegramIntegerAsString(
    readRecord(replyToMessage, "telegram reply message"),
    "message_id",
  );
}

function readAttachments(message: Record<string, unknown>): TelegramAttachmentContext[] {
  const attachments: TelegramAttachmentContext[] = [];
  const document = readProperty(message, "document");
  const photo = readOptionalArray(message, "photo");
  if (document !== undefined && document !== null)
    attachments.push(readDocumentAttachment(document));
  if (photo !== undefined && photo.length > 0) {
    attachments.push(readPhotoAttachment(photo[photo.length - 1]));
  }
  return attachments;
}

function readDocumentAttachment(value: unknown): TelegramDocumentAttachmentContext {
  const record = readRecord(value, "telegram document");
  return {
    fileId: readString(record, "file_id"),
    fileName: readOptionalNullableStringAsNull(record, "file_name"),
    fileUniqueId: readOptionalNullableStringAsNull(record, "file_unique_id"),
    kind: "document",
    mimeType: readOptionalNullableStringAsNull(record, "mime_type"),
    sizeBytes: readOptionalIntegerString(record, "file_size"),
  };
}

function readPhotoAttachment(value: unknown): TelegramPhotoAttachmentContext {
  const record = readRecord(value, "telegram photo");
  return {
    fileId: readString(record, "file_id"),
    fileUniqueId: readOptionalNullableStringAsNull(record, "file_unique_id"),
    height: readNonNegativeInteger(record, "height"),
    kind: "photo",
    sizeBytes: readOptionalIntegerString(record, "file_size"),
    width: readNonNegativeInteger(record, "width"),
  };
}

function readRequiredProperty(record: Record<string, unknown>, propertyName: string): unknown {
  const value = readProperty(record, propertyName);
  if (value === undefined || value === null) {
    throw new TelegramUpdateParseError(`${propertyName} is required.`);
  }
  return value;
}

function readProperty(record: Record<string, unknown>, propertyName: string): unknown {
  return record[propertyName];
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new TelegramUpdateParseError(`${label} must be an object.`);
  }
  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];
  if (typeof value !== "string" || value.length > maxTelegramStringLength) {
    throw new TelegramUpdateParseError(`${propertyName} must be a bounded string.`);
  }
  return value;
}

function readBoolean(record: Record<string, unknown>, propertyName: string): boolean {
  const value = record[propertyName];
  if (typeof value !== "boolean") {
    throw new TelegramUpdateParseError(`${propertyName} must be a boolean.`);
  }
  return value;
}

function readTelegramIntegerAsString(
  record: Record<string, unknown>,
  propertyName: string,
): string {
  const value = record[propertyName];
  if (!isSafeInteger(value)) {
    throw new TelegramUpdateParseError(`${propertyName} must be a safe integer.`);
  }
  return value.toString();
}

function readTelegramIntegerString(value: unknown): string | null {
  if (isSafeInteger(value)) return String(value);
  if (typeof value === "string" && /^-?\d+$/u.test(value)) return value;
  return null;
}

function readNonNegativeInteger(record: Record<string, unknown>, propertyName: string): number {
  const value = record[propertyName];
  if (!isSafeInteger(value) || value < 0) {
    throw new TelegramUpdateParseError(`${propertyName} must be a non-negative safe integer.`);
  }
  return value;
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function readOptionalIntegerString(
  record: Record<string, unknown>,
  propertyName: string,
): string | null {
  const value = record[propertyName];
  if (value === undefined || value === null) return null;
  if (!isSafeInteger(value) || value < 0) {
    throw new TelegramUpdateParseError(`${propertyName} must be a non-negative safe integer.`);
  }
  return value.toString();
}

function readOptionalNullableString(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = record[propertyName];
  if (value === undefined || value === null) return value;
  if (typeof value !== "string" || value.length > maxTelegramStringLength) {
    throw new TelegramUpdateParseError(`${propertyName} must be a bounded string or null.`);
  }
  return value;
}

function readOptionalNullableStringAsNull(
  record: Record<string, unknown>,
  propertyName: string,
): string | null {
  return readOptionalNullableString(record, propertyName) ?? null;
}

function readOptionalArray(
  record: Record<string, unknown>,
  propertyName: string,
): unknown[] | undefined {
  const value = record[propertyName];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > maxTelegramArrayLength) {
    throw new TelegramUpdateParseError(`${propertyName} must be a bounded array.`);
  }
  return value;
}

type ConfirmationCallbackPayload = {
  confirmationRequestId: string;
  action: TelegramConfirmationCallbackAction;
};

const maxTelegramArrayLength = 100;
const maxTelegramStringLength = 8_192;
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
