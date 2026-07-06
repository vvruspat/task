import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { createOpenApiDocument } from "./openapi.js";

const defaultPort = 3000;

function getPort(value: string | undefined): number {
  if (value === undefined) {
    return defaultPort;
  }

  const parsedPort = Number.parseInt(value, 10);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    return defaultPort;
  }

  return parsedPort;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const document = createOpenApiDocument(app);
  const { PORT: port } = process.env;

  SwaggerModule.setup("openapi", app, document);

  await app.listen(getPort(port));
}

await bootstrap();
