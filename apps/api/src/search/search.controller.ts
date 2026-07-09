import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import type { SearchInput } from "./search.contracts.js";
import { ParseSearchQueryPipe, SearchPageDto } from "./search.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { SearchService } from "./search.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });
@ApiTags("search")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId")
export class SearchController {
  constructor(private readonly service: SearchService) {}
  @Get("search")
  @ApiOperation({ summary: "Search visible projects, tasks, task skills, and workspace members" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiQuery({ name: "query", required: true, type: String, minLength: 1, maxLength: 200 })
  @ApiQuery({ name: "page", required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiQuery({ name: "pageSize", required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: SearchPageDto })
  @ApiBadRequestResponse({ description: "Search query is invalid." })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible." })
  search(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Query(new ParseSearchQueryPipe()) input: SearchInput,
  ): Promise<SearchPageDto> {
    return this.service.search(workspaceId, userId, input);
  }
}
