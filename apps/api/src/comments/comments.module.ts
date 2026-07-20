import { Module, type Provider } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module.js";
import { AgentService } from "../agent/agent.service.js";
import { DatabaseModule } from "../database/database.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { ProjectsService } from "../projects/projects.service.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { TasksService } from "../tasks/tasks.service.js";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { WorkspacesService } from "../workspaces/workspaces.service.js";
import { CommentAgentMentionService } from "./comment-agent-mention.service.js";
import { CommentsController } from "./comments.controller.js";
import { CommentsService } from "./comments.service.js";
import type { TaskCommentsStore } from "./comments.store.js";
import { TypeOrmTaskCommentsStore } from "./typeorm-task-comments.store.js";

const commentsServiceProvider: Provider<CommentsService> = {
  provide: CommentsService,
  useFactory: (
    commentsStore: TaskCommentsStore,
    agentMentionHandler: CommentAgentMentionService,
  ): CommentsService => new CommentsService(commentsStore, agentMentionHandler),
  inject: [TypeOrmTaskCommentsStore, CommentAgentMentionService],
};

const commentAgentMentionServiceProvider: Provider<CommentAgentMentionService> = {
  provide: CommentAgentMentionService,
  useFactory: (
    commentsStore: TaskCommentsStore,
    agentService: AgentService,
    projectsService: ProjectsService,
    tasksService: TasksService,
    workspacesService: WorkspacesService,
  ): CommentAgentMentionService =>
    new CommentAgentMentionService(
      commentsStore,
      agentService,
      projectsService,
      tasksService,
      workspacesService,
    ),
  inject: [
    TypeOrmTaskCommentsStore,
    AgentService,
    ProjectsService,
    TasksService,
    WorkspacesService,
  ],
};

@Module({
  imports: [AgentModule, DatabaseModule, ProjectsModule, TasksModule, WorkspacesModule],
  controllers: [CommentsController],
  providers: [
    TypeOrmTaskCommentsStore,
    commentAgentMentionServiceProvider,
    commentsServiceProvider,
  ],
})
export class CommentsModule {}
