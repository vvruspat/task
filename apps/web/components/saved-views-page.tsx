"use client";

import {
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
  ChevronRight,
  Columns3,
  Funnel,
  Layers3,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  notifyWorkspaceDataChanged,
  useWorkspaceData,
} from "../lib/use-workspace-data";
import type { WorkspaceBootstrap } from "../lib/workspace-contracts";
import { useWorkspaceStore } from "../lib/workspace-store";

type ViewSettings = SavedView["settings"];
type ViewGrouping = ViewSettings["grouping"];
type DisplayProperty = ViewSettings["displayProperties"][number];
type ViewFilter = ViewSettings["filters"][number];
type FilterField = ViewFilter["field"];
type FilterOperator = ViewFilter["operator"];
type ViewDraft = Pick<
  SavedView,
  "name" | "description" | "projectId" | "layout" | "settings"
>;
type TaskWithProject = TaskSummary & { projectTitle: string };
type TaskGroup = { id: string; title: string; tasks: TaskWithProject[] };
type TaskBoardOverride = { statusId: string | null; position: string };
type MoveBoardTask = (
  task: TaskWithProject,
  targetStatusId: string | null,
  targetTasks: TaskWithProject[],
) => Promise<void>;

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

export function SavedViewsPage(): ReactNode {
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
  const [taskOverrides, setTaskOverrides] = useState<
    Record<string, TaskBoardOverride>
  >({});
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const selected =
    data?.views.find((view) => view.id === queryViewId) ??
    data?.views.find((view) => view.id === selectedId) ??
    data?.views.at(0);

  useEffect(() => {
    if (
      selected !== undefined &&
      (draft === null || selected.id !== selectedId)
    ) {
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
    const response = await fetch("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const result: unknown = await response.json();
    if (!response.ok || !isSavedView(result)) {
      setMutationError(readError(result, "Не удалось создать view."));
      setSaving(false);
      return;
    }
    await refresh();
    notifyWorkspaceDataChanged();
    setSelectedId(result.id);
    setDraft(toDraft(result));
    router.replace(savedViewUrl(result.id, queryProjectId));
    setCreateOpen(false);
    setSaving(false);
  };
  const saveView = async (): Promise<void> => {
    if (selected === undefined || draft === null) return;
    setSaving(true);
    setMutationError(null);
    const response = await fetch(`/api/views/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result: unknown = await response.json();
    if (!response.ok || !isSavedView(result)) {
      setMutationError(readError(result, "Не удалось сохранить view."));
      setSaving(false);
      return;
    }
    await refresh();
    notifyWorkspaceDataChanged();
    setDraft(toDraft(result));
    setSaving(false);
  };
  const deleteView = async (): Promise<void> => {
    if (selected === undefined) return;
    setSaving(true);
    setMutationError(null);
    const response = await fetch(`/api/views/${selected.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const result: unknown = await response.json();
      setMutationError(readError(result, "Не удалось удалить view."));
      setSaving(false);
      return;
    }
    setSelectedId(null);
    setDraft(null);
    await refresh();
    notifyWorkspaceDataChanged();
    const nextView = data.views.find((view) => view.id !== selected.id);
    router.replace(
      nextView === undefined
        ? viewsUrl(queryProjectId)
        : savedViewUrl(nextView.id, queryProjectId),
    );
    setSaving(false);
  };
  const moveBoardTask: MoveBoardTask = async (
    task,
    targetStatusId,
    targetTasks,
  ) => {
    const nextPosition = String(
      targetTasks
        .filter((targetTask) => targetTask.id !== task.id)
        .reduce((maximum, targetTask) => {
          const position = Number(
            taskOverrides[targetTask.id]?.position ?? targetTask.position,
          );
          return Number.isFinite(position)
            ? Math.max(maximum, position)
            : maximum;
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
      if (!response.ok) {
        setMutationError(readError(result, "Не удалось переместить задачу."));
        setTaskOverrides((current) => withoutTaskOverride(current, task.id));
        return;
      }
      await refresh();
      setTaskOverrides((current) => withoutTaskOverride(current, task.id));
    } catch (moveError: unknown) {
      setMutationError(
        moveError instanceof Error
          ? moveError.message
          : "Не удалось переместить задачу.",
      );
      setTaskOverrides((current) => withoutTaskOverride(current, task.id));
    } finally {
      setMovingTaskId(null);
    }
  };

  const hasChanges =
    selected !== undefined &&
    draft !== null &&
    !viewDraftEquals(draft, selected);

  return (
    <div className="views-page">
      {data.views.length === 0 || selected === undefined || draft === null ? (
        <ViewsEmpty onCreate={() => setCreateOpen(true)} />
      ) : (
        <section className="view-editor">
          <div className="view-editor-head">
            <ViewIdentityEditor
              key={selected.id}
              draft={draft}
              setDraft={setDraft}
            />
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
                  <IconButton
                    variant="ghost"
                    color="gray"
                    aria-label="Действия view"
                  >
                    <MoreHorizontal size={17} />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item
                    color="red"
                    onSelect={() => void deleteView()}
                  >
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
          />
        </section>
      )}
      <CreateViewDialog
        open={createOpen}
        setOpen={setCreateOpen}
        saving={saving}
        onCreate={createView}
      />
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
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value || null })
          }
        />
      ) : (
        <button
          className={
            draft.description === null
              ? "view-description empty"
              : "view-description"
          }
          type="button"
          onClick={() => setEditingDescription(true)}
        >
          {draft.description ?? "Добавить описание"}
        </button>
      )}
    </div>
  );
}

function ViewsEmpty({
  onCreate,
}: Readonly<{ onCreate: () => void }>): ReactNode {
  return (
    <Card className="views-empty">
      <span>
        <Layers3 size={30} />
      </span>
      <h2>Создайте первый view</h2>
      <p>
        Выберите список или доску, группировку и поля. Настройки сохранятся для
        быстрого доступа.
      </p>
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
            onClick={() => setDraft({ ...draft, layout: "list" })}
          >
            <List size={14} /> Список
          </Button>
          <Button
            size="1"
            variant={draft.layout === "board" ? "solid" : "soft"}
            color={draft.layout === "board" ? "indigo" : "gray"}
            onClick={() => setDraft({ ...draft, layout: "board" })}
          >
            <Columns3 size={14} /> Доска
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
            <span
              key={`${filter.field}-${filter.operator}-${filter.value ?? "none"}-${index}`}
            >
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
    (operator === "is_empty" ||
      operator === "is_not_empty" ||
      value.trim().length > 0);
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
              {visibleFields.map(
                ({ field: optionField, icon: Icon, label }) => (
                  <button
                    type="button"
                    key={optionField}
                    onClick={() => beginFilter(optionField)}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                    <ChevronRight size={14} />
                  </button>
                ),
              )}
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
                value:
                  operator === "is_empty" || operator === "is_not_empty"
                    ? null
                    : value.trim(),
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
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          aria-label="Назад"
          onClick={onBack}
        >
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
            const nextOperator = filterOperators.find(
              (item) => item === nextValue,
            );
            if (nextOperator !== undefined) setOperator(nextOperator);
          }}
        >
          <Select.Trigger aria-label="Условие фильтра" />
          <Select.Content>
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
              <Select.Content>
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
            onClick={() => setDraft({ ...draft, layout: "list" })}
          >
            <List size={14} /> List
          </Button>
          <Button
            size="1"
            variant={draft.layout === "board" ? "solid" : "soft"}
            color="gray"
            onClick={() => setDraft({ ...draft, layout: "board" })}
          >
            <Columns3 size={14} /> Board
          </Button>
        </div>
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
                orderDirection:
                  settings.orderDirection === "asc" ? "desc" : "asc",
              })
            }
          >
            {settings.orderDirection === "asc"
              ? "По возрастанию"
              : "По убыванию"}
          </Button>
        </div>
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
                      ? settings.displayProperties.filter(
                          (item) => item !== property,
                        )
                      : [...settings.displayProperties, property],
                  })
                }
              >
                {propertyLabels[property]}
              </button>
            );
          })}
        </div>
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
        <Select.Content>
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
}: Readonly<{
  data: WorkspaceBootstrap;
  draft: ViewDraft;
  taskOverrides: Record<string, TaskBoardOverride>;
  movingTaskId: string | null;
  onMoveTask: MoveBoardTask;
}>): ReactNode {
  const tasks = useMemo(
    () => collectTasks(data, draft, taskOverrides),
    [data, draft, taskOverrides],
  );
  const groups = useMemo(
    () =>
      groupTasks(
        tasks,
        draft.settings.grouping,
        data,
        draft.settings.showEmptyGroups,
      ),
    [tasks, draft.settings.grouping, draft.settings.showEmptyGroups, data],
  );
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
      data={data}
      draft={draft}
      movingTaskId={movingTaskId}
      onMoveTask={onMoveTask}
    />
  ) : (
    <ListView groups={groups} data={data} draft={draft} />
  );
}

