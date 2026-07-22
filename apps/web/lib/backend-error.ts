export function readBackendErrorMessage(responseBody: string | null): string | null {
  if (responseBody === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(responseBody);
  } catch {
    return null;
  }
  return typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.length > 0
    ? value.message
    : null;
}
