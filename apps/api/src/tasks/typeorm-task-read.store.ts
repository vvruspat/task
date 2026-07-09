import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  ProjectEntity,
  StatusEntity,
  TaskEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import type {
  AddTaskSubtasksInput,
  CreateTaskInput,
  MoveTaskInput,
  TaskDetail,
  TaskSummary,
  UpdateTaskAssigneeInput,
  UpdateTaskDueDateInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";
import type {
  TaskAddSubtasksResult,
  TaskArchiveResult,
  TaskCreateResult,
  TaskMoveResult,
  TaskReadStore,
  TaskUpdateAssigneeResult,
  TaskUpdateDueDateResult,
  TaskUpdateResult,
  TaskUpdateStatusResult,
} from "./tasks.store.js";

const taskWriteRoles: ReadonlySet<WorkspaceMemberRole> = new Set(["owner", "admin", "member"]);

@Injectable()
export class TypeOrmTaskReadStore implements TaskReadStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listActiveForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<TaskSummary[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const canReadProject = await this.canReadProject(dataSource, workspaceId, projectId, userId);

    if (!canReadProject) {
      return null;
    }

    const tasks = await dataSource.getRepository(TaskEntity).find({
      where: { archivedAt: IsNull(), projectId, workspaceId },
      order: { parentTaskId: "ASC", position: "ASC", createdAt: "ASC" },
    });

    return tasks.map(toTaskSummary);
  }

  async getForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDetail | null> {
    const dataSource = await this.getInitializedDataSource();
    const canReadProject = await this.canReadProject(dataSource, workspaceId, projectId, userId);

    if (!canReadProject) {
      return null;
    }

    const task = await dataSource.getRepository(TaskEntity).findOneBy({
      archivedAt: IsNull(),
      id: taskId,
      projectId,
      workspaceId,
    });

    if (task === null) {
      return null;
    }

    return toTaskSummary(task);
  }

  async createForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: CreateTaskInput,
  ): Promise<TaskCreateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "project_not_found" };
    }

    if (!taskWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    if (project === null) {
      return { status: "project_not_found" };
    }

    if (input.parentTaskId !== undefined && input.parentTaskId !== null) {
      const parentTask = await dataSource.getRepository(TaskEntity).findOneBy({
        id: input.parentTaskId,
        projectId,
        workspaceId,
      });

      if (parentTask === null) {
        return { status: "invalid_parent_task" };
      }
    }

    const savedTask = await dataSource.transaction(async (manager): Promise<TaskEntity> => {
      const taskRepository = manager.getRepository(TaskEntity);
      const task = taskRepository.create({
        workspaceId,
        projectId,
        parentTaskId: input.parentTaskId ?? null,
        title: input.title,
        description: input.description ?? null,
        createdByUserId: userId,
        position: input.position ?? "0",
        dueAt: input.dueAt === undefined || input.dueAt === null ? null : new Date(input.dueAt),
        metadata: input.metadata ?? {},
      });
      const createdTask = await taskRepository.save(task);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task.created",
        entityType: "task",
        entityId: createdTask.id,
        payload: {
          projectId,
          title: createdTask.title,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return createdTask;
    });

    return { status: "created", task: toTaskSummary(savedTask) };
  }

  async addSubtasksForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: AddTaskSubtasksInput,
  ): Promise<TaskAddSubtasksResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!taskWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const parentTask = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (parentTask === null) {
      return { status: "task_not_found" };
    }

    const savedTasks = await dataSource.transaction(async (manager): Promise<TaskEntity[]> => {
      const taskRepository = manager.getRepository(TaskEntity);
      const tasks = input.subtasks.map((subtask) =>
        taskRepository.create({
          workspaceId,
          projectId,
          parentTaskId: parentTask.id,
          title: subtask.title,
          description: subtask.description ?? null,
          createdByUserId: userId,
          position: subtask.position ?? "0",
          dueAt:
            subtask.dueAt === undefined || subtask.dueAt === null ? null : new Date(subtask.dueAt),
          metadata: subtask.metadata ?? {},
        }),
      );
      const createdTasks = await taskRepository.save(tasks);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task.subtasks_created",
        entityType: "task",
        entityId: parentTask.id,
        payload: {
          count: createdTasks.length,
          projectId,
          taskIds: createdTasks.map((task) => task.id),
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return createdTasks;
    });

    return { status: "created", tasks: savedTasks.map(toTaskSummary) };
  }

  async updateStatusForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskStatusInput,
  ): Promise<TaskUpdateStatusResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!taskWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (task === null) {
      return { status: "task_not_found" };
    }

    if (input.statusId !== null) {
      const status = await dataSource.getRepository(StatusEntity).findOneBy({
        id: input.statusId,
        workspaceId,
      });

      if (status === null) {
        return { status: "invalid_status" };
      }
    }

    const savedTask = await dataSource.transaction(async (manager): Promise<TaskEntity> => {
      task.statusId = input.statusId;

      const updatedTask = await manager.getRepository(TaskEntity).save(task);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task.status_updated",
        entityType: "task",
        entityId: updatedTask.id,
        payload: {
          projectId,
          statusId: input.statusId,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return updatedTask;
    });

    return { status: "updated", task: toTaskSummary(savedTask) };
  }

  async updateForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskInput,
  ): Promise<TaskUpdateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!taskWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (task === null) {
      return { status: "task_not_found" };
    }

    const updatedFields = getUpdatedTaskFields(input);
    const savedTask = await dataSource.transaction(async (manager): Promise<TaskEntity> => {
      if (input.title !== undefined) {
        task.title = input.title;
      }

      if (input.description !== undefined) {
        task.description = input.description;
      }

      if (input.metadata !== undefined) {
        task.metadata = input.metadata;
      }

      const updatedTask = await manager.getRepository(TaskEntity).save(task);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task.updated",
        entityType: "task",
        entityId: updatedTask.id,
        payload: {
          fields: updatedFields,
          projectId,
          title: updatedTask.title,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return updatedTask;
    });

    return { status: "updated", task: toTaskSummary(savedTask) };
  }

  async moveForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: MoveTaskInput,
  ): Promise<TaskMoveResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!taskWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (task === null) {
      return { status: "task_not_found" };
    }

    if (input.parentTaskId !== null) {
      const parentTask = await this.getVisibleTask(
        dataSource,
        workspaceId,
        projectId,
        input.parentTaskId,
      );

      if (
        parentTask === null ||
        parentTask.id === task.id ||
        (await this.isTaskAncestor(dataSource, workspaceId, projectId, task.id, parentTask))
      ) {
        return { status: "invalid_parent_task" };
      }
    }

    const savedTask = await dataSource.transaction(async (manager): Promise<TaskEntity> => {
      task.parentTaskId = input.parentTaskId;
      task.position = input.position;

      const updatedTask = await manager.getRepository(TaskEntity).save(task);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task.moved",
        entityType: "task",
        entityId: updatedTask.id,
        payload: {
          parentTaskId: input.parentTaskId,
          position: input.position,
          projectId,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return updatedTask;
    });

    return { status: "updated", task: toTaskSummary(savedTask) };
  }

  async updateAssigneeForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskAssigneeInput,
  ): Promise<TaskUpdateAssigneeResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!taskWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (task === null) {
      return { status: "task_not_found" };
    }

    if (input.assigneeUserId !== null) {
      const assigneeMembership = await this.getWorkspaceMembership(
        dataSource,
        workspaceId,
        input.assigneeUserId,
      );

      if (assigneeMembership === null) {
        return { status: "invalid_assignee" };
      }
    }

    const savedTask = await dataSource.transaction(async (manager): Promise<TaskEntity> => {
      task.assigneeUserId = input.assigneeUserId;

      const updatedTask = await manager.getRepository(TaskEntity).save(task);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task.assignee_updated",
        entityType: "task",
        entityId: updatedTask.id,
        payload: {
          assigneeUserId: input.assigneeUserId,
          projectId,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return updatedTask;
    });

    return { status: "updated", task: toTaskSummary(savedTask) };
  }

  async updateDueDateForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskDueDateInput,
  ): Promise<TaskUpdateDueDateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!taskWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (task === null) {
      return { status: "task_not_found" };
    }

    const savedTask = await dataSource.transaction(async (manager): Promise<TaskEntity> => {
      task.dueAt = input.dueAt === null ? null : new Date(input.dueAt);

      const updatedTask = await manager.getRepository(TaskEntity).save(task);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task.due_date_updated",
        entityType: "task",
        entityId: updatedTask.id,
        payload: {
          dueAt: input.dueAt,
          projectId,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return updatedTask;
    });

    return { status: "updated", task: toTaskSummary(savedTask) };
  }

  async archiveForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskArchiveResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!taskWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (task === null) {
      return { status: "task_not_found" };
    }

    const archivedTask = await dataSource.transaction(async (manager): Promise<TaskEntity> => {
      task.archivedAt = new Date();

      const savedTask = await manager.getRepository(TaskEntity).save(task);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task.archived",
        entityType: "task",
        entityId: savedTask.id,
        payload: {
          projectId,
          title: savedTask.title,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return savedTask;
    });

    return { status: "archived", task: toTaskSummary(archivedTask) };
  }

  private async canReadProject(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return false;
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    return project !== null;
  }

  private async getVisibleTask(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskEntity | null> {
    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    if (project === null) {
      return null;
    }

    return dataSource.getRepository(TaskEntity).findOneBy({
      archivedAt: IsNull(),
      id: taskId,
      projectId,
      workspaceId,
    });
  }

  private async getWorkspaceMembership(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity | null> {
    return dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });
  }

  private async isTaskAncestor(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    taskId: string,
    parentTask: TaskEntity,
  ): Promise<boolean> {
    let currentParentId = parentTask.parentTaskId;

    while (currentParentId !== null) {
      if (currentParentId === taskId) {
        return true;
      }

      const currentParent = await this.getVisibleTask(
        dataSource,
        workspaceId,
        projectId,
        currentParentId,
      );

      if (currentParent === null) {
        return false;
      }

      currentParentId = currentParent.parentTaskId;
    }

    return false;
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

function getUpdatedTaskFields(input: UpdateTaskInput): string[] {
  const fields: string[] = [];

  if (input.title !== undefined) {
    fields.push("title");
  }

  if (input.description !== undefined) {
    fields.push("description");
  }

  if (input.metadata !== undefined) {
    fields.push("metadata");
  }

  return fields;
}

function toTaskSummary(task: TaskEntity): TaskSummary {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
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
