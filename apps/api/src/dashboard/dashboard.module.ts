import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";
import type { DashboardReadStore } from "./dashboard.store.js";
import { TypeOrmDashboardReadStore } from "./typeorm-dashboard-read.store.js";

const dashboardServiceProvider: Provider<DashboardService> = {
  provide: DashboardService,
  useFactory: (store: DashboardReadStore): DashboardService => new DashboardService(store),
  inject: [TypeOrmDashboardReadStore],
};
@Module({
  imports: [DatabaseModule],
  controllers: [DashboardController],
  providers: [TypeOrmDashboardReadStore, dashboardServiceProvider],
})
export class DashboardModule {}
