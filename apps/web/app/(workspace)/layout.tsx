import { type ReactNode, Suspense } from "react";
import { WorkspaceShell } from "../../components/workspace-shell";

export default function WorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <Suspense fallback={null}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
