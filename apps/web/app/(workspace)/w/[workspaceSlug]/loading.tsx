import type { ReactNode } from "react";
import { WorkspaceRouteSkeleton } from "../../../../components/workspace-shell";

export default function Loading(): ReactNode {
  return <WorkspaceRouteSkeleton />;
}
