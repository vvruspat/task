import { DataSource, type DataSourceOptions } from "typeorm";
import type { ApiDatabaseConfig } from "./config.js";
import {
  StatusEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "./persistence/entities/index.js";
import { CreateCorePersistenceTables1783296000000 } from "./persistence/migrations/1783296000000-create-core-persistence-tables.js";

const apiEntities = [WorkspaceEntity, UserEntity, WorkspaceMemberEntity, StatusEntity] as const;
const apiMigrations = [CreateCorePersistenceTables1783296000000] as const;

export function createTypeOrmDataSourceOptions(database: ApiDatabaseConfig): DataSourceOptions {
  return {
    type: "postgres",
    url: database.url,
    synchronize: false,
    migrationsRun: false,
    entities: [...apiEntities],
    migrations: [...apiMigrations],
  };
}

export function createApiDataSource(database: ApiDatabaseConfig): DataSource {
  return new DataSource(createTypeOrmDataSourceOptions(database));
}
