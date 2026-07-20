"use client";

import { Badge, Button, Card, Checkbox, Flex, Progress, Table, Text } from "@radix-ui/themes";
import { MarkdownContent } from "@task/ui";
import { Bot, ChevronRight, Clock3, MoreHorizontal, Plus, Sparkles, Workflow } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { isTaskSummary } from "../lib/task-summary";
import {
  updateWorkspaceData,
  updateWorkspaceTask,
  useWorkspaceData,
} from "../lib/use-workspace-data";
import {
  isApiFailure,
  type ProjectData,
  type WorkspaceBootstrap,
} from "../lib/workspace-contracts";
import { useWorkspaceStore } from "../lib/workspace-store";
import { workspaceProjectHref } from "../lib/workspace-url";
import { MarkdownDescriptionEditor } from "./markdown-description-editor";
import { ProjectDangerZone } from "./project-danger-zone";
import { ProjectStatusesManager } from "./project-statuses-manager";

export type ViewKind =
  | "dashboard"
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
const copy: Record<ViewKind, { title: string; subtitle: string }> = {
  dashboard: { title: "Дашборд", subtitle: "Обзор процессов рабочего пространства" },
  projects: { title: "Проекты", subtitle: "Активные проекты рабочего пространства" },
  project: { title: "Проект", subtitle: "Задачи и прогресс проекта" },
  kanban: { title: "Канбан", subtitle: "Задачи сгруппированы по статусам" },
  matrix: { title: "Матрица", subtitle: "Этапы и задачи выбранного проекта" },
  table: { title: "Таблица", subtitle: "Плоский список задач выбранного проекта" },
  templates: { title: "Шаблоны", subtitle: "Task skills рабочего пространства" },
  confirmations: { title: "Подтверждения", subtitle: "Ожидающие решения действия агента" },
  history: { title: "История агента", subtitle: "Запуски агента в рабочем пространстве" },
  settings: { title: "Настройки", subtitle: "Участники и конфигурация рабочего пространства" },
  telegram: {
    title: "Настройки Telegram",
    subtitle: "Статус привязки Telegram доступен через backend API.",
  },
};

