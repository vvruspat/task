const hiddenInternalIdentifier = "[служебный идентификатор скрыт]";
const uuidSource = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const shortenedUuidSource = "[0-9a-f]{8}(?:-[0-9a-f]{1,4}){0,3}-(?:\\.{3}|…)";
const markdownDestinationSource = "\\]\\([^\\r\\n)]*\\)";
const markdownDestinationPattern = new RegExp(markdownDestinationSource, "giu");
const visibleInternalIdentifierPattern = new RegExp(
  `(?:${uuidSource})|(?:${shortenedUuidSource})`,
  "iu",
);
const markdownDestinationOrInternalIdentifierPattern = new RegExp(
  `${markdownDestinationSource}|(?:${uuidSource})|(?:${shortenedUuidSource})`,
  "giu",
);

export function containsVisibleInternalIdentifier(value: string): boolean {
  return visibleInternalIdentifierPattern.test(value.replace(markdownDestinationPattern, ""));
}

export function sanitizeUserFacingAgentResponse(value: string): string {
  return value.replace(markdownDestinationOrInternalIdentifierPattern, (match) =>
    match.startsWith("](") ? match : hiddenInternalIdentifier,
  );
}
