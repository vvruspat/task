import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource, ObjectLiteral, SelectQueryBuilder } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ProjectEntity,
  TaskEntity,
  TaskSkillEntity,
  UserEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
  SearchInput,
  SearchPage,
  SearchResult,
  SearchResultType,
} from "./search.contracts.js";
import type { SearchReadStore } from "./search.store.js";

type RankedSearchResult = SearchResult & { rank: number };
type RawSearchResult = {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  rank: string;
};
const typeOrder: Record<SearchResultType, number> = { project: 0, task: 1, task_skill: 2, user: 3 };
const maxCandidateResults = 10_000;
export const activeTaskSearchConditions = [
  "task.archived_at IS NULL",
  "project.archived_at IS NULL",
  "project.workspace_id = task.workspace_id",
] as const;

@Injectable()
export class TypeOrmSearchReadStore implements SearchReadStore {
  private initialization: Promise<DataSource> | null = null;
  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async search(
    workspaceId: string,
    userId: string,
    input: SearchInput,
  ): Promise<SearchPage | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.isWorkspaceMember(dataSource, workspaceId, userId))) return null;
    const parameters = { query: input.query.toLocaleLowerCase(), workspaceId };
    const candidateLimit = getSearchCandidateLimit(input);
    const [projects, tasks, skills, users] = await Promise.all([
      this.getProjects(dataSource, parameters, candidateLimit),
      this.getTasks(dataSource, parameters, candidateLimit),
      this.getSkills(dataSource, parameters, candidateLimit),
      this.getUsers(dataSource, parameters, candidateLimit),
    ]);
    const candidates = [...projects.items, ...tasks.items, ...skills.items, ...users.items].sort(
      compareSearchResults,
    );
    const total = projects.total + tasks.total + skills.total + users.total;
    const start = (input.page - 1) * input.pageSize;
    return {
      items: candidates.slice(start, start + input.pageSize).map(removeRank),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }

  private async getProjects(
    dataSource: DataSource,
    parameters: SearchParameters,
    limit: number,
  ): Promise<SearchCandidates> {
    const query = dataSource
      .getRepository(ProjectEntity)
      .createQueryBuilder("project")
      .where("project.workspace_id = :workspaceId", parameters)
      .andWhere("project.archived_at IS NULL")
      .andWhere(
        "(POSITION(:query IN LOWER(project.title)) > 0 OR POSITION(:query IN LOWER(COALESCE(project.description, ''))) > 0)",
      );
    return getCandidates(
      query,
      "project",
      "project.id",
      "project.title",
      "project.description",
      "NULL",
      projectRankSql,
      parameters,
      limit,
    );
  }
  private async getTasks(
    dataSource: DataSource,
    parameters: SearchParameters,
    limit: number,
  ): Promise<SearchCandidates> {
    const query = applyTaskSearchFilters(
      dataSource.getRepository(TaskEntity).createQueryBuilder("task"),
      parameters,
    );
    return getCandidates(
      query,
      "task",
      "task.id",
      "task.title",
      "task.description",
      "task.project_id",
      taskRankSql,
      parameters,
      limit,
    );
  }
  private async getSkills(
    dataSource: DataSource,
    parameters: SearchParameters,
    limit: number,
  ): Promise<SearchCandidates> {
    const aliasMatch =
      "EXISTS (SELECT 1 FROM unnest(skill.aliases) alias WHERE POSITION(:query IN LOWER(alias)) > 0)";
    const query = dataSource
      .getRepository(TaskSkillEntity)
      .createQueryBuilder("skill")
      .where("skill.workspace_id = :workspaceId", parameters)
      .andWhere("skill.archived_at IS NULL")
      .andWhere(
        `(POSITION(:query IN LOWER(skill.name)) > 0 OR POSITION(:query IN LOWER(COALESCE(skill.description, ''))) > 0 OR ${aliasMatch})`,
      );
    return getCandidates(
      query,
      "task_skill",
      "skill.id",
      "skill.name",
      "skill.description",
      "NULL",
      skillRankSql,
      parameters,
      limit,
    );
  }
  private async getUsers(
    dataSource: DataSource,
    parameters: SearchParameters,
    limit: number,
  ): Promise<SearchCandidates> {
    const query = dataSource
      .getRepository(UserEntity)
      .createQueryBuilder("user")
      .innerJoin(
        WorkspaceMemberEntity,
        "member",
        "member.user_id = user.id AND member.workspace_id = :workspaceId",
        parameters,
      )
      .where(
        "POSITION(:query IN LOWER(user.display_name)) > 0 OR POSITION(:query IN LOWER(COALESCE(user.email, ''))) > 0",
      );
    return getCandidates(
      query,
      "user",
      "user.id",
      "user.display_name",
      "user.email",
      "NULL",
      userRankSql,
      parameters,
      limit,
    );
  }
  private async isWorkspaceMember(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    return (
      (await dataSource.getRepository(WorkspaceMemberEntity).countBy({ workspaceId, userId })) > 0
    );
  }
  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
    if (dataSource.isInitialized) return dataSource;
    this.initialization ??= dataSource.initialize();
    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}
