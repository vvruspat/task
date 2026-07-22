import { createHash } from "node:crypto";

const driveUrlPattern = /https:\/\/(?:docs|drive)\.google\.com\/[^\s<>"']+/giu;
const maxReferencesPerSource = 100;

export type GoogleDriveReference = {
  providerResourceId: string;
  url: string;
  urlHash: string;
};

export function extractGoogleDriveReferences(text: string): GoogleDriveReference[] {
  const references = new Map<string, GoogleDriveReference>();
  for (const match of text.matchAll(driveUrlPattern)) {
    const rawUrl = trimTrailingUrlPunctuation(match[0]);
    const parsed = parseGoogleDriveUrl(rawUrl);
    if (parsed === null || references.has(parsed.providerResourceId)) continue;
    references.set(parsed.providerResourceId, parsed);
    if (references.size >= maxReferencesPerSource) break;
  }
  return [...references.values()];
}

export function parseGoogleDriveUrl(value: string): GoogleDriveReference | null {
  if (value.length === 0 || value.length > 4_096) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const segments = url.pathname.split("/").filter(Boolean);
  let providerResourceId: string | null = null;
  if (url.hostname === "drive.google.com") {
    if (segments[0] === "file" && segments[1] === "d") providerResourceId = segments[2] ?? null;
    else if (segments[0] === "drive" && segments[1] === "folders") {
      providerResourceId = segments[2] ?? null;
    } else if (segments[0] === "open" || segments[0] === "uc" || segments[0] === "folderview") {
      providerResourceId = url.searchParams.get("id");
    }
  } else if (
    url.hostname === "docs.google.com" &&
    ["document", "drawings", "forms", "presentation", "spreadsheets"].includes(segments[0] ?? "") &&
    segments[1] === "d"
  ) {
    providerResourceId = segments[2] ?? null;
  }
  if (providerResourceId === null || !/^[A-Za-z0-9_-]{10,1024}$/u.test(providerResourceId)) {
    return null;
  }
  const canonicalUrl = `https://drive.google.com/open?id=${encodeURIComponent(providerResourceId)}`;
  return {
    providerResourceId,
    url: canonicalUrl,
    urlHash: createHash("sha256").update(canonicalUrl, "utf8").digest("hex"),
  };
}

function trimTrailingUrlPunctuation(value: string): string {
  return value.replace(/[),.;:!?\]}]+$/gu, "");
}
