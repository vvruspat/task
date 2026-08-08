import type { ReactNode } from "react";
import { TelegramChatSettings } from "../../../../../../../../components/telegram-chat-settings";
import { WorkspaceRouteSnapshot } from "../../../../../../../../components/workspace-route-snapshot";

export default async function TelegramChatSettingsPage({
  params,
}: Readonly<{
  params: Promise<{ connectionId: string; workspaceSlug: string }>;
}>): Promise<ReactNode> {
  const { connectionId, workspaceSlug } = await params;
  return (
    <WorkspaceRouteSnapshot workspaceSelector={workspaceSlug}>
      <TelegramChatSettings connectionId={connectionId} />
    </WorkspaceRouteSnapshot>
  );
}
