import { SavedViewsPage } from "../../../../../../components/saved-views-page";
import { WorkspaceRouteSnapshot } from "../../../../../../components/workspace-route-snapshot";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ viewSlug: string; workspaceSlug: string }> }>) {
  const { viewSlug, workspaceSlug } = await params;
  return (
    <WorkspaceRouteSnapshot workspaceSelector={workspaceSlug}>
      <SavedViewsPage viewSlug={viewSlug} />
    </WorkspaceRouteSnapshot>
  );
}
