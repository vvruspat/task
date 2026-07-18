import { Module, type Provider } from "@nestjs/common";
import { BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import { loadApiConfig } from "../config.js";
import { ConfirmationsModule } from "../confirmations/confirmations.module.js";
import { ConfirmationsService } from "../confirmations/confirmations.service.js";
import { DatabaseModule } from "../database/database.module.js";
import { ProjectsModule } from "../projects/projects.module.js";
import { ProjectsService } from "../projects/projects.service.js";
import { TasksModule } from "../tasks/tasks.module.js";
import { TasksService } from "../tasks/tasks.service.js";
import { AgentController } from "./agent.controller.js";
import {
  type AgentRuntime,
  agentRuntimeToken,
  OpenRouterAgentRuntime,
  StubAgentRuntime,
} from "./agent.runtime.js";
import { AgentService } from "./agent.service.js";
import type { AgentRunStore } from "./agent.store.js";
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
  ): BackendAgentToolOperationDispatcher =>
    new BackendAgentToolOperationDispatcher(projectsService, tasksService),
  inject: [ProjectsService, TasksService],
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
  imports: [DatabaseModule, ConfirmationsModule, ProjectsModule, TasksModule],
  controllers: [AgentController, AgentRunsController, WebAgentController],
  providers: [
    BotSharedSecretGuard,
    backendAgentToolOperationDispatcherProvider,
    agentRuntimeProvider,
    TypeOrmAgentRunStore,
    agentServiceProvider,
  ],
})
export class AgentModule {}
