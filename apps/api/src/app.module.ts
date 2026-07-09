import { Module } from "@nestjs/common";
import { ActivityModule } from "./activity/activity.module.js";
import { AgentModule } from "./agent/agent.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AttachmentsModule } from "./attachments/attachments.module.js";
import { CommentsModule } from "./comments/comments.module.js";
import { ConfirmationsModule } from "./confirmations/confirmations.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { StatusesModule } from "./statuses/statuses.module.js";
import { TaskSkillsModule } from "./task-skills/task-skills.module.js";
import { TasksModule } from "./tasks/tasks.module.js";
import { TelegramModule } from "./telegram/telegram.module.js";
import { WorkspacesModule } from "./workspaces/workspaces.module.js";

@Module({
  imports: [
    ActivityModule,
    WorkspacesModule,
    DashboardModule,
    ProjectsModule,
    TasksModule,
    TaskSkillsModule,
    StatusesModule,
    CommentsModule,
    AttachmentsModule,
    ConfirmationsModule,
    TelegramModule,
    AgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
