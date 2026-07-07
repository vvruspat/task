import { Module, type Provider } from "@nestjs/common";
import { BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import { DatabaseModule } from "../database/database.module.js";
import { AgentController } from "./agent.controller.js";
import { AgentService } from "./agent.service.js";
import type { AgentRunStore } from "./agent.store.js";
import { TypeOrmAgentRunStore } from "./typeorm-agent-run.store.js";

const agentServiceProvider: Provider<AgentService> = {
  provide: AgentService,
  useFactory: (agentRunStore: AgentRunStore): AgentService => new AgentService(agentRunStore),
  inject: [TypeOrmAgentRunStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [AgentController],
  providers: [BotSharedSecretGuard, TypeOrmAgentRunStore, agentServiceProvider],
})
export class AgentModule {}
