import { WorkspaceView } from "../../../../../../components/workspace-view";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ projectSlug: string }> }>) {
  const { projectSlug } = await params;
  return <WorkspaceView kind="project" projectSlug={projectSlug} />;
}
