import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import type { AttachmentKind } from "../persistence/types/core-persistence.types.js";
import type { AttachmentContentConfig } from "./integrations.config.js";

const fallbackMimeType = "application/octet-stream";
const maxFileNameLength = 240;
const safeMimeTypePattern = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;

export const attachmentContentProviderToken = Symbol("AttachmentContentProvider");

export type AttachmentContentSource = {
  id: string;
  kind: AttachmentKind;
  mimeType: string | null;
  sizeBytes: string | null;
  storageKey: string | null;
  telegramFileId: string | null;
  title: string | null;
};

export type AttachmentContent = {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export interface AttachmentContentProvider {
  read(source: AttachmentContentSource): Promise<AttachmentContent | null>;
}

export class AttachmentContentUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentContentUnavailableError";
  }
}

export class LocalAttachmentContentProvider implements AttachmentContentProvider {
  constructor(private readonly config: AttachmentContentConfig) {}

  async read(source: AttachmentContentSource): Promise<AttachmentContent | null> {
    if (source.kind !== "file") return null;
    if (source.storageKey === null) {
      throw new AttachmentContentUnavailableError(
        `File attachment ${source.id} has no storage key.`,
      );
    }
    if (this.config.storageRoot === null) {
      throw new AttachmentContentUnavailableError(
        "ATTACHMENT_STORAGE_ROOT is required to export file attachments.",
      );
    }

    try {
      const rootPath = await realpath(this.config.storageRoot);
      const requestedPath = resolve(rootPath, source.storageKey);
      const filePath = await realpath(requestedPath);
      assertContainedPath(rootPath, filePath);

      const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const stats = await handle.stat({ bigint: true });
        if (!stats.isFile()) {
          throw new AttachmentContentUnavailableError(
            `Attachment content ${source.id} is not a regular file.`,
          );
        }
        assertExpectedSize(source, stats.size);
        if (stats.size > BigInt(this.config.maxBytes)) {
          throw new AttachmentContentUnavailableError(
            `Attachment ${source.id} exceeds the ${this.config.maxBytes}-byte export limit.`,
          );
        }
        const bytes = await handle.readFile();
        return {
          bytes,
          fileName: buildAttachmentFileName(source, filePath),
          mimeType: normalizeAttachmentMimeType(source.mimeType),
          sizeBytes: bytes.byteLength,
        };
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (error instanceof AttachmentContentUnavailableError) throw error;
      throw new AttachmentContentUnavailableError(
        `Content for attachment ${source.id} is unavailable.`,
      );
    }
  }
}

export function buildAttachmentFileName(
  source: Pick<AttachmentContentSource, "id" | "title">,
  filePath: string,
): string {
  const candidate = source.title?.trim() || basename(filePath);
  const sanitized = Array.from(candidate, (character) => {
    const codePoint = character.codePointAt(0);
    return character === "/" ||
      character === "\\" ||
      (codePoint !== undefined && (codePoint <= 31 || codePoint === 127))
      ? " "
      : character;
  })
    .join("")
    .replace(/\s+/gu, " ")
    .trim();
  return (sanitized || `attachment-${source.id}`).slice(0, maxFileNameLength);
}

export function normalizeAttachmentMimeType(value: string | null): string {
  return value !== null && value.length <= 255 && safeMimeTypePattern.test(value)
    ? value
    : fallbackMimeType;
}

function assertContainedPath(rootPath: string, filePath: string): void {
  const relativePath = relative(rootPath, filePath);
  if (
    relativePath.length === 0 ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new AttachmentContentUnavailableError(
      "Attachment storage key resolves outside the configured storage root.",
    );
  }
}

function assertExpectedSize(source: AttachmentContentSource, actualSize: bigint): void {
  if (source.sizeBytes === null) return;
  if (!/^\d+$/u.test(source.sizeBytes) || BigInt(source.sizeBytes) !== actualSize) {
    throw new AttachmentContentUnavailableError(
      `Attachment ${source.id} content size does not match its metadata.`,
    );
  }
}
