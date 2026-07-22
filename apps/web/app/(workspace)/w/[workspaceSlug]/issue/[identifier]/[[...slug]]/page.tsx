import { IssuePage } from "../../../../../../../components/issue-page";
import { WorkspaceRouteSnapshot } from "../../../../../../../components/workspace-route-snapshot";

export default async function Page({
  params,
}: Readonly<{
  params: Promise<{ workspaceSlug: string; identifier: string; slug?: string[] }>;
}>) {
  const { workspaceSlug, identifier, slug } = await params;
  return (
    <WorkspaceRouteSnapshot workspaceSelector={workspaceSlug}>
      <IssuePage workspaceSlug={workspaceSlug} identifier={identifier} slug={slug?.at(0) ?? null} />
    </WorkspaceRouteSnapshot>
  );
}
