export const searchResultTypes = ["project", "task", "task_skill", "user"] as const;
export type SearchResultType = (typeof searchResultTypes)[number];

export type SearchInput = { query: string; page: number; pageSize: number };
export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  description: string | null;
  projectId: string | null;
};
export type SearchPage = { items: SearchResult[]; page: number; pageSize: number; total: number };
