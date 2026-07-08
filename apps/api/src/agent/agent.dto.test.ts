import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  AgentRunIntakeResponseDto,
  AgentRunSummaryDto,
  parseCreateTelegramAgentRunInput,
} from "./agent.dto.js";

const validInput = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
  sourceMessageId: "  42  ",
  inputText: "  @task what is next?  ",
};

test("parseCreateTelegramAgentRunInput validates and normalizes Telegram agent requests", () => {
  assert.deepEqual(parseCreateTelegramAgentRunInput(validInput), {
    telegramId: "123456789",
    telegramChatId: "-100987654321",
    sourceMessageId: "42",
    inputText: "@task what is next?",
  });

  assert.deepEqual(
    parseCreateTelegramAgentRunInput({
      ...validInput,
      sourceMessageId: "",
    }),
    {
      telegramId: "123456789",
      telegramChatId: "-100987654321",
      sourceMessageId: null,
      inputText: "@task what is next?",
    },
  );
});

test("parseCreateTelegramAgentRunInput rejects malformed Telegram agent requests", () => {
  const invalidPayloads: unknown[] = [
    null,
    [],
    { ...validInput, telegramId: "username" },
    { ...validInput, telegramChatId: "chat" },
    { ...validInput, sourceMessageId: 42 },
    { ...validInput, inputText: "" },
    { ...validInput, inputText: " ".repeat(8001) },
  ];

  for (const payload of invalidPayloads) {
    assert.throws(() => parseCreateTelegramAgentRunInput(payload), BadRequestException);
  }
});

test("AgentRunIntakeResponseDto maps agent run intake responses", () => {
  const response = new AgentRunIntakeResponseDto({
    agentRunId: "11111111-1111-4111-8111-111111111111",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    source: "telegram",
    sourceMessageId: "42",
    status: "completed",
    responseText: "Request recorded. Agent execution is not connected yet.",
    createdAt: "2026-07-08T00:00:00.000Z",
  });

  assert.deepEqual(
    { ...response },
    {
      agentRunId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      source: "telegram",
      sourceMessageId: "42",
      status: "completed",
      responseText: "Request recorded. Agent execution is not connected yet.",
      createdAt: "2026-07-08T00:00:00.000Z",
    },
  );
});

test("AgentRunSummaryDto maps agent run summaries", () => {
  const response = new AgentRunSummaryDto({
    id: "11111111-1111-4111-8111-111111111111",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    source: "telegram",
    sourceMessageId: "42",
    model: "openai/gpt-4.1-mini",
    inputText: "@task what is next?",
    finalResponse: "Already handled.",
    status: "completed",
    error: null,
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:01:00.000Z",
  });

  assert.deepEqual(
    { ...response },
    {
      id: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      source: "telegram",
      sourceMessageId: "42",
      model: "openai/gpt-4.1-mini",
      inputText: "@task what is next?",
      finalResponse: "Already handled.",
      status: "completed",
      error: null,
      createdAt: "2026-07-08T00:00:00.000Z",
      updatedAt: "2026-07-08T00:01:00.000Z",
    },
  );
});
