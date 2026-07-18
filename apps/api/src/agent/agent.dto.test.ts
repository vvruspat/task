import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  AgentRunIntakeResponseDto,
  AgentRunSummaryDto,
  parseCreateTelegramAgentRunInput,
  parseCreateWebAgentChatInput,
} from "./agent.dto.js";

const validInput = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
  sourceMessageId: "  42  ",
  inputText: "  @task what is next?  ",
  attachments: [
    {
      kind: "document",
      fileId: " document-file-id ",
      fileUniqueId: "document-unique-id",
      fileName: " chart.pdf ",
      mimeType: " application/pdf ",
      sizeBytes: "1024",
    },
    {
      kind: "photo",
      fileId: "photo-file-id",
      fileUniqueId: null,
      width: 1280,
      height: 720,
      sizeBytes: null,
    },
  ],
};

test("parseCreateTelegramAgentRunInput validates and normalizes Telegram agent requests", () => {
  assert.deepEqual(parseCreateTelegramAgentRunInput(validInput), {
    telegramId: "123456789",
    telegramChatId: "-100987654321",
    sourceMessageId: "42",
    inputText: "@task what is next?",
    attachments: [
      {
        kind: "document",
        fileId: "document-file-id",
        fileUniqueId: "document-unique-id",
        fileName: "chart.pdf",
        mimeType: "application/pdf",
        sizeBytes: "1024",
      },
      {
        kind: "photo",
        fileId: "photo-file-id",
        fileUniqueId: null,
        width: 1280,
        height: 720,
        sizeBytes: null,
      },
    ],
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
      attachments: [
        {
          kind: "document",
          fileId: "document-file-id",
          fileUniqueId: "document-unique-id",
          fileName: "chart.pdf",
          mimeType: "application/pdf",
          sizeBytes: "1024",
        },
        {
          kind: "photo",
          fileId: "photo-file-id",
          fileUniqueId: null,
          width: 1280,
          height: 720,
          sizeBytes: null,
        },
      ],
    },
  );

  assert.deepEqual(parseCreateTelegramAgentRunInput({ ...validInput, attachments: undefined }), {
    telegramId: "123456789",
    telegramChatId: "-100987654321",
    sourceMessageId: "42",
    inputText: "@task what is next?",
    attachments: [],
  });
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
    { ...validInput, attachments: {} },
    { ...validInput, attachments: Array.from({ length: 11 }, () => validInput.attachments[0]) },
    { ...validInput, attachments: [{ kind: "video", fileId: "file-id" }] },
    { ...validInput, attachments: [{ kind: "document", fileId: "", sizeBytes: null }] },
    { ...validInput, attachments: [{ kind: "document", fileId: "file-id", sizeBytes: "1KB" }] },
    {
      ...validInput,
      attachments: [{ kind: "photo", fileId: "file-id", width: 0, height: 1 }],
    },
  ];

  for (const payload of invalidPayloads) {
    assert.throws(() => parseCreateTelegramAgentRunInput(payload), BadRequestException);
  }
});

test("parseCreateWebAgentChatInput validates conversation and project context", () => {
  assert.deepEqual(
    parseCreateWebAgentChatInput({
      messages: [
        { role: "assistant", content: " Чем помочь? " },
        { role: "user", content: " Покажи статус проекта " },
      ],
      projectId: "b0000000-0000-4000-8000-000000000001",
    }),
    {
      messages: [
        { role: "assistant", content: "Чем помочь?" },
        { role: "user", content: "Покажи статус проекта" },
      ],
      projectId: "b0000000-0000-4000-8000-000000000001",
    },
  );
});

test("parseCreateWebAgentChatInput rejects empty and assistant-ended conversations", () => {
  const invalidPayloads: unknown[] = [
    null,
    { messages: [] },
    { messages: [{ role: "assistant", content: "Готово" }] },
    { messages: [{ role: "user", content: "" }] },
    { messages: [{ role: "user", content: "Привет" }], projectId: "not-a-uuid" },
  ];
  for (const payload of invalidPayloads) {
    assert.throws(() => parseCreateWebAgentChatInput(payload), BadRequestException);
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
    pendingConfirmationRequests: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        kind: "task.create",
        preview: { title: "Записать бас" },
        expiresAt: "2026-07-08T01:00:00.000Z",
      },
    ],
    createdAt: "2026-07-08T00:00:00.000Z",
  });

  assert.deepEqual(
    {
      ...response,
      pendingConfirmationRequests: response.pendingConfirmationRequests.map((request) => ({
        ...request,
      })),
    },
    {
      agentRunId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      source: "telegram",
      sourceMessageId: "42",
      status: "completed",
      responseText: "Request recorded. Agent execution is not connected yet.",
      pendingConfirmationRequests: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          kind: "task.create",
          preview: { title: "Записать бас" },
          expiresAt: "2026-07-08T01:00:00.000Z",
        },
      ],
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
