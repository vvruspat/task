# Graph Report - tAsk-issue-131-telegram-update-processor  (2026-07-07)

## Corpus Check
- 215 files · ~80,621 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1705 nodes · 3563 edges · 92 communities (82 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6e8520b0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]

## God Nodes (most connected - your core abstractions)
1. `executeMigrationQueries()` - 34 edges
2. `compilerOptions` - 23 edges
3. `ApiDataSourceProvider` - 20 edges
4. `WorkspaceMemberEntity` - 19 edges
5. `TaskDetailDto` - 19 edges
6. `TaskSkillDetailDto` - 18 edges
7. `Tables` - 18 edges
8. `ResolveTelegramContextInput` - 17 edges
9. `createTaskMcpServer()` - 17 edges
10. `Technical architecture` - 17 edges

## Surprising Connections (you probably didn't know these)
- `generateOpenApi()` --calls--> `createOpenApiDocument()`  [EXTRACTED]
  apps/api/src/generate-openapi.ts → apps/api/src/openapi.ts
- `TaskSkillDetailDto` --implements--> `TaskSkillDetail`  [EXTRACTED]
  apps/api/src/task-skills/task-skills.dto.ts → apps/api/src/task-skills/task-skills.contracts.ts
- `UpdateTaskSkillDefinitionDto` --implements--> `UpdateTaskSkillDefinitionInput`  [EXTRACTED]
  apps/api/src/task-skills/task-skills.dto.ts → apps/api/src/task-skills/task-skills.contracts.ts
- `TaskSkillApplyResultDto` --references--> `TaskDetailDto`  [EXTRACTED]
  apps/api/src/task-skills/task-skills.dto.ts → apps/api/src/tasks/tasks.dto.ts
- `TypeOrmTaskSkillsReadStore` --implements--> `TaskSkillsReadStore`  [EXTRACTED]
  apps/api/src/task-skills/typeorm-task-skills-read.store.ts → apps/api/src/task-skills/task-skills.store.ts

## Import Cycles
- None detected.

## Communities (92 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (21): activity_events, agent_runs, agent_tool_calls, attachments, comments, confirmation_requests, Core principle, Data model draft (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (17): Backend architecture, Confirmation model, Database, Deployment draft, External references, Frontend architecture, Linting and formatting, LLM and OpenRouter (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (21): DatabaseModule, toWorkspaceSummary(), TypeOrmWorkspaceReadStore, WorkspaceDetail, WorkspaceMember, WorkspaceSummary, createdAt, workspaceSummary (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (13): Kanban, Matrix view, My tasks, Product model, Table view, Task skills/templates, Telegram-first UX, Templates/skills editor (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (23): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (19): Agent and MCP design, Agent run audit, Attachment tools, Confirmation tools, Example flow: apply a skill with overrides, Example flow: create a song from a skill, Example flow: create a task skill, Fuzzy resolution (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (25): compilerOptions, allowSyntheticDefaultImports, alwaysStrict, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, moduleDetection (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (14): Agent rules, API and OpenAPI, Async and data consistency, Atomicity, Error handling, Git hygiene, graphify, Reuse and boundaries (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): tAsk docs, Главная идея, Документы

