import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { TypeOrmWorkspaceReadStore } from "./typeorm-workspace-read.store.js";
import { WorkspacesController } from "./workspaces.controller.js";
import { WorkspacesService } from "./workspaces.service.js";
import type { WorkspaceReadStore } from "./workspaces.store.js";

const workspacesServiceProvider: Provider<WorkspacesService> = {
  provide: WorkspacesService,
  useFactory: (readStore: WorkspaceReadStore): WorkspacesService =>
    new WorkspacesService(readStore),
  inject: [TypeOrmWorkspaceReadStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [WorkspacesController],
  providers: [TypeOrmWorkspaceReadStore, workspacesServiceProvider],
})
export class WorkspacesModule {}
