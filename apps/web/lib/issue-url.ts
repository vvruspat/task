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
