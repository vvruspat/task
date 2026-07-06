import { Injectable, Module, type OnApplicationShutdown } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { loadApiConfig } from "../config.js";
import { createApiDataSource } from "../data-source.js";

export type ApiDataSource = DataSource | null;

@Injectable()
export class ApiDataSourceProvider implements OnApplicationShutdown {
  private readonly dataSource: ApiDataSource;

  constructor() {
    const config = loadApiConfig();

    if (config.database === null) {
      this.dataSource = null;
      return;
    }

    this.dataSource = createApiDataSource(config.database);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  getDataSource(): ApiDataSource {
    return this.dataSource;
  }
}

@Module({
  providers: [ApiDataSourceProvider],
  exports: [ApiDataSourceProvider],
})
export class DatabaseModule {}
