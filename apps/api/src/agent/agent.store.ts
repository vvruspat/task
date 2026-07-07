import type { AgentRunRecord } from "../persistence/types/core-persistence.types.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";

export type AgentRunCreateResult =
  | {
      status: "created";
      run: AgentRunRecord;
    }
  | {
      status: "telegram_user_unlinked";
    }
  | {
      status: "telegram_chat_unlinked";
    }
  | {
      status: "user_not_in_chat_workspace";
    };

export type AgentRunStore = {
  createTelegramRun(input: CreateTelegramAgentRunInput): Promise<AgentRunCreateResult>;
};
