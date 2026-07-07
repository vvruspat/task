import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AttachmentsModule } from "./attachments/attachments.module.js";
import { CommentsModule } from "./comments/comments.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { StatusesModule } from "./statuses/statuses.module.js";
import { TaskSkillsModule } from "./task-skills/task-skills.module.js";
import { TasksModule } from "./tasks/tasks.module.js";
import { TelegramModule } from "./telegram/telegram.module.js";
import { WorkspacesModule } from "./workspaces/workspaces.module.js";

@Module({
  imports: [
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    TaskSkillsModule,
    StatusesModule,
    CommentsModule,
    AttachmentsModule,
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
