import assert from "node:assert/strict";
import test from "node:test";
import { parseApiConfig } from "./config.js";
import { createApiDataSource, createTypeOrmDataSourceOptions } from "./data-source.js";
import {
  StatusEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "./persistence/entities/index.js";
import { CreateCorePersistenceTables1783296000000 } from "./persistence/migrations/1783296000000-create-core-persistence-tables.js";

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
    StatusEntity,
  ]);
  assert.deepEqual(options.migrations, [CreateCorePersistenceTables1783296000000]);
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
