import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";

const resourcesEndpoint = "https://cloud-api.yandex.net/v1/disk/resources";
export const yandexDiskFolderMimeType = "application/vnd.yandex.disk.directory";

export type YandexDiskResource = {
  id: string;
  md5: string | null;
  mimeType: string;
  modifiedAt: string | null;
  name: string;
  parentId: string | null;
  path: string;
  resourceType: "file" | "folder";
  sizeBytes: number | null;
  version: string | null;
  webUrl: string;
};

export type YandexDiskFolderPage = {
  items: readonly YandexDiskResource[];
  nextOffset: number | null;
};

export class YandexDiskApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YandexDiskApiError";
  }
}

export class YandexDiskFolderSelectionError extends YandexDiskApiError {
  constructor(message: string) {
    super(message);
    this.name = "YandexDiskFolderSelectionError";
  }
}

@Injectable()
export class YandexDiskClient {
  async getWritableFolder(accessToken: string, inputPath: string): Promise<YandexDiskResource> {
    const path = normalizeYandexDiskPath(inputPath);
    const response = await requestYandexDisk(resourceUrl(path), accessToken, {
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status >= 500) throw new YandexDiskApiError("Yandex Disk is unavailable.");
      throw new YandexDiskFolderSelectionError("Yandex Disk folder is unavailable.");
    }
    const resource = parseYandexDiskResource(payload);
    if (resource.resourceType !== "folder") {
      throw new YandexDiskFolderSelectionError("Selected Yandex Disk resource is not a folder.");
    }
    return resource;
  }

