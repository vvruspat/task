import { Injectable } from "@nestjs/common";

const driveFilesEndpoint = "https://www.googleapis.com/drive/v3/files";
export const googleDriveFolderMimeType = "application/vnd.google-apps.folder";

export type GoogleDriveFolder = {
  id: string;
  name: string;
  mimeType: typeof googleDriveFolderMimeType;
  webViewLink: string | null;
  parentId: string | null;
  modifiedAt: string | null;
  version: string | null;
};

export type CreateGoogleDriveFolderInput = {
  appProperties: Readonly<Record<string, string>>;
  folderId: string;
  name: string;
  parentId: string;
};

export class GoogleDriveApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleDriveApiError";
  }
}

export class GoogleDriveFolderSelectionError extends GoogleDriveApiError {
  constructor(message: string) {
    super(message);
    this.name = "GoogleDriveFolderSelectionError";
  }
}

@Injectable()
export class GoogleDriveClient {
  async generateFileId(accessToken: string): Promise<string> {
    const url = new URL(`${driveFilesEndpoint}/generateIds`);
    url.search = new URLSearchParams({ count: "1", space: "drive", type: "files" }).toString();
    const response = await requestDrive(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new GoogleDriveApiError("Google Drive could not generate a file ID.");
    return parseGeneratedGoogleDriveFileId(payload);
  }

  async createFolder(
    accessToken: string,
    input: CreateGoogleDriveFolderInput,
  ): Promise<GoogleDriveFolder> {
    const url = new URL(driveFilesEndpoint);
    url.search = new URLSearchParams({
      fields:
        "id,name,mimeType,webViewLink,parents,modifiedTime,version,trashed,capabilities(canAddChildren)",
      supportsAllDrives: "true",
    }).toString();
    const response = await requestDrive(url, {
      body: JSON.stringify({
        appProperties: input.appProperties,
        id: input.folderId,
        mimeType: googleDriveFolderMimeType,
        name: input.name,
        parents: [input.parentId],
      }),
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 409) {
      const existing = await this.getWritableFolder(accessToken, input.folderId);
      if (existing.parentId !== input.parentId) {
        throw new GoogleDriveApiError("Reserved Google Drive folder has an unexpected parent.");
      }
      return existing;
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new GoogleDriveApiError("Google Drive folder creation failed.");
    const folder = parseGoogleDriveFolder(payload);
    if (folder.id !== input.folderId || folder.parentId !== input.parentId) {
      throw new GoogleDriveApiError("Google Drive returned unexpected folder metadata.");
    }
    return folder;
  }

  async getWritableFolder(accessToken: string, folderId: string): Promise<GoogleDriveFolder> {
    const url = new URL(`${driveFilesEndpoint}/${encodeURIComponent(folderId)}`);
    url.search = new URLSearchParams({
      fields:
        "id,name,mimeType,webViewLink,parents,modifiedTime,version,trashed,capabilities(canAddChildren)",
      supportsAllDrives: "true",
    }).toString();
    const response = await requestDrive(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status >= 500) throw new GoogleDriveApiError("Google Drive is unavailable.");
      throw new GoogleDriveFolderSelectionError("Google Drive folder is unavailable.");
    }
    return parseGoogleDriveFolder(payload);
  }
}

export function parseGeneratedGoogleDriveFileId(value: unknown): string {
  if (!isRecord(value)) throw new GoogleDriveApiError("Google Drive returned a malformed file ID.");
  const ids = value["ids"];
  if (
    !Array.isArray(ids) ||
    ids.length !== 1 ||
    typeof ids[0] !== "string" ||
    !/^[A-Za-z0-9_-]{10,1024}$/u.test(ids[0])
  ) {
    throw new GoogleDriveApiError("Google Drive returned a malformed file ID.");
  }
  return ids[0];
}

export function parseGoogleDriveFolder(value: unknown): GoogleDriveFolder {
  if (!isRecord(value)) throw invalidFolder();
  const capabilities = value["capabilities"];
  const id = value["id"];
  const mimeType = value["mimeType"];
  const modifiedTime = value["modifiedTime"];
  const name = value["name"];
  const parents = value["parents"];
  const trashed = value["trashed"];
  const version = value["version"];
  const webViewLink = value["webViewLink"];
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    id.length > 1_024 ||
    typeof name !== "string" ||
    name.length === 0 ||
    name.length > 512 ||
    mimeType !== googleDriveFolderMimeType ||
    trashed !== false ||
    !isRecord(capabilities) ||
    capabilities["canAddChildren"] !== true ||
    (webViewLink !== undefined && !isHttpsUrl(webViewLink)) ||
    (version !== undefined && typeof version !== "string") ||
    (modifiedTime !== undefined && !isIsoTimestamp(modifiedTime)) ||
    (parents !== undefined && !isStringArray(parents))
  ) {
    throw invalidFolder();
  }
  return {
    id,
    mimeType: googleDriveFolderMimeType,
    modifiedAt: modifiedTime ?? null,
    name,
    parentId: parents?.[0] ?? null,
    version: version ?? null,
    webViewLink: webViewLink ?? null,
  };
}

function invalidFolder(): GoogleDriveFolderSelectionError {
  return new GoogleDriveFolderSelectionError(
    "Selected Google Drive item is not a writable folder.",
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_096) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

async function requestDrive(input: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new GoogleDriveApiError("Google Drive is unavailable.");
  }
}
