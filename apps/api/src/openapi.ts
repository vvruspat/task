import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { HealthResponseDto } from "./app.dto.js";

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("tAsk API")
    .setDescription("Backend API contract for tAsk.")
    .setVersion("0.0.0")
    .build();

  return SwaggerModule.createDocument(app, config, {
    extraModels: [HealthResponseDto],
  });
}
