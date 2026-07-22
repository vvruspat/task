import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { In, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  ProjectEntity,
  StatusEntity,
  TaskEntity,
  TaskSkillEntity,
  TaskSkillVersionEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import { selectDefaultTaskStatusId } from "../tasks/default-task-status.js";
import { reserveProjectTaskNumbers } from "../tasks/project-task-number.js";
import { taskAssignmentActivityPayload } from "../tasks/task-assignment-notification.js";
import type { TaskDetail } from "../tasks/tasks.contracts.js";
import type {
  CloneTaskSkillInput,
  CreateTaskSkillInput,
  PreviewTaskSkillApplyInput,
  TaskSkillApplyPreview,
  TaskSkillApplyPreviewSubtask,
  TaskSkillApplyResult,
  TaskSkillDefinition,
  TaskSkillDetail,
  TaskSkillSubtaskDefinition,
  TaskSkillSummary,
  TaskSkillVersionSummary,
  UpdateTaskSkillDefinitionInput,
  UpdateTaskSkillMetadataInput,
} from "./task-skills.contracts.js";
import type {
  TaskSkillApplyForWorkspaceResult,
  TaskSkillApplyPreviewResult,
  TaskSkillArchiveResult,
  TaskSkillCloneResult,
  TaskSkillCreateResult,
  TaskSkillDefinitionUpdateResult,
  TaskSkillMetadataUpdateResult,
  TaskSkillsReadStore,
} from "./task-skills.store.js";

const taskSkillWriteRoles: ReadonlySet<WorkspaceMemberRole> = new Set(["owner", "admin", "member"]);

@Injectable()
export class TypeOrmTaskSkillsReadStore implements TaskSkillsReadStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listActiveForWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<TaskSkillSummary[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return null;
    }

    const skills = await dataSource.getRepository(TaskSkillEntity).find({
      where: { archivedAt: IsNull(), workspaceId },
      order: { name: "ASC", createdAt: "ASC" },
    });

    return skills.map((skill) => toTaskSkillSummary(skill));
  }

  async getActiveForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
  ): Promise<TaskSkillDetail | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return null;
    }

    const skill = await dataSource.getRepository(TaskSkillEntity).findOneBy({
      archivedAt: IsNull(),
      id: taskSkillId,
      workspaceId,
    });

    if (skill === null) {
      return null;
    }

    const versions = await dataSource.getRepository(TaskSkillVersionEntity).find({
      where: { taskSkillId, workspaceId },
      order: { version: "DESC", createdAt: "DESC" },
    });

    return {
      ...toTaskSkillSummary(skill),
      versions: versions.map((version) => toTaskSkillVersionSummary(version)),
    };
  }

  async createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateTaskSkillInput,
  ): Promise<TaskSkillCreateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "workspace_not_found" };
    }

    if (!taskSkillWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const existingSkill = await dataSource.getRepository(TaskSkillEntity).findOneBy({
      name: input.name,
      workspaceId,
    });

    if (existingSkill !== null) {
      return { status: "duplicate_name" };
    }

    const created = await dataSource.transaction(async (manager): Promise<TaskSkillDetail> => {
      const skillRepository = manager.getRepository(TaskSkillEntity);
      const versionRepository = manager.getRepository(TaskSkillVersionEntity);
      const skill = skillRepository.create({
        workspaceId,
        name: input.name,
        description: input.description ?? null,
        aliases: input.aliases ?? [],
        createdByUserId: userId,
      });
      const savedSkill = await skillRepository.save(skill);
      const version = versionRepository.create({
        workspaceId,
        taskSkillId: savedSkill.id,
        version: 1,
        definition: input.definition,
        createdByUserId: userId,
      });
      const savedVersion = await versionRepository.save(version);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task_skill.created",
        entityType: "task_skill",
        entityId: savedSkill.id,
        payload: {
          name: savedSkill.name,
          version: savedVersion.version,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return {
        ...toTaskSkillSummary(savedSkill),
        versions: [toTaskSkillVersionSummary(savedVersion)],
      };
    });

    return { status: "created", taskSkill: created };
  }

  async cloneForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: CloneTaskSkillInput,
  ): Promise<TaskSkillCloneResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "workspace_not_found" };
    }

    if (!taskSkillWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const skillRepository = dataSource.getRepository(TaskSkillEntity);
    const sourceSkill = await skillRepository.findOneBy({
      archivedAt: IsNull(),
      id: taskSkillId,
      workspaceId,
    });

    if (sourceSkill === null) {
      return { status: "task_skill_not_found" };
    }

    const existingSkill = await skillRepository.findOneBy({
      name: input.name,
      workspaceId,
    });

    if (existingSkill !== null) {
      return { status: "duplicate_name" };
    }

    const latestVersion = await dataSource.getRepository(TaskSkillVersionEntity).findOne({
      where: { taskSkillId, workspaceId },
      order: { version: "DESC", createdAt: "DESC" },
    });

    if (latestVersion === null) {
      return { status: "task_skill_not_found" };
    }

    const cloned = await dataSource.transaction(async (manager): Promise<TaskSkillDetail> => {
      const transactionalSkillRepository = manager.getRepository(TaskSkillEntity);
      const versionRepository = manager.getRepository(TaskSkillVersionEntity);
      const skill = transactionalSkillRepository.create({
        workspaceId,
        name: input.name,
        description: input.description === undefined ? sourceSkill.description : input.description,
        aliases: input.aliases === undefined ? sourceSkill.aliases : input.aliases,
        createdByUserId: userId,
      });
      const savedSkill = await transactionalSkillRepository.save(skill);
      const version = versionRepository.create({
        workspaceId,
        taskSkillId: savedSkill.id,
        version: 1,
        definition: latestVersion.definition,
        createdByUserId: userId,
      });
      const savedVersion = await versionRepository.save(version);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task_skill.cloned",
        entityType: "task_skill",
        entityId: savedSkill.id,
        payload: {
          name: savedSkill.name,
          sourceTaskSkillId: sourceSkill.id,
          sourceTaskSkillVersionId: latestVersion.id,
          sourceTaskSkillVersion: latestVersion.version,
          version: savedVersion.version,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return {
        ...toTaskSkillSummary(savedSkill),
        versions: [toTaskSkillVersionSummary(savedVersion)],
      };
    });

    return { status: "cloned", taskSkill: cloned };
  }

  async updateMetadataForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: UpdateTaskSkillMetadataInput,
  ): Promise<TaskSkillMetadataUpdateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "workspace_not_found" };
    }

    if (!taskSkillWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const skillRepository = dataSource.getRepository(TaskSkillEntity);
    const skill = await skillRepository.findOneBy({
      archivedAt: IsNull(),
      id: taskSkillId,
      workspaceId,
    });

    if (skill === null) {
      return { status: "task_skill_not_found" };
    }

    if (input.name !== undefined && input.name !== skill.name) {
      const duplicateSkill = await skillRepository.findOneBy({
        name: input.name,
        workspaceId,
      });

      if (duplicateSkill !== null && duplicateSkill.id !== taskSkillId) {
        return { status: "duplicate_name" };
      }
    }

    const updated = await dataSource.transaction(
      async (manager): Promise<TaskSkillDetail | null> => {
        const transactionalSkillRepository = manager.getRepository(TaskSkillEntity);
        const transactionalSkill = await transactionalSkillRepository.findOneBy({
          archivedAt: IsNull(),
          id: taskSkillId,
          workspaceId,
        });

        if (transactionalSkill === null) {
          return null;
        }

        if (input.name !== undefined) {
          transactionalSkill.name = input.name;
        }

        if (input.description !== undefined) {
          transactionalSkill.description = input.description;
        }

        if (input.aliases !== undefined) {
          transactionalSkill.aliases = input.aliases;
        }

        const savedSkill = await transactionalSkillRepository.save(transactionalSkill);
        const activityEvent = manager.getRepository(ActivityEventEntity).create({
          workspaceId,
          actorUserId: userId,
          eventType: "task_skill.metadata_updated",
          entityType: "task_skill",
          entityId: savedSkill.id,
          payload: {
            aliases: savedSkill.aliases,
            description: savedSkill.description,
            name: savedSkill.name,
          },
        });

        await manager.getRepository(ActivityEventEntity).save(activityEvent);

        const versions = await manager.getRepository(TaskSkillVersionEntity).find({
          where: { taskSkillId, workspaceId },
          order: { version: "DESC", createdAt: "DESC" },
        });

        return {
          ...toTaskSkillSummary(savedSkill),
          versions: versions.map((version) => toTaskSkillVersionSummary(version)),
        };
      },
    );

    if (updated === null) {
      return { status: "task_skill_not_found" };
    }

    return { status: "updated", taskSkill: updated };
  }

  async updateDefinitionForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: UpdateTaskSkillDefinitionInput,
  ): Promise<TaskSkillDefinitionUpdateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "workspace_not_found" };
    }

    if (!taskSkillWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const updated = await dataSource.transaction(
      async (manager): Promise<TaskSkillDetail | null> => {
        const skill = await manager.getRepository(TaskSkillEntity).findOneBy({
          archivedAt: IsNull(),
          id: taskSkillId,
          workspaceId,
        });

        if (skill === null) {
          return null;
        }

        const versionRepository = manager.getRepository(TaskSkillVersionEntity);
        const latestVersion = await versionRepository.findOne({
          where: { taskSkillId, workspaceId },
          order: { version: "DESC", createdAt: "DESC" },
        });
        const nextVersion = (latestVersion?.version ?? 0) + 1;
        const version = versionRepository.create({
          workspaceId,
          taskSkillId,
          version: nextVersion,
          definition: input.definition,
          createdByUserId: userId,
        });
        const savedVersion = await versionRepository.save(version);
        const activityEvent = manager.getRepository(ActivityEventEntity).create({
          workspaceId,
          actorUserId: userId,
          eventType: "task_skill.definition_updated",
          entityType: "task_skill",
          entityId: skill.id,
          payload: {
            name: skill.name,
            version: savedVersion.version,
          },
        });

        await manager.getRepository(ActivityEventEntity).save(activityEvent);

        const versions = await versionRepository.find({
          where: { taskSkillId, workspaceId },
          order: { version: "DESC", createdAt: "DESC" },
        });

        return {
          ...toTaskSkillSummary(skill),
          versions: versions.map((taskSkillVersion) => toTaskSkillVersionSummary(taskSkillVersion)),
        };
      },
    );

    if (updated === null) {
      return { status: "task_skill_not_found" };
    }

    return { status: "updated", taskSkill: updated };
  }

  async archiveForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
  ): Promise<TaskSkillArchiveResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "workspace_not_found" };
    }

    if (!taskSkillWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const archived = await dataSource.transaction(
      async (manager): Promise<TaskSkillDetail | null> => {
        const skillRepository = manager.getRepository(TaskSkillEntity);
        const skill = await skillRepository.findOneBy({
          archivedAt: IsNull(),
          id: taskSkillId,
          workspaceId,
        });

        if (skill === null) {
          return null;
        }

        skill.archivedAt = new Date();

        const savedSkill = await skillRepository.save(skill);
        const activityEvent = manager.getRepository(ActivityEventEntity).create({
          workspaceId,
          actorUserId: userId,
          eventType: "task_skill.archived",
          entityType: "task_skill",
          entityId: savedSkill.id,
          payload: {
            name: savedSkill.name,
          },
        });

        await manager.getRepository(ActivityEventEntity).save(activityEvent);

        const versions = await manager.getRepository(TaskSkillVersionEntity).find({
          where: { taskSkillId, workspaceId },
          order: { version: "DESC", createdAt: "DESC" },
        });

        return {
          ...toTaskSkillSummary(savedSkill),
          versions: versions.map((version) => toTaskSkillVersionSummary(version)),
        };
      },
    );

    if (archived === null) {
      return { status: "task_skill_not_found" };
    }

    return { status: "archived", taskSkill: archived };
  }

  async previewApplyForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: PreviewTaskSkillApplyInput,
  ): Promise<TaskSkillApplyPreviewResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "not_found" };
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      archivedAt: IsNull(),
      id: input.projectId,
      workspaceId,
    });

    if (project === null) {
      return { status: "not_found" };
    }

    const skill = await dataSource.getRepository(TaskSkillEntity).findOneBy({
      archivedAt: IsNull(),
      id: taskSkillId,
      workspaceId,
    });

    if (skill === null) {
      return { status: "not_found" };
    }

    const latestVersion = await dataSource.getRepository(TaskSkillVersionEntity).findOne({
      where: { taskSkillId, workspaceId },
      order: { version: "DESC", createdAt: "DESC" },
    });

    if (latestVersion === null) {
      return { status: "invalid_definition" };
    }

    const skillSubtasks = readDefinitionSubtasks(latestVersion.definition);

    if (skillSubtasks === null) {
      return { status: "invalid_definition" };
    }

    const preview: TaskSkillApplyPreview = {
      workspaceId,
      projectId: input.projectId,
      taskSkillId: skill.id,
      taskSkillVersionId: latestVersion.id,
      taskSkillVersion: latestVersion.version,
      rootTaskTitle: input.rootTaskTitle,
      subtasks: buildApplySubtasks(skillSubtasks, input),
    };

    return { status: "previewed", preview };
  }

  async applyForWorkspace(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: PreviewTaskSkillApplyInput,
  ): Promise<TaskSkillApplyForWorkspaceResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return { status: "not_found" };
    }

    if (!taskSkillWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      archivedAt: IsNull(),
      id: input.projectId,
      workspaceId,
    });

    if (project === null) {
      return { status: "not_found" };
    }

    const skill = await dataSource.getRepository(TaskSkillEntity).findOneBy({
      archivedAt: IsNull(),
      id: taskSkillId,
      workspaceId,
    });

    if (skill === null) {
      return { status: "not_found" };
    }

    const latestVersion = await dataSource.getRepository(TaskSkillVersionEntity).findOne({
      where: { taskSkillId, workspaceId },
      order: { version: "DESC", createdAt: "DESC" },
    });

    if (latestVersion === null) {
      return { status: "invalid_definition" };
    }

    const skillSubtasks = readDefinitionSubtasks(latestVersion.definition);

    if (skillSubtasks === null) {
      return { status: "invalid_definition" };
    }

    const plannedSubtasks = buildApplySubtasks(skillSubtasks, input);
    const assigneeUserIds = [
      ...new Set(
        plannedSubtasks.flatMap((subtask) =>
          subtask.assigneeUserId === null ? [] : [subtask.assigneeUserId],
        ),
      ),
    ];

    if (assigneeUserIds.length > 0) {
      const assigneeMemberships = await dataSource
        .getRepository(WorkspaceMemberEntity)
        .findBy({ workspaceId, userId: In(assigneeUserIds) });

      if (assigneeMemberships.length !== assigneeUserIds.length) {
        return { status: "invalid_assignee" };
      }
    }
    const applied = await dataSource.transaction(
      async (manager): Promise<TaskSkillApplyResult | null> => {
        const taskRepository = manager.getRepository(TaskEntity);
        const numbers = await reserveProjectTaskNumbers(
          manager,
          workspaceId,
          input.projectId,
          plannedSubtasks.length + 1,
        );
        const rootTaskNumber = numbers?.[0];
        if (numbers === null || rootTaskNumber === undefined) return null;
        const statuses = await manager.getRepository(StatusEntity).find({
          order: { position: "ASC" },
          where: { projectId: input.projectId, workspaceId },
        });
        const defaultStatusId = selectDefaultTaskStatusId(statuses);
        const rootTask = taskRepository.create({
          workspaceId,
          projectId: input.projectId,
          number: rootTaskNumber,
          parentTaskId: null,
          title: input.rootTaskTitle,
          description: null,
          assigneeUserId: null,
          statusId: defaultStatusId,
          createdByUserId: userId,
          position: "0",
          dueAt: null,
          sourceSkillId: skill.id,
          sourceSkillVersionId: latestVersion.id,
          metadata: {},
        });
        const savedRootTask = await taskRepository.save(rootTask);
        const subtaskEntities = plannedSubtasks.map((subtask, index) => {
          const number = numbers[index + 1];
          if (number === undefined) {
            throw new Error("Reserved task number is missing.");
          }
          return taskRepository.create({
            workspaceId,
            projectId: input.projectId,
            number,
            parentTaskId: savedRootTask.id,
            title: subtask.title,
            description: subtask.description,
            assigneeUserId: subtask.assigneeUserId,
            statusId: defaultStatusId,
            createdByUserId: userId,
            position: String(index + 1),
            dueAt: null,
            sourceSkillId: skill.id,
            sourceSkillVersionId: latestVersion.id,
            metadata: {
              labels: subtask.labels,
              taskSkillSubtaskSource: subtask.source,
            },
          });
        });
        const savedSubtasks = await taskRepository.save(subtaskEntities);
        const activityRepository = manager.getRepository(ActivityEventEntity);
        const activityEvent = activityRepository.create({
          workspaceId,
          actorUserId: userId,
          eventType: "task_skill.applied",
          entityType: "task",
          entityId: savedRootTask.id,
          payload: {
            projectId: input.projectId,
            rootTaskTitle: savedRootTask.title,
            subtaskCount: savedSubtasks.length,
            taskSkillId: skill.id,
            taskSkillVersion: latestVersion.version,
            taskSkillVersionId: latestVersion.id,
          },
        });

        const assignedSubtaskEvents = savedSubtasks.flatMap((subtask) =>
          subtask.assigneeUserId === null
            ? []
            : [
                activityRepository.create({
                  workspaceId,
                  actorUserId: userId,
                  eventType: "task.created",
                  entityType: "task",
                  entityId: subtask.id,
                  payload: {
                    ...taskAssignmentActivityPayload(null, subtask.assigneeUserId),
                    projectId: input.projectId,
                    title: subtask.title,
                  },
                }),
              ],
        );

        await activityRepository.save([activityEvent, ...assignedSubtaskEvents]);

        return {
          workspaceId,
          projectId: input.projectId,
          taskSkillId: skill.id,
          taskSkillVersionId: latestVersion.id,
          taskSkillVersion: latestVersion.version,
          rootTask: toTaskDetail(savedRootTask),
          subtasks: savedSubtasks.map((subtask) => toTaskDetail(subtask)),
        };
      },
    );

    if (applied === null) return { status: "not_found" };

    return { status: "applied", result: applied };
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();

    if (dataSource === null) {
      throw new ServiceUnavailableException("Database is not configured.");
    }

    if (dataSource.isInitialized) {
      return dataSource;
    }

    this.initialization ??= dataSource.initialize();

    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

