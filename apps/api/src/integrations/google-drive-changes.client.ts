import { Injectable } from "@nestjs/common";
import { GoogleDriveApiError } from "./google-drive.client.js";

const driveChangesEndpoint = "https://www.googleapis.com/drive/v3/changes";
const driveChannelsStopEndpoint = "https://www.googleapis.com/drive/v3/channels/stop";

export type GoogleDriveChangeChannel = {
  expiration: Date;
  id: string;
  resourceId: string;
  resourceUri: string;
};

export type WatchGoogleDriveChangesInput = {
  callbackUrl: string;
  channelId: string;
  channelToken: string;
  expiresAt: Date;
  pageToken: string;
};

export type GoogleDriveChangedFile = {
  id: string;
  mimeType: string | null;
  modifiedAt: string | null;
  name: string | null;
  parentId: string | null;
  trashed: boolean;
  version: string | null;
  webViewLink: string | null;
};

export type GoogleDriveChange = {
  file: GoogleDriveChangedFile | null;
  fileId: string;
  removed: boolean;
  time: string;
};

export type GoogleDriveChangePage = {
  changes: readonly GoogleDriveChange[];
  newStartPageToken: string | null;
  nextPageToken: string | null;
};

@Injectable()
export class GoogleDriveChangesClient {
  async getStartPageToken(accessToken: string): Promise<string> {
    const url = new URL(`${driveChangesEndpoint}/startPageToken`);
    url.search = new URLSearchParams({ supportsAllDrives: "true" }).toString();
    const response = await requestDrive(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new GoogleDriveApiError("Google Drive change cursor is unavailable.");
    return parseGoogleDriveStartPageToken(payload);
  }

  async watchChanges(
    accessToken: string,
    input: WatchGoogleDriveChangesInput,
  ): Promise<GoogleDriveChangeChannel> {
    const url = new URL(`${driveChangesEndpoint}/watch`);
    url.search = new URLSearchParams({
      includeItemsFromAllDrives: "true",
      includeRemoved: "true",
      pageToken: input.pageToken,
      spaces: "drive",
      supportsAllDrives: "true",
    }).toString();
    const response = await requestDrive(url, {
      body: JSON.stringify({
        address: input.callbackUrl,
        expiration: input.expiresAt.getTime().toString(),
        id: input.channelId,
        token: input.channelToken,
        type: "web_hook",
      }),
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new GoogleDriveApiError("Google Drive change watch creation failed.");
    const channel = parseGoogleDriveChangeChannel(payload);
    if (channel.id !== input.channelId) {
      throw new GoogleDriveApiError("Google Drive returned an unexpected change channel.");
    }
    return channel;
  }

  async listChanges(accessToken: string, pageToken: string): Promise<GoogleDriveChangePage> {
    const url = new URL(driveChangesEndpoint);
    url.search = new URLSearchParams({
      fields:
        "changes(fileId,removed,time,file(id,name,mimeType,modifiedTime,version,webViewLink,parents,trashed)),nextPageToken,newStartPageToken",
      includeItemsFromAllDrives: "true",
      includeRemoved: "true",
      pageSize: "1000",
      pageToken,
      spaces: "drive",
      supportsAllDrives: "true",
    }).toString();
    const response = await requestDrive(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new GoogleDriveApiError("Google Drive changes are unavailable.");
    return parseGoogleDriveChangePage(payload);
  }

  async stopChannel(accessToken: string, channelId: string, resourceId: string): Promise<void> {
    const response = await requestDrive(new URL(driveChannelsStopEndpoint), {
      body: JSON.stringify({ id: channelId, resourceId }),
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new GoogleDriveApiError("Google Drive change channel stop failed.");
  }
}

export function parseGoogleDriveStartPageToken(value: unknown): string {
  if (!isRecord(value)) throw invalidChangesPayload();
  return readToken(value["startPageToken"]);
}

export function parseGoogleDriveChangeChannel(value: unknown): GoogleDriveChangeChannel {
  if (!isRecord(value)) throw invalidChangesPayload();
  const expiration = readIntegerString(value["expiration"]);
  const id = readBoundedString(value["id"], 64);
  const resourceId = readBoundedString(value["resourceId"], 1_024);
  const resourceUri = readHttpsUrl(value["resourceUri"]);
  const expirationDate = new Date(Number(expiration));
  if (!Number.isFinite(expirationDate.getTime())) throw invalidChangesPayload();
  return { expiration: expirationDate, id, resourceId, resourceUri };
}

export function parseGoogleDriveChangePage(value: unknown): GoogleDriveChangePage {
  if (!isRecord(value) || !Array.isArray(value["changes"])) throw invalidChangesPayload();
  const nextPageToken = readOptionalToken(value["nextPageToken"]);
  const newStartPageToken = readOptionalToken(value["newStartPageToken"]);
  if (nextPageToken === null && newStartPageToken === null) throw invalidChangesPayload();
  return {
    changes: value["changes"].map(parseGoogleDriveChange),
    newStartPageToken,
    nextPageToken,
  };
}

function parseGoogleDriveChange(value: unknown): GoogleDriveChange {
  if (!isRecord(value)) throw invalidChangesPayload();
  const fileValue = value["file"];
  return {
    file: fileValue === undefined ? null : parseGoogleDriveChangedFile(fileValue),
    fileId: readBoundedString(value["fileId"], 1_024),
    removed: value["removed"] === true,
    time: readIsoTimestamp(value["time"]),
  };
}

function parseGoogleDriveChangedFile(value: unknown): GoogleDriveChangedFile {
  if (!isRecord(value)) throw invalidChangesPayload();
  const parents = value["parents"];
  if (parents !== undefined && !isStringArray(parents)) throw invalidChangesPayload();
  return {
    id: readBoundedString(value["id"], 1_024),
    mimeType: readOptionalBoundedString(value["mimeType"], 255),
    modifiedAt: readOptionalIsoTimestamp(value["modifiedTime"]),
    name: readOptionalBoundedString(value["name"], 512),
    parentId: parents?.[0] ?? null,
    trashed: value["trashed"] === true,
    version: readOptionalIntegerString(value["version"]),
    webViewLink: value["webViewLink"] === undefined ? null : readHttpsUrl(value["webViewLink"]),
  };
}

function readToken(value: unknown): string {
  return readBoundedString(value, 4_096);
}

function readOptionalToken(value: unknown): string | null {
  return value === undefined ? null : readToken(value);
}

function readIntegerString(value: unknown): string {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === "string" && /^\d{1,32}$/u.test(value)) return value;
  throw invalidChangesPayload();
}

function readOptionalIntegerString(value: unknown): string | null {
  return value === undefined ? null : readIntegerString(value);
}

function readBoundedString(value: unknown, maxLength: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw invalidChangesPayload();
  }
  return value;
}

function readOptionalBoundedString(value: unknown, maxLength: number): string | null {
  return value === undefined ? null : readBoundedString(value, maxLength);
}

function readIsoTimestamp(value: unknown): string {
  const timestamp = readBoundedString(value, 64);
  if (!Number.isFinite(Date.parse(timestamp))) throw invalidChangesPayload();
  return timestamp;
}

function readOptionalIsoTimestamp(value: unknown): string | null {
  return value === undefined ? null : readIsoTimestamp(value);
}

function readHttpsUrl(value: unknown): string {
  const candidate = readBoundedString(value, 4_096);
  try {
    if (new URL(candidate).protocol === "https:") return candidate;
  } catch {
    // Converted to a provider error below.
  }
  throw invalidChangesPayload();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function invalidChangesPayload(): GoogleDriveApiError {
  return new GoogleDriveApiError("Google Drive returned malformed change metadata.");
}

async function requestDrive(input: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new GoogleDriveApiError("Google Drive is unavailable.");
  }
}
