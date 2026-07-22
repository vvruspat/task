import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AgentPage } from "../../../../../components/agent-chat";
import { NotificationsPage } from "../../../../../components/notifications-page";
import { SavedViewsPage } from "../../../../../components/saved-views-page";
import { TemplatesPage } from "../../../../../components/templates-page";
import { WorkspaceView } from "../../../../../components/workspace-view";

export default async function CanonicalWorkspacePage({
  params,
}: Readonly<{ params: Promise<{ page: string }> }>): Promise<ReactNode> {
  const { page } = await params;
  if (page === "agent" || page === "agent-history") return <AgentPage />;
  if (page === "notifications") return <NotificationsPage />;
  if (page === "projects") return <WorkspaceView kind="projects" />;
  if (page === "views") return <SavedViewsPage />;
  if (page === "templates") return <TemplatesPage />;
  if (page === "settings") return <WorkspaceView kind="settings" />;
  if (page === "kanban") return <WorkspaceView kind="kanban" />;
  notFound();
}
