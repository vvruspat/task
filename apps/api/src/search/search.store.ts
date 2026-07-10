import type { SearchInput, SearchPage } from "./search.contracts.js";

export type SearchReadStore = {
  search(workspaceId: string, userId: string, input: SearchInput): Promise<SearchPage | null>;
};
