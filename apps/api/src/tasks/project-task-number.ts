import type { EntityManager } from "typeorm";
import { ProjectEntity } from "../persistence/entities/index.js";

export async function reserveProjectTaskNumbers(
  manager: EntityManager,
  workspaceId: string,
  projectId: string,
  count: number,
): Promise<number[] | null> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Task number reservation count must be a positive integer.");
  }

  const projectRepository = manager.getRepository(ProjectEntity);
  const project = await projectRepository.findOne({
    where: { id: projectId, workspaceId },
    lock: { mode: "pessimistic_write" },
  });

  if (project === null) return null;
  const firstNumber = project.nextTaskNumber;
  project.nextTaskNumber += count;
  await projectRepository.save(project);
  return Array.from({ length: count }, (_, index) => firstNumber + index);
}
