import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { CommentsController } from "./comments.controller.js";
import { CommentsService } from "./comments.service.js";
import type { TaskCommentsStore } from "./comments.store.js";
import { TypeOrmTaskCommentsStore } from "./typeorm-task-comments.store.js";

const commentsServiceProvider: Provider<CommentsService> = {
  provide: CommentsService,
  useFactory: (commentsStore: TaskCommentsStore): CommentsService =>
    new CommentsService(commentsStore),
  inject: [TypeOrmTaskCommentsStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [CommentsController],
  providers: [TypeOrmTaskCommentsStore, commentsServiceProvider],
})
export class CommentsModule {}
