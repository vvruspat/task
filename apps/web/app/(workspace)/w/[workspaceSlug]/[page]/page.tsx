import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AgentPage } from "../../../../../components/agent-chat";
import { NotificationsPage } from "../../../../../components/notifications-page";
import { SavedViewsPage } from "../../../../../components/saved-views-page";
import { TemplatesPage } from "../../../../../components/templates-page";
import { WorkspaceRouteSnapshot } from "../../../../../components/workspace-route-snapshot";
import { WorkspaceView } from "../../../../../components/workspace-view";

export default async function CanonicalWorkspacePage({
  params,
}: Readonly<{ params: Promise<{ page: string; workspaceSlug: string }> }>): Promise<ReactNode> {
  const { page, workspaceSlug } = await params;
  let content: ReactNode;
  if (page === "agent" || page === "agent-history") content = <AgentPage />;
  else if (page === "notifications") content = <NotificationsPage />;
  else if (page === "projects") content = <WorkspaceView kind="projects" />;
  else if (page === "views") content = <SavedViewsPage />;
  else if (page === "templates") content = <TemplatesPage />;
  else if (page === "settings") content = <WorkspaceView kind="settings" />;
  else if (page === "kanban") content = <WorkspaceView kind="kanban" />;
  else notFound();
  return (
    <WorkspaceRouteSnapshot workspaceSelector={workspaceSlug}>{content}</WorkspaceRouteSnapshot>
  );
}
