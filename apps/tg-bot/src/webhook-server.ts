import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { loadTelegramBotConfig, type TelegramBotConfig } from "./config.js";
import {
  type CreateTelegramBotRuntimeFromEnvironmentOptions,
  type CreateTelegramBotRuntimeOptions,
  createTelegramBotRuntime,
  type TelegramBotRuntime,
} from "./runtime.js";
import {
  handleTelegramWebhookHttpRequest,
  type TelegramWebhookHttpHeaders,
  type TelegramWebhookHttpResponse,
} from "./webhook-http-adapter.js";

export type TelegramWebhookServerOptions = {
  config: Pick<TelegramBotConfig, "port" | "webhookSecret">;
  runtime: TelegramBotRuntime;
  maxBodyBytes?: number;
};

export type TelegramWebhookServerFromEnvironmentOptions =
  CreateTelegramBotRuntimeFromEnvironmentOptions & {
    maxBodyBytes?: number;
  };

export class TelegramWebhookServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramWebhookServerError";
  }
}

export function createTelegramWebhookServer(options: TelegramWebhookServerOptions): Server {
  return createServer((request, response) => {
    void handleTelegramWebhookNodeRequest(request, response, options);
  });
}

export async function runTelegramWebhookServerFromEnvironment(
  options: TelegramWebhookServerFromEnvironmentOptions = {},
): Promise<Server> {
  const config = loadTelegramBotConfig(options.environment);
  const runtimeOptions: CreateTelegramBotRuntimeOptions = { config };

  if (options.backendFetch !== undefined) {
    runtimeOptions.backendFetch = options.backendFetch;
  }

  if (options.telegramFetch !== undefined) {
    runtimeOptions.telegramFetch = options.telegramFetch;
  }

  const runtime = createTelegramBotRuntime(runtimeOptions);
  const serverOptions: TelegramWebhookServerOptions = {
    config,
    runtime,
  };

  if (options.maxBodyBytes !== undefined) {
    serverOptions.maxBodyBytes = options.maxBodyBytes;
  }

  const server = createTelegramWebhookServer(serverOptions);

  await listen(server, config.port);

  return server;
}

export async function handleTelegramWebhookNodeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: TelegramWebhookServerOptions,
): Promise<void> {
  try {
    const method = request.method ?? "";
    const headers = normalizeHeaders(request.headers);

    if (method.toUpperCase() !== "POST") {
      const adapterResponse = await handleTelegramWebhookHttpRequest(
        {
          method,
          headers,
          body: null,
        },
        {
          config: { webhookSecret: options.config.webhookSecret },
          runtime: options.runtime,
        },
      );

      writeJsonResponse(response, adapterResponse.statusCode, adapterResponse.body);
      return;
    }

    const adapterResponse = await handleTelegramWebhookHttpRequest(
      {
        method,
        headers,
        body: await readJsonBody(request, options.maxBodyBytes ?? defaultMaxBodyBytes),
      },
      {
        config: { webhookSecret: options.config.webhookSecret },
        runtime: options.runtime,
      },
    );

    writeJsonResponse(response, adapterResponse.statusCode, adapterResponse.body);
  } catch (error) {
    if (error instanceof TelegramWebhookServerError) {
      writeJsonResponse(response, 400, { status: "bad_request" });
      return;
    }

    writeJsonResponse(response, 500, { status: "failed" });
  }
}

function normalizeHeaders(headers: IncomingHttpHeaders): TelegramWebhookHttpHeaders {
  return headers;
}

async function readJsonBody(request: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const rawBody = await readRequestBody(request, maxBodyBytes);

  try {
    const parsedBody: unknown = JSON.parse(rawBody);
    return parsedBody;
  } catch {
    throw new TelegramWebhookServerError("Telegram webhook body must be valid JSON.");
  }
}

function readRequestBody(request: IncomingMessage, maxBodyBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let receivedBytes = 0;

    request.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      receivedBytes += buffer.byteLength;

      if (receivedBytes > maxBodyBytes) {
        reject(new TelegramWebhookServerError("Telegram webhook body is too large."));
        return;
      }

      chunks.push(buffer);
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", (error: Error) => {
      reject(error);
    });
  });
}

function writeJsonResponse(
  response: ServerResponse,
  statusCode: TelegramWebhookHttpResponse["statusCode"] | 400,
  body: { status: string },
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

const defaultMaxBodyBytes = 1024 * 1024;
