import assert from "node:assert/strict";
import test from "node:test";
import {
  type AgentRuntimeToolCall,
  OpenRouterAgentRuntime,
  type OpenRouterFetch,
  type OpenRouterFetchInit,
  type OpenRouterFetchResponse,
  openRouterChatCompletionsEndpoint,
} from "./agent.runtime.js";
import type {
  AgentToolOperationCall,
  AgentToolOperationDispatcher,
} from "./agent-tool-dispatcher.js";

const request = {
  input: {
    telegramId: "123456789",
    telegramChatId: "-100987654321",
    sourceMessageId: "42",
    inputText: "@task summarize today",
    attachments: [],
  },
  context: {
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
  },
};

const config = {
  apiKey: "openrouter-secret",
  appTitle: "tAsk",
  fallbackModel: null,
  model: "openai/gpt-4.1-mini",
  siteUrl: null,
};

test("OpenRouterAgentRuntime sends chat completions and maps assistant content", async () => {
  const fetcher = new RecordingOpenRouterFetch(
    jsonResponse(200, {
      choices: [{ message: { content: "Today's summary is ready." } }],
      usage: {
        completion_tokens: 5,
        prompt_tokens: 10,
        total_tokens: 15,
      },
    }),
  );
  const runtime = new OpenRouterAgentRuntime(config, fetcher.fetch);

  assert.deepEqual(await runtime.handleTelegramRequest(request), {
    model: "openai/gpt-4.1-mini",
    normalizedIntent: {
      kind: "openrouter_chat_completion",
      source: "telegram",
    },
    finalResponse: "Today's summary is ready.",
    status: "completed",
    tokenUsage: {
      completion_tokens: 5,
      prompt_tokens: 10,
      total_tokens: 15,
    },
    cost: null,
    error: null,
    toolCalls: [],
  });

  const call = getOnlyCall(fetcher);
  assert.equal(call.url, openRouterChatCompletionsEndpoint);
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers.Authorization, "Bearer openrouter-secret");
  assert.equal(call.init.headers["Content-Type"], "application/json");
  assert.equal(call.init.headers["X-Title"], "tAsk");
  assert.equal(call.init.headers["HTTP-Referer"], undefined);
  assert.deepEqual(parseRequestBody(call.init.body), {
    model: "openai/gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You are tAsk's backend task agent. Reply with a short, actionable response.",
      },
      {
        role: "user",
        content: "@task summarize today",
      },
    ],
    stream: false,
  });
});

test("OpenRouterAgentRuntime parses assistant tool calls and dispatches typed operations", async () => {
  const fetcher = new RecordingOpenRouterFetch(
    jsonResponse(200, {
      choices: [
        {
          message: {
            content: "Task created.",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "tasks.create",
                  arguments: JSON.stringify({
                    workspaceId: "22222222-2222-4222-8222-222222222222",
                    projectId: "44444444-4444-4444-8444-444444444444",
                    title: "Follow up with Marina",
                  }),
                },
              },
            ],
          },
        },
      ],
      usage: {
        total_tokens: 24,
      },
    }),
  );
  const dispatcher = new RecordingAgentToolOperationDispatcher([
    {
      toolName: "tasks.create",
      arguments: {
        workspaceId: "22222222-2222-4222-8222-222222222222",
        projectId: "44444444-4444-4444-8444-444444444444",
        title: "Follow up with Marina",
      },
      result: {
        taskId: "55555555-5555-4555-8555-555555555555",
      },
      status: "success",
      error: null,
      completedAt: new Date("2026-07-08T00:00:03.000Z"),
    },
  ]);
  const runtime = new OpenRouterAgentRuntime(config, fetcher.fetch, dispatcher);

  assert.deepEqual(await runtime.handleTelegramRequest(request), {
    model: "openai/gpt-4.1-mini",
    normalizedIntent: {
      kind: "openrouter_chat_completion",
      source: "telegram",
    },
    finalResponse: "Task created.",
    status: "completed",
    tokenUsage: {
      total_tokens: 24,
    },
    cost: null,
    error: null,
    toolCalls: [
      {
        toolName: "tasks.create",
        arguments: {
          workspaceId: "22222222-2222-4222-8222-222222222222",
          projectId: "44444444-4444-4444-8444-444444444444",
          title: "Follow up with Marina",
        },
        result: {
          taskId: "55555555-5555-4555-8555-555555555555",
        },
        status: "success",
        error: null,
        completedAt: new Date("2026-07-08T00:00:03.000Z"),
      },
    ],
  });
  assert.deepEqual(dispatcher.calls, [
    {
      toolName: "tasks.create",
      arguments: {
        workspaceId: "22222222-2222-4222-8222-222222222222",
        projectId: "44444444-4444-4444-8444-444444444444",
        title: "Follow up with Marina",
      },
    },
  ]);
});

