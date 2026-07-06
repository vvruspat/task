import assert from "node:assert/strict";
import test from "node:test";
import { parseApiConfig } from "./config.js";
import { createApiDataSource, createTypeOrmDataSourceOptions } from "./data-source.js";
import {
  ActivityEventEntity,
  AgentRunEntity,
  AgentToolCallEntity,
  AttachmentEntity,
  CommentEntity,
  ProjectEntity,
  StatusEntity,
  TaskEntity,
  TaskSkillEntity,
  TaskSkillVersionEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "./persistence/entities/index.js";
import { CreateCorePersistenceTables1783296000000 } from "./persistence/migrations/1783296000000-create-core-persistence-tables.js";
import { CreateProjectsTable1783296060000 } from "./persistence/migrations/1783296060000-create-projects-table.js";
import { CreateTasksTable1783296120000 } from "./persistence/migrations/1783296120000-create-tasks-table.js";
import { CreateTaskSkillsTables1783296180000 } from "./persistence/migrations/1783296180000-create-task-skills-tables.js";
import { CreateCommentsTable1783296240000 } from "./persistence/migrations/1783296240000-create-comments-table.js";
import { CreateAttachmentsTable1783296300000 } from "./persistence/migrations/1783296300000-create-attachments-table.js";
import { CreateActivityEventsTable1783296360000 } from "./persistence/migrations/1783296360000-create-activity-events-table.js";
import { CreateAgentRunTables1783296420000 } from "./persistence/migrations/1783296420000-create-agent-run-tables.js";

const databaseUrl = "postgresql://task_user:task_password@localhost:5432/task_db";

test("createTypeOrmDataSourceOptions builds a PostgreSQL shell without schema sync", () => {
  const config = parseApiConfig({ DATABASE_URL: databaseUrl });

  assert.notEqual(config.database, null);

  if (config.database === null) {
    throw new Error("Expected parsed database config.");
  }

  const options = createTypeOrmDataSourceOptions(config.database);

  assert.equal(options.type, "postgres");
  assert.equal(options.url, databaseUrl);
  assert.equal(options.synchronize, false);
  assert.equal(options.migrationsRun, false);
  assert.deepEqual(options.entities, [
    WorkspaceEntity,
    UserEntity,
    WorkspaceMemberEntity,
    ProjectEntity,
    StatusEntity,
    TaskEntity,
    TaskSkillEntity,
    TaskSkillVersionEntity,
    CommentEntity,
    AttachmentEntity,
    ActivityEventEntity,
    AgentRunEntity,
    AgentToolCallEntity,
  ]);
  assert.deepEqual(options.migrations, [
    CreateCorePersistenceTables1783296000000,
    CreateProjectsTable1783296060000,
    CreateTasksTable1783296120000,
    CreateTaskSkillsTables1783296180000,
    CreateCommentsTable1783296240000,
    CreateAttachmentsTable1783296300000,
    CreateActivityEventsTable1783296360000,
    CreateAgentRunTables1783296420000,
  ]);
});

test("createApiDataSource constructs but does not initialize a DataSource", () => {
  const config = parseApiConfig({ DATABASE_URL: databaseUrl });

  assert.notEqual(config.database, null);

  if (config.database === null) {
    throw new Error("Expected parsed database config.");
  }

  const dataSource = createApiDataSource(config.database);

  assert.equal(dataSource.isInitialized, false);
  assert.equal(dataSource.options.type, "postgres");
});
