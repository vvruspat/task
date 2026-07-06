# Graph Report - tAsk-issue-1-root-workspaces-turbo  (2026-07-06)

## Corpus Check
- 18 files · ~14,826 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 194 nodes · 178 edges · 19 communities (16 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf11b663`
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

## God Nodes (most connected - your core abstractions)
1. `Tables` - 18 edges
2. `Technical architecture` - 17 edges
3. `Agent rules` - 14 edges
4. `Agent and MCP design` - 12 edges
5. `What You Must Do When Invoked` - 11 edges
6. `/graphify` - 10 edges
7. `scripts` - 9 edges
8. `tasks` - 9 edges
9. `graphify reference: extra exports and benchmark` - 8 edges
10. `Tool surface` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (19 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (21): activity_events, agent_runs, agent_tool_calls, attachments, comments, confirmation_requests, Core principle, Data model draft (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (17): Backend architecture, Confirmation model, Database, Deployment draft, External references, Frontend architecture, Linting and formatting, LLM and OpenRouter (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (21): dependsOn, outputs, cache, persistent, cache, outputs, dependsOn, outputs (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (13): Kanban, Matrix view, My tasks, Product model, Table view, Task skills/templates, Telegram-first UX, Templates/skills editor (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (14): Part A - Structural extraction for code files, Part B - Semantic extraction (parallel subagents), Part C - Merge AST + semantic into final extraction, Step 0 - GitHub repos and multi-path merge (only if a URL or several paths), Step 1 - Ensure graphify is installed, Step 2.5 - Video and audio (only if video files detected), Step 2 - Detect files, Step 3 - Extract entities and relationships (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (19): Agent and MCP design, Agent run audit, Attachment tools, Confirmation tools, Example flow: apply a skill with overrides, Example flow: create a song from a skill, Example flow: create a task skill, Fuzzy resolution (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (9): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Usage (+1 more)

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
Cohesion: 0.17
Nodes (10): description, devDependencies, turbo, license, name, packageManager, private, version (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (9): scripts, build, dev, format, generate:api-client, generate:openapi, lint, lint:fix (+1 more)

## Knowledge Gaps
- **146 isolated node(s):** `name`, `version`, `private`, `description`, `license` (+141 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `tasks` connect `Community 2` to `Community 17`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _146 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._