type SearchParameters = { query: string; workspaceId: string };
type SearchCandidates = { items: RankedSearchResult[]; total: number };
type TaskSearchQueryBuilder = {
  innerJoin(entity: typeof ProjectEntity, alias: string, condition: string): TaskSearchQueryBuilder;
  where(condition: string, parameters: SearchParameters): TaskSearchQueryBuilder;
  andWhere(condition: string): TaskSearchQueryBuilder;
};
export function applyTaskSearchFilters<T extends TaskSearchQueryBuilder>(
  query: T,
  parameters: SearchParameters,
): T {
  query
    .innerJoin(
      ProjectEntity,
      "project",
      "project.id = task.project_id AND project.workspace_id = task.workspace_id",
    )
    .where("task.workspace_id = :workspaceId", parameters)
    .andWhere(activeTaskSearchConditions[0])
    .andWhere(activeTaskSearchConditions[1])
    .andWhere(
      "(POSITION(:query IN LOWER(task.title)) > 0 OR POSITION(:query IN LOWER(COALESCE(task.description, ''))) > 0)",
    );
  return query;
}
export function getSearchCandidateLimit(input: SearchInput): number {
  return Math.min(input.page * input.pageSize, maxCandidateResults);
}
async function getCandidates<Entity extends ObjectLiteral>(
  query: SelectQueryBuilder<Entity>,
  type: SearchResultType,
  id: string,
  title: string,
  description: string,
  projectId: string,
  rankSql: string,
  parameters: SearchParameters,
  limit: number,
): Promise<SearchCandidates> {
  const total = await query.getCount();
  const rows = await query
    .select([
      `${id} AS id`,
      `${title} AS title`,
      `${description} AS description`,
      `${projectId} AS project_id`,
      `${rankSql} AS rank`,
    ])
    .orderBy(rankSql, "ASC")
    .addOrderBy(title, "ASC")
    .addOrderBy(id, "ASC")
    .setParameters(parameters)
    .take(limit)
    .getRawMany<RawSearchResult>();
  return {
    total,
    items: rows.map((row) => ({
      id: row.id,
      type,
      title: row.title,
      description: row.description,
      projectId: row.project_id,
      rank: Number(row.rank),
    })),
  };
}
const projectRankSql = rankSql("project.title", "project.description");
const taskRankSql = rankSql("task.title", "task.description");
const userRankSql = rankSql("user.display_name", "user.email");
export const skillRankSql = `CASE WHEN LOWER(skill.name) = :query OR LOWER(COALESCE(skill.description, '')) = :query OR EXISTS (SELECT 1 FROM unnest(skill.aliases) alias WHERE LOWER(alias) = :query) THEN 0 WHEN LOWER(skill.name) LIKE :query || '%' OR LOWER(COALESCE(skill.description, '')) LIKE :query || '%' OR EXISTS (SELECT 1 FROM unnest(skill.aliases) alias WHERE LOWER(alias) LIKE :query || '%') THEN 1 ELSE 2 END`;
function rankSql(primary: string, secondary: string): string {
  return `CASE WHEN LOWER(${primary}) = :query OR LOWER(COALESCE(${secondary}, '')) = :query THEN 0 WHEN LOWER(${primary}) LIKE :query || '%' OR LOWER(COALESCE(${secondary}, '')) LIKE :query || '%' THEN 1 ELSE 2 END`;
}
export function compareSearchResults(left: RankedSearchResult, right: RankedSearchResult): number {
  return (
    left.rank - right.rank ||
    typeOrder[left.type] - typeOrder[right.type] ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  );
}
function removeRank({ rank: _rank, ...item }: RankedSearchResult): SearchResult {
  return item;
}