export function WorkspaceView({
  kind,
  projectId,
  projectSlug,
}: Readonly<{ kind: ViewKind; projectId?: string; projectSlug?: string }>): ReactNode {
  const { data, error, loading, refresh } = useWorkspaceData();
  const searchParams = useSearchParams();
  const setCreateOpen = useWorkspaceStore((state) => state.setCreateOpen);
  if (loading)
    return (
      <Card className="panel">
        <Text color="gray">Загружаю данные рабочего пространства…</Text>
      </Card>
    );
  if (error !== null || data === null)
    return (
      <Card className="panel connection-error">
        <h2>Нет подключения к backend API</h2>
        <p>{error ?? "Не удалось загрузить данные."}</p>
        <code>
          TASK_API_BASE_URL=http://localhost:3000
          <br />
          TASK_USER_ID=&lt;uuid пользователя&gt;
        </code>
        <Button size="1" onClick={() => void refresh()}>
          Повторить
        </Button>
      </Card>
    );
  const selectedProjectId =
    projectId ??
    data.projects.find((project) => project.slug === projectSlug)?.id ??
    searchParams.get("project") ??
    undefined;
  const title =
    kind === "project" && selectedProjectId !== undefined
      ? (data.projects.find((project) => project.id === selectedProjectId)?.title ??
        copy[kind].title)
      : copy[kind].title;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{copy[kind].subtitle}</p>
        </div>
        {["projects", "templates"].includes(kind) && (
          <Button size="1" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Создать
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
  if (kind === "dashboard") return <Dashboard data={data} />;
  if (kind === "projects") return <Projects data={data} />;
  if (kind === "project") return <ProjectDetail data={data} project={project} refresh={refresh} />;
  if (kind === "kanban") return <Kanban data={data} project={project} />;
  if (kind === "matrix") return <Matrix project={project} />;
  if (kind === "table") return <TaskTable project={project} />;
  if (kind === "templates") return <Templates data={data} />;
  if (kind === "confirmations") return <Confirmations data={data} refresh={refresh} />;
  if (kind === "history") return <History data={data} />;
  if (kind === "settings") return <Settings data={data} />;
  return <Telegram data={data} />;
}
function findProjectData(data: WorkspaceBootstrap, projectId?: string): ProjectData | undefined {
  return data.projectData.find((item) => item.projectId === projectId) ?? data.projectData[0];
}
function Dashboard({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
  const c = data.dashboard.taskCounts;
  return (
    <>
      <section className="metrics">
        {[
          ["Назначено", c.assigned, "indigo"],
          ["Просрочено", c.overdue, "red"],
          ["Скоро срок", c.dueSoon, "amber"],
          ["Активные проекты", data.dashboard.activeProjects.length, "green"],
        ].map(([title, value, color]) => (
          <Card key={String(title)} className="metric">
            <Text size="1" color="gray">
              {title}
            </Text>
            <strong>{value}</strong>
            <Progress
              value={Math.min(Number(value) * 10, 100)}
              color={
                color === "red"
                  ? "red"
                  : color === "amber"
                    ? "amber"
                    : color === "green"
                      ? "green"
                      : "indigo"
              }
            />
          </Card>
        ))}
      </section>
      <section className="two-columns">
        <Card className="panel">
          <PanelTitle title="Мои задачи" />
          <TaskRows data={data} items={data.myTasks.items.slice(0, 5)} />
        </Card>
        <Card className="panel">
          <PanelTitle title="Активные проекты" />
          {data.dashboard.activeProjects.map((project) => (
            <Link
              className="project-row"
              href={activeProjectHref(data, project.id)}
              key={project.id}
            >
              <span className="project-dot">{project.title.slice(0, 1)}</span>
              <div>
                <strong>{project.title}</strong>
                <small>{project.status ?? "Без статуса"}</small>
              </div>
              <ChevronRight size={16} />
            </Link>
          ))}
        </Card>
      </section>
      <Card className="agent-callout">
        <Sparkles size={20} />
        <div>
          <strong>Последние запуски агента</strong>
          <p>{data.dashboard.recentAgentRuns.at(0)?.inputText ?? "Запусков ещё не было."}</p>
        </div>
        <Badge>{data.dashboard.pendingConfirmations.length} ожид.</Badge>
      </Card>
    </>
  );
}
function TaskRows({
  data,
  items,
}: Readonly<{
  data: WorkspaceBootstrap;
  items: WorkspaceBootstrap["myTasks"]["items"];
}>): ReactNode {
  return (
    <>
      {items.map((task) => {
        const done = data.statuses.find(
          (status) => status.projectId === task.projectId && status.isDone,
        );
        return (
          <div className="task-row" key={task.id}>
            <Checkbox
              checked={done?.id === task.statusId}
              onCheckedChange={() => {
                if (done !== undefined)
                  void updateTaskStatus(data.workspace.id, task.projectId, task.id, done.id);
              }}
            />
            <div>
              <strong>{task.title}</strong>
              <small>{task.projectTitle}</small>
            </div>
            <Badge color="gray">{task.statusName ?? "Без статуса"}</Badge>
            <span>{formatDate(task.dueAt)}</span>
          </div>
        );
      })}
    </>
  );
}
function Projects({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
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
            <Badge color="indigo">{project.status ?? "Активный"}</Badge>
          </div>
          <h2>{project.title}</h2>
          {project.description === null ? (
            <p>Описание не задано</p>
          ) : (
            <MarkdownContent
              className="project-card-description"
              renderLinks={false}
              value={project.description}
            />
          )}
          <small>Обновлено {formatDate(project.updatedAt)}</small>
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
  if (project === undefined) return <Empty text="В рабочем пространстве пока нет проектов." />;
  const projectSummary = data.projects.find((item) => item.id === project.projectId);
  return (
    <Flex direction="column" gap="4">
      {projectSummary !== undefined && (
        <Card className="panel project-description-panel">
          <PanelTitle title="Описание" />
          <MarkdownDescriptionEditor
            ariaLabel="Редактировать описание проекта"
            emptyText="Описание проекта не добавлено"
            value={projectSummary.description ?? null}
            onSave={(description) =>
              saveMarkdownDescription(
                `/api/workspace/projects/${project.projectId}`,
                data.workspace.id,
                description,
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
  if (project === undefined) return <Empty text="Выберите проект, чтобы увидеть канбан." />;
  const tasksWithoutStatus = project.tasks.filter((task) => task.statusId === null);
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
      {tasksWithoutStatus.length > 0 && (
        <KanbanColumn title="Без статуса" tasks={tasksWithoutStatus} />
      )}
    </div>
  );
}
function KanbanColumn({
  title,
  color,
  tasks,
}: Readonly<{ title: string; color?: string; tasks: ProjectData["tasks"] }>): ReactNode {
  return (
    <section>
      <div className="board-heading">
        <strong className="board-heading-title">
          {color !== undefined && (
            <span className="status-dot" style={{ backgroundColor: color }} />
          )}
          {title}
        </strong>
        <Badge>{tasks.length}</Badge>
      </div>
      {tasks.map((task) => (
        <Card key={task.id} className="kanban-card">
          <strong>{task.title}</strong>
          <small>{task.description ?? "Без описания"}</small>
        </Card>
      ))}
    </section>
  );
}
function Matrix({ project }: Readonly<{ project: ProjectData | undefined }>): ReactNode {
  if (project === undefined) return <Empty text="Выберите проект, чтобы увидеть матрицу." />;
  return (
    <Card className="panel matrix">
      <div className="matrix-grid matrix-head">
        <span>Этап</span>
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
  if (project === undefined) return <Empty text="Выберите проект, чтобы увидеть таблицу." />;
  return (
    <Card className="table-card">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Задача</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Срок</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Описание</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {project.table.items.map((task) => (
            <Table.Row key={task.id}>
              <Table.RowHeaderCell>{task.title}</Table.RowHeaderCell>
              <Table.Cell>{formatDate(task.dueAt ?? null)}</Table.Cell>
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
  return (
    <div className="template-grid">
      {data.taskSkills.map((skill) => (
        <Card className="template-card" key={skill.id}>
          <Workflow size={22} />
          <h2>{skill.name}</h2>
          <p>{skill.description ?? "Без описания"}</p>
          <small>{skill.aliases.join(", ") || "Нет алиасов"}</small>
        </Card>
      ))}
    </div>
  );
}
function Confirmations({
  data,
  refresh,
}: Readonly<{ data: WorkspaceBootstrap; refresh: () => Promise<void> }>): ReactNode {
  return (
    <div className="stacked">
      {data.confirmations.map((confirmation) => (
        <Card className="confirmation" key={confirmation.id}>
          <div>
            <span className="agent-icon">
              <Bot size={18} />
            </span>
            <strong>{confirmation.kind}</strong>
            <p>Истекает {formatDate(confirmation.expiresAt)}</p>
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
              Отклонить
            </Button>
            <Button
              size="1"
              onClick={() =>
                void updateConfirmation(data.workspace.id, confirmation.id, "confirm", refresh)
              }
            >
              Подтвердить
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
function History({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
  return (
    <Card className="panel timeline">
      {data.agentRuns.map((run) => (
        <div key={run.id}>
          <span className="timeline-dot" />
          <strong>{run.inputText}</strong>
          <small>
            {run.source} · {run.status} · {formatDate(run.createdAt)}
          </small>
          <p>{run.finalResponse ?? run.error ?? "Выполняется"}</p>
        </div>
      ))}
    </Card>
  );
}
function Settings({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
  return (
    <section className="settings">
      <Card className="panel">
        <PanelTitle title="Рабочее пространство" />
        <label>
          Название
          <input value={data.workspace.name} readOnly />
        </label>
        <label>
          Slug
          <input value={data.workspace.slug} readOnly />
        </label>
        <div className="settings-description-field">
          <Text color="gray" size="2">
            Описание
          </Text>
          <MarkdownDescriptionEditor
            ariaLabel="Редактировать описание рабочего пространства"
            emptyText="Описание рабочего пространства не добавлено"
            value={data.workspace.description}
            onSave={(description) =>
              saveMarkdownDescription("/api/workspace", data.workspace.id, description, () =>
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
        <PanelTitle title="Участники" />
        {data.workspace.members.map((member) => (
          <div className="person" key={member.id}>
            <span className="avatar">{member.displayName.slice(0, 1)}</span>
            <span>
              <strong>{member.displayName}</strong>
              <small>{member.role}</small>
            </span>
          </div>
        ))}
      </Card>
    </section>
  );
}
function Telegram({ data }: Readonly<{ data: WorkspaceBootstrap }>): ReactNode {
  return (
    <Card className="panel">
      <PanelTitle title="Telegram Mini App" />
      <p>
        Для Telegram backend предоставляет проверку initData и статус привязки identity. Настройки
        каналов и bot permissions пока не входят в опубликованный API-контракт.
      </p>
      <Text size="2" color="gray">
        Workspace: {data.workspace.name}
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
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <Clock3 size={16} />
    </div>
  );
}
function formatDate(value: string | null | undefined): string {
  return value === null || value === undefined
    ? "—"
    : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" }).format(new Date(value));
}
function activeProjectHref(data: WorkspaceBootstrap, projectId: string): string {
  const project = data.projects.find((item) => item.id === projectId);
  return project === undefined
    ? "/projects"
    : workspaceProjectHref(data.workspace.slug, project.slug);
}
async function updateTaskStatus(
  workspaceId: string,
  projectId: string,
  taskId: string,
  statusId: string,
): Promise<void> {
  const response = await fetch(`/api/workspace/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId, projectId, statusId }),
  });
  const body: unknown = await response.json();
  if (response.ok && isTaskSummary(body)) updateWorkspaceTask(body);
}

async function saveMarkdownDescription(
  url: string,
  workspaceId: string,
  description: string | null,
  onSaved: () => void,
): Promise<void> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ description, workspaceId }),
  });
  const body: unknown = await response.json().catch((): null => null);
  if (!response.ok) {
    throw new Error(isApiFailure(body) ? body.error : "Не удалось сохранить описание.");
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
