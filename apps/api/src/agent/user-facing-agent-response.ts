const hiddenInternalIdentifier = "[служебный идентификатор скрыт]";
const markdownDestinationOrUuidPattern =
  /\]\([^\r\n)]*\)|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/giu;

export function sanitizeUserFacingAgentResponse(value: string): string {
  return value.replace(markdownDestinationOrUuidPattern, (match) =>
    match.startsWith("](") ? match : hiddenInternalIdentifier,
  );
}
