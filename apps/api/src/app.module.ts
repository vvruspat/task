import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { WorkspacesModule } from "./workspaces/workspaces.module.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
