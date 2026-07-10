import type { CreateTaskSkillInput, PreviewTaskSkillApplyInput } from "@task/api-client";

export function shouldAcceptTaskSkillSettlement(input: {
  currentSelectionVersion: number;
  detailId: string;
  requestSelectionVersion: number;
  selectedSkillId: string | null;
}): boolean {
  return (
    input.currentSelectionVersion === input.requestSelectionVersion &&
    input.detailId === input.selectedSkillId
  );
}

export function splitTaskSkillList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  ];
}

export function buildCreateTaskSkillInput(input: {
  aliases: string;
  description: string;
  name: string;
  subtasks: string;
}): CreateTaskSkillInput {
  return {
    aliases: splitTaskSkillList(input.aliases),
    definition: {
      subtasks: splitTaskSkillList(input.subtasks).map((title) => ({ title })),
    },
    description: input.description.trim() || null,
    name: input.name.trim(),
  };
}

export function buildTaskSkillApplyInput(input: {
  addedSubtasks: string;
  projectId: string;
  removedSubtasks: string;
  rootTaskTitle: string;
}): PreviewTaskSkillApplyInput {
  const addSubtasks = splitTaskSkillList(input.addedSubtasks);
  const removeSubtasks = splitTaskSkillList(input.removedSubtasks);
  const overrides = {
    ...(addSubtasks.length > 0 ? { addSubtasks } : {}),
    ...(removeSubtasks.length > 0 ? { removeSubtasks } : {}),
  };

  return {
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
    projectId: input.projectId,
    rootTaskTitle: input.rootTaskTitle.trim(),
  };
}
