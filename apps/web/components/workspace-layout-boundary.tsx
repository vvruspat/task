"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { WorkspaceServerSnapshot } from "../lib/workspace-server-snapshot";
import { WorkspaceServerSnapshotBoundary } from "./workspace-server-snapshot-boundary";
import { WorkspaceShell } from "./workspace-shell";

export function WorkspaceLayoutBoundary({
  children,
  legacySnapshot,
}: Readonly<{ children: ReactNode; legacySnapshot: WorkspaceServerSnapshot | null }>): ReactNode {
  const pathname = usePathname();
  if (pathname.startsWith("/w/")) return children;
  const shell = <WorkspaceShell>{children}</WorkspaceShell>;
  return legacySnapshot === null ? (
    shell
  ) : (
    <WorkspaceServerSnapshotBoundary snapshot={legacySnapshot}>
      {shell}
    </WorkspaceServerSnapshotBoundary>
  );
}
