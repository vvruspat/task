import { DataSource, type DataSourceOptions } from "typeorm";
import type { ApiDatabaseConfig } from "./config.js";

export function createTypeOrmDataSourceOptions(database: ApiDatabaseConfig): DataSourceOptions {
  return {
    type: "postgres",
    url: database.url,
    synchronize: false,
    migrationsRun: false,
    entities: [],
    migrations: [],
  };
}

export function createApiDataSource(database: ApiDatabaseConfig): DataSource {
  return new DataSource(createTypeOrmDataSourceOptions(database));
}
