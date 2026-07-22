"use client";

import { Badge, Button, Card, Flex, Text } from "@radix-ui/themes";
import { MarkdownContent } from "@task/ui";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { localizeWorkspaceError } from "../lib/i18n/errors";
import { useI18n } from "../lib/i18n/i18n";
import type { MessageKey } from "../lib/i18n/messages";
import { updateWorkspaceData, useWorkspaceData } from "../lib/use-workspace-data";
import {
  canManageWorkspaceSettings,
  isApiFailure,
  type ProjectData,
  type WorkspaceBootstrap,
} from "../lib/workspace-contracts";
import { useWorkspaceOverlayStore } from "../lib/workspace-overlay-store";
import { workspacePageHref, workspaceProjectHref } from "../lib/workspace-url";
import { MarkdownDescriptionEditor } from "./markdown-description-editor";
import { ProjectDangerZone } from "./project-danger-zone";
import { ProjectStatusesManager } from "./project-statuses-manager";
import { TaskStatusIndicator } from "./task-status-indicator";
import { WorkspaceDangerZone } from "./workspace-danger-zone";
import { WorkspaceIntegrations } from "./workspace-integrations";
import { WorkspaceInvitations } from "./workspace-invitations";
import { WorkspaceMembersManager } from "./workspace-members-manager";
import { WorkspaceNameEditor } from "./workspace-name-editor";
import { WorkspaceOnboarding } from "./workspace-onboarding";

export type ViewKind = "integrations" | "kanban" | "project" | "projects" | "settings" | "telegram";
const copy: Record<ViewKind, { title: MessageKey; subtitle: MessageKey }> = {
  integrations: {
    title: "integrations.title",
    subtitle: "integrations.subtitle",
  },
  projects: { title: "workspace.projectsTitle", subtitle: "workspace.projectsSubtitle" },
  project: { title: "workspace.projectTitle", subtitle: "workspace.projectSubtitle" },
  kanban: { title: "workspace.kanbanTitle", subtitle: "workspace.kanbanSubtitle" },
  settings: { title: "common.settings", subtitle: "workspace.settingsSubtitle" },
  telegram: {
    title: "workspace.telegramTitle",
    subtitle: "workspace.telegramSubtitle",
  },
};

export function WorkspaceView({
  kind,
  projectId,
  projectSlug,
}: Readonly<{ kind: ViewKind; projectId?: string; projectSlug?: string }>): ReactNode {
  const { t } = useI18n();
  const { data, error, loading, refresh, requiresWorkspace } = useWorkspaceData();
  const searchParams = useSearchParams();
  const setCreateOpen = useWorkspaceOverlayStore((state) => state.setCreateOpen);
  if (loading)
    return (
      <Card className="panel">
        <Text color="gray">{t("workspace.loading")}</Text>
      </Card>
    );
  if (requiresWorkspace) return <WorkspaceOnboarding refresh={refresh} />;
  if (error !== null || data === null)
    return (
      <Card className="panel connection-error">
        <h2>{t("workspace.backendUnavailable")}</h2>
        <p>{localizeWorkspaceError(error, t, "workspace.loadError")}</p>
        <code>TASK_API_BASE_URL=http://localhost:3000</code>
        <Button size="1" onClick={() => void refresh()}>
          {t("common.retry")}
        </Button>
      </Card>
    );
  const selectedProjectId =
    projectId ??
    data.projects.find((project) => project.slug === projectSlug)?.id ??
    data.projects.find((project) => {
      const queryProject = searchParams.get("project");
      return project.id === queryProject || project.slug === queryProject;
    })?.id ??
    undefined;
  const title =
    kind === "project" && selectedProjectId !== undefined
      ? (data.projects.find((project) => project.id === selectedProjectId)?.title ??
        t(copy[kind].title))
      : t(copy[kind].title);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{t(copy[kind].subtitle)}</p>
        </div>
        {kind === "projects" && (
          <Button size="1" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> {t("common.create")}
          </Button>
        )}
      </div>
      {renderView(kind, data, selectedProjectId, refresh)}
    </>
  );
}