function BoardView({
  groups,
  data,
  draft,
  movingTaskId,
  onMoveTask,
}: Readonly<{
  groups: TaskGroup[];
  data: WorkspaceBootstrap;
  draft: ViewDraft;
  movingTaskId: string | null;
  onMoveTask: MoveBoardTask;
}>): ReactNode {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropGroupId, setDropGroupId] = useState<string | null>(null);
  const canDrag = draft.settings.grouping === "status";
  const resetDrag = (): void => {
    setDraggedTaskId(null);
    setDropGroupId(null);
  };
  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    taskId: string,
  ): void => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };
  const handleDragOver = (
    event: DragEvent<HTMLElement>,
    groupId: string,
  ): void => {
    if (!canDrag || movingTaskId !== null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropGroupId(groupId);
  };
  const handleDrop = (
    event: DragEvent<HTMLElement>,
    group: TaskGroup,
  ): void => {
    event.preventDefault();
    const droppedTaskId =
      event.dataTransfer.getData("text/plain") || draggedTaskId;
    const droppedTask = groups
      .flatMap((candidateGroup) => candidateGroup.tasks)
      .find((task) => task.id === droppedTaskId);
    if (!canDrag || movingTaskId !== null || droppedTask === undefined) {
      resetDrag();
      return;
    }
    const targetStatusId = group.id === "none" ? null : group.id;
    resetDrag();
    void onMoveTask(droppedTask, targetStatusId, group.tasks);
  };

  return (
    <div className="saved-board">
      {groups.map((group) => (
        <section
          key={group.id}
          className={
            dropGroupId === group.id ? "kanban-drop-target" : undefined
          }
          onDragOver={(event) => handleDragOver(event, group.id)}
          onDrop={(event) => handleDrop(event, group)}
        >
          <div className="saved-group-head">
            <strong>{group.title}</strong>
            <Badge color="gray">{group.tasks.length}</Badge>
          </div>
          {renderSubgroups(group.tasks, draft.settings.subGrouping, data).map(
            (subgroup) => (
              <div key={subgroup.id} className="saved-subgroup">
                {draft.settings.subGrouping !== "none" && (
                  <Text size="1" color="gray">
                    {subgroup.title}
                  </Text>
                )}
                {subgroup.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={
                      draggedTaskId === task.id
                        ? "saved-task-drag dragging"
                        : "saved-task-drag"
                    }
                    draggable={canDrag && movingTaskId === null}
                    aria-label={
                      canDrag ? `Переместить задачу ${task.title}` : undefined
                    }
                    onDragStart={(event) => handleDragStart(event, task.id)}
                    onDragEnd={resetDrag}
                  >
                    <TaskCard
                      task={task}
                      data={data}
                      properties={draft.settings.displayProperties}
                      moving={movingTaskId === task.id}
                    />
                  </div>
                ))}
              </div>
            ),
          )}
        </section>
      ))}
    </div>
  );
}
function ListView({
  groups,
  data,
  draft,
}: Readonly<{
  groups: TaskGroup[];
  data: WorkspaceBootstrap;
  draft: ViewDraft;
}>): ReactNode {
  return (
    <Card className="saved-list">
      {groups.map((group) => (
        <section key={group.id}>
          <div className="saved-list-group">
            <strong>{group.title}</strong>
            <Badge color="gray">{group.tasks.length}</Badge>
          </div>
          {renderSubgroups(group.tasks, draft.settings.subGrouping, data).map(
            (subgroup) => (
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
                  />
                ))}
              </div>
            ),
          )}
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
}: Readonly<{
  task: TaskWithProject;
  data: WorkspaceBootstrap;
  properties: DisplayProperty[];
  moving?: boolean;
}>): ReactNode {
  return (
    <Card className={moving ? "saved-task-card moving" : "saved-task-card"}>
      <strong>{task.title}</strong>
      {task.parentTaskId !== null && task.parentTaskId !== undefined && (
        <small>Подзадача</small>
      )}
      <TaskProperties task={task} data={data} properties={properties} />
    </Card>
  );
}
function TaskLine({
  task,
  data,
  properties,
}: Readonly<{
  task: TaskWithProject;
  data: WorkspaceBootstrap;
  properties: DisplayProperty[];
}>): ReactNode {
  return (
    <div className="saved-task-line">
      <span className="task-status-dot" />
      <strong>{task.title}</strong>
      <TaskProperties task={task} data={data} properties={properties} />
    </div>
  );
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
        <span key={property}>{propertyValue(property, task, data)}</span>
      ))}
    </div>
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
                if (value === "list" || value === "board") setLayout(value);
              }}
            >
              <Select.Trigger aria-label="Вид отображения" />
              <Select.Content>
                <Select.Item value="list">Список</Select.Item>
                <Select.Item value="board">Доска</Select.Item>
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
                settings: { ...defaultSettings },
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
      { label: "Без статуса", value: "none" },
      ...data.statuses.map((status) => ({
        label: status.name,
        value: status.id,
      })),
    ];
  if (field === "project")
    return data.projects.map((project) => ({
      label: project.title,
      value: project.id,
    }));
  if (field === "assignee" || field === "creator")
    return [
      {
        label:
          field === "assignee" ? "Не назначено" : "Неизвестный пользователь",
        value: "none",
      },
      ...data.workspace.members.map((member) => ({
        label: member.displayName,
        value: member.userId,
      })),
    ];
  return [];
}
function initialFilter(
  field: FilterField,
  data: WorkspaceBootstrap,
): ViewFilter {
  if (field === "due_date") return { field, operator: "is_empty", value: null };
  if (field === "content") return { field, operator: "contains", value: "" };
  return {
    field,
    operator: "is",
    value: entityFilterOptions(field, data).at(0)?.value ?? "none",
  };
}
function filterLabel(filter: ViewFilter, data: WorkspaceBootstrap): string {
  const fieldLabel =
    filterFields.find((item) => item.field === filter.field)?.label ?? "Фильтр";
  const operatorLabel = operatorsForField(filter.field).find(
    (item) => item.value === filter.operator,
  )?.label;
  if (filter.operator === "is_empty" || filter.operator === "is_not_empty")
    return `${fieldLabel}: ${operatorLabel ?? filter.operator}`;
  const optionLabel = entityFilterOptions(filter.field, data).find(
    (item) => item.value === filter.value,
  )?.label;
  return `${fieldLabel} ${operatorLabel?.toLocaleLowerCase("ru") ?? filter.operator} ${optionLabel ?? filter.value ?? "—"}`;
}