test("OpenRouterAgentRuntime logs dispatcher errors as failed tool calls", async () => {
  const fetcher = new RecordingOpenRouterFetch(
    jsonResponse(200, {
      choices: [
        {
          message: {
            content: "Could not create task.",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "tasks.create",
                  arguments: JSON.stringify({ title: "Follow up" }),
                },
              },
            ],
          },
        },
      ],
    }),
  );
  const runtime = new OpenRouterAgentRuntime(
    config,
    fetcher.fetch,
    new ThrowingAgentToolOperationDispatcher("backend unavailable"),
  );
  const result = await runtime.handleTelegramRequest(request);

  assert.equal(result.status, "failed");
  assert.equal(result.error, "backend unavailable");
  assert.equal(result.toolCalls.length, 1);
  assert.deepEqual(result.toolCalls[0]?.toolName, "tasks.create");
  assert.deepEqual(result.toolCalls[0]?.arguments, { title: "Follow up" });
  assert.deepEqual(result.toolCalls[0]?.result, null);
  assert.deepEqual(result.toolCalls[0]?.status, "error");
  assert.deepEqual(result.toolCalls[0]?.error, "backend unavailable");
  assert.ok(result.toolCalls[0]?.completedAt instanceof Date);
});

test("OpenRouterAgentRuntime rejects malformed assistant tool call arguments", async () => {
  const fetcher = new RecordingOpenRouterFetch(
    jsonResponse(200, {
      choices: [
        {
          message: {
            content: "Task created.",
            tool_calls: [
              {
                type: "function",
                function: {
                  name: "tasks.create",
                  arguments: "[]",
                },
              },
            ],
          },
        },
      ],
    }),
  );
  const runtime = new OpenRouterAgentRuntime(config, fetcher.fetch);

  assert.deepEqual(await runtime.handleTelegramRequest(request), {
    model: "openai/gpt-4.1-mini",
    normalizedIntent: {
      kind: "openrouter_chat_completion",
      source: "telegram",
    },
    finalResponse: "Agent execution failed before producing a response.",
    status: "failed",
    tokenUsage: null,
    cost: null,
    error: "OpenRouter assistant tool call function arguments must parse to an object.",
    toolCalls: [],
  });
});

test("OpenRouterAgentRuntime sends configured attribution headers", async () => {
  const fetcher = new RecordingOpenRouterFetch(
    jsonResponse(200, {
      choices: [{ message: { content: "Done." } }],
    }),
  );
  const runtime = new OpenRouterAgentRuntime(
    {
      apiKey: "openrouter-secret",
      appTitle: "tAsk Staging",
      fallbackModel: "anthropic/claude-3.5-sonnet",
      model: "openai/gpt-4.1-mini",
      siteUrl: "https://task.example",
    },
    fetcher.fetch,
  );

  await runtime.handleTelegramRequest(request);

  const call = getOnlyCall(fetcher);
  assert.equal(call.init.headers["HTTP-Referer"], "https://task.example");
  assert.equal(call.init.headers["X-Title"], "tAsk Staging");
});

test("OpenRouterAgentRuntime stores failed runs for non-OK OpenRouter responses", async () => {
  const fetcher = new RecordingOpenRouterFetch(
    jsonResponse(401, {
      error: {
        message: "Invalid API key",
      },
    }),
  );
  const runtime = new OpenRouterAgentRuntime(config, fetcher.fetch);

  assert.deepEqual(await runtime.handleTelegramRequest(request), {
    model: "openai/gpt-4.1-mini",
    normalizedIntent: {
      kind: "openrouter_chat_completion",
      source: "telegram",
    },
    finalResponse: "Agent execution failed before producing a response.",
    status: "failed",
    tokenUsage: null,
    cost: null,
    error: "OpenRouter request failed with status 401: Invalid API key",
    toolCalls: [],
  });
});

test("OpenRouterAgentRuntime stores failed runs for malformed success responses", async () => {
  const fetcher = new RecordingOpenRouterFetch(jsonResponse(200, { choices: [] }));
  const runtime = new OpenRouterAgentRuntime(config, fetcher.fetch);

  assert.deepEqual(await runtime.handleTelegramRequest(request), {
    model: "openai/gpt-4.1-mini",
    normalizedIntent: {
      kind: "openrouter_chat_completion",
      source: "telegram",
    },
    finalResponse: "Agent execution failed before producing a response.",
    status: "failed",
    tokenUsage: null,
    cost: null,
    error: "OpenRouter response did not include an assistant message.",
    toolCalls: [],
  });
});

