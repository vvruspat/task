import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { TypeOrmWorkspaceReadStore } from "./typeorm-workspace-read.store.js";
import { WorkspacesController } from "./workspaces.controller.js";
import { WorkspacesService } from "./workspaces.service.js";
import type {
  WorkspaceManagementStore,
  WorkspaceMemberManagementStore,
  WorkspaceReadStore,
} from "./workspaces.store.js";

const workspacesServiceProvider: Provider<WorkspacesService> = {
  provide: WorkspacesService,
  useFactory: (
    readStore: WorkspaceReadStore,
    managementStore: WorkspaceMemberManagementStore,
    workspaceManagementStore: WorkspaceManagementStore,
  ): WorkspacesService =>
    new WorkspacesService(readStore, managementStore, workspaceManagementStore),
  inject: [TypeOrmWorkspaceReadStore, TypeOrmWorkspaceReadStore, TypeOrmWorkspaceReadStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [WorkspacesController],
  providers: [TypeOrmWorkspaceReadStore, workspacesServiceProvider],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
