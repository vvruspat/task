import type { ReactNode } from "react";
import { loadOptionalCurrentWorkspaceServerSnapshot } from "../lib/server-workspace-snapshot";
import { WorkspaceServerSnapshotBoundary } from "./workspace-server-snapshot-boundary";

export async function WorkspaceRouteSnapshot({
  children,
  workspaceSelector,
}: Readonly<{ children: ReactNode; workspaceSelector: string | null }>): Promise<ReactNode> {
  const snapshot = await loadOptionalCurrentWorkspaceServerSnapshot(workspaceSelector);
  if (snapshot === null) return children;
  return (
    <WorkspaceServerSnapshotBoundary snapshot={snapshot}>
      {children}
    </WorkspaceServerSnapshotBoundary>
  );
}