### Community 11 - "Community 11"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 12 - "Community 12"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 13 - "Community 13"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (25): dependsOn, outputs, cache, persistent, cache, outputs, dependsOn, outputs (+17 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (37): CreateTaskInput, CreateTaskRequest, UpdateTaskAssigneeInput, UpdateTaskAssigneeRequest, UpdateTaskDueDateInput, UpdateTaskDueDateRequest, UpdateTaskStatusInput, UpdateTaskStatusRequest (+29 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (20): description, devDependencies, openapi-typescript, exports, files, import, main, name (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (17): description, exports, files, import, main, name, private, scripts (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (17): description, exports, files, import, main, name, private, scripts (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (17): description, exports, files, import, main, name, private, scripts (+9 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (12): compilerOptions, composite, declaration, declarationMap, emitDeclarationOnly, lib, module, moduleResolution (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (10): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, strict, target (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (8): compilerOptions, lib, module, moduleResolution, strict, target, extends, $schema

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (9): compilerOptions, declarationMap, emitDeclarationOnly, outDir, rootDir, tsBuildInfoFile, extends, include (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (9): compilerOptions, declarationMap, emitDeclarationOnly, outDir, rootDir, tsBuildInfoFile, extends, include (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): compilerOptions, declarationMap, emitDeclarationOnly, outDir, rootDir, tsBuildInfoFile, extends, include (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, strict, extends, files, references, $schema

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): compilerOptions, emitDecoratorMetadata, experimentalDecorators, strict, useDefineForClassFields, extends, $schema

### Community 31 - "Community 31"
Cohesion: 0.20
Nodes (9): compilerOptions, declarationMap, emitDeclarationOnly, outDir, rootDir, tsBuildInfoFile, extends, include (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (5): compilerOptions, jsx, strict, extends, $schema

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (14): requestBody, TaskBackendClientError, TaskBackendFetchInit, projectDetail, projectSummary, readJsonBody(), readPostInit(), readWriteInit() (+6 more)

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (22): dependencies, @nestjs/common, @nestjs/core, @nestjs/platform-fastify, @nestjs/swagger, pg, reflect-metadata, rxjs (+14 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (18): bin, task-mcp-server, dependencies, @modelcontextprotocol/sdk, @task/api-client, zod, description, name (+10 more)

### Community 39 - "Community 39"
Cohesion: 0.13
Nodes (14): dependencies, @task/api-client, description, name, private, scripts, build, format (+6 more)

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, format, lint, lint:fix (+4 more)

### Community 41 - "Community 41"
Cohesion: 0.20
Nodes (9): compilerOptions, incremental, outDir, rootDir, tsBuildInfoFile, types, extends, include (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (9): compilerOptions, incremental, outDir, rootDir, tsBuildInfoFile, types, extends, include (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (9): compilerOptions, incremental, outDir, rootDir, tsBuildInfoFile, types, extends, include (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (7): compilerOptions, incremental, rootDir, tsBuildInfoFile, extends, include, $schema

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (22): description, devDependencies, @biomejs/biome, turbo, @types/node, typescript, license, name (+14 more)

### Community 46 - "Community 46"
Cohesion: 0.15
Nodes (16): ResolveTelegramContextInput, TelegramContextResolution, TelegramController, RecordingTelegramContextStore, isUnknownRecord(), ParseResolveTelegramContextBodyPipe, parseResolveTelegramContextInput(), readTelegramId() (+8 more)

### Community 47 - "Community 47"
Cohesion: 0.21
Nodes (24): isSafeInteger(), isUnknownRecord(), parseTelegramMessageContext(), readAttachments(), readBoolean(), readDocumentAttachment(), readMessageEntities(), readMessageEntity() (+16 more)

### Community 49 - "Community 49"
Cohesion: 0.16
Nodes (11): CreateTaskSkillInput, UpdateTaskSkillDefinitionInput, UpdateTaskSkillMetadataInput, TaskSkillsController, uuidV4Pipe, CreateTaskSkillDto, TaskSkillDetailDto, UpdateTaskSkillMetadataDto (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (29): ActivityEventEntity, AttachmentEntity, CommentEntity, ConfirmationRequestEntity, ProjectEntity, StatusEntity, TaskEntity, TaskSkillEntity (+21 more)

### Community 51 - "Community 51"
Cohesion: 0.08
Nodes (44): CreateTaskInput, TaskDetail, TaskSummary, UpdateTaskAssigneeInput, UpdateTaskDueDateInput, UpdateTaskStatusInput, TasksController, createdAt (+36 more)

### Community 53 - "Community 53"
Cohesion: 0.20
Nodes (12): CreateTaskCommentInput, TaskCommentResponse, CommentCreateToolInput, CommentListToolInput, CommentToolHandlers, CommentToolInputError, isUnknownRecord(), parseCommentCreateToolInput() (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.19
Nodes (17): PreviewTaskSkillApplyOverrides, isUnknownRecord(), ParseCreateTaskSkillBodyPipe, parseCreateTaskSkillInput(), ParsePreviewTaskSkillApplyBodyPipe, parsePreviewTaskSkillApplyInput(), ParseUpdateTaskSkillDefinitionBodyPipe, parseUpdateTaskSkillDefinitionInput() (+9 more)

### Community 55 - "Community 55"
Cohesion: 0.11
Nodes (15): TaskMcpToolRegistrar, TaskSkillToolRegistrar, applyResponse, attachmentResponse, commentResponse, isUnknownRecord(), previewResponse, projectDetailResponse (+7 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (12): applyPreview, applyResult, archivedAt, archivedTaskSkillDetail, createdAt, createInput, definitionUpdateInput, metadataUpdateInput (+4 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (15): TaskSkillSummary, TaskSkillSummaryDto, applyPreview, applyResult, archivedAt, archivedTaskSkillDetail, createdAt, createInput (+7 more)

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (10): createCorePersistenceTablesSql, dropCorePersistenceTablesSql, MigrationQueryExecutor, createProjectsTableSql, dropProjectsTableSql, createAgentRunTablesSql, dropAgentRunTablesSql, createTelegramTablesSql (+2 more)

### Community 60 - "Community 60"
Cohesion: 0.23
Nodes (11): PreviewTaskSkillApplyInput, isUnknownRecord(), parseTaskSkillApplyToolInput(), readOptionalOverrides(), readOptionalStringArray(), readRecord(), readRequiredNonEmptyString(), readRequiredUuid() (+3 more)

### Community 61 - "Community 61"
Cohesion: 0.05
Nodes (59): isUnknownRecord(), postJson(), readOptionalNullableString(), readRecord(), readString(), ApplyTaskSkillOperation, buildProjectTaskAssigneePath(), buildProjectTaskDueDatePath() (+51 more)

### Community 62 - "Community 62"
Cohesion: 0.07
Nodes (27): files, includes, formatter, enabled, indentStyle, indentWidth, lineWidth, quoteStyle (+19 more)

### Community 63 - "Community 63"
Cohesion: 0.11
Nodes (24): CreateProjectInput, ProjectDetail, ProjectSummary, ProjectsController, createdAt, projectSummary, uuidV4Pipe, CreateProjectDto (+16 more)

### Community 64 - "Community 64"
Cohesion: 0.12
Nodes (21): CreateTaskCommentInput, TaskComment, CommentsController, createdAt, taskComment, uuidV4Pipe, CreateTaskCommentDto, isUnknownRecord() (+13 more)

### Community 65 - "Community 65"
Cohesion: 0.27
Nodes (8): formatInvalidValue(), parseBackendBaseUrl(), InvalidTaskMcpEnvironmentError, loadTaskMcpConfig(), parseOptionalNonEmptyString(), parseTaskMcpConfig(), TaskMcpConfig, TaskMcpEnvironment

### Community 66 - "Community 66"
Cohesion: 0.11
Nodes (22): CreateTaskLinkAttachmentInput, TaskAttachment, AttachmentsController, createdAt, taskAttachment, uuidV4Pipe, CreateTaskLinkAttachmentDto, isUnknownRecord() (+14 more)

### Community 67 - "Community 67"
Cohesion: 0.08
Nodes (19): ApiTrustedCurrentUser(), parseTrustedCurrentUserId(), TrustedCurrentUserHeader, TrustedCurrentUserId, TrustedCurrentUserRequest, ApiDataSourceProvider, WorkspaceStatus, StatusesController (+11 more)

### Community 68 - "Community 68"
Cohesion: 0.15
Nodes (13): TaskSkillDetail, TaskSkillApplyForWorkspaceResult, TaskSkillApplyPreviewResult, TaskSkillArchiveResult, TaskSkillCreateResult, TaskSkillDefinitionUpdateResult, TaskSkillMetadataUpdateResult, buildApplySubtasks() (+5 more)

### Community 69 - "Community 69"
Cohesion: 0.06
Nodes (52): normalizeBaseUrl(), createAttachmentToolHandlers(), createTaskBackendClient(), TaskBackendFetch, createCommentToolHandlers(), attachmentCreateLinkInputSchema, AttachmentCreateLinkMcpArgs, attachmentListInputSchema (+44 more)

### Community 70 - "Community 70"
Cohesion: 0.18
Nodes (15): CreateProjectInput, isUnknownRecord(), parseProjectCreateToolInput(), parseProjectGetToolInput(), parseProjectSearchToolInput(), ProjectCreateToolInput, ProjectGetToolInput, ProjectSearchToolInput (+7 more)

### Community 71 - "Community 71"
Cohesion: 0.21
Nodes (7): PreviewTaskSkillApplyInput, TaskSkillApplyPreview, TaskSkillApplyResult, PreviewTaskSkillApplyDto, TaskSkillApplyPreviewDto, TaskSkillApplyResultDto, UpdateTaskSkillDefinitionDto

### Community 72 - "Community 72"
Cohesion: 0.48
Nodes (5): InviteEntity, WorkspaceMemberEntity, InviteRecord, WorkspaceMemberRecord, WorkspaceMemberRole

### Community 74 - "Community 74"
Cohesion: 0.43
Nodes (5): components, $defs, operations, paths, webhooks

### Community 75 - "Community 75"
Cohesion: 0.70
Nodes (4): AgentRunEntity, AgentRunRecord, AgentRunSource, AgentRunStatus

### Community 76 - "Community 76"
Cohesion: 0.18
Nodes (13): AttachmentCreateLinkToolInput, AttachmentListToolInput, AttachmentToolHandlers, AttachmentToolInputError, isUnknownRecord(), parseAttachmentCreateLinkToolInput(), parseAttachmentListToolInput(), readOptionalNullableString() (+5 more)

### Community 77 - "Community 77"
Cohesion: 0.07
Nodes (28): formatInvalidValue(), AttachmentsModule, CommentsModule, ProjectsModule, HealthResponse, HealthStatus, AppController, HealthResponseDto (+20 more)

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (12): PreviewTaskSkillApplyResponse, TaskBackendFetchResponse, applyResponse, FetchCall, isRegisteredServerToolCollection(), isUnknownRecord(), previewResponse, readProperty() (+4 more)

### Community 80 - "Community 80"
Cohesion: 0.09
Nodes (17): ApiDataSource, CreateCorePersistenceTables1783296000000, executeMigrationQueries(), CreateProjectsTable1783296060000, CreateTasksTable1783296120000, CreateTaskSkillsTables1783296180000, CreateCommentsTable1783296240000, CreateAttachmentsTable1783296300000 (+9 more)

### Community 81 - "Community 81"
Cohesion: 0.83
Nodes (3): AgentToolCallEntity, AgentToolCallRecord, AgentToolCallStatus

### Community 82 - "Community 82"
Cohesion: 0.36
Nodes (5): TaskSkillApplyPreviewSubtask, TaskSkillApplyPreviewSubtaskSource, TaskSkillVersionSummary, TaskSkillApplyPreviewSubtaskDto, TaskSkillVersionSummaryDto

### Community 84 - "Community 84"
Cohesion: 0.09
Nodes (28): taskAttachment, ApplyTaskSkillResponse, CreateProjectRequest, CreateTaskCommentRequest, CreateTaskLinkAttachmentRequest, ListTaskAttachmentsRequest, ProjectDetailResponse, ProjectSummaryResponse (+20 more)

### Community 85 - "Community 85"
Cohesion: 0.13
Nodes (19): createSendMessageBody(), createTelegramReplySender(), isUnknownRecord(), normalizeApiBaseUrl(), readMessageId(), readProperty(), readRecord(), readSendMessageResponse() (+11 more)

### Community 86 - "Community 86"
Cohesion: 0.12
Nodes (18): requestBody, isUnknownRecord(), normalizeBaseUrl(), readOptionalNullableString(), readRecord(), readString(), createTelegramBackendClient(), readResolutionStatus() (+10 more)

### Community 87 - "Community 87"
Cohesion: 0.14
Nodes (23): createReply(), handleTelegramUpdate(), readResolvedContext(), TelegramMessageHandlerAction, TelegramMessageHandlerOptions, TelegramReplyAction, TelegramResolvedContext, TelegramResolvedMessageAction (+15 more)

### Community 88 - "Community 88"
Cohesion: 0.23
Nodes (10): formatInvalidValue(), parseBackendBaseUrl(), InvalidTelegramBotEnvironmentError, loadTelegramBotConfig(), parseOptionalSecret(), parseRequiredSecret(), parseTelegramBotConfig(), TelegramBotConfig (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.29
Nodes (7): ResolveTelegramContextRequest, TelegramBackendClient, TelegramContextResolutionResponse, FailingTelegramBackendClient, RecordingTelegramBackendClient, telegramUpdate, RecordingTelegramBackendClient

## Knowledge Gaps
- **589 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+584 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `operations` connect `Community 74` to `Community 61`, `Community 86`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `TaskBackendClient` connect `Community 76` to `Community 69`, `Community 70`, `Community 18`, `Community 84`, `Community 53`, `Community 55`, `Community 60`, `Community 61`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `WorkspaceMemberEntity` connect `Community 72` to `Community 64`, `Community 66`, `Community 67`, `Community 68`, `Community 2`, `Community 46`, `Community 80`, `Community 50`, `Community 51`, `Community 63`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _589 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10122448979591837 - nodes in this community are weakly interconnected._