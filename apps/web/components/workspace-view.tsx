"use client";

import { Badge, Button, Card, Flex, Table, Text } from "@radix-ui/themes";
import { MarkdownContent } from "@task/ui";
import { Bot, MoreHorizontal, Plus, Workflow } from "lucide-react";
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
import { useWorkspaceStore } from "../lib/workspace-store";
import { workspaceProjectHref } from "../lib/workspace-url";
import { MarkdownDescriptionEditor } from "./markdown-description-editor";
import { ProjectDangerZone } from "./project-danger-zone";
import { ProjectStatusesManager } from "./project-statuses-manager";
import { TaskStatusIndicator } from "./task-status-indicator";
import { WorkspaceDangerZone } from "./workspace-danger-zone";
import { WorkspaceInvitations } from "./workspace-invitations";
import { WorkspaceMembersManager } from "./workspace-members-manager";
import { WorkspaceNameEditor } from "./workspace-name-editor";
import { WorkspaceOnboarding } from "./workspace-onboarding";

export type ViewKind =
  | "projects"
  | "project"
  | "kanban"
  | "matrix"
  | "table"
  | "templates"
  | "confirmations"
  | "history"
  | "settings"
  | "telegram";
const copy: Record<ViewKind, { title: MessageKey; subtitle: MessageKey }> = {
  projects: { title: "workspace.projectsTitle", subtitle: "workspace.projectsSubtitle" },
  project: { title: "workspace.projectTitle", subtitle: "workspace.projectSubtitle" },
  kanban: { title: "workspace.kanbanTitle", subtitle: "workspace.kanbanSubtitle" },
  matrix: { title: "workspace.matrixTitle", subtitle: "workspace.matrixSubtitle" },
  table: { title: "workspace.tableTitle", subtitle: "workspace.tableSubtitle" },
  templates: { title: "templates.title", subtitle: "workspace.templatesSubtitle" },
  confirmations: { title: "nav.confirmations", subtitle: "workspace.confirmationsSubtitle" },
  history: { title: "nav.agentHistory", subtitle: "workspace.historySubtitle" },
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
  const setCreateOpen = useWorkspaceStore((state) => state.setCreateOpen);
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
        {["projects", "templates"].includes(kind) && (
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
  if (kind === "matrix") return <Matrix project={project} />;
  if (kind === "table") return <TaskTable project={project} />;
  if (kind === "templates") return <Templates data={data} />;
  if (kind === "confirmations") return <Confirmations data={data} refresh={refresh} />;
  if (kind === "history") return <History data={data} />;
  if (kind === "settings") {
    return canManageWorkspaceSettings(data.currentMember.role) ? (
      <Settings data={data} />
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
function Matrix({ project }: Readonly<{ project: ProjectData | undefined }>): ReactNode {
  const { t } = useI18n();
  if (project === undefined) return <Empty text={t("workspace.selectProjectMatrix")} />;
  return (
    <Card className="panel matrix">
      <div className="matrix-grid matrix-head">
        <span>{t("workspace.stage")}</span>
        {project.matrix.columns.map((column) => (
          <span key={column.id}>{column.title}</span>
        ))}
      </div>
      {project.matrix.stages.map((stage) => (
        <div className="matrix-grid" key={stage.position}>
          <strong>{stage.name}</strong>
          {project.matrix.columns.map((column) => {
            const cell = project.matrix.cells.find(
              (item) => item.columnTaskId === column.id && item.stageId === stage.id,
            );
            return (
              <span className="matrix-cell active" key={column.id}>
                {cell?.tasks.map((task) => task.title).join(", ") ?? ""}
              </span>
            );
          })}
        </div>
      ))}
    </Card>
  );
}
function TaskTable({ project }: Readonly<{ project: ProjectData | undefined }>): ReactNode {
  const { locale, t } = useI18n();
  if (project === undefined) return <Empty text={t("workspace.selectProjectTable")} />;
  return (
    <Card className="table-card">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>{t("common.task")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("workspace.dueDate")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t("common.description")}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {project.table.items.map((task) => (
            <Table.Row key={task.id}>
              <Table.RowHeaderCell>{task.title}</Table.RowHeaderCell>
              <Table.Cell>{formatDate(task.dueAt ?? null, locale)}</Table.Cell>
              <Table.Cell>{task.description ?? "—"}</Table.Cell>
              <Table.Cell>
                <MoreHorizontal size={16} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Card>
  );
}
function Templates({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
  const { t } = useI18n();
  return (
    <div className="template-grid">
      {data.taskSkills.map((skill) => (
        <Card className="template-card" key={skill.id}>
          <Workflow size={22} />
          <h2>{skill.name}</h2>
          <p>{skill.description ?? t("common.noDescription")}</p>
          <small>{skill.aliases.join(", ") || t("workspace.noAliases")}</small>
        </Card>
      ))}
    </div>
  );
}
function Confirmations({
  data,
  refresh,
}: Readonly<{ data: WorkspaceBootstrap; refresh: () => Promise<void> }>): ReactNode {
  const { locale, t } = useI18n();
  return (
    <div className="stacked">
      {data.confirmations.map((confirmation) => (
        <Card className="confirmation" key={confirmation.id}>
          <div>
            <span className="agent-icon">
              <Bot size={18} />
            </span>
            <strong>{confirmation.kind}</strong>
            <p>{t("workspace.expires", { date: formatDate(confirmation.expiresAt, locale) })}</p>
          </div>
          <div>
            <Button
              variant="soft"
              color="gray"
              size="1"
              onClick={() =>
                void updateConfirmation(data.workspace.id, confirmation.id, "cancel", refresh)
              }
            >
              {t("workspace.reject")}
            </Button>
            <Button
              size="1"
              onClick={() =>
                void updateConfirmation(data.workspace.id, confirmation.id, "confirm", refresh)
              }
            >
              {t("common.confirm")}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
function History({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
  const { locale, t } = useI18n();
  return (
    <Card className="panel timeline">
      {data.agentRuns.map((run) => (
        <div key={run.id}>
          <span className="timeline-dot" />
          <strong>{run.inputText}</strong>
          <small>
            {run.source} · {run.status} · {formatDate(run.createdAt, locale)}
          </small>
          <p>{run.finalResponse ?? run.error ?? t("workspace.running")}</p>
        </div>
      ))}
    </Card>
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
async function updateConfirmation(
  workspaceId: string,
  confirmationId: string,
  action: "cancel" | "confirm",
  refresh: () => Promise<void>,
): Promise<void> {
  await fetch(`/api/workspace/confirmations/${confirmationId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, action }),
  });
  await refresh();
}
