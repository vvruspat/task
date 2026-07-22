import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ActivityModule } from "./activity/activity.module.js";
import { AgentModule } from "./agent/agent.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AttachmentsModule } from "./attachments/attachments.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CommentsModule } from "./comments/comments.module.js";
import { ConfirmationsModule } from "./confirmations/confirmations.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { InvitationsModule } from "./invitations/invitations.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { ProjectMatrixModule } from "./project-matrix/project-matrix.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { RealtimeModule } from "./realtime/realtime.module.js";
import { SearchModule } from "./search/search.module.js";
import { StatusesModule } from "./statuses/statuses.module.js";
import { TaskSkillsModule } from "./task-skills/task-skills.module.js";
import { TasksModule } from "./tasks/tasks.module.js";
import { TelegramModule } from "./telegram/telegram.module.js";
import { ViewsModule } from "./views/views.module.js";
import { WorkspaceRolesGuard } from "./workspaces/workspace-roles.guard.js";
import { WorkspacesModule } from "./workspaces/workspaces.module.js";

@Module({
  imports: [
    AuthModule,
    ActivityModule,
    WorkspacesModule,
    DashboardModule,
    ProjectsModule,
    SearchModule,
    ProjectMatrixModule,
    NotificationsModule,
    InvitationsModule,
    RealtimeModule,
    TasksModule,
    TaskSkillsModule,
    StatusesModule,
    CommentsModule,
    AttachmentsModule,
    ConfirmationsModule,
    TelegramModule,
    AgentModule,
    ViewsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: WorkspaceRolesGuard }],
})
export class AppModule {}
