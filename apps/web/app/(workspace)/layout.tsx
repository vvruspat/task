import { headers } from "next/headers";
import { type ReactNode, Suspense } from "react";
import { WorkspaceLayoutBoundary } from "../../components/workspace-layout-boundary";
import { WorkspaceShellSkeleton } from "../../components/workspace-shell";
import { workspaceRequestPathHeader } from "../../lib/auth";
import { loadOptionalCurrentWorkspaceServerSnapshot } from "../../lib/server-workspace-snapshot";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactNode> {
  const requestPath = (await headers()).get(workspaceRequestPathHeader) ?? "/agent";
  const legacySnapshot = requestPath.startsWith("/w/")
    ? null
    : await loadOptionalCurrentWorkspaceServerSnapshot(null);
  return (
    <Suspense fallback={<WorkspaceShellSkeleton />}>
      <WorkspaceLayoutBoundary legacySnapshot={legacySnapshot}>{children}</WorkspaceLayoutBoundary>
    </Suspense>
  );
}
