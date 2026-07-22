const maxJsonDepth = 12;
const maxCollectionSize = 1_000;

export function isBoundedIntegrationToolJsonObject(
  value: unknown,
  maxBytes: number,
): value is Record<string, unknown> {
  if (!isPlainRecord(value) || !isJsonValue(value, 0, new Set<unknown>())) return false;
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <= maxBytes;
  } catch {
    return false;
  }
}

function isJsonValue(value: unknown, depth: number, ancestors: Set<unknown>): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (depth >= maxJsonDepth || typeof value !== "object") return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  const valid = Array.isArray(value)
    ? value.length <= maxCollectionSize &&
      value.every((item) => isJsonValue(item, depth + 1, ancestors))
    : isPlainRecord(value) &&
      Object.keys(value).length <= maxCollectionSize &&
      Object.values(value).every((item) => isJsonValue(item, depth + 1, ancestors));
  ancestors.delete(value);
  return valid;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
