import "reflect-metadata";

import { loadApiConfig } from "./config.js";
import { createApiDataSource } from "./data-source.js";

const database = loadApiConfig().database;
if (database === null) throw new Error("DATABASE_URL is required to run migrations.");

const dataSource = createApiDataSource(database);
try {
  await dataSource.initialize();
  const migrations = await dataSource.runMigrations({ transaction: "all" });
  process.stdout.write(`Applied ${migrations.length} migration(s).\n`);
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
