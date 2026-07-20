import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { IssuesController, TasksController } from "./tasks.controller.js";
import { TasksService } from "./tasks.service.js";
import type { TaskReadStore } from "./tasks.store.js";
import { TypeOrmTaskReadStore } from "./typeorm-task-read.store.js";

const tasksServiceProvider: Provider<TasksService> = {
  provide: TasksService,
  useFactory: (readStore: TaskReadStore): TasksService => new TasksService(readStore),
  inject: [TypeOrmTaskReadStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [TasksController, IssuesController],
  providers: [TypeOrmTaskReadStore, tasksServiceProvider],
  exports: [TasksService],
})
export class TasksModule {}