function toTaskSkillSummary(skill: TaskSkillEntity): TaskSkillSummary {
  return {
    id: skill.id,
    workspaceId: skill.workspaceId,
    name: skill.name,
    description: skill.description,
    aliases: skill.aliases,
    createdByUserId: skill.createdByUserId,
    archivedAt: skill.archivedAt,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  };
}

function toTaskSkillVersionSummary(version: TaskSkillVersionEntity): TaskSkillVersionSummary {
  const definition = readTaskSkillDefinition(version.definition);

  if (definition === null) {
    throw new ServiceUnavailableException("Stored task skill definition is invalid.");
  }

  return {
    id: version.id,
    workspaceId: version.workspaceId,
    taskSkillId: version.taskSkillId,
    version: version.version,
    definition,
    createdByUserId: version.createdByUserId,
    createdAt: version.createdAt,
  };
}

function readTaskSkillDefinition(definition: Record<string, unknown>): TaskSkillDefinition | null {
  const subtasks = readDefinitionSubtasks(definition);
  return subtasks === null ? null : { subtasks };
}

function readDefinitionSubtasks(
  definition: Record<string, unknown>,
): TaskSkillSubtaskDefinition[] | null {
  const subtasks = readUnknownProperty(definition, "subtasks");

  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return null;
  }

  const parsedSubtasks: TaskSkillSubtaskDefinition[] = [];

  for (const subtask of subtasks) {
    if (!isUnknownRecord(subtask)) {
      return null;
    }

    const title = readUnknownProperty(subtask, "title");

    if (typeof title !== "string") {
      return null;
    }

    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      return null;
    }

    const descriptionValue = readUnknownProperty(subtask, "description");
    const assigneeValue = readUnknownProperty(subtask, "assigneeUserId");
    const labelsValue = readUnknownProperty(subtask, "labels");

    if (
      descriptionValue !== undefined &&
      descriptionValue !== null &&
      typeof descriptionValue !== "string"
    ) {
      return null;
    }
    if (
      assigneeValue !== undefined &&
      assigneeValue !== null &&
      typeof assigneeValue !== "string"
    ) {
      return null;
    }
    if (
      labelsValue !== undefined &&
      (!Array.isArray(labelsValue) || !labelsValue.every((label) => typeof label === "string"))
    ) {
      return null;
    }

    parsedSubtasks.push({
      title: trimmedTitle,
      description: typeof descriptionValue === "string" ? descriptionValue : null,
      assigneeUserId: typeof assigneeValue === "string" ? assigneeValue : null,
      labels:
        labelsValue === undefined
          ? []
          : [...new Set(labelsValue.map((label) => label.trim()).filter(Boolean))],
    });
  }

  return parsedSubtasks;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readUnknownProperty(value: Record<string, unknown>, propertyName: string): unknown {
  return value[propertyName];
}

