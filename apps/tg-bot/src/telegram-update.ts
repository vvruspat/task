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
    updateId: readTelegramIntegerAsString(updateRecord, "update_id"),
    messageId: readTelegramIntegerAsString(message, "message_id"),
    sender,
    chat,
    text: readOptionalText(message),
    entities: readMessageEntities(message),
    replyToMessageId: readReplyToMessageId(message),
    attachments: readAttachments(message),
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
    updateId: readTelegramIntegerAsString(updateRecord, "update_id"),
    callbackQueryId: readString(callbackQuery, "id"),
    confirmationRequestId: callbackPayload.confirmationRequestId,
    action: callbackPayload.action,
    sender: readTelegramUser(readRequiredProperty(callbackQuery, "from")),
    chat: readTelegramChat(readRequiredProperty(callbackMessage, "chat")),
    messageId: readTelegramIntegerAsString(callbackMessage, "message_id"),
  };
}

function readTelegramUser(value: unknown): TelegramUserContext {
  const record = readRecord(value, "telegram user");

  return {
    telegramId: readTelegramIntegerAsString(record, "id"),
    isBot: readBoolean(record, "is_bot"),
    username: readOptionalNullableStringAsNull(record, "username"),
    firstName: readOptionalNullableStringAsNull(record, "first_name"),
    lastName: readOptionalNullableStringAsNull(record, "last_name"),
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

  return {
    confirmationRequestId,
    action,
  };
}

function readTelegramChat(value: unknown): TelegramChatContext {
  const record = readRecord(value, "telegram chat");

  return {
    telegramChatId: readTelegramIntegerAsString(record, "id"),
    type: readString(record, "type"),
    title: readOptionalNullableStringAsNull(record, "title"),
  };
}

function readOptionalText(message: Record<string, unknown>): string | null {
  const text = readOptionalNullableString(message, "text");
  const caption = readOptionalNullableString(message, "caption");

  if (text !== undefined && text !== null) {
    return text;
  }

  if (caption !== undefined && caption !== null) {
    return caption;
  }

  return null;
}

function readMessageEntities(message: Record<string, unknown>): TelegramMessageEntityContext[] {
  const entities =
    readOptionalArray(message, "entities") ?? readOptionalArray(message, "caption_entities");

  if (entities === undefined) {
    return [];
  }

  return entities.map(readMessageEntity);
}

function readMessageEntity(value: unknown): TelegramMessageEntityContext {
  const record = readRecord(value, "telegram message entity");

  return {
    type: readString(record, "type"),
    offset: readNonNegativeInteger(record, "offset"),
    length: readNonNegativeInteger(record, "length"),
    url: readOptionalNullableString(record, "url") ?? null,
  };
}

function readReplyToMessageId(message: Record<string, unknown>): string | null {
  const replyToMessage = readProperty(message, "reply_to_message");

  if (replyToMessage === undefined || replyToMessage === null) {
    return null;
  }

  const replyRecord = readRecord(replyToMessage, "telegram reply message");

  return readTelegramIntegerAsString(replyRecord, "message_id");
}

function readAttachments(message: Record<string, unknown>): TelegramAttachmentContext[] {
  const attachments: TelegramAttachmentContext[] = [];
  const document = readProperty(message, "document");
  const photo = readOptionalArray(message, "photo");

  if (document !== undefined && document !== null) {
    attachments.push(readDocumentAttachment(document));
  }

  if (photo !== undefined && photo.length > 0) {
    attachments.push(readPhotoAttachment(photo[photo.length - 1]));
  }

  return attachments;
}

function readDocumentAttachment(value: unknown): TelegramDocumentAttachmentContext {
  const record = readRecord(value, "telegram document");

  return {
    kind: "document",
    fileId: readString(record, "file_id"),
    fileUniqueId: readOptionalNullableStringAsNull(record, "file_unique_id"),
    fileName: readOptionalNullableStringAsNull(record, "file_name"),
    mimeType: readOptionalNullableStringAsNull(record, "mime_type"),
    sizeBytes: readOptionalIntegerString(record, "file_size"),
  };
}

function readPhotoAttachment(value: unknown): TelegramPhotoAttachmentContext {
  const record = readRecord(value, "telegram photo");

  return {
    kind: "photo",
    fileId: readString(record, "file_id"),
    fileUniqueId: readOptionalNullableStringAsNull(record, "file_unique_id"),
    width: readNonNegativeInteger(record, "width"),
    height: readNonNegativeInteger(record, "height"),
    sizeBytes: readOptionalIntegerString(record, "file_size"),
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

  if (typeof value !== "string") {
    throw new TelegramUpdateParseError(`${propertyName} must be a string.`);
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

  if (value === undefined || value === null) {
    return null;
  }

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

  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    throw new TelegramUpdateParseError(`${propertyName} must be a string or null.`);
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

  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new TelegramUpdateParseError(`${propertyName} must be an array.`);
  }

  return value;
}

type ConfirmationCallbackPayload = {
  confirmationRequestId: string;
  action: TelegramConfirmationCallbackAction;
};

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
