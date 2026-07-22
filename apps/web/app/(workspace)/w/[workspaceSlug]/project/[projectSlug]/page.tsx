import { WorkspaceRouteSnapshot } from "../../../../../../components/workspace-route-snapshot";
import { WorkspaceView } from "../../../../../../components/workspace-view";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ projectSlug: string; workspaceSlug: string }> }>) {
  const { projectSlug, workspaceSlug } = await params;
  return (
    <WorkspaceRouteSnapshot workspaceSelector={workspaceSlug}>
      <WorkspaceView kind="project" projectSlug={projectSlug} />
    </WorkspaceRouteSnapshot>
  );
}
