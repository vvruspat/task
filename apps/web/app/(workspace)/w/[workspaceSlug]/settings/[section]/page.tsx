import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProfileSettings } from "../../../../../../components/profile-settings";
import { WorkspaceView } from "../../../../../../components/workspace-view";

export default async function CanonicalWorkspaceSettingsPage({
  params,
}: Readonly<{ params: Promise<{ section: string }> }>): Promise<ReactNode> {
  const { section } = await params;
  if (section === "profile") return <ProfileSettings />;
  if (section === "telegram") return <WorkspaceView kind="telegram" />;
  notFound();
}
