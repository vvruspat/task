import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AuthStore } from "./auth.store.js";
import { TypeOrmAuthStore } from "./typeorm-auth.store.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, TypeOrmAuthStore, { provide: AuthStore, useExisting: TypeOrmAuthStore }],
  exports: [AuthService],
})
export class AuthModule {}
