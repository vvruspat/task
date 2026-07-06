# Agent rules

These rules are mandatory for all implementation work in this repository.

## TypeScript strictness

TypeScript code must be strictly typed.

- Do not use `any`.
- Do not use unsafe type casts like `value as SomeType` to hide type problems.
- Prefer fully known types at API boundaries and inside application code.
- If a value is genuinely unknown, use `unknown` and narrow it with a type guard, schema parser, or explicit runtime validation.
- Do not use non-null assertions (`!`) unless the invariant is enforced immediately above and cannot be expressed better.
- Avoid broad index signatures such as `Record<string, any>`. Use precise value types or `Record<string, unknown>` with narrowing.
- Avoid `object` when the shape is known.
- Avoid implicit return types on exported functions, public class methods, and shared helpers.
- Keep `strict: true` enabled in every TypeScript config.

Bad:

```ts
const payload = input as CreateTaskDto;
```

Better:

```ts
const payload = parseCreateTaskInput(input);
```

Acceptable when the shape is truly unknown:

```ts
function isCreateTaskInput(value: unknown): value is CreateTaskInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    typeof value.title === "string"
  );
}
```

## Shared types and DTOs

Define domain/API shapes in shared type files first, then implement them in DTO classes.

Preferred pattern:

```ts
export type CreateTaskInput = {
  title: string;
  projectId: string;
  parentTaskId?: string | null;
};
```

```ts
export class CreateTaskDto implements CreateTaskInput {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  projectId!: string;

  @ApiPropertyOptional({ nullable: true })
  parentTaskId?: string | null;
}
```

Rules:

- Types live in dedicated `types`/`contracts` files close to the domain package or module.
- DTO classes implement those types instead of inventing parallel shapes.
- Do not duplicate frontend/bot/backend API types by hand.
- Frontend, bot, and MCP clients must consume generated types from the backend OpenAPI spec.
- If a DTO changes, update tests and regenerate OpenAPI/API clients.

## API and OpenAPI

OpenAPI is the backend contract.

- Every public endpoint must have typed DTOs and Swagger metadata.
- Keep `openapi.json` current.
- Generated API types are the source of truth for web, bot, and MCP clients.
- Do not add untyped request/response bodies.
- Do not return raw database entities from controllers.
- Controllers should be thin: validate input, call service methods, return typed response DTOs.

## Runtime validation

Static types are not enough at external boundaries.

Validate:

- HTTP request bodies and params;
- Telegram webhook payloads;
- OpenRouter/tool-call payloads;
- MCP tool inputs;
- file metadata;
- JSONB definitions for task skills.

Use explicit DTO validation, schema validation, or type guards. Do not trust external input because TypeScript says it has a type.

## Atomicity

Changes should be atomic and easy to review.

- One feature/fix should touch the smallest reasonable set of files.
- Keep unrelated refactors out of feature commits.
- Database changes must include migrations.
- API contract changes must include generated spec/client updates.
- Avoid partially implemented flows that compile but cannot be used end to end.
- Prefer small services/functions with clear inputs and outputs.

## Reuse and boundaries

Reuse existing patterns before introducing new abstractions.

- Put shared UI primitives in `packages/ui`.
- Put generated API clients/types in `packages/api-client`.
- Keep business logic in backend services, not controllers, bots, or frontend components.
- Telegram bot should call backend/agent APIs, not PostgreSQL directly.
- MCP tools should call backend service/API layers, not duplicate business logic.
- Frontend components should not know database shapes.
- Avoid copy-pasting logic across API, bot, MCP, and web. Extract shared contracts/helpers when reuse is real.

## Error handling

Errors should be explicit and useful.

- Do not swallow errors silently.
- Do not throw plain strings.
- Use typed/domain errors where practical.
- Preserve enough context for debugging without leaking secrets.
- User-facing messages should be clear and short.
- Log agent runs, tool calls, and confirmation decisions.

## Async and data consistency

- Always `await` promises unless intentionally returning them.
- Use transactions for multi-step writes that must succeed or fail together.
- Use idempotency keys or durable confirmation records for Telegram callback actions.
- Avoid race-prone read-modify-write flows without locking or constraints.
- Prefer database constraints over application-only assumptions.

## Security

- Never commit secrets or `.env` files with real credentials.
- Keep OpenRouter and Telegram tokens in environment variables.
- Validate Telegram Mini App `initData`.
- Check workspace membership and permissions in backend services for every mutating action.
- The LLM agent can only do what the current user is allowed to do.
- Never use Telegram username as a stable identity key; use `telegram_id`.

## Testing expectations

Add tests where behavior can regress.

Prioritize tests for:

- task skill creation;
- skill application with overrides;
- fuzzy project/skill resolution;
- Telegram user linking;
- confirmation flow;
- OpenAPI generation;
- permission checks;
- task tree creation;
- attachment linking.

For LLM/agent behavior, use deterministic fixtures and mocked model/tool responses. Do not make tests depend on live OpenRouter calls.

## UI implementation

- Build the actual product UI, not a landing page.
- Keep views dense and operational: Kanban, Matrix, Table, My Tasks, Templates.
- Use generated API types.
- Lazy-load major routes and heavy views.
- Keep components accessible and keyboard-friendly.
- Prefer icon buttons for common actions when the meaning is standard.
- Do not create nested cards or decorative UI that gets in the way of repeated work.

## Git hygiene

- Do not revert user changes unless explicitly asked.
- Keep commits focused.
- Run relevant checks before committing.
- Do not commit generated artifacts unless the docs/project rules require them, such as generated OpenAPI/API client files.
- Always commit and push graphify knowledge graph changes under `graphify-out/`; these files are project state and must not be ignored as disposable generated artifacts.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Include updated `graphify-out/` files in the same commit and push them with the related project changes.
