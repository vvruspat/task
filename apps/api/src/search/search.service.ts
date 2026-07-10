import { Injectable, NotFoundException } from "@nestjs/common";
import type { SearchInput } from "./search.contracts.js";
import { SearchPageDto } from "./search.dto.js";
import type { SearchReadStore } from "./search.store.js";

@Injectable()
export class SearchService {
  constructor(private readonly store: SearchReadStore) {}
  async search(workspaceId: string, userId: string, input: SearchInput): Promise<SearchPageDto> {
    const result = await this.store.search(workspaceId, userId, input);
    if (result === null) throw new NotFoundException("Workspace was not found.");
    return new SearchPageDto(result);
  }
}
