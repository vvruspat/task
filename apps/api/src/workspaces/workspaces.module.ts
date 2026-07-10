import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { TypeOrmWorkspaceReadStore } from "./typeorm-workspace-read.store.js";
import { WorkspacesController } from "./workspaces.controller.js";
import { WorkspacesService } from "./workspaces.service.js";
import type { WorkspaceMemberManagementStore, WorkspaceReadStore } from "./workspaces.store.js";

const workspacesServiceProvider: Provider<WorkspacesService> = {
  provide: WorkspacesService,
  useFactory: (
    readStore: WorkspaceReadStore,
    managementStore: WorkspaceMemberManagementStore,
  ): WorkspacesService => new WorkspacesService(readStore, managementStore),
  inject: [TypeOrmWorkspaceReadStore, TypeOrmWorkspaceReadStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [WorkspacesController],
  providers: [TypeOrmWorkspaceReadStore, workspacesServiceProvider],
})
export class WorkspacesModule {}
