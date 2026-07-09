import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ProjectMatrixController } from "./project-matrix.controller.js";
import { ProjectMatrixService } from "./project-matrix.service.js";
import type { ProjectMatrixReadStore } from "./project-matrix.store.js";
import { TypeOrmProjectMatrixReadStore } from "./typeorm-project-matrix-read.store.js";

const projectMatrixServiceProvider: Provider<ProjectMatrixService> = {
  provide: ProjectMatrixService,
  useFactory: (store: ProjectMatrixReadStore): ProjectMatrixService =>
    new ProjectMatrixService(store),
  inject: [TypeOrmProjectMatrixReadStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [ProjectMatrixController],
  providers: [TypeOrmProjectMatrixReadStore, projectMatrixServiceProvider],
})
export class ProjectMatrixModule {}
