import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { loadApiConfig } from "./config.js";
import { configureCors } from "./cors.js";
import { createOpenApiDocument } from "./openapi.js";

async function bootstrap(): Promise<void> {
  const config = loadApiConfig();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  configureCors(app);
  const document = createOpenApiDocument(app);

  SwaggerModule.setup("openapi", app, document);

  await app.listen(config.port);
}

await bootstrap();
