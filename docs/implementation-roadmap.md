# Implementation roadmap

This roadmap tracks implementation progress against the product and architecture docs. It is not a
replacement for GitHub Issues; each implementation item should still become a small issue, branch,
PR, review, and merge.

## Current State

Foundation is in place:

- npm workspaces, Turborepo, Biome, strict TypeScript, and baseline scripts;
- app/package skeletons for API, web, Telegram bot, MCP server, UI, config, domain, and API client;
- NestJS backend with typed DTOs, runtime validation, OpenAPI generation, TypeORM entities,
  migrations, stores, services, and permission checks for core task-tracker domains;
- generated API client types consumed by web, bot, and MCP paths;
- Telegram bot webhook parsing, context resolution, backend calls, replies, confirmation callbacks,
  and attachment metadata intake;
- MCP tools for workspace/user, project, task, skill, attachment, summary, comment, status, and
  confirmation flows;
- operational web shell views for dashboard/workspace task, project, skill, settings, and agent
  history data;
- deterministic test coverage across API, bot, MCP, web shell helpers, generated clients, and
  persistence metadata;
- graphify project state committed under `graphify-out/`.

Known blocker:

- GitHub Actions workflow creation for generated contract drift checks is blocked until the GitHub
  credential has `workflow` scope. Tracked by issue #291.

## Phase 1 - Contract and CI Hardening

Goal: make contract drift and basic quality gates automatic.

- Add the generated OpenAPI/API client drift workflow after `workflow` scope is available.
- Add a lightweight PR validation workflow for lint, build, test, and generated contract checks.
- Decide whether generated graphify updates need a separate verification helper or remain a manual
  commit rule.
- Keep root scripts as the single local source of truth for checks.

## Phase 2 - Telegram Linking and Mini App Access

Goal: make real users able to link Telegram safely and operate within a workspace.

- Implement Telegram Mini App `initData` verification in the backend. Initial backend verification endpoint is in place; durable replay/linking storage remains follow-up work.
- Add a user linking flow that maps stable `telegram_id` to internal users.
- Add workspace/chat linking or invite handling for Telegram chats.
- Expose minimal web/Mini App screens for linking state, success, and failure.
- Cover malformed, replayed, expired, and mismatched Telegram identity inputs with tests.

## Phase 3 - Agent Runtime Tool Execution

Goal: move from agent intake/audit primitives to useful task operations through tools.

- Define the runtime contract for model tool calls, MCP invocation, and durable tool-call logging.
- Connect OpenRouter tool-call responses to the MCP/backend operation layer.
- Persist tool-call inputs, outputs, errors, token usage, and confirmation decisions.
- Add deterministic fixtures for common Russian Telegram commands.
- Add safe fallback behavior for ambiguous project, task, user, and skill resolution.

## Phase 4 - Task Skills and Confirmation UX

Goal: make template-driven task creation reliable for real workflows.

- Complete preview and confirmation flows for applying task skills from Telegram.
- Add update/edit flows for task skill definitions and overrides beyond basic API support.
- Improve conflict handling for duplicate skill names and changed definitions.
- Decide whether task skill definitions stay JSONB-only or need normalized child tables.
- Add tests for skill application with overrides and confirmation retries.

## Phase 5 - Attachments and Files

Goal: make links, files, and Telegram file metadata useful across bot, API, MCP, and web.

- Decide whether Telegram files are copied to object storage immediately or lazily.
- If needed, add durable pending Telegram file storage rather than overloading attachment creation.
- Add web views for task attachments and comments.
- Add safe download/open behavior that respects workspace permissions.
- Add tests for attachment visibility, invalid metadata, and Telegram file edge cases.

## Phase 6 - Web Product UI

Goal: turn the current operational shell into the primary visual workspace.

- Expand Kanban interactions for status changes, assignment, due dates, and task creation.
- Build the Matrix view for parent tasks and subtasks.
- Build the Table view with dense scanning/editing flows.
- Expand My Tasks, Templates, Settings, and Agent History views into complete workflows.
- Move reusable layout and typography needs into `packages/ui` instead of app-local styling.
- Keep major routes lazy-loaded and accessible.

## Phase 7 - Deployment and Operations

Goal: make the app deployable and observable.

- Finalize process layout for API, bot, MCP server, web, PostgreSQL, and migrations.
- Add environment variable documentation and production config validation.
- Add deployment scripts or container definitions.
- Add structured logging for agent runs, tool calls, confirmations, webhook handling, and failures.
- Add backup/migration runbook notes for PostgreSQL.

## Phase 8 - Product Polish and Readiness

Goal: close MVP gaps and reduce operational risk.

- Decide whether task labels are MVP or post-MVP.
- Add workspace member management and permission-facing UI.
- Add import/export or seed fixtures for demo workspaces.
- Add end-to-end smoke tests for Telegram command to backend state change.
- Review security boundaries for every mutating path.
- Revisit model choice, latency, and cost after realistic Russian-command evaluation.

## Next Recommended Issues

1. Enable CI workflow for generated contract drift check after `workflow` scope is available.
2. Implement Telegram Mini App `initData` verification.
3. Add backend/user linking flow for stable Telegram identity.
4. Connect OpenRouter tool-call outputs to MCP tool execution with durable logging.
5. Expand web task detail attachments/comments UI.
