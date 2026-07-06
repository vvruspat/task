import { ApiProperty } from "@nestjs/swagger";
import type { HealthResponse, HealthStatus } from "./app.contracts.js";

export class HealthResponseDto implements HealthResponse {
  @ApiProperty({
    description: "Current API health status.",
    enum: ["ok"],
    example: "ok",
  })
  readonly status: HealthStatus;

  @ApiProperty({
    description: "Service identifier.",
    example: "api",
  })
  readonly service: string;

  @ApiProperty({
    description: "API package version.",
    example: "0.0.0",
  })
  readonly version: string;

  constructor(response: HealthResponse) {
    this.status = response.status;
    this.service = response.service;
    this.version = response.version;
  }
}
