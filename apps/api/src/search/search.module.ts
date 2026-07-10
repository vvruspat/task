import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { SearchController } from "./search.controller.js";
import { SearchService } from "./search.service.js";
import type { SearchReadStore } from "./search.store.js";
import { TypeOrmSearchReadStore } from "./typeorm-search-read.store.js";

const searchServiceProvider: Provider<SearchService> = {
  provide: SearchService,
  useFactory: (store: SearchReadStore): SearchService => new SearchService(store),
  inject: [TypeOrmSearchReadStore],
};
@Module({
  imports: [DatabaseModule],
  controllers: [SearchController],
  providers: [TypeOrmSearchReadStore, searchServiceProvider],
})
export class SearchModule {}