  async createFolder(
    accessToken: string,
    parentPath: string,
    name: string,
  ): Promise<YandexDiskResource> {
    const path = joinYandexDiskPath(parentPath, name);
    const response = await requestYandexDisk(resourceUrl(path), accessToken, {
      method: "PUT",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok && response.status !== 409) {
      throw new YandexDiskApiError("Yandex Disk folder creation failed.");
    }
    const folder = await this.getWritableFolder(accessToken, path);
    if (folder.path !== path)
      throw new YandexDiskApiError("Yandex Disk returned an unexpected folder.");
    return folder;
  }

  async getResource(accessToken: string, inputPath: string): Promise<YandexDiskResource> {
    const path = normalizeYandexDiskPath(inputPath);
    const response = await requestYandexDisk(resourceUrl(path), accessToken, {
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new YandexDiskApiError("Yandex Disk resource is unavailable.");
    return parseYandexDiskResource(payload);
  }

  async uploadFile(
    accessToken: string,
    input: { bytes: Uint8Array; mimeType: string; name: string; parentPath: string },
  ): Promise<YandexDiskResource> {
    const path = joinYandexDiskPath(input.parentPath, input.name);
    const url = new URL(`${resourcesEndpoint}/upload`);
    url.search = new URLSearchParams({ overwrite: "false", path }).toString();
    const linkResponse = await requestYandexDisk(url, accessToken, {
      signal: AbortSignal.timeout(15_000),
    });
    if (linkResponse.status === 409) {
      return await this.assertExistingUpload(accessToken, path, input.bytes, input.mimeType);
    }
    const linkPayload: unknown = await linkResponse.json().catch(() => null);
    if (!linkResponse.ok) throw new YandexDiskApiError("Yandex Disk upload URL is unavailable.");
    const uploadUrl = parseUploadUrl(linkPayload);
    let uploadResponse: Response;
    try {
      uploadResponse = await fetch(uploadUrl, {
        body: new Uint8Array(input.bytes),
        headers: { "content-type": input.mimeType },
        method: "PUT",
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new YandexDiskApiError("Yandex Disk file upload failed.");
    }
    if (!uploadResponse.ok) throw new YandexDiskApiError("Yandex Disk file upload failed.");
    return await this.getResource(accessToken, path);
  }

  async listFolder(
    accessToken: string,
    inputPath: string,
    offset: number,
  ): Promise<YandexDiskFolderPage> {
    const path = normalizeYandexDiskPath(inputPath);
    const limit = 1000;
    const url = resourceUrl(path);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("sort", "created");
    const response = await requestYandexDisk(url, accessToken, {
      signal: AbortSignal.timeout(30_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new YandexDiskApiError("Yandex Disk folder contents are unavailable.");
    return parseYandexDiskFolderPage(payload, offset, limit);
  }

  private async assertExistingUpload(
    accessToken: string,
    path: string,
    bytes: Uint8Array,
    mimeType: string,
  ): Promise<YandexDiskResource> {
    const existing = await this.getResource(accessToken, path);
    const digest = createHash("md5").update(bytes).digest("hex");
    if (
      existing.resourceType !== "file" ||
      existing.sizeBytes !== bytes.byteLength ||
      existing.md5 !== digest ||
      existing.mimeType !== mimeType
    ) {
      throw new YandexDiskApiError("Yandex Disk already contains a different file at this path.");
    }
    return existing;
  }
}

export function normalizeYandexDiskPath(value: string): string {
  const withScheme = value.startsWith("disk:/") ? value : `disk:${value}`;
  const parts = withScheme
    .slice("disk:/".length)
    .split("/")
    .filter((part) => part.length > 0 && part !== ".");
  if (parts.some((part) => part === ".."))
    throw new YandexDiskFolderSelectionError("Yandex Disk path is invalid.");
  return parts.length === 0 ? "disk:/" : `disk:/${parts.join("/")}`;
}

export function joinYandexDiskPath(parentPath: string, name: string): string {
  const parent = normalizeYandexDiskPath(parentPath);
  if (name.length === 0 || name.includes("/") || name === "." || name === "..") {
    throw new YandexDiskApiError("Yandex Disk resource name is invalid.");
  }
  return `${parent === "disk:/" ? parent : `${parent}/`}${name}`;
}

export function buildYandexDiskWebUrl(path: string): string {
  const normalized = normalizeYandexDiskPath(path);
  const relative = normalized.slice("disk:/".length);
  if (relative.length === 0) return "https://disk.yandex.ru/client/disk";
  return `https://disk.yandex.ru/client/disk/${relative
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export function parseYandexDiskResource(value: unknown): YandexDiskResource {
  if (!isRecord(value)) throw malformedResource();
  const name = value["name"];
  const path = value["path"];
  const type = value["type"];
  const mimeType = value["mime_type"];
  const modified = value["modified"];
  const revision = value["revision"];
  const resourceId = value["resource_id"];
  const md5 = value["md5"];
  const size = value["size"];
  if (
    typeof name !== "string" ||
    name.length === 0 ||
    name.length > 512 ||
    typeof path !== "string" ||
    path.length === 0 ||
    path.length > 1_024 ||
    (type !== "dir" && type !== "file") ||
    (mimeType !== undefined && typeof mimeType !== "string") ||
    (modified !== undefined && !isIsoTimestamp(modified)) ||
    (revision !== undefined && typeof revision !== "string" && typeof revision !== "number") ||
    (resourceId !== undefined && typeof resourceId !== "string") ||
    (md5 !== undefined && typeof md5 !== "string") ||
    (size !== undefined && (typeof size !== "number" || !Number.isSafeInteger(size) || size < 0))
  ) {
    throw malformedResource();
  }
  const normalizedPath = normalizeYandexDiskPath(path);
  const parentPath = parentYandexDiskPath(normalizedPath);
  return {
    id: normalizedPath,
    md5: md5 ?? null,
    mimeType:
      type === "dir"
        ? yandexDiskFolderMimeType
        : mimeType === undefined || mimeType.length === 0
          ? "application/octet-stream"
          : mimeType,
    modifiedAt: modified ?? null,
    name,
    parentId: parentPath,
    path: normalizedPath,
    resourceType: type === "dir" ? "folder" : "file",
    sizeBytes: size ?? null,
    version: revision === undefined ? null : String(revision),
    webUrl: buildYandexDiskWebUrl(normalizedPath),
  };
}

export function parseYandexDiskFolderPage(
  value: unknown,
  offset: number,
  limit: number,
): YandexDiskFolderPage {
  if (!isRecord(value) || !isRecord(value["_embedded"])) throw malformedResource();
  const items = value["_embedded"]["items"];
  const total = value["_embedded"]["total"];
  if (
    !Array.isArray(items) ||
    typeof total !== "number" ||
    !Number.isSafeInteger(total) ||
    total < 0
  ) {
    throw malformedResource();
  }
  const parsed = items.map(parseYandexDiskResource);
  if (parsed.length > limit) throw malformedResource();
  return {
    items: parsed,
    nextOffset: offset + parsed.length < total ? offset + parsed.length : null,
  };
}

function parentYandexDiskPath(path: string): string | null {
  if (path === "disk:/") return null;
  const index = path.lastIndexOf("/");
  return index <= "disk:".length ? "disk:/" : path.slice(0, index);
}

function resourceUrl(path: string): URL {
  const url = new URL(resourcesEndpoint);
  url.search = new URLSearchParams({ path }).toString();
  return url;
}

function parseUploadUrl(value: unknown): string {
  if (!isRecord(value) || typeof value["href"] !== "string") {
    throw new YandexDiskApiError("Yandex Disk returned a malformed upload URL.");
  }
  try {
    const url = new URL(value["href"]);
    if (url.protocol !== "https:") throw new Error("Unexpected upload protocol.");
    return url.toString();
  } catch {
    throw new YandexDiskApiError("Yandex Disk returned a malformed upload URL.");
  }
}

function malformedResource(): YandexDiskApiError {
  return new YandexDiskApiError("Yandex Disk returned malformed resource metadata.");
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function requestYandexDisk(
  input: URL,
  accessToken: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      headers: { ...init.headers, authorization: `OAuth ${accessToken}` },
    });
  } catch {
    throw new YandexDiskApiError("Yandex Disk is unavailable.");
  }
}
