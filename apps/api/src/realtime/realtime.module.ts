import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { WorkspacesModule } from "../workspaces/workspaces.module.js";
import { WorkspaceChangeInterceptor } from "./workspace-change.interceptor.js";
import { WorkspaceRealtimeController } from "./workspace-realtime.controller.js";
import { WorkspaceRealtimeService } from "./workspace-realtime.service.js";

@Module({
  imports: [WorkspacesModule],
  controllers: [WorkspaceRealtimeController],
  providers: [
    WorkspaceRealtimeService,
    { provide: APP_INTERCEPTOR, useClass: WorkspaceChangeInterceptor },
  ],
  exports: [WorkspaceRealtimeService],
})
export class RealtimeModule {}
