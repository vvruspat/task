import { Module, type Provider } from "@nestjs/common";
import { AttachmentsModule } from "../attachments/attachments.module.js";
import { AttachmentsService } from "../attachments/attachments.service.js";
import { BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import { loadApiConfig } from "../config.js";
import { ConfirmationsModule } from "../confirmations/confirmations.module.js";
import { ConfirmationsService } from "../confirmations/confirmations.service.js";
import { DatabaseModule } from "../database/database.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { ProjectsService } from "../projects/projects.service.js";
import { RealtimeModule } from "../realtime/realtime.module.js";
import { WorkspaceRealtimeService } from "../realtime/workspace-realtime.service.js";
import { SearchModule } from "../search/search.module.js";
import { SearchService } from "../search/search.service.js";
import { StatusesModule } from "../statuses/statuses.module.js";
import { StatusesService } from "../statuses/statuses.service.js";
import { TaskSkillsModule } from "../task-skills/task-skills.module.js";
import { TaskSkillsService } from "../task-skills/task-skills.service.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { TasksService } from "../tasks/tasks.service.js";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { WorkspacesService } from "../workspaces/workspaces.service.js";
import { AgentController } from "./agent.controller.js";
import {
  type AgentRuntime,
  agentRuntimeToken,
  OpenRouterAgentRuntime,
  StubAgentRuntime,
} from "./agent.runtime.js";
import { AgentService } from "./agent.service.js";
import type { AgentRunStore } from "./agent.store.js";
import { AgentChatsController } from "./agent-chats.controller.js";
import { AgentRunsController } from "./agent-runs.controller.js";
import { BackendAgentToolOperationDispatcher } from "./backend-agent-tool-dispatcher.js";
import { TypeOrmAgentRunStore } from "./typeorm-agent-run.store.js";
import { WebAgentController } from "./web-agent.controller.js";

const agentRuntimeProvider: Provider<AgentRuntime> = {
  provide: agentRuntimeToken,
  useFactory: (toolDispatcher: BackendAgentToolOperationDispatcher): AgentRuntime => {
    const openRouterConfig = loadApiConfig().openRouter;

    return openRouterConfig === null
      ? new StubAgentRuntime()
      : new OpenRouterAgentRuntime(openRouterConfig, undefined, toolDispatcher);
  },
  inject: [BackendAgentToolOperationDispatcher],
};

const backendAgentToolOperationDispatcherProvider: Provider<BackendAgentToolOperationDispatcher> = {
  provide: BackendAgentToolOperationDispatcher,
  useFactory: (
    projectsService: ProjectsService,
    tasksService: TasksService,
    taskSkillsService: TaskSkillsService,
    workspacesService: WorkspacesService,
    statusesService: StatusesService,
    attachmentsService: AttachmentsService,
    searchService: SearchService,
    realtimeService: WorkspaceRealtimeService,
  ): BackendAgentToolOperationDispatcher =>
    new BackendAgentToolOperationDispatcher(
      projectsService,
      tasksService,
      taskSkillsService,
      workspacesService,
      statusesService,
      attachmentsService,
      searchService,
      realtimeService,
    ),
  inject: [
    ProjectsService,
    TasksService,
    TaskSkillsService,
    WorkspacesService,
    StatusesService,
    AttachmentsService,
    SearchService,
    WorkspaceRealtimeService,
  ],
};

const agentServiceProvider: Provider<AgentService> = {
  provide: AgentService,
  useFactory: (
    agentRunStore: AgentRunStore,
    agentRuntime: AgentRuntime,
    confirmationsService: ConfirmationsService,
  ): AgentService => new AgentService(agentRunStore, agentRuntime, confirmationsService),
  inject: [TypeOrmAgentRunStore, agentRuntimeToken, ConfirmationsService],
};

@Module({
  imports: [
    AttachmentsModule,
    DatabaseModule,
    ConfirmationsModule,
    ProjectsModule,
    RealtimeModule,
    SearchModule,
    StatusesModule,
    TasksModule,
    TaskSkillsModule,
    WorkspacesModule,
  ],
  controllers: [AgentController, AgentChatsController, AgentRunsController, WebAgentController],
  providers: [
    BotSharedSecretGuard,
    backendAgentToolOperationDispatcherProvider,
    agentRuntimeProvider,
    TypeOrmAgentRunStore,
    agentServiceProvider,
  ],
  exports: [AgentService],
})
export class AgentModule {}
