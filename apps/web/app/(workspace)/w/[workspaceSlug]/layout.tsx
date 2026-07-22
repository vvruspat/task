import type { ReactNode } from "react";
import { WorkspaceServerSnapshotBoundary } from "../../../../components/workspace-server-snapshot-boundary";
import { WorkspaceShell } from "../../../../components/workspace-shell";
import { loadOptionalCurrentWorkspaceServerSnapshot } from "../../../../lib/server-workspace-snapshot";

export default async function CanonicalWorkspaceLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}>): Promise<ReactNode> {
  const { workspaceSlug } = await params;
  const snapshot = await loadOptionalCurrentWorkspaceServerSnapshot(workspaceSlug);
  const shell = <WorkspaceShell>{children}</WorkspaceShell>;
  return snapshot === null ? (
    shell
  ) : (
    <WorkspaceServerSnapshotBoundary snapshot={snapshot}>{shell}</WorkspaceServerSnapshotBoundary>
  );
}
