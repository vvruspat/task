export type TemplateMatrixTask = {
  id: string;
  title: string;
  parentTaskId?: string | null;
  sourceSkillId?: string | null;
};

export type TemplateMatrixRow<TTask extends TemplateMatrixTask> = {
  key: string;
  title: string;
  cells: Array<TTask | null>;
};

export type TemplateMatrix<TTask extends TemplateMatrixTask> = {
  columns: TTask[];
  rows: Array<TemplateMatrixRow<TTask>>;
};

export function normalizeTemplateMatrixTitle(title: string): string {
  return title.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
}

export function buildTemplateMatrix<TTask extends TemplateMatrixTask>(
  tasks: readonly TTask[],
  templateId: string,
): TemplateMatrix<TTask> {
  const columns = tasks.filter(
    (task) =>
      (task.parentTaskId === null || task.parentTaskId === undefined) &&
      task.sourceSkillId === templateId,
  );
  const columnIndexes = new Map(columns.map((task, index) => [task.id, index]));
  const rowsByKey = new Map<string, TemplateMatrixRow<TTask>>();

  for (const task of tasks) {
    const parentTaskId = task.parentTaskId;
    if (parentTaskId === null || parentTaskId === undefined || task.sourceSkillId !== templateId) {
      continue;
    }
    const columnIndex = columnIndexes.get(parentTaskId);
    if (columnIndex === undefined) continue;
    const key = normalizeTemplateMatrixTitle(task.title);
    if (key.length === 0) continue;
    const existing = rowsByKey.get(key);
    const row =
      existing ??
      ({
        key,
        title: task.title.normalize("NFKC").trim().replace(/\s+/g, " "),
        cells: columns.map(() => null),
      } satisfies TemplateMatrixRow<TTask>);
    if (existing === undefined) rowsByKey.set(key, row);
    if (row.cells[columnIndex] === null) row.cells[columnIndex] = task;
  }

  return { columns, rows: [...rowsByKey.values()] };
}
