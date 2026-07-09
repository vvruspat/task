import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { SearchInput, SearchPage, SearchResult } from "./search.contracts.js";

export class SearchResultDto implements SearchResult {
  @ApiProperty({ format: "uuid" }) readonly id: string;
  @ApiProperty({ enum: ["project", "task", "task_skill", "user"] }) readonly type:
    | "project"
    | "task"
    | "task_skill"
    | "user";
  @ApiProperty() readonly title: string;
  @ApiProperty({ nullable: true, required: true, type: String }) readonly description:
    | string
    | null;
  @ApiProperty({ format: "uuid", nullable: true, required: true, type: String }) readonly projectId:
    | string
    | null;
  constructor(value: SearchResult) {
    this.id = value.id;
    this.type = value.type;
    this.title = value.title;
    this.description = value.description;
    this.projectId = value.projectId;
  }
}
export class SearchPageDto implements SearchPage {
  @ApiProperty({ type: SearchResultDto, isArray: true }) readonly items: SearchResultDto[];
  @ApiProperty({ minimum: 1 }) readonly page: number;
  @ApiProperty({ minimum: 1, maximum: 100 }) readonly pageSize: number;
  @ApiProperty({ minimum: 0 }) readonly total: number;
  constructor(value: SearchPage) {
    this.items = value.items.map((item) => new SearchResultDto(item));
    this.page = value.page;
    this.pageSize = value.pageSize;
    this.total = value.total;
  }
}
export class SearchQueryDto implements SearchInput {
  @ApiProperty({ minLength: 1, maxLength: 200 }) readonly query: string = "";
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 1 }) readonly page: number = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 }) readonly pageSize: number = 20;
}
export class ParseSearchQueryPipe implements PipeTransform<unknown, SearchInput> {
  transform(value: unknown): SearchInput {
    if (!isUnknownRecord(value)) throw new BadRequestException("Search query must be an object.");
    const query = readProperty(value, "query");
    if (typeof query !== "string" || query.trim().length === 0 || query.trim().length > 200)
      throw new BadRequestException(
        "query must be a non-empty string no longer than 200 characters.",
      );
    return {
      query: query.trim(),
      page: parsePositive(readProperty(value, "page"), "page", 1, 100),
      pageSize: parsePositive(readProperty(value, "pageSize"), "pageSize", 20, 100),
    };
  }
}
function parsePositive(value: unknown, name: string, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value))
    throw new BadRequestException(`${name} must be a positive integer.`);
  const parsed = Number(value);
  if (parsed < 1 || parsed > max)
    throw new BadRequestException(`${name} must be between 1 and ${max}.`);
  return parsed;
}
function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readProperty(value: Record<string, unknown>, key: string): unknown {
  return value[key];
}
