export type GoogleDriveWebhookHeaders = Record<string, string | readonly string[] | undefined>;

export type GoogleDriveWebhookNotification = {
  channelId: string;
  channelToken: string;
  changed: string | null;
  expiration: string | null;
  messageNumber: string;
  resourceId: string;
  resourceState: string;
  resourceUri: string;
};

export class InvalidGoogleDriveWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGoogleDriveWebhookError";
  }
}

export function parseGoogleDriveWebhookHeaders(
  headers: GoogleDriveWebhookHeaders,
): GoogleDriveWebhookNotification {
  return {
    channelId: readHeader(headers, "x-goog-channel-id", 128),
    channelToken: readChannelToken(headers),
    changed: readOptionalHeader(headers, "x-goog-changed", 1_024),
    expiration: readOptionalHeader(headers, "x-goog-channel-expiration", 128),
    messageNumber: readMessageNumber(headers),
    resourceId: readHeader(headers, "x-goog-resource-id", 1_024),
    resourceState: readHeader(headers, "x-goog-resource-state", 128),
    resourceUri: readHttpsHeader(headers, "x-goog-resource-uri"),
  };
}

export function safeGoogleDriveWebhookHeaders(
  notification: GoogleDriveWebhookNotification,
): Record<string, unknown> {
  return {
    channelId: notification.channelId,
    changed: notification.changed,
    expiration: notification.expiration,
    messageNumber: notification.messageNumber,
    resourceId: notification.resourceId,
    resourceState: notification.resourceState,
    resourceUri: notification.resourceUri,
  };
}

function readChannelToken(headers: GoogleDriveWebhookHeaders): string {
  const value = readHeader(headers, "x-goog-channel-token", 256);
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value)) throw invalidHeader("x-goog-channel-token");
  return value;
}

function readMessageNumber(headers: GoogleDriveWebhookHeaders): string {
  const value = readHeader(headers, "x-goog-message-number", 32);
  if (!/^\d+$/u.test(value)) throw invalidHeader("x-goog-message-number");
  return value;
}

function readHttpsHeader(headers: GoogleDriveWebhookHeaders, name: string): string {
  const value = readHeader(headers, name, 4_096);
  try {
    if (new URL(value).protocol === "https:") return value;
  } catch {
    // Converted to a boundary validation error below.
  }
  throw invalidHeader(name);
}

function readOptionalHeader(
  headers: GoogleDriveWebhookHeaders,
  name: string,
  maxLength: number,
): string | null {
  const value = headers[name];
  if (value === undefined) return null;
  return readSingleValue(value, name, maxLength);
}

function readHeader(headers: GoogleDriveWebhookHeaders, name: string, maxLength: number): string {
  const value = headers[name];
  if (value === undefined) throw invalidHeader(name);
  return readSingleValue(value, name, maxLength);
}

function readSingleValue(
  value: string | readonly string[],
  name: string,
  maxLength: number,
): string {
  const candidate = typeof value === "string" ? value : value.length === 1 ? value[0] : undefined;
  if (candidate === undefined || candidate.length === 0 || candidate.length > maxLength) {
    throw invalidHeader(name);
  }
  return candidate;
}

function invalidHeader(name: string): InvalidGoogleDriveWebhookError {
  return new InvalidGoogleDriveWebhookError(`Invalid Google Drive webhook header ${name}.`);
}
