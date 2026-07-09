import { Module, type Provider } from "@nestjs/common";
import { BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import { loadApiConfig } from "../config.js";
import { ConfirmationsModule } from "../confirmations/confirmations.module.js";
import { ConfirmationsService } from "../confirmations/confirmations.service.js";
import { DatabaseModule } from "../database/database.module.js";
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
import { TypeOrmAgentRunStore } from "./typeorm-agent-run.store.js";

const agentRuntimeProvider: Provider<AgentRuntime> = {
  provide: agentRuntimeToken,
  useFactory: (): AgentRuntime => {
    const openRouterConfig = loadApiConfig().openRouter;

    return openRouterConfig === null
      ? new StubAgentRuntime()
      : new OpenRouterAgentRuntime(openRouterConfig);
  },
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
  imports: [DatabaseModule, ConfirmationsModule],
  controllers: [AgentController, AgentRunsController],
  providers: [
    BotSharedSecretGuard,
    agentRuntimeProvider,
    TypeOrmAgentRunStore,
    agentServiceProvider,
  ],
})
export class AgentModule {}
