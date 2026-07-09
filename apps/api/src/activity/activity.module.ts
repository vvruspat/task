import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ActivityController } from "./activity.controller.js";
import { ActivityService } from "./activity.service.js";
import type { TaskActivityStore } from "./activity.store.js";
import { TypeOrmTaskActivityStore } from "./typeorm-task-activity.store.js";

const activityServiceProvider: Provider<ActivityService> = {
  provide: ActivityService,
  useFactory: (activityStore: TaskActivityStore): ActivityService =>
    new ActivityService(activityStore),
  inject: [TypeOrmTaskActivityStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [ActivityController],
  providers: [TypeOrmTaskActivityStore, activityServiceProvider],
})
export class ActivityModule {}
