export function issueIdentifier(projectKey: string, number: number): string {
  return `${projectKey}-${number}`;
}

export function issueTitleSlug(title: string): string {
  const slug = title
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug.length === 0 ? "issue" : slug;
}

export function issueHref(projectKey: string, number: number, title: string): string {
  const identifier = issueIdentifier(projectKey, number);
  return `/issue/${identifier}/${encodeURIComponent(issueTitleSlug(title))}`;
}

export function isCanonicalIssueRoute(
  identifier: string,
  slug: string | null,
  projectKey: string,
  number: number,
  title: string,
): boolean {
  return (
    decodeIssueRouteSegment(identifier) === issueIdentifier(projectKey, number) &&
    slug !== null &&
    decodeIssueRouteSegment(slug) === issueTitleSlug(title)
  );
}

function decodeIssueRouteSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
