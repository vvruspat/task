import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";
import type { ProjectReadStore } from "./projects.store.js";
import { TypeOrmProjectReadStore } from "./typeorm-project-read.store.js";

const projectsServiceProvider: Provider<ProjectsService> = {
  provide: ProjectsService,
  useFactory: (readStore: ProjectReadStore): ProjectsService => new ProjectsService(readStore),
  inject: [TypeOrmProjectReadStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [ProjectsController],
  providers: [TypeOrmProjectReadStore, projectsServiceProvider],
  exports: [ProjectsService],
})
export class ProjectsModule {}