function renderView(
  kind: ViewKind,
  data: WorkspaceBootstrap,
  projectId: string | undefined,
  refresh: () => Promise<void>,
): ReactNode {
  const project = findProjectData(data, projectId);
  if (kind === "projects") return <Projects data={data} />;
  if (kind === "project") return <ProjectDetail data={data} project={project} refresh={refresh} />;
  if (kind === "kanban") return <Kanban data={data} project={project} />;
  if (kind === "settings") {
    return canManageWorkspaceSettings(data.currentMember.role) ? (
      <Settings data={data} />
    ) : (
      <WorkspaceSettingsRestricted />
    );
  }
  if (kind === "integrations") {
    return canManageWorkspaceSettings(data.currentMember.role) ? (
      <WorkspaceIntegrations workspaceId={data.workspace.id} />
    ) : (
      <WorkspaceSettingsRestricted />
    );
  }
  return <Telegram data={data} />;
}
function WorkspaceSettingsRestricted(): ReactNode {
  const { t } = useI18n();
  return <Empty text={t("workspace.settingsRestricted")} />;
}
function findProjectData(data: WorkspaceBootstrap, projectId?: string): ProjectData | undefined {
  return projectId === undefined
    ? undefined
    : data.projectData.find((item) => item.projectId === projectId);
}
function Projects({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
  const { locale, t } = useI18n();
  return (
    <div className="project-grid">
      {data.projects.map((project) => (
        <Link
          href={workspaceProjectHref(data.workspace.slug, project.slug)}
          key={project.id}
          className="project-card"
        >
          <div>
            <span className="cover">{project.title.slice(0, 1)}</span>
            <Badge color="indigo">{project.status ?? t("common.active")}</Badge>
          </div>
          <h2>{project.title}</h2>
          {project.description === null ? (
            <p>{t("common.noDescription")}</p>
          ) : (
            <MarkdownContent
              className="project-card-description"
              renderLinks={false}
              value={project.description}
            />
          )}
          <small>{t("common.updated", { date: formatDate(project.updatedAt, locale) })}</small>
        </Link>
      ))}
    </div>
  );
}
function ProjectDetail({
  data,
  project,
  refresh,
}: Readonly<{
  data: WorkspaceBootstrap;
  project: ProjectData | undefined;
  refresh: () => Promise<void>;
}>): ReactNode {
  const { t } = useI18n();
  if (project === undefined) return <Empty text={t("workspace.noProjects")} />;
  const projectSummary = data.projects.find((item) => item.id === project.projectId);
  return (
    <Flex direction="column" gap="4">
      {projectSummary !== undefined && (
        <Card className="panel project-description-panel">
          <PanelTitle title={t("common.description")} />
          <MarkdownDescriptionEditor
            ariaLabel={t("project.editDescription")}
            emptyText={t("project.noDescription")}
            value={projectSummary.description ?? null}
            onSave={(description) =>
              saveMarkdownDescription(
                `/api/workspace/projects/${project.projectId}`,
                data.workspace.id,
                description,
                t("common.descriptionSaveError"),
                () =>
                  updateWorkspaceData((current) => ({
                    ...current,
                    projects: current.projects.map((item) =>
                      item.id === project.projectId ? { ...item, description } : item,
                    ),
                  })),
              )
            }
          />
        </Card>
      )}
      <ProjectStatusesManager
        workspaceId={data.workspace.id}
        projectId={project.projectId}
        statuses={data.statuses.filter((status) => status.projectId === project.projectId)}
      />
      {projectSummary !== undefined && (
        <ProjectDangerZone
          workspaceId={data.workspace.id}
          workspaceSlug={data.workspace.slug}
          projectId={project.projectId}
          projectTitle={projectSummary.title}
          refresh={refresh}
        />
      )}
    </Flex>
  );
}
function Kanban({
  data,
  project,
}: Readonly<{ data: WorkspaceBootstrap; project: ProjectData | undefined }>): ReactNode {
  const { t } = useI18n();
  if (project === undefined) return <Empty text={t("workspace.selectProjectKanban")} />;
  return (
    <div className="board">
      {data.statuses
        .filter((status) => status.projectId === project.projectId)
        .map((status) => {
          const tasks = project.tasks.filter((task) => task.statusId === status.id);
          return (
            <KanbanColumn key={status.id} title={status.name} color={status.color} tasks={tasks} />
          );
        })}
    </div>
  );
}
function KanbanColumn({
  title,
  color,
  tasks,
}: Readonly<{ title: string; color?: string; tasks: ProjectData["tasks"] }>): ReactNode {
  const { t } = useI18n();
  return (
    <section>
      <div className="board-heading">
        <strong className="board-heading-title">
          <TaskStatusIndicator color={color} size="xs" />
          {title}
        </strong>
        <Badge>{tasks.length}</Badge>
      </div>
      {tasks.map((task) => (
        <Card key={task.id} className="kanban-card">
          <span className="task-status-label">
            <TaskStatusIndicator color={color} size="sm" />
            <strong>{task.title}</strong>
          </span>
          <small>{task.description ?? t("common.noDescription")}</small>
        </Card>
      ))}
    </section>
  );
}
function Settings({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
  const { t } = useI18n();
  return (
    <section className="settings">
      <Card className="panel">
        <PanelTitle title={t("common.workspace")} />
        <WorkspaceNameEditor name={data.workspace.name} workspaceId={data.workspace.id} />
        <div className="settings-description-field">
          <Text color="gray" size="2">
            {t("common.description")}
          </Text>
          <MarkdownDescriptionEditor
            ariaLabel={t("workspace.editDescription")}
            emptyText={t("workspace.noDescription")}
            value={data.workspace.description}
            onSave={(description) =>
              saveMarkdownDescription(
                "/api/workspace",
                data.workspace.id,
                description,
                t("common.descriptionSaveError"),
                () =>
                  updateWorkspaceData((current) => ({
                    ...current,
                    workspace: { ...current.workspace, description },
                  })),
              )
            }
          />
        </div>
      </Card>
      <Card className="panel">
        <PanelTitle title={t("workspace.members")} />
        <WorkspaceMembersManager
          currentMember={data.currentMember}
          members={data.workspace.members}
          workspaceId={data.workspace.id}
        />
      </Card>
      <Card className="panel">
        <PanelTitle title={t("invitations.title")} />
        <WorkspaceInvitations workspaceId={data.workspace.id} />
      </Card>
      <Card className="panel">
        <PanelTitle title={t("integrations.title")} />
        <Flex direction="column" gap="3" align="start">
          <Text color="gray">{t("integrations.settingsDescription")}</Text>
          <Button asChild size="1" variant="soft">
            <Link href={workspacePageHref(data.workspace.slug, "settings/integrations")}>
              {t("integrations.manage")}
            </Link>
          </Button>
        </Flex>
      </Card>
      <WorkspaceDangerZone
        fallbackWorkspaceSlug={
          data.availableWorkspaces.find((workspace) => workspace.id !== data.workspace.id)?.slug ??
          null
        }
        workspaceId={data.workspace.id}
        workspaceName={data.workspace.name}
      />
    </section>
  );
}
function Telegram({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
  const { t } = useI18n();
  return (
    <Card className="panel">
      <PanelTitle title="Telegram Mini App" />
      <p>{t("workspace.telegramInfo")}</p>
      <Text size="2" color="gray">
        {t("common.workspace")}: {data.workspace.name}
      </Text>
    </Card>
  );
}
function Empty({ text }: Readonly<{ text: string }>): ReactNode {
  return (
    <Card className="panel">
      <Text color="gray">{text}</Text>
    </Card>
  );
}
function PanelTitle({ title }: Readonly<{ title: string }>): ReactNode {
  return <h2 className="panel-title">{title}</h2>;
}
function formatDate(value: string | null | undefined, locale: "en" | "ru"): string {
  return value === null || value === undefined
    ? "—"
    : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(new Date(value));
}
async function saveMarkdownDescription(
  url: string,
  workspaceId: string,
  description: string | null,
  fallback: string,
  onSaved: () => void,
): Promise<void> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ description, workspaceId }),
  });
  const body: unknown = await response.json().catch((): null => null);
  if (!response.ok) {
    throw new Error(isApiFailure(body) ? body.error : fallback);
  }
  onSaved();
}
