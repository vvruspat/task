"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { hydrateWorkspaceServerSnapshot } from "../lib/use-workspace-data";
import type { WorkspaceServerSnapshot } from "../lib/workspace-server-snapshot";
import { WorkspaceServerSnapshotContext } from "../lib/workspace-server-snapshot-context";

export function WorkspaceServerSnapshotBoundary({
  children,
  snapshot,
}: Readonly<{ children: ReactNode; snapshot: WorkspaceServerSnapshot }>): ReactNode {
  useLayoutEffect(() => hydrateWorkspaceServerSnapshot(snapshot), [snapshot]);
  return (
    <WorkspaceServerSnapshotContext.Provider value={snapshot}>
      {children}
    </WorkspaceServerSnapshotContext.Provider>
  );
}
