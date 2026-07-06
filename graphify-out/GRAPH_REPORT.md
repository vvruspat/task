# Graph Report - tAsk-issue-13-api-env-config  (2026-07-06)

## Corpus Check
- 61 files · ~16,657 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 556 nodes · 545 edges · 49 communities (46 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a2fa9977`
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
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 23 edges
2. `Tables` - 18 edges
3. `Technical architecture` - 17 edges
4. `Agent rules` - 14 edges
5. `Agent and MCP design` - 12 edges
6. `What You Must Do When Invoked` - 11 edges
7. `HealthResponseDto` - 10 edges
8. `scripts` - 10 edges
9. `compilerOptions` - 10 edges
10. `tasks` - 10 edges

## Surprising Connections (you probably didn't know these)
- `generateOpenApi()` --calls--> `createOpenApiDocument()`  [EXTRACTED]
  apps/api/src/generate-openapi.ts → apps/api/src/openapi.ts
- `HealthResponseDto` --references--> `HealthStatus`  [EXTRACTED]
  apps/api/src/app.dto.ts → apps/api/src/app.contracts.ts
- `HealthResponseDto` --implements--> `HealthResponse`  [EXTRACTED]
  apps/api/src/app.dto.ts → apps/api/src/app.contracts.ts
- `bootstrap()` --calls--> `loadApiConfig()`  [EXTRACTED]
  apps/api/src/main.ts → apps/api/src/config.ts
- `bootstrap()` --calls--> `createOpenApiDocument()`  [EXTRACTED]
  apps/api/src/main.ts → apps/api/src/openapi.ts

## Import Cycles
- None detected.

## Communities (49 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (21): activity_events, agent_runs, agent_tool_calls, attachments, comments, confirmation_requests, Core principle, Data model draft (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (17): Backend architecture, Confirmation model, Database, Deployment draft, External references, Frontend architecture, Linting and formatting, LLM and OpenRouter (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (25): files, includes, formatter, enabled, indentStyle, indentWidth, lineWidth, quoteStyle (+17 more)

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
Cohesion: 0.13
Nodes (15): HealthResponse, HealthStatus, AppController, HealthResponseDto, AppModule, AppService, ApiConfig, ApiEnvironment (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (18): description, exports, files, import, main, name, private, scripts (+10 more)

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

### Community 37 - "Community 37"
Cohesion: 0.10
Nodes (20): dependencies, @nestjs/common, @nestjs/core, @nestjs/platform-fastify, @nestjs/swagger, reflect-metadata, rxjs, description (+12 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, format, lint, lint:fix (+4 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, format, lint, lint:fix (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (12): description, name, private, scripts, build, format, lint, lint:fix (+4 more)

### Community 41 - "Community 41"
Cohesion: 0.20
Nodes (9): compilerOptions, incremental, outDir, rootDir, tsBuildInfoFile, types, extends, include (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (8): compilerOptions, incremental, outDir, rootDir, tsBuildInfoFile, extends, include, $schema

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (8): compilerOptions, incremental, outDir, rootDir, tsBuildInfoFile, extends, include, $schema

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (7): compilerOptions, incremental, rootDir, tsBuildInfoFile, extends, include, $schema

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (22): description, devDependencies, @biomejs/biome, turbo, @types/node, typescript, license, name (+14 more)

## Knowledge Gaps
- **404 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+399 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `version`, `private` to the rest of the system?**
  _404 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._