import { WorkspaceView } from "../../../../components/workspace-view";
export default async function Page({
  params,
}: Readonly<{ params: Promise<{ projectId: string }> }>) {
  const { projectId } = await params;
  return <WorkspaceView kind="project" projectId={projectId} />;
}
