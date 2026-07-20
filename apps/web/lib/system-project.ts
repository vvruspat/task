import type { ProjectSummary } from "@task/api-client";

export const unprojectedIssueProjectStatus = "__system_unprojected_issues__";

export function isUnprojectedIssueProject(project: ProjectSummary): boolean {
  return project.status === unprojectedIssueProjectStatus;
}