function collectTasks(
  data: WorkspaceBootstrap,
  draft: ViewDraft,
  taskOverrides: Record<string, TaskBoardOverride>,
): TaskWithProject[] {
  const tasks = data.projectData
    .filter(
      (project) =>
        draft.projectId === null || project.projectId === draft.projectId,
    )
    .flatMap((project) => {
      const title =
        data.projects.find((item) => item.id === project.projectId)?.title ??
        "Проект";
      return project.tasks.map((task) => {
        const override = taskOverrides[task.id];
        return override === undefined
          ? { ...task, projectTitle: title }
          : {
              ...task,
              statusId: override.statusId,
              position: override.position,
              projectTitle: title,
            };
      });
    })
    .filter(
      (task) =>
        draft.settings.showSubtasks ||
        task.parentTaskId === null ||
        task.parentTaskId === undefined,
    )
    .filter((task) => matchesFilters(task, draft.settings.filters ?? []));
  return sortTasks(tasks, draft.settings);
}
function matchesFilters(task: TaskWithProject, filters: ViewFilter[]): boolean {
  return filters.every((filter) => matchesFilter(task, filter));
}
function matchesFilter(task: TaskWithProject, filter: ViewFilter): boolean {
  if (filter.field === "due_date") {
    if (filter.operator === "is_empty")
      return task.dueAt === null || task.dueAt === undefined;
    if (filter.operator === "is_not_empty")
      return task.dueAt !== null && task.dueAt !== undefined;
    if (
      task.dueAt === null ||
      task.dueAt === undefined ||
      filter.value === null
    )
      return false;
    const taskDate = task.dueAt.slice(0, 10);
    return filter.operator === "before"
      ? taskDate < filter.value
      : taskDate > filter.value;
  }
  if (filter.field === "content") {
    const query = (filter.value ?? "").toLocaleLowerCase("ru");
    const content =
      `${task.title}\n${task.description ?? ""}`.toLocaleLowerCase("ru");
    const contains = content.includes(query);
    return filter.operator === "not_contains" ? !contains : contains;
  }
  const actualValue =
    filter.field === "status"
      ? (task.statusId ?? "none")
      : filter.field === "project"
        ? task.projectId
        : filter.field === "assignee"
          ? (task.assigneeUserId ?? "none")
          : (task.createdByUserId ?? "none");
  const matches = actualValue === filter.value;
  return filter.operator === "is_not" ? !matches : matches;
}
function withoutTaskOverride(
  overrides: Record<string, TaskBoardOverride>,
  taskId: string,
): Record<string, TaskBoardOverride> {
  return Object.fromEntries(
    Object.entries(overrides).filter(([id]) => id !== taskId),
  );
}
function sortTasks(
  tasks: TaskWithProject[],
  settings: ViewSettings,
): TaskWithProject[] {
  return [...tasks].sort((left, right) => {
    let result = 0;
    if (settings.ordering === "title")
      result = left.title.localeCompare(right.title, "ru");
    else if (settings.ordering === "status")
      result = (left.statusId ?? "").localeCompare(right.statusId ?? "");
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
  return definitions
    .map((definition) => ({
      ...definition,
      tasks: tasks.filter((task) => groupId(task, grouping) === definition.id),
    }))
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
      ...data.statuses.map((status) => ({ id: status.id, title: status.name })),
      { id: "none", title: "Без статуса" },
    ];
  if (grouping === "project")
    return data.projects.map((project) => ({
      id: project.id,
      title: project.title,
    }));
  if (grouping === "parent_task") {
    const allWorkspaceTasks = data.projectData.flatMap(
      (project) => project.tasks,
    );
    const parentTaskIds = new Set(
      tasks
        .map((task) => task.parentTaskId)
        .filter(
          (parentTaskId): parentTaskId is string =>
            parentTaskId !== null && parentTaskId !== undefined,
        ),
    );
    const visibleParentTasks = tasks.filter(
      (task) => task.parentTaskId === null || task.parentTaskId === undefined,
    );
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
function groupId(task: TaskWithProject, grouping: ViewGrouping): string {
  if (grouping === "status") return task.statusId ?? "none";
  if (grouping === "project") return task.projectId;
  if (grouping === "parent_task") return task.parentTaskId ?? "none";
  return "all";
}
function propertyValue(
  property: DisplayProperty,
  task: TaskWithProject,
  data: WorkspaceBootstrap,
): string {
  if (property === "status")
    return (
      data.statuses.find((status) => status.id === task.statusId)?.name ??
      "Без статуса"
    );
  if (property === "project") return task.projectTitle;
  if (property === "assignee")
    return task.assigneeUserId === null || task.assigneeUserId === undefined
      ? "Не назначено"
      : (data.workspace.members.find(
          (member) => member.userId === task.assigneeUserId,
        )?.displayName ?? "Исполнитель");
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
    draft.settings.displayProperties.length ===
      settings.displayProperties.length &&
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
function savedViewUrl(viewId: string, projectId: string | null): string {
  const parameters = new URLSearchParams({ view: viewId });
  if (projectId !== null) parameters.set("project", projectId);
  return `/views?${parameters.toString()}`;
}
function viewsUrl(projectId: string | null): string {
  return projectId === null
    ? "/views"
    : `/views?project=${encodeURIComponent(projectId)}`;
}
function isSavedView(value: unknown): value is SavedView {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
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
