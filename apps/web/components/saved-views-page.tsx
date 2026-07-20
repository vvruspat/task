"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  DropdownMenu,
  IconButton,
  Popover,
  Select,
  Switch,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import type { SavedView, TaskSummary } from "@task/api-client";
import {
  ArrowLeft,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  Columns3,
  ExternalLink,
  Funnel,
  Grid3X3,
  Layers3,
  List,
  MoreHorizontal,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { issueIdentifier } from "../lib/issue-url";
import {
  logicalStatusKeyForTask,
  mergeLogicalStatuses,
  mergeLogicalStatusesForProjects,
  normalizeStatusFilterValue,
  noStatusKey,
  resolveProjectStatusId,
} from "../lib/logical-statuses";
import { changeSavedViewLayout, type SavedViewDraft as ViewDraft } from "../lib/saved-view-draft";
import { isTaskSummary } from "../lib/task-summary";
import { buildTemplateMatrix } from "../lib/template-matrix";
import {
  updateWorkspaceData,
  updateWorkspaceTask,
  useWorkspaceData,
} from "../lib/use-workspace-data";
import type { WorkspaceBootstrap } from "../lib/workspace-contracts";
import { useWorkspaceStore } from "../lib/workspace-store";
import { workspaceIssueHref, workspaceViewHref } from "../lib/workspace-url";
import { TaskDetailsContent } from "./task-details-content";
import { TaskStatusIndicator } from "./task-status-indicator";

type ViewSettings = SavedView["settings"];
type ViewGrouping = ViewSettings["grouping"];
type DisplayProperty = ViewSettings["displayProperties"][number];
type ViewFilter = ViewSettings["filters"][number];
type FilterField = ViewFilter["field"];
type FilterOperator = ViewFilter["operator"];
type TaskWithProject = TaskSummary & {
  projectKey: string;
  projectTitle: string;
};
type TaskGroup = { id: string; title: string; tasks: TaskWithProject[] };
type TaskBoardOverride = { statusId: string | null; position: string };
type SubtaskStatusSlice = {
  id: string;
  label: string;
  color: string;
  count: number;
};
type MoveBoardTask = (
  task: TaskWithProject,
  targetStatusKey: string,
  targetTasks: TaskWithProject[],
) => Promise<void>;
type OpenTaskPreview = (task: TaskWithProject) => void;
type QuickTaskUpdate =
  | { operation: "assignee"; assigneeUserId: string | null }
  | { operation: "status"; statusId: string };
type UpdateCardTask = (task: TaskWithProject, update: QuickTaskUpdate) => Promise<void>;

const defaultSettings: ViewSettings = {
  grouping: "status",
  subGrouping: "none",
  ordering: "manual",
  orderDirection: "asc",
  showSubtasks: true,
  showEmptyGroups: false,
  displayProperties: ["status", "project", "due_at"],
  filters: [],
};
const groupingOptions: ReadonlyArray<{ value: ViewGrouping; label: string }> = [
  { value: "none", label: "Без группировки" },
  { value: "status", label: "Статус" },
  { value: "project", label: "Проект" },
  { value: "parent_task", label: "Родительская задача" },
];
const orderingOptions: ReadonlyArray<{
  value: ViewSettings["ordering"];
  label: string;
}> = [
  { value: "manual", label: "Вручную" },
  { value: "title", label: "Название" },
  { value: "status", label: "Статус" },
  { value: "created_at", label: "Создано" },
  { value: "updated_at", label: "Обновлено" },
  { value: "due_at", label: "Срок" },
];
const propertyLabels: Record<DisplayProperty, string> = {
  status: "Статус",
  project: "Проект",
  assignee: "Исполнитель",
  due_at: "Срок",
  created_at: "Создано",
  updated_at: "Обновлено",
};
const allProperties: readonly DisplayProperty[] = [
  "status",
  "project",
  "assignee",
  "due_at",
  "created_at",
  "updated_at",
];
const filterFields: ReadonlyArray<{
  field: FilterField;
  icon: typeof Funnel;
  label: string;
}> = [
  { field: "status", icon: SlidersHorizontal, label: "Статус" },
  { field: "assignee", icon: UserRound, label: "Исполнитель" },
  { field: "creator", icon: UserRound, label: "Создатель" },
  { field: "project", icon: Box, label: "Проект" },
  { field: "template", icon: Workflow, label: "Шаблон" },
  { field: "due_date", icon: CalendarDays, label: "Даты" },
  { field: "content", icon: Search, label: "Содержимое" },
];
const filterOperators: readonly FilterOperator[] = [
  "is",
  "is_not",
  "before",
  "after",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
];

export function SavedViewsPage({ viewSlug }: Readonly<{ viewSlug?: string }>): ReactNode {
  const { data, error, loading, refresh } = useWorkspaceData();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryProjectId = searchParams.get("project");
  const queryViewId = searchParams.get("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ViewDraft | null>(null);
  const createOpen = useWorkspaceStore((state) => state.createViewOpen);
  const setCreateOpen = useWorkspaceStore((state) => state.setCreateViewOpen);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [taskOverrides, setTaskOverrides] = useState<Record<string, TaskBoardOverride>>({});
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const selected =
    data?.views.find((view) => view.slug === viewSlug) ??
    data?.views.find((view) => view.id === queryViewId) ??
    data?.views.find((view) => view.id === selectedId) ??
    data?.views.at(0);
  const previewTask = useMemo(() => {
    if (data === null || previewTaskId === null) return null;
    return (
      collectWorkspaceTasks(data, null, taskOverrides).find((task) => task.id === previewTaskId) ??
      null
    );
  }, [data, previewTaskId, taskOverrides]);

  useEffect(() => {
    if (selected !== undefined && (draft === null || selected.id !== selectedId)) {
      setSelectedId(selected.id);
      setDraft(toDraft(selected));
    }
  }, [selected, selectedId, draft]);

  if (loading)
    return (
      <Card className="panel">
        <Text color="gray">Загружаю представления…</Text>
      </Card>
    );
  if (error !== null || data === null)
    return (
      <Card className="panel connection-error">
        <h2>Не удалось загрузить Views</h2>
        <p>{error ?? "Backend не ответил."}</p>
        <Button onClick={() => void refresh()}>Повторить</Button>
      </Card>
    );

  const createView = async (input: ViewDraft): Promise<void> => {
    setSaving(true);
    setMutationError(null);
    const response = await fetch(
      `/api/views?workspaceId=${encodeURIComponent(data.workspace.id)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const result: unknown = await response.json();
    if (!response.ok || !isSavedView(result)) {
      setMutationError(readError(result, "Не удалось создать view."));
      setSaving(false);
      return;
    }
    updateWorkspaceData((current) => ({ ...current, views: [...current.views, result] }));
    setSelectedId(result.id);
    setDraft(toDraft(result));
    router.replace(workspaceViewHref(data.workspace.slug, result.slug));
    setCreateOpen(false);
    setSaving(false);
  };
  const saveView = async (): Promise<void> => {
    if (selected === undefined || draft === null) return;
    setSaving(true);
    setMutationError(null);
    const response = await fetch(
      `/api/views/${selected.id}?workspaceId=${encodeURIComponent(data.workspace.id)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      },
    );
    const result: unknown = await response.json();
    if (!response.ok || !isSavedView(result)) {
      setMutationError(readError(result, "Не удалось сохранить view."));
      setSaving(false);
      return;
    }
    updateWorkspaceData((current) => ({
      ...current,
      views: current.views.map((view) => (view.id === result.id ? result : view)),
    }));
    setDraft(toDraft(result));
    setSaving(false);
  };
  const deleteView = async (): Promise<void> => {
    if (selected === undefined) return;
    setSaving(true);
    setMutationError(null);
    const response = await fetch(
      `/api/views/${selected.id}?workspaceId=${encodeURIComponent(data.workspace.id)}`,
      {
        method: "DELETE",
      },
    );
    if (!response.ok) {
      const result: unknown = await response.json();
      setMutationError(readError(result, "Не удалось удалить view."));
      setSaving(false);
      return;
    }
    setSelectedId(null);
    setDraft(null);
    updateWorkspaceData((current) => ({
      ...current,
      views: current.views.filter((view) => view.id !== selected.id),
    }));
    const nextView = data.views.find((view) => view.id !== selected.id);
    router.replace(
      nextView === undefined
        ? viewsUrl(queryProjectId)
        : workspaceViewHref(data.workspace.slug, nextView.slug),
    );
    setSaving(false);
  };
  const moveBoardTask: MoveBoardTask = async (task, targetStatusKey, targetTasks) => {
    const targetStatusId = resolveProjectStatusId(task.projectId, targetStatusKey, data.statuses);
    if (targetStatusId === undefined) {
      setMutationError(`В проекте «${task.projectTitle}» нет статуса этой колонки.`);
      return;
    }
    const nextPosition = String(
      targetTasks
        .filter((targetTask) => targetTask.id !== task.id)
        .reduce((maximum, targetTask) => {
          const position = Number(taskOverrides[targetTask.id]?.position ?? targetTask.position);
          return Number.isFinite(position) ? Math.max(maximum, position) : maximum;
        }, 0) + 1000,
    );

    setMutationError(null);
    setMovingTaskId(task.id);
    setTaskOverrides((current) => ({
      ...current,
      [task.id]: { statusId: targetStatusId, position: nextPosition },
    }));

    try {
      const response = await fetch(`/api/workspace/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: data.workspace.id,
          projectId: task.projectId,
          statusId: targetStatusId,
          position: nextPosition,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !isTaskSummary(result)) {
        setMutationError(readError(result, "Не удалось переместить задачу."));
        setTaskOverrides((current) => withoutTaskOverride(current, task.id));
        return;
      }
      updateWorkspaceTask(result);
      setTaskOverrides((current) => withoutTaskOverride(current, task.id));
    } catch (moveError: unknown) {
      setMutationError(
        moveError instanceof Error ? moveError.message : "Не удалось переместить задачу.",
      );
      setTaskOverrides((current) => withoutTaskOverride(current, task.id));
    } finally {
      setMovingTaskId(null);
    }
  };
  const updateCardTask: UpdateCardTask = async (task, update) => {
    setMutationError(null);
    try {
      const response = await fetch(`/api/workspace/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: data.workspace.id,
          projectId: task.projectId,
          ...update,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !isTaskSummary(result)) {
        setMutationError(readError(result, "Не удалось обновить задачу."));
        return;
      }
      updateWorkspaceTask(result);
    } catch (updateError: unknown) {
      setMutationError(
        updateError instanceof Error ? updateError.message : "Не удалось обновить задачу.",
      );
    }
  };

  const hasChanges = selected !== undefined && draft !== null && !viewDraftEquals(draft, selected);

  return (
    <div className="views-page">
      {data.views.length === 0 || selected === undefined || draft === null ? (
        <ViewsEmpty onCreate={() => setCreateOpen(true)} />
      ) : (
        <section className="view-editor">
          <div className="view-editor-head">
            <ViewIdentityEditor key={selected.id} draft={draft} setDraft={setDraft} />
            <div className="view-actions">
              {hasChanges && (
                <Button
                  disabled={saving || draft.name.trim().length === 0}
                  onClick={() => void saveView()}
                >
                  {saving ? "Сохраняю…" : "Сохранить"}
                </Button>
              )}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <IconButton variant="ghost" color="gray" aria-label="Действия view">
                    <MoreHorizontal size={17} />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item color="red" onSelect={() => void deleteView()}>
                    <Trash2 size={14} /> Удалить view
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          </div>
          {mutationError !== null && (
            <Text color="red" size="2">
              {mutationError}
            </Text>
          )}
          <ViewToolbar data={data} draft={draft} setDraft={setDraft} />
          <ViewContent
            data={data}
            draft={draft}
            taskOverrides={taskOverrides}
            movingTaskId={movingTaskId}
            onMoveTask={moveBoardTask}
            onOpenTask={(task) => setPreviewTaskId(task.id)}
            onUpdateTask={updateCardTask}
          />
        </section>
      )}
      <CreateViewDialog
        open={createOpen}
        setOpen={setCreateOpen}
        saving={saving}
        onCreate={createView}
      />
      <TaskDetailsDrawer data={data} task={previewTask} onClose={() => setPreviewTaskId(null)} />
    </div>
  );
}

function ViewIdentityEditor({
  draft,
  setDraft,
}: Readonly<{
  draft: ViewDraft;
  setDraft: (draft: ViewDraft) => void;
}>): ReactNode {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  return (
    <div className="view-identity">
      {editingTitle ? (
        <TextField.Root
          autoFocus
          value={draft.name}
          aria-label="Название view"
          onBlur={() => setEditingTitle(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      ) : (
        <h1>
          <button type="button" onClick={() => setEditingTitle(true)}>
            {draft.name}
          </button>
        </h1>
      )}
      {editingDescription ? (
        <TextArea
          autoFocus
          value={draft.description ?? ""}
          placeholder="Описание (необязательно)"
          aria-label="Описание view"
          resize="vertical"
          onBlur={() => setEditingDescription(false)}
          onChange={(event) => setDraft({ ...draft, description: event.target.value || null })}
        />
      ) : (
        <button
          className={draft.description === null ? "view-description empty" : "view-description"}
          type="button"
          onClick={() => setEditingDescription(true)}
        >
          {draft.description ?? "Добавить описание"}
        </button>
      )}
    </div>
  );
}

function ViewsEmpty({ onCreate }: Readonly<{ onCreate: () => void }>): ReactNode {
  return (
    <Card className="views-empty">
      <span>
        <Layers3 size={30} />
      </span>
      <h2>Создайте первый view</h2>
      <p>Выберите список, доску или матрицу. Настройки сохранятся для быстрого доступа.</p>
      <Button onClick={onCreate}>Создать view</Button>
    </Card>
  );
}

function ViewToolbar({
  data,
  draft,
  setDraft,
}: Readonly<{
  data: WorkspaceBootstrap;
  draft: ViewDraft;
  setDraft: (draft: ViewDraft) => void;
}>): ReactNode {
  const filters = draft.settings.filters ?? [];
  const addFilter = (filter: ViewFilter): void =>
    setDraft({
      ...draft,
      settings: { ...draft.settings, filters: [...filters, filter] },
    });
  const removeFilter = (index: number): void =>
    setDraft({
      ...draft,
      settings: {
        ...draft.settings,
        filters: filters.filter((_, filterIndex) => filterIndex !== index),
      },
    });
  return (
    <div className="view-toolbar-region">
      <div className="view-toolbar">
        <div className="layout-toggle">
          <Button
            size="1"
            variant={draft.layout === "list" ? "solid" : "soft"}
            color={draft.layout === "list" ? "indigo" : "gray"}
            onClick={() => setDraft(changeSavedViewLayout(draft, "list"))}
          >
            <List size={14} /> Список
          </Button>
          <Button
            size="1"
            variant={draft.layout === "board" ? "solid" : "soft"}
            color={draft.layout === "board" ? "indigo" : "gray"}
            onClick={() => setDraft(changeSavedViewLayout(draft, "board"))}
          >
            <Columns3 size={14} /> Доска
          </Button>
          <Button
            size="1"
            variant={draft.layout === "matrix" ? "solid" : "soft"}
            color={draft.layout === "matrix" ? "indigo" : "gray"}
            onClick={() => setDraft(changeSavedViewLayout(draft, "matrix"))}
          >
            <Grid3X3 size={14} /> Матрица
          </Button>
        </div>
        <div className="view-toolbar-actions">
          <ViewFiltersPopover data={data} onAdd={addFilter} />
          <ViewSettingsPopover draft={draft} setDraft={setDraft} />
        </div>
      </div>
      {filters.length > 0 && (
        <div className="view-filter-chips">
          {filters.map((filter, index) => (
            <span key={`${filter.field}-${filter.operator}-${filter.value ?? "none"}`}>
              {filterLabel(filter, data)}
              <button
                type="button"
                aria-label={`Удалить фильтр ${filterLabel(filter, data)}`}
                onClick={() => removeFilter(index)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewFiltersPopover({
  data,
  onAdd,
}: Readonly<{
  data: WorkspaceBootstrap;
  onAdd: (filter: ViewFilter) => void;
}>): ReactNode {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<FilterField | null>(null);
  const [operator, setOperator] = useState<FilterOperator>("is");
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  const beginFilter = (nextField: FilterField): void => {
    const initial = initialFilter(nextField, data);
    setField(nextField);
    setOperator(initial.operator);
    setValue(initial.value ?? "");
  };
  const reset = (): void => {
    setField(null);
    setSearch("");
  };
  const canAdd =
    field !== null &&
    (operator === "is_empty" || operator === "is_not_empty" || value.trim().length > 0);
  const visibleFields = filterFields.filter((item) =>
    item.label.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")),
  );
  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <Popover.Trigger>
        <IconButton aria-label="Фильтры view" variant="soft">
          <Funnel size={16} />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content className="view-filter-popover" align="end">
        {field === null ? (
          <>
            <TextField.Root
              autoFocus
              value={search}
              placeholder="Добавить фильтр…"
              aria-label="Найти фильтр"
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="filter-field-list">
              {visibleFields.map(({ field: optionField, icon: Icon, label }) => (
                <button type="button" key={optionField} onClick={() => beginFilter(optionField)}>
                  <Icon size={17} />
                  <span>{label}</span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <FilterEditor
            data={data}
            field={field}
            operator={operator}
            value={value}
            canAdd={canAdd}
            setOperator={setOperator}
            setValue={setValue}
            onBack={() => setField(null)}
            onAdd={() => {
              onAdd({
                field,
                operator,
                value: operator === "is_empty" || operator === "is_not_empty" ? null : value.trim(),
              });
              setOpen(false);
              reset();
            }}
          />
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

function FilterEditor({
  data,
  field,
  operator,
  value,
  canAdd,
  setOperator,
  setValue,
  onBack,
  onAdd,
}: Readonly<{
  data: WorkspaceBootstrap;
  field: FilterField;
  operator: FilterOperator;
  value: string;
  canAdd: boolean;
  setOperator: (operator: FilterOperator) => void;
  setValue: (value: string) => void;
  onBack: () => void;
  onAdd: () => void;
}>): ReactNode {
  const fieldDefinition = filterFields.find((item) => item.field === field);
  const operators = operatorsForField(field);
  const valueOptions = entityFilterOptions(field, data);
  const needsValue = operator !== "is_empty" && operator !== "is_not_empty";
  return (
    <div className="filter-editor">
      <div className="filter-editor-head">
        <IconButton size="1" variant="ghost" color="gray" aria-label="Назад" onClick={onBack}>
          <ArrowLeft size={15} />
        </IconButton>
        <Text weight="medium">{fieldDefinition?.label ?? "Фильтр"}</Text>
      </div>
      <div className="filter-editor-control">
        <Text size="1" color="gray">
          Условие
        </Text>
        <Select.Root
          value={operator}
          onValueChange={(nextValue) => {
            const nextOperator = filterOperators.find((item) => item === nextValue);
            if (nextOperator !== undefined) setOperator(nextOperator);
          }}
        >
          <Select.Trigger aria-label="Условие фильтра" />
          <Select.Content className="view-nested-select-content">
            {operators.map((item) => (
              <Select.Item key={item.value} value={item.value}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>
      {needsValue && (
        <div className="filter-editor-control">
          <Text size="1" color="gray">
            Значение
          </Text>
          {field === "content" ? (
            <TextField.Root
              autoFocus
              value={value}
              placeholder="Текст в названии или описании"
              aria-label="Значение фильтра"
              onChange={(event) => setValue(event.target.value)}
            />
          ) : field === "due_date" ? (
            <TextField.Root
              type="date"
              value={value}
              aria-label="Дата фильтра"
              onChange={(event) => setValue(event.target.value)}
            />
          ) : (
            <Select.Root value={value} onValueChange={setValue}>
              <Select.Trigger aria-label="Значение фильтра" />
              <Select.Content className="view-nested-select-content">
                {valueOptions.map((item) => (
                  <Select.Item key={item.value} value={item.value}>
                    {item.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </div>
      )}
      <Button disabled={!canAdd} onClick={onAdd}>
        Добавить фильтр
      </Button>
    </div>
  );
}

function ViewSettingsPopover({
  draft,
  setDraft,
}: Readonly<{
  draft: ViewDraft;
  setDraft: (draft: ViewDraft) => void;
}>): ReactNode {
  const settings = draft.settings;
  const update = (next: Partial<ViewSettings>): void =>
    setDraft({ ...draft, settings: { ...settings, ...next } });
  return (
    <Popover.Root>
      <Popover.Trigger>
        <IconButton aria-label="Настройки view" variant="soft">
          <Settings2 size={16} />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content className="view-settings-popover" align="end">
        <div className="settings-layout-toggle">
          <Button
            size="1"
            variant={draft.layout === "list" ? "solid" : "soft"}
            color="gray"
            onClick={() => setDraft(changeSavedViewLayout(draft, "list"))}
          >
            <List size={14} /> List
          </Button>
          <Button
            size="1"
            variant={draft.layout === "board" ? "solid" : "soft"}
            color="gray"
            onClick={() => setDraft(changeSavedViewLayout(draft, "board"))}
          >
            <Columns3 size={14} /> Board
          </Button>
          <Button
            size="1"
            variant={draft.layout === "matrix" ? "solid" : "soft"}
            color="gray"
            onClick={() => setDraft(changeSavedViewLayout(draft, "matrix"))}
          >
            <Grid3X3 size={14} /> Matrix
          </Button>
        </div>
        {draft.layout !== "matrix" && (
          <>
            <SettingSelect
              label={draft.layout === "board" ? "Колонки" : "Группировка"}
              value={settings.grouping}
              options={groupingOptions}
              onChange={(value) => update({ grouping: value })}
            />
            <SettingSelect
              label={draft.layout === "board" ? "Строки" : "Подгруппировка"}
              value={settings.subGrouping}
              options={groupingOptions}
              onChange={(value) => update({ subGrouping: value })}
            />
          </>
        )}
        <SettingSelect
          label="Сортировка"
          value={settings.ordering}
          options={orderingOptions}
          onChange={(value) => update({ ordering: value })}
        />
        <div className="setting-row">
          <Text size="2">Направление</Text>
          <Button
            size="1"
            variant="soft"
            color="gray"
            onClick={() =>
              update({
                orderDirection: settings.orderDirection === "asc" ? "desc" : "asc",
              })
            }
          >
            {settings.orderDirection === "asc" ? "По возрастанию" : "По убыванию"}
          </Button>
        </div>
        {draft.layout !== "matrix" && (
          <>
            <div className="settings-divider" />
            <SettingSwitch
              label="Показывать подзадачи"
              checked={settings.showSubtasks}
              onChange={(checked) => update({ showSubtasks: checked })}
            />
            <SettingSwitch
              label="Пустые группы"
              checked={settings.showEmptyGroups}
              onChange={(checked) => update({ showEmptyGroups: checked })}
            />
            <div className="settings-divider" />
            <Text size="2" weight="medium">
              Показывать поля
            </Text>
            <div className="display-properties">
              {allProperties.map((property) => {
                const active = settings.displayProperties.includes(property);
                return (
                  <button
                    type="button"
                    className={active ? "active" : ""}
                    key={property}
                    onClick={() =>
                      update({
                        displayProperties: active
                          ? settings.displayProperties.filter((item) => item !== property)
                          : [...settings.displayProperties, property],
                      })
                    }
                  >
                    {propertyLabels[property]}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

function SettingSelect<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: TValue;
  options: ReadonlyArray<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}>): ReactNode {
  return (
    <div className="setting-row">
      <Text size="2">{label}</Text>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger />
        <Select.Content className="view-nested-select-content">
          {options.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  );
}
function SettingSwitch({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>): ReactNode {
  return (
    <div className="setting-row">
      <Text size="2">{label}</Text>
      <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ViewContent({
  data,
  draft,
  taskOverrides,
  movingTaskId,
  onMoveTask,
  onOpenTask,
  onUpdateTask,
}: Readonly<{
  data: WorkspaceBootstrap;
  draft: ViewDraft;
  taskOverrides: Record<string, TaskBoardOverride>;
  movingTaskId: string | null;
  onMoveTask: MoveBoardTask;
  onOpenTask: OpenTaskPreview;
  onUpdateTask: UpdateCardTask;
}>): ReactNode {
  const tasks = useMemo(
    () => collectTasks(data, draft, taskOverrides),
    [data, draft, taskOverrides],
  );
  const groups = useMemo(
    () => groupTasks(tasks, draft.settings.grouping, data, draft.settings.showEmptyGroups),
    [tasks, draft.settings.grouping, draft.settings.showEmptyGroups, data],
  );
  if (draft.layout === "matrix") {
    return (
      <MatrixView data={data} draft={draft} taskOverrides={taskOverrides} onOpenTask={onOpenTask} />
    );
  }
  if (tasks.length === 0)
    return (
      <div className="view-no-tasks">
        <SlidersHorizontal size={24} />
        <strong>Задач по этим настройкам нет</strong>
        <Text size="2" color="gray">
          Измените область view или включите подзадачи.
        </Text>
      </div>
    );
  return draft.layout === "board" ? (
    <BoardView
      groups={groups}
      tasks={tasks}
      data={data}
      draft={draft}
      movingTaskId={movingTaskId}
      onMoveTask={onMoveTask}
      onOpenTask={onOpenTask}
      onUpdateTask={onUpdateTask}
    />
  ) : (
    <ListView groups={groups} data={data} draft={draft} onOpenTask={onOpenTask} />
  );
}

function MatrixView({
  data,
  draft,
  taskOverrides,
  onOpenTask,
}: Readonly<{
  data: WorkspaceBootstrap;
  draft: ViewDraft;
  taskOverrides: Record<string, TaskBoardOverride>;
  onOpenTask: OpenTaskPreview;
}>): ReactNode {
  const matrix = useMemo(() => {
    const allTasks = collectWorkspaceTasks(data, draft.projectId ?? null, taskOverrides);
    const filters = draft.settings.filters ?? [];
    const templateFilter = filters.find(
      (filter) => filter.field === "template" && filter.operator === "is",
    );
    const rootCandidates = allTasks.filter(
      (task) =>
        (task.parentTaskId === null || task.parentTaskId === undefined) &&
        matchesFilters(
          task,
          filters.filter((filter) => filter.field !== "template"),
          data,
        ),
    );
    const inferredTemplateIds = [
      ...new Set(
        rootCandidates.flatMap((task) =>
          task.sourceSkillId === null || task.sourceSkillId === undefined
            ? []
            : [task.sourceSkillId],
        ),
      ),
    ];
    const templateId =
      templateFilter?.value === "none" || templateFilter?.value === null
        ? null
        : (templateFilter?.value ??
          (inferredTemplateIds.length === 1 ? inferredTemplateIds[0] : null));
    if (templateId === null || templateId === undefined) return null;

    const roots = sortTasks(
      rootCandidates.filter(
        (task) => task.sourceSkillId === templateId && matchesFilters(task, filters, data),
      ),
      draft.settings,
      data,
    );
    const rootIds = new Set(roots.map((task) => task.id));
    const subtasks = allTasks.filter(
      (task) =>
        task.parentTaskId !== null &&
        task.parentTaskId !== undefined &&
        rootIds.has(task.parentTaskId) &&
        task.sourceSkillId === templateId,
    );
    return buildTemplateMatrix([...roots, ...subtasks], templateId);
  }, [data, draft, taskOverrides]);

  if (matrix === null) {
    return (
      <div className="view-no-tasks">
        <Workflow size={24} />
        <strong>Выберите один шаблон</strong>
        <Text size="2" color="gray">
          Добавьте фильтр «Шаблон», чтобы определить набор родительских задач для матрицы.
        </Text>
      </div>
    );
  }
  if (matrix.columns.length === 0) {
    return (
      <div className="view-no-tasks">
        <Grid3X3 size={24} />
        <strong>Задач по этому шаблону нет</strong>
        <Text size="2" color="gray">
          Измените фильтры или создайте родительские задачи из выбранного шаблона.
        </Text>
      </div>
    );
  }

  return (
    <div className="template-matrix-scroll">
      <table className="template-matrix">
        <thead>
          <tr>
            <th scope="col">Подзадача</th>
            {matrix.columns.map((task) => (
              <th scope="col" key={task.id} title={task.title}>
                {task.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.title}</th>
              {row.cells.map((task, index) => {
                const column = matrix.columns[index];
                if (task === null) {
                  return (
                    <td key={column?.id ?? `${row.key}-${index}`}>
                      <button
                        type="button"
                        className="template-matrix-cell missing"
                        disabled
                        aria-label={`${column?.title ?? "Задача"}: подзадача «${row.title}» отсутствует`}
                      >
                        —
                      </button>
                    </td>
                  );
                }
                const status = data.statuses.find((item) => item.id === task.statusId);
                const assignee =
                  task.assigneeUserId === null || task.assigneeUserId === undefined
                    ? "Не назначен"
                    : (data.workspace.members.find(
                        (member) => member.userId === task.assigneeUserId,
                      )?.displayName ?? "Исполнитель");
                return (
                  <td key={task.id}>
                    <button
                      type="button"
                      className="template-matrix-cell"
                      style={{
                        backgroundColor: status?.color ?? "#A1A1AA",
                        color: readableColor(status?.color),
                      }}
                      title={`${status?.name ?? "Без статуса"} · ${assignee}`}
                      onClick={() => onOpenTask(task)}
                    >
                      {assignee}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoardView({
  groups,
  tasks,
  data,
  draft,
  movingTaskId,
  onMoveTask,
  onOpenTask,
  onUpdateTask,
}: Readonly<{
  groups: TaskGroup[];
  tasks: TaskWithProject[];
  data: WorkspaceBootstrap;
  draft: ViewDraft;
  movingTaskId: string | null;
  onMoveTask: MoveBoardTask;
  onOpenTask: OpenTaskPreview;
  onUpdateTask: UpdateCardTask;
}>): ReactNode {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [collapsedRowIds, setCollapsedRowIds] = useState<ReadonlySet<string>>(() => new Set());
  const canDrag = draft.settings.grouping === "status";
  const rowGroups = useMemo(
    () =>
      draft.settings.subGrouping === "none"
        ? []
        : groupTasks(tasks, draft.settings.subGrouping, data, false),
    [data, draft.settings.subGrouping, tasks],
  );
  const statusColorsByGroupId = useMemo(() => {
    if (draft.settings.grouping !== "status") return new Map<string, string>();
    return new Map(
      mergeLogicalStatusesForProjects(
        data.statuses,
        new Set(tasks.map((task) => task.projectId)),
      ).map((status) => [status.key, status.color]),
    );
  }, [data.statuses, draft.settings.grouping, tasks]);
  const toggleRow = (rowId: string): void => {
    setCollapsedRowIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };
  const resetDrag = (): void => {
    setDraggedTaskId(null);
    setDropTargetKey(null);
  };
  const handleDragStart = (event: DragEvent<HTMLDivElement>, taskId: string): void => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };
  const handleDragOver = (event: DragEvent<HTMLElement>, targetKey: string): void => {
    if (!canDrag || movingTaskId !== null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetKey(targetKey);
  };
  const handleDrop = (event: DragEvent<HTMLElement>, group: TaskGroup): void => {
    event.preventDefault();
    const droppedTaskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    const droppedTask = groups
      .flatMap((candidateGroup) => candidateGroup.tasks)
      .find((task) => task.id === droppedTaskId);
    if (!canDrag || movingTaskId !== null || droppedTask === undefined) {
      resetDrag();
      return;
    }
    resetDrag();
    void onMoveTask(droppedTask, group.id, group.tasks);
  };
  const renderTask = (task: TaskWithProject): ReactNode => (
    // biome-ignore lint/a11y/noStaticElementInteractions: This wrapper owns native drag events; the card contains a keyboard-accessible preview button.
    <div
      key={task.id}
      className={draggedTaskId === task.id ? "saved-task-drag dragging" : "saved-task-drag"}
      draggable={canDrag && movingTaskId === null}
      onDragStart={(event) => handleDragStart(event, task.id)}
      onDragEnd={resetDrag}
    >
      <TaskCard
        task={task}
        data={data}
        properties={draft.settings.displayProperties}
        moving={movingTaskId === task.id}
        onOpenTask={onOpenTask}
        onUpdateTask={onUpdateTask}
      />
    </div>
  );

  if (draft.settings.subGrouping !== "none") {
    return (
      <div className="saved-board-grouped-scroll">
        <div
          className="saved-board-grouped"
          style={{
            gridTemplateColumns: `repeat(${Math.max(groups.length, 1)}, minmax(250px, 1fr))`,
          }}
        >
          {groups.map((group) => (
            <div className="saved-board-column-head" key={group.id}>
              <strong>{group.title}</strong>
              <GroupCountBadge
                count={group.tasks.length}
                statusColor={statusColorsByGroupId.get(group.id)}
              />
            </div>
          ))}
          {rowGroups.map((row) => {
            const rowTaskIds = new Set(row.tasks.map((task) => task.id));
            const collapsed = collapsedRowIds.has(row.id);
            return (
              <Fragment key={row.id}>
                <button
                  type="button"
                  className="saved-board-row-head"
                  aria-expanded={!collapsed}
                  onClick={() => toggleRow(row.id)}
                >
                  <ChevronRight size={13} aria-hidden="true" />
                  <strong>{row.title}</strong>
                  <span>{row.tasks.length}</span>
                  <MoreHorizontal size={15} aria-hidden="true" />
                </button>
                {!collapsed &&
                  groups.map((group) => {
                    const targetKey = `${row.id}:${group.id}`;
                    const cellTasks = group.tasks.filter((task) => rowTaskIds.has(task.id));
                    return (
                      <section
                        key={targetKey}
                        className={
                          dropTargetKey === targetKey
                            ? "saved-board-group-cell kanban-drop-target"
                            : "saved-board-group-cell"
                        }
                        aria-label={`${row.title}, ${group.title}`}
                        onDragOver={(event) => handleDragOver(event, targetKey)}
                        onDrop={(event) => handleDrop(event, group)}
                      >
                        {cellTasks.map(renderTask)}
                      </section>
                    );
                  })}
              </Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="saved-board">
      {groups.map((group) => (
        <section
          key={group.id}
          className={dropTargetKey === group.id ? "kanban-drop-target" : undefined}
          aria-label={group.title}
          onDragOver={(event) => handleDragOver(event, group.id)}
          onDrop={(event) => handleDrop(event, group)}
        >
          <div className="saved-group-head">
            <strong>{group.title}</strong>
            <GroupCountBadge
              count={group.tasks.length}
              statusColor={statusColorsByGroupId.get(group.id)}
            />
          </div>
          {renderSubgroups(group.tasks, "none", data).map((subgroup) => (
            <div key={subgroup.id} className="saved-subgroup">
              {subgroup.tasks.map(renderTask)}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function GroupCountBadge({
  count,
  statusColor,
}: Readonly<{ count: number; statusColor: string | undefined }>): ReactNode {
  if (statusColor === undefined) return <Badge color="gray">{count}</Badge>;
  return (
    <Badge
      className="status-count-badge"
      style={{ "--status-badge-color": statusColor } as CSSProperties}
    >
      {count}
    </Badge>
  );
}

function ListView({
  groups,
  data,
  draft,
  onOpenTask,
}: Readonly<{
  groups: TaskGroup[];
  data: WorkspaceBootstrap;
  draft: ViewDraft;
  onOpenTask: OpenTaskPreview;
}>): ReactNode {
  return (
    <Card className="saved-list">
      {groups.map((group) => (
        <section key={group.id}>
          <div className="saved-list-group">
            <strong>{group.title}</strong>
            <Badge color="gray">{group.tasks.length}</Badge>
          </div>
          {renderSubgroups(group.tasks, draft.settings.subGrouping, data).map((subgroup) => (
            <div key={subgroup.id}>
              {draft.settings.subGrouping !== "none" && (
                <div className="saved-list-subgroup">{subgroup.title}</div>
              )}
              {subgroup.tasks.map((task) => (
                <TaskLine
                  key={task.id}
                  task={task}
                  data={data}
                  properties={draft.settings.displayProperties}
                  onOpenTask={onOpenTask}
                />
              ))}
            </div>
          ))}
        </section>
      ))}
    </Card>
  );
}

function TaskCard({
  task,
  data,
  properties,
  moving = false,
  onOpenTask,
  onUpdateTask,
}: Readonly<{
  task: TaskWithProject;
  data: WorkspaceBootstrap;
  properties: DisplayProperty[];
  moving?: boolean;
  onOpenTask: OpenTaskPreview;
  onUpdateTask: UpdateCardTask;
}>): ReactNode {
  const status = data.statuses.find((item) => item.id === task.statusId);
  const assignee = data.workspace.members.find((member) => member.userId === task.assigneeUserId);
  const hasSubtasks = subtaskStatusSlices(task.id, data).length > 0;
  return (
    <Card className={moving ? "saved-task-card moving" : "saved-task-card"}>
      {hasSubtasks && <SubtaskStatusChart task={task} data={data} mode="chart" />}
      <button
        className="task-preview-button"
        type="button"
        aria-label={`Открыть задачу ${task.title}`}
        onClick={() => onOpenTask(task)}
      />
      <div className="saved-task-card-head">
        <Link
          className="issue-identifier-link"
          href={workspaceIssueHref(data.workspace.slug, task.projectKey, task.number, task.title)}
          aria-label={`Открыть задачу ${issueIdentifier(task.projectKey, task.number)} на отдельной странице`}
          onClick={(event) => event.stopPropagation()}
        >
          {issueIdentifier(task.projectKey, task.number)}
          <ExternalLink size={11} />
        </Link>
        <TaskAssigneePicker
          task={task}
          assignee={assignee}
          members={data.workspace.members}
          onChange={(assigneeUserId) =>
            onUpdateTask(task, { operation: "assignee", assigneeUserId })
          }
        />
      </div>
      <div className="saved-task-card-title">
        <TaskStatusPicker
          status={status}
          statuses={data.statuses.filter((item) => item.projectId === task.projectId)}
          onChange={(statusId) => onUpdateTask(task, { operation: "status", statusId })}
        />
        <strong>{task.title}</strong>
      </div>
      {task.parentTaskId !== null && task.parentTaskId !== undefined && <small>Подзадача</small>}
      {hasSubtasks && <SubtaskStatusChart task={task} data={data} mode="legend" />}
      <TaskProperties
        task={task}
        data={data}
        properties={properties.filter(
          (property) => property !== "status" && property !== "assignee",
        )}
      />
    </Card>
  );
}

function TaskStatusPicker({
  status,
  statuses,
  onChange,
}: Readonly<{
  status: WorkspaceBootstrap["statuses"][number] | undefined;
  statuses: WorkspaceBootstrap["statuses"];
  onChange: (statusId: string) => Promise<void>;
}>): ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleStatuses = statuses.filter((item) =>
    item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <Popover.Trigger>
        <button
          type="button"
          className="task-card-status-trigger"
          aria-label={`Изменить статус: ${status?.name ?? "Backlog"}`}
          title={status?.name ?? "Backlog"}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <TaskStatusIndicator color={status?.color} size="sm" />
        </button>
      </Popover.Trigger>
      <Popover.Content className="task-card-picker" align="start" sideOffset={6}>
        <TextField.Root
          size="2"
          value={query}
          placeholder="Изменить статус…"
          aria-label="Поиск статуса"
          onChange={(event) => setQuery(event.target.value)}
        >
          <TextField.Slot>
            <Search size={14} />
          </TextField.Slot>
        </TextField.Root>
        <div className="task-card-picker-list">
          {visibleStatuses.map((item) => (
            <button
              type="button"
              className="task-card-picker-option"
              key={item.id}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                void onChange(item.id);
              }}
            >
              <TaskStatusIndicator color={item.color} size="md" />
              <span className="task-card-picker-option-label">{item.name}</span>
              {item.id === status?.id && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function TaskAssigneePicker({
  task,
  assignee,
  members,
  onChange,
}: Readonly<{
  task: TaskWithProject;
  assignee: WorkspaceBootstrap["workspace"]["members"][number] | undefined;
  members: WorkspaceBootstrap["workspace"]["members"];
  onChange: (assigneeUserId: string | null) => Promise<void>;
}>): ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleMembers = members.filter((member) =>
    `${member.displayName} ${member.email ?? ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <Popover.Trigger>
        <button
          type="button"
          className="task-card-assignee-trigger"
          aria-label={`Изменить исполнителя задачи ${task.title}`}
          title={assignee?.displayName ?? "Не назначено"}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Avatar
            size="1"
            src={assignee?.avatarUrl ?? undefined}
            fallback={
              assignee === undefined ? (
                <UserRound size={13} />
              ) : (
                memberInitials(assignee.displayName)
              )
            }
          />
        </button>
      </Popover.Trigger>
      <Popover.Content className="task-card-picker assignee" align="end" sideOffset={6}>
        <TextField.Root
          size="2"
          value={query}
          placeholder="Назначить…"
          aria-label="Поиск исполнителя"
          onChange={(event) => setQuery(event.target.value)}
        >
          <TextField.Slot>
            <Search size={14} />
          </TextField.Slot>
        </TextField.Root>
        <div className="task-card-picker-list">
          <button
            type="button"
            className="task-card-picker-option"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              void onChange(null);
            }}
          >
            <Avatar size="1" fallback={<UserRound size={13} />} />
            <span className="task-card-picker-option-label">Не назначено</span>
            {assignee === undefined && <Check size={15} aria-hidden="true" />}
          </button>
          {visibleMembers.map((member) => (
            <button
              type="button"
              className="task-card-picker-option"
              key={member.userId}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                void onChange(member.userId);
              }}
            >
              <Avatar
                size="1"
                src={member.avatarUrl ?? undefined}
                fallback={memberInitials(member.displayName)}
              />
              <span className="task-card-picker-option-label">{member.displayName}</span>
              {member.userId === task.assigneeUserId && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

function memberInitials(displayName: string): string {
  return displayName
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? "")
    .join("");
}

function TaskLine({
  task,
  data,
  properties,
  onOpenTask,
}: Readonly<{
  task: TaskWithProject;
  data: WorkspaceBootstrap;
  properties: DisplayProperty[];
  onOpenTask: OpenTaskPreview;
}>): ReactNode {
  const hasSubtasks = subtaskStatusSlices(task.id, data).length > 0;
  return (
    <div className="saved-task-line">
      <button
        className="task-preview-button"
        type="button"
        aria-label={`Открыть задачу ${task.title}`}
        onClick={() => onOpenTask(task)}
      />
      <TaskStatusIndicator
        color={data.statuses.find((status) => status.id === task.statusId)?.color}
        size="sm"
      />
      <Link
        className="issue-identifier-link"
        href={workspaceIssueHref(data.workspace.slug, task.projectKey, task.number, task.title)}
        aria-label={`Открыть задачу ${issueIdentifier(task.projectKey, task.number)} на отдельной странице`}
        onClick={(event) => event.stopPropagation()}
      >
        {issueIdentifier(task.projectKey, task.number)}
        <ExternalLink size={11} />
      </Link>
      <strong className="saved-task-line-title">{task.title}</strong>
      {hasSubtasks && <SubtaskStatusChart task={task} data={data} compact mode="legend" />}
      <TaskProperties task={task} data={data} properties={properties} />
    </div>
  );
}

function SubtaskStatusChart({
  task,
  data,
  compact = false,
  mode = "both",
}: Readonly<{
  task: TaskWithProject;
  data: WorkspaceBootstrap;
  compact?: boolean;
  mode?: "both" | "chart" | "legend";
}>): ReactNode {
  if (task.parentTaskId !== null && task.parentTaskId !== undefined) return null;

  const slices = subtaskStatusSlices(task.id, data);
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  if (total === 0) return null;

  const breakdown = slices.map((slice) => `${slice.label}: ${slice.count}`).join(", ");

  const chart = (
    <div
      className="subtask-status-chart"
      role="img"
      aria-label={`Всего подзадач: ${total}. ${breakdown}`}
    >
      {slices.map((slice) => (
        <span
          key={slice.id}
          title={`${slice.label}: ${slice.count}`}
          style={{
            backgroundColor: slice.color,
            flexGrow: slice.count,
          }}
        />
      ))}
    </div>
  );

  if (mode === "chart") return chart;

  return (
    <div className={compact ? "subtask-status-summary compact" : "subtask-status-summary"}>
      {mode === "both" && chart}
      <div className="subtask-status-legend" aria-hidden="true">
        {slices.map((slice) => (
          <span className="subtask-status-legend-item" key={slice.id}>
            <TaskStatusIndicator color={slice.color} size="xs" />
            <span>{slice.label}</span>
            <strong>{slice.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function subtaskStatusSlices(parentTaskId: string, data: WorkspaceBootstrap): SubtaskStatusSlice[] {
  const counts = new Map<string, number>();
  for (const project of data.projectData) {
    for (const task of project.tasks) {
      if (task.parentTaskId !== parentTaskId) continue;
      const key = task.statusId ?? noStatusKey;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const slices = data.statuses.flatMap((status) => {
    const count = counts.get(status.id);
    return count === undefined
      ? []
      : [{ id: status.id, label: status.name, color: status.color ?? "#A1A1AA", count }];
  });
  const withoutStatus = counts.get(noStatusKey);
  return withoutStatus === undefined
    ? slices
    : [
        ...slices,
        { id: noStatusKey, label: "Без статуса", color: "#A1A1AA", count: withoutStatus },
      ];
}

function TaskProperties({
  task,
  data,
  properties,
}: Readonly<{
  task: TaskWithProject;
  data: WorkspaceBootstrap;
  properties: DisplayProperty[];
}>): ReactNode {
  return (
    <div className="saved-task-properties">
      {properties.map((property) => (
        <span key={property}>
          {property === "status" && (
            <TaskStatusIndicator
              color={data.statuses.find((status) => status.id === task.statusId)?.color}
              size="xs"
            />
          )}
          {propertyValue(property, task, data)}
        </span>
      ))}
    </div>
  );
}

function TaskDetailsDrawer({
  data,
  task,
  onClose,
}: Readonly<{
  data: WorkspaceBootstrap;
  task: TaskWithProject | null;
  onClose: () => void;
}>): ReactNode {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const identifier = task === null ? "Задача" : issueIdentifier(task.projectKey, task.number);
  const href =
    task === null
      ? null
      : workspaceIssueHref(data.workspace.slug, task.projectKey, task.number, task.title);

  return (
    <DialogPrimitive.Root
      open={task !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="task-drawer-overlay" />
        <DialogPrimitive.Content className="task-drawer">
          <header className="task-drawer-header">
            <div>
              <DialogPrimitive.Title>{identifier}</DialogPrimitive.Title>
              <DialogPrimitive.Description>Просмотр задачи</DialogPrimitive.Description>
            </div>
            <div className="task-drawer-actions">
              {href !== null && (
                <IconButton asChild variant="ghost" color="gray">
                  <Link href={href} aria-label="Открыть задачу на отдельной странице">
                    <ExternalLink size={17} />
                  </Link>
                </IconButton>
              )}
              <DialogPrimitive.Close asChild>
                <IconButton variant="ghost" color="gray" aria-label="Закрыть задачу">
                  <X size={18} />
                </IconButton>
              </DialogPrimitive.Close>
            </div>
          </header>
          {task !== null && (
            <div className="task-drawer-body">
              <TaskDetailsContent
                data={data}
                identifier={identifier}
                portalContainer={portalContainer}
                task={task}
              />
            </div>
          )}
          <div className="task-drawer-portals" ref={setPortalContainer} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CreateViewDialog({
  open,
  setOpen,
  saving,
  onCreate,
}: Readonly<{
  open: boolean;
  setOpen: (open: boolean) => void;
  saving: boolean;
  onCreate: (draft: ViewDraft) => Promise<void>;
}>): ReactNode {
  const [name, setName] = useState("Новый view");
  const [layout, setLayout] = useState<SavedView["layout"]>("board");
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Создать view</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          Настройки можно изменить после создания.
        </Dialog.Description>
        <div className="create-view-form">
          <div className="create-view-field">
            <Text size="2">Название</Text>
            <TextField.Root
              aria-label="Название view"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="create-view-field">
            <Text size="2">Вид</Text>
            <Select.Root
              value={layout}
              onValueChange={(value) => {
                if (value === "list" || value === "board" || value === "matrix") {
                  setLayout(value);
                }
              }}
            >
              <Select.Trigger aria-label="Вид отображения" />
              <Select.Content>
                <Select.Item value="list">Список</Select.Item>
                <Select.Item value="board">Доска</Select.Item>
                <Select.Item value="matrix">Матрица</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>
        <div className="dialog-actions">
          <Dialog.Close>
            <Button color="gray" variant="soft">
              Отмена
            </Button>
          </Dialog.Close>
          <Button
            disabled={saving || name.trim().length === 0}
            onClick={() =>
              void onCreate({
                name: name.trim(),
                description: null,
                projectId: null,
                layout,
                settings: {
                  ...defaultSettings,
                  subGrouping: layout === "board" ? "parent_task" : "none",
                },
              })
            }
          >
            Создать
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function operatorsForField(
  field: FilterField,
): ReadonlyArray<{ label: string; value: FilterOperator }> {
  if (field === "due_date")
    return [
      { label: "До даты", value: "before" },
      { label: "После даты", value: "after" },
      { label: "Без срока", value: "is_empty" },
      { label: "С указанным сроком", value: "is_not_empty" },
    ];
  if (field === "content")
    return [
      { label: "Содержит", value: "contains" },
      { label: "Не содержит", value: "not_contains" },
    ];
  return [
    { label: "Совпадает", value: "is" },
    { label: "Не совпадает", value: "is_not" },
  ];
}
function entityFilterOptions(
  field: FilterField,
  data: WorkspaceBootstrap,
): Array<{ label: string; value: string }> {
  if (field === "status")
    return [
      ...mergeLogicalStatuses(data.statuses).map((status) => ({
        label: status.name,
        value: status.key,
      })),
    ];
  if (field === "project")
    return data.projects.map((project) => ({
      label: project.title,
      value: project.id,
    }));
  if (field === "template")
    return [
      ...data.taskSkills.map((taskSkill) => ({
        label: taskSkill.name,
        value: taskSkill.id,
      })),
      { label: "Без шаблона", value: "none" },
    ];
  if (field === "assignee" || field === "creator")
    return [
      {
        label: field === "assignee" ? "Не назначено" : "Неизвестный пользователь",
        value: "none",
      },
      ...data.workspace.members.map((member) => ({
        label: member.displayName,
        value: member.userId,
      })),
    ];
  return [];
}
function initialFilter(field: FilterField, data: WorkspaceBootstrap): ViewFilter {
  if (field === "due_date") return { field, operator: "is_empty", value: null };
  if (field === "content") return { field, operator: "contains", value: "" };
  return {
    field,
    operator: "is",
    value: entityFilterOptions(field, data).at(0)?.value ?? "none",
  };
}
function filterLabel(filter: ViewFilter, data: WorkspaceBootstrap): string {
  const fieldLabel = filterFields.find((item) => item.field === filter.field)?.label ?? "Фильтр";
  const operatorLabel = operatorsForField(filter.field).find(
    (item) => item.value === filter.operator,
  )?.label;
  if (filter.operator === "is_empty" || filter.operator === "is_not_empty")
    return `${fieldLabel}: ${operatorLabel ?? filter.operator}`;
  const normalizedValue =
    filter.field === "status"
      ? normalizeStatusFilterValue(filter.value, data.statuses)
      : filter.value;
  const optionLabel = entityFilterOptions(filter.field, data).find(
    (item) => item.value === normalizedValue,
  )?.label;
  return `${fieldLabel} ${operatorLabel?.toLocaleLowerCase("ru") ?? filter.operator} ${optionLabel ?? filter.value ?? "—"}`;
}

function collectTasks(
  data: WorkspaceBootstrap,
  draft: ViewDraft,
  taskOverrides: Record<string, TaskBoardOverride>,
): TaskWithProject[] {
  const tasks = collectWorkspaceTasks(data, draft.projectId ?? null, taskOverrides)
    .filter(
      (task) =>
        draft.settings.showSubtasks ||
        task.parentTaskId === null ||
        task.parentTaskId === undefined,
    )
    .filter((task) => matchesFilters(task, draft.settings.filters ?? [], data));
  return sortTasks(tasks, draft.settings, data);
}
function collectWorkspaceTasks(
  data: WorkspaceBootstrap,
  projectId: string | null,
  taskOverrides: Record<string, TaskBoardOverride>,
): TaskWithProject[] {
  return data.projectData
    .filter((project) => projectId === null || project.projectId === projectId)
    .flatMap((project) => {
      const title = project.projectTitle;
      const key = project.projectKey;
      return project.tasks.map((task) => {
        const override = taskOverrides[task.id];
        return override === undefined
          ? { ...task, projectKey: key, projectTitle: title }
          : {
              ...task,
              statusId: override.statusId,
              position: override.position,
              projectKey: key,
              projectTitle: title,
            };
      });
    });
}
function matchesFilters(
  task: TaskWithProject,
  filters: ViewFilter[],
  data: WorkspaceBootstrap,
): boolean {
  return filters.every((filter) => matchesFilter(task, filter, data));
}
function matchesFilter(
  task: TaskWithProject,
  filter: ViewFilter,
  data: WorkspaceBootstrap,
): boolean {
  if (filter.field === "due_date") {
    if (filter.operator === "is_empty") return task.dueAt === null || task.dueAt === undefined;
    if (filter.operator === "is_not_empty") return task.dueAt !== null && task.dueAt !== undefined;
    if (task.dueAt === null || task.dueAt === undefined || filter.value === null) return false;
    const taskDate = task.dueAt.slice(0, 10);
    return filter.operator === "before" ? taskDate < filter.value : taskDate > filter.value;
  }
  if (filter.field === "content") {
    const query = (filter.value ?? "").toLocaleLowerCase("ru");
    const content = `${task.title}\n${task.description ?? ""}`.toLocaleLowerCase("ru");
    const contains = content.includes(query);
    return filter.operator === "not_contains" ? !contains : contains;
  }
  const actualValue =
    filter.field === "status"
      ? logicalStatusKeyForTask(task.statusId, data.statuses)
      : filter.field === "project"
        ? task.projectId
        : filter.field === "template"
          ? (task.sourceSkillId ?? "none")
          : filter.field === "assignee"
            ? (task.assigneeUserId ?? "none")
            : (task.createdByUserId ?? "none");
  const expectedValue =
    filter.field === "status"
      ? normalizeStatusFilterValue(filter.value, data.statuses)
      : filter.value;
  const matches = actualValue === expectedValue;
  return filter.operator === "is_not" ? !matches : matches;
}
function readableColor(color: string | undefined): "#111113" | "#ffffff" {
  if (color === undefined || !/^#[0-9a-f]{6}$/i.test(color)) return "#111113";
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160 ? "#111113" : "#ffffff";
}
function withoutTaskOverride(
  overrides: Record<string, TaskBoardOverride>,
  taskId: string,
): Record<string, TaskBoardOverride> {
  return Object.fromEntries(Object.entries(overrides).filter(([id]) => id !== taskId));
}
function sortTasks(
  tasks: TaskWithProject[],
  settings: ViewSettings,
  data: WorkspaceBootstrap,
): TaskWithProject[] {
  return [...tasks].sort((left, right) => {
    let result = 0;
    if (settings.ordering === "title") result = left.title.localeCompare(right.title, "ru");
    else if (settings.ordering === "status")
      result = logicalStatusKeyForTask(left.statusId, data.statuses).localeCompare(
        logicalStatusKeyForTask(right.statusId, data.statuses),
        "ru",
      );
    else if (settings.ordering === "created_at")
      result = left.createdAt.localeCompare(right.createdAt);
    else if (settings.ordering === "updated_at")
      result = left.updatedAt.localeCompare(right.updatedAt);
    else if (settings.ordering === "due_at")
      result = (left.dueAt ?? "9999").localeCompare(right.dueAt ?? "9999");
    else result = Number(left.position) - Number(right.position);
    return settings.orderDirection === "asc" ? result : -result;
  });
}
function groupTasks(
  tasks: TaskWithProject[],
  grouping: ViewGrouping,
  data: WorkspaceBootstrap,
  showEmpty: boolean,
): TaskGroup[] {
  if (grouping === "none") return [{ id: "all", title: "Все задачи", tasks }];
  const definitions = groupingDefinitions(grouping, tasks, data);
  const parentTaskIds = new Set(
    tasks.flatMap((task) =>
      task.parentTaskId === null || task.parentTaskId === undefined ? [] : [task.parentTaskId],
    ),
  );
  return definitions
    .map((definition) => {
      const groupedTasks = tasks.filter(
        (task) => groupId(task, grouping, parentTaskIds, data) === definition.id,
      );
      if (grouping === "parent_task" && definition.id !== "none") {
        groupedTasks.sort((left, right) => {
          if (left.id === definition.id) return -1;
          if (right.id === definition.id) return 1;
          return 0;
        });
      }
      return { ...definition, tasks: groupedTasks };
    })
    .filter((group) => showEmpty || group.tasks.length > 0);
}
function renderSubgroups(
  tasks: TaskWithProject[],
  grouping: ViewGrouping,
  data: WorkspaceBootstrap,
): TaskGroup[] {
  return groupTasks(tasks, grouping, data, false);
}
function groupingDefinitions(
  grouping: ViewGrouping,
  tasks: TaskWithProject[],
  data: WorkspaceBootstrap,
): Array<{ id: string; title: string }> {
  if (grouping === "status")
    return [
      ...mergeLogicalStatusesForProjects(
        data.statuses,
        new Set(tasks.map((task) => task.projectId)),
      ).map((status) => ({
        id: status.key,
        title: status.name,
      })),
    ];
  if (grouping === "project")
    return data.projects.map((project) => ({
      id: project.id,
      title: project.title,
    }));
  if (grouping === "parent_task") {
    const allWorkspaceTasks = data.projectData.flatMap((project) => project.tasks);
    const parentTaskIds = new Set(
      tasks
        .map((task) => task.parentTaskId)
        .filter(
          (parentTaskId): parentTaskId is string =>
            parentTaskId !== null && parentTaskId !== undefined,
        ),
    );
    const visibleRootIds = new Set(
      tasks
        .filter((task) => task.parentTaskId === null || task.parentTaskId === undefined)
        .map((task) => task.id),
    );
    const visibleParentTasks = allWorkspaceTasks.filter((task) => visibleRootIds.has(task.id));
    const visibleParentIds = new Set(visibleParentTasks.map((task) => task.id));
    return [
      ...visibleParentTasks.map((task) => ({ id: task.id, title: task.title })),
      ...[...parentTaskIds]
        .filter((parentTaskId) => !visibleParentIds.has(parentTaskId))
        .map((parentTaskId) => ({
          id: parentTaskId,
          title:
            allWorkspaceTasks.find((task) => task.id === parentTaskId)?.title ??
            "Родительская задача",
        })),
      { id: "none", title: "Без родительской задачи" },
    ];
  }
  return [{ id: "all", title: "Все задачи" }];
}
function groupId(
  task: TaskWithProject,
  grouping: ViewGrouping,
  parentTaskIds: ReadonlySet<string>,
  data: WorkspaceBootstrap,
): string {
  if (grouping === "status") return logicalStatusKeyForTask(task.statusId, data.statuses);
  if (grouping === "project") return task.projectId;
  if (grouping === "parent_task") {
    if (task.parentTaskId !== null && task.parentTaskId !== undefined) return task.parentTaskId;
    return parentTaskIds.has(task.id) ? task.id : "none";
  }
  return "all";
}
function propertyValue(
  property: DisplayProperty,
  task: TaskWithProject,
  data: WorkspaceBootstrap,
): string {
  if (property === "status")
    return data.statuses.find((status) => status.id === task.statusId)?.name ?? "Без статуса";
  if (property === "project") return task.projectTitle;
  if (property === "assignee")
    return task.assigneeUserId === null || task.assigneeUserId === undefined
      ? "Не назначено"
      : (data.workspace.members.find((member) => member.userId === task.assigneeUserId)
          ?.displayName ?? "Исполнитель");
  if (property === "due_at") return formatDate(task.dueAt);
  if (property === "created_at") return `Создано ${formatDate(task.createdAt)}`;
  return `Обновлено ${formatDate(task.updatedAt)}`;
}
function formatDate(value: string | null | undefined): string {
  return value === null || value === undefined
    ? "Без срока"
    : new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
      }).format(new Date(value));
}
function toDraft(view: SavedView): ViewDraft {
  return {
    name: view.name,
    description: view.description ?? null,
    projectId: view.projectId ?? null,
    layout: view.layout,
    settings: {
      ...view.settings,
      displayProperties: [...view.settings.displayProperties],
      filters: [...(view.settings.filters ?? [])],
    },
  };
}
function viewDraftEquals(draft: ViewDraft, view: SavedView): boolean {
  const settings = view.settings;
  return (
    draft.name === view.name &&
    (draft.description ?? null) === (view.description ?? null) &&
    (draft.projectId ?? null) === (view.projectId ?? null) &&
    draft.layout === view.layout &&
    draft.settings.grouping === settings.grouping &&
    draft.settings.subGrouping === settings.subGrouping &&
    draft.settings.ordering === settings.ordering &&
    draft.settings.orderDirection === settings.orderDirection &&
    draft.settings.showSubtasks === settings.showSubtasks &&
    draft.settings.showEmptyGroups === settings.showEmptyGroups &&
    draft.settings.displayProperties.length === settings.displayProperties.length &&
    draft.settings.displayProperties.every(
      (property, index) => property === settings.displayProperties[index],
    ) &&
    draft.settings.filters.length === (settings.filters ?? []).length &&
    draft.settings.filters.every((filter, index) => {
      const savedFilter = settings.filters?.[index];
      return (
        savedFilter !== undefined &&
        filter.field === savedFilter.field &&
        filter.operator === savedFilter.operator &&
        filter.value === savedFilter.value
      );
    })
  );
}
function viewsUrl(projectId: string | null): string {
  return projectId === null ? "/views" : `/views?project=${encodeURIComponent(projectId)}`;
}
function isSavedView(value: unknown): value is SavedView {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "slug" in value &&
    typeof value.slug === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "settings" in value &&
    typeof value.settings === "object" &&
    value.settings !== null
  );
}
function readError(value: unknown, fallback: string): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}
