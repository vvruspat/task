import type {
  AgentChatMessageRecord,
  AgentChatRecord,
  AgentRunRecord,
  AgentToolCallRecord,
  ConfirmationRequestRecord,
} from "../persistence/types/core-persistence.types.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import type { AgentRuntimeResult, AgentRuntimeToolCall } from "./agent.runtime.js";

export type TelegramAgentRunContextResult =
  | {
      status: "resolved";
      workspaceId: string;
      userId: string;
      defaultProjectId?: string | null;
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

export type PersistTelegramAgentRunInput = {
  workspaceId: string;
  userId: string;
  sourceThreadId: string | null;
  sourceMessageId: string | null;
  inputText: string;
  runtimeResult: AgentRuntimeResult;
};

export type PersistWebAgentRunInput = Omit<
  PersistTelegramAgentRunInput,
  "sourceMessageId" | "sourceThreadId"
>;

export type PersistWebChatTurnInput = PersistWebAgentRunInput & {
  chatId: string | null;
  chatTitle: string;
  assistantMessage: string;
};

export type AgentChatDetailRecord = {
  chat: AgentChatRecord;
  messages: AgentChatMessageRecord[];
};

export type PersistedWebChatTurn = {
  chat: AgentChatRecord;
  run: AgentRunRecord;
};

export type PersistAgentToolCallInput = AgentRuntimeToolCall;

export type FindTelegramAgentRunInput = {
  workspaceId: string;
  userId: string;
  sourceThreadId: string;
  sourceMessageId: string;
};

export type ListTelegramConversationInput = {
  workspaceId: string;
  sourceThreadId: string;
  limit: number;
};

export type AgentRunDetailRecord = {
  run: AgentRunRecord;
  toolCalls: AgentToolCallRecord[];
  confirmationRequests: ConfirmationRequestRecord[];
};

export type AgentRunStore = {
  resolveTelegramRunContext(
    input: CreateTelegramAgentRunInput,
  ): Promise<TelegramAgentRunContextResult>;
  listForWorkspace(workspaceId: string, userId: string): Promise<AgentRunRecord[] | null>;
  getDetailForWorkspace(
    workspaceId: string,
    agentRunId: string,
    userId: string,
  ): Promise<AgentRunDetailRecord | null>;
  isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean>;
  listChats?(workspaceId: string, userId: string, query: string): Promise<AgentChatRecord[] | null>;
  getChat?(
    workspaceId: string,
    chatId: string,
    userId: string,
  ): Promise<AgentChatDetailRecord | null>;
  updateChatTitle?(
    workspaceId: string,
    chatId: string,
    userId: string,
    title: string,
  ): Promise<AgentChatRecord | null>;
  deleteChat?(workspaceId: string, chatId: string, userId: string): Promise<AgentChatRecord | null>;
  findTelegramRunBySource(input: FindTelegramAgentRunInput): Promise<AgentRunRecord | null>;
  listTelegramConversation(input: ListTelegramConversationInput): Promise<AgentRunRecord[]>;
  createTelegramRun(input: PersistTelegramAgentRunInput): Promise<AgentRunRecord>;
  createWebRun(input: PersistWebAgentRunInput): Promise<AgentRunRecord>;
  createWebChatTurn?(input: PersistWebChatTurnInput): Promise<PersistedWebChatTurn | null>;
};
