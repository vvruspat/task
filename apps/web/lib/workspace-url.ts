import { issueIdentifier, issueTitleSlug } from "./issue-url";

function segment(value: string): string {
  return encodeURIComponent(value);
}

export function workspaceProjectHref(workspaceSlug: string, projectSlug: string): string {
  return `/w/${segment(workspaceSlug)}/project/${segment(projectSlug)}`;
}

export function workspaceViewHref(workspaceSlug: string, viewSlug: string): string {
  return `/w/${segment(workspaceSlug)}/view/${segment(viewSlug)}`;
}

export function workspaceIssueHref(
  workspaceSlug: string,
  projectKey: string,
  number: number,
  title: string,
): string {
  return `/w/${segment(workspaceSlug)}/issue/${segment(issueIdentifier(projectKey, number))}/${segment(issueTitleSlug(title))}`;
}