function buildApplySubtasks(
  skillSubtasks: TaskSkillSubtaskDefinition[],
  input: PreviewTaskSkillApplyInput,
): TaskSkillApplyPreviewSubtask[] {
  const removeSubtasks = new Set(input.overrides?.removeSubtasks ?? []);
  const subtasks: TaskSkillApplyPreviewSubtask[] = skillSubtasks
    .filter((subtask) => !removeSubtasks.has(subtask.title))
    .map((subtask) => ({
      assigneeUserId: subtask.assigneeUserId ?? null,
      description: subtask.description ?? null,
      labels: subtask.labels ?? [],
      source: "skill",
      title: subtask.title,
    }));
  const titles = new Set(subtasks.map((subtask) => subtask.title));

  for (const title of input.overrides?.addSubtasks ?? []) {
    if (!titles.has(title)) {
      subtasks.push({
        assigneeUserId: null,
        description: null,
        labels: [],
        source: "added",
        title,
      });
      titles.add(title);
    }
  }

  return subtasks;
}

function toTaskDetail(task: TaskEntity): TaskDetail {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    number: task.number,
    parentTaskId: task.parentTaskId,
    title: task.title,
    description: task.description,
    statusId: task.statusId,
    assigneeUserId: task.assigneeUserId,
    createdByUserId: task.createdByUserId,
    position: task.position,
    dueAt: task.dueAt,
    sourceSkillId: task.sourceSkillId,
    sourceSkillVersionId: task.sourceSkillVersionId,
    metadata: task.metadata,
    archivedAt: task.archivedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
