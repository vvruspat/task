import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProfileSettings } from "../../../../../../components/profile-settings";
import { WorkspaceRouteSnapshot } from "../../../../../../components/workspace-route-snapshot";
import { WorkspaceView } from "../../../../../../components/workspace-view";

export default async function CanonicalWorkspaceSettingsPage({
  params,
}: Readonly<{
  params: Promise<{ section: string; workspaceSlug: string }>;
}>): Promise<ReactNode> {
  const { section, workspaceSlug } = await params;
  let content: ReactNode;
  if (section === "profile") content = <ProfileSettings />;
  else if (section === "telegram") content = <WorkspaceView kind="telegram" />;
  else notFound();
  return (
    <WorkspaceRouteSnapshot workspaceSelector={workspaceSlug}>{content}</WorkspaceRouteSnapshot>
  );
}
