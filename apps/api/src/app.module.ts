import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AttachmentsModule } from "./attachments/attachments.module.js";
import { CommentsModule } from "./comments/comments.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { TasksModule } from "./tasks/tasks.module.js";
import { WorkspacesModule } from "./workspaces/workspaces.module.js";

@Module({
  imports: [WorkspacesModule, ProjectsModule, TasksModule, CommentsModule, AttachmentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