test("OpenRouterAgentRuntime retries with fallback model after primary failure", async () => {
  const fetcher = new RecordingOpenRouterFetch([
    jsonResponse(429, { error: { message: "rate limited" } }),
    jsonResponse(200, {
      choices: [{ message: { content: "Fallback handled it." } }],
      usage: {
        total_tokens: 9,
      },
    }),
  ]);
  const runtime = new OpenRouterAgentRuntime(
    {
      ...config,
      fallbackModel: "anthropic/claude-3.5-sonnet",
    },
    fetcher.fetch,
  );

  assert.deepEqual(await runtime.handleTelegramRequest(request), {
    model: "anthropic/claude-3.5-sonnet",
    normalizedIntent: {
      kind: "openrouter_chat_completion",
      source: "telegram",
    },
    finalResponse: "Fallback handled it.",
    status: "completed",
    tokenUsage: {
      total_tokens: 9,
    },
    cost: null,
    error: null,
    toolCalls: [],
  });
  assert.equal(fetcher.calls.length, 2);
  assert.deepEqual(
    fetcher.calls.map((call) => readRequestModel(call.init.body)),
    ["openai/gpt-4.1-mini", "anthropic/claude-3.5-sonnet"],
  );
});

test("OpenRouterAgentRuntime stores combined failure context after fallback failure", async () => {
  const fetcher = new RecordingOpenRouterFetch([
    jsonResponse(429, { error: { message: "rate limited" } }),
    jsonResponse(200, { choices: [] }),
  ]);
  const runtime = new OpenRouterAgentRuntime(
    {
      ...config,
      fallbackModel: "anthropic/claude-3.5-sonnet",
    },
    fetcher.fetch,
  );

  assert.deepEqual(await runtime.handleTelegramRequest(request), {
    model: "anthropic/claude-3.5-sonnet",
    normalizedIntent: {
      kind: "openrouter_chat_completion",
      source: "telegram",
    },
    finalResponse: "Agent execution failed before producing a response.",
    status: "failed",
    tokenUsage: null,
    cost: null,
    error:
      "openai/gpt-4.1-mini: OpenRouter request failed with status 429: rate limited | anthropic/claude-3.5-sonnet: OpenRouter response did not include an assistant message.",
    toolCalls: [],
  });
});

test("OpenRouterAgentRuntime stores failed runs for fetch failures", async () => {
  const runtime = new OpenRouterAgentRuntime(config, async () => {
    throw new Error("network unavailable");
  });

  assert.deepEqual(await runtime.handleTelegramRequest(request), {
    model: "openai/gpt-4.1-mini",
    normalizedIntent: {
      kind: "openrouter_chat_completion",
      source: "telegram",
    },
    finalResponse: "Agent execution failed before producing a response.",
    status: "failed",
    tokenUsage: null,
    cost: null,
    error: "network unavailable",
    toolCalls: [],
  });
});

type OpenRouterFetchCall = {
  url: string;
  init: OpenRouterFetchInit;
};

class RecordingOpenRouterFetch {
  readonly calls: OpenRouterFetchCall[] = [];
  private responseIndex = 0;

  constructor(private readonly responses: OpenRouterFetchResponse | OpenRouterFetchResponse[]) {}

  readonly fetch: OpenRouterFetch = async (
    url: string,
    init: OpenRouterFetchInit,
  ): Promise<OpenRouterFetchResponse> => {
    this.calls.push({ url, init });

    if (!Array.isArray(this.responses)) {
      return this.responses;
    }

    const response = this.responses[this.responseIndex];
    this.responseIndex += 1;

    if (response === undefined) {
      throw new Error("No recorded OpenRouter response for fetch call.");
    }

    return response;
  };
}

class RecordingAgentToolOperationDispatcher implements AgentToolOperationDispatcher {
  readonly calls: AgentToolOperationCall[] = [];
  private responseIndex = 0;

  constructor(private readonly responses: AgentRuntimeToolCall[]) {}

  async dispatchToolCall(call: AgentToolOperationCall): Promise<AgentRuntimeToolCall> {
    this.calls.push(call);

    const response = this.responses[this.responseIndex];
    this.responseIndex += 1;

    if (response === undefined) {
      throw new Error("No recorded agent tool dispatch response.");
    }

    return response;
  }
}

class ThrowingAgentToolOperationDispatcher implements AgentToolOperationDispatcher {
  constructor(private readonly message: string) {}

  async dispatchToolCall(_call: AgentToolOperationCall): Promise<AgentRuntimeToolCall> {
    throw new Error(this.message);
  }
}

function jsonResponse(status: number, body: unknown): OpenRouterFetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json(): Promise<unknown> {
      return body;
    },
    async text(): Promise<string> {
      return JSON.stringify(body);
    },
  };
}

function getOnlyCall(fetcher: RecordingOpenRouterFetch): OpenRouterFetchCall {
  assert.equal(fetcher.calls.length, 1);
  const [call] = fetcher.calls;

  if (call === undefined) {
    throw new Error("Expected one OpenRouter fetch call.");
  }

  return call;
}

function parseRequestBody(value: string): unknown {
  return JSON.parse(value);
}

function readRequestModel(value: string): unknown {
  const body = parseRequestBody(value);

  if (!isOpenRouterRequestBody(body)) {
    throw new Error("Expected OpenRouter request body to be an object.");
  }

  return body.model;
}

type OpenRouterRequestBody = {
  model?: unknown;
};

function isOpenRouterRequestBody(value: unknown): value is OpenRouterRequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
