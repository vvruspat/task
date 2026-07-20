import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { TaskSkillsController } from "./task-skills.controller.js";
import { TaskSkillsService } from "./task-skills.service.js";
import type { TaskSkillsReadStore } from "./task-skills.store.js";
import { TypeOrmTaskSkillsReadStore } from "./typeorm-task-skills-read.store.js";

const taskSkillsServiceProvider: Provider<TaskSkillsService> = {
  provide: TaskSkillsService,
  useFactory: (readStore: TaskSkillsReadStore): TaskSkillsService =>
    new TaskSkillsService(readStore),
  inject: [TypeOrmTaskSkillsReadStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [TaskSkillsController],
  providers: [TypeOrmTaskSkillsReadStore, taskSkillsServiceProvider],
  exports: [TaskSkillsService],
})
export class TaskSkillsModule {}
