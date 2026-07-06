import { Injectable } from "@nestjs/common";
import { HealthResponseDto } from "./app.dto.js";

@Injectable()
export class AppService {
  getHealth(): HealthResponseDto {
    return new HealthResponseDto({
      status: "ok",
      service: "api",
      version: "0.0.0",
    });
  }
}
