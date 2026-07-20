import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { TypeOrmViewsStore } from "./typeorm-views.store.js";
import { ViewsController } from "./views.controller.js";
import { ViewsService } from "./views.service.js";
import type { SavedViewsStore } from "./views.store.js";

const viewsServiceProvider: Provider<ViewsService> = {
  provide: ViewsService,
  useFactory: (store: SavedViewsStore): ViewsService => new ViewsService(store),
  inject: [TypeOrmViewsStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [ViewsController],
  providers: [TypeOrmViewsStore, viewsServiceProvider],
})
export class ViewsModule {}
