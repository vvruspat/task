# Frontend UI-kit refactor plan

## Source and constraints

Reference source: `/tmp/ws-uikit-main` on branch `main` (`60ef82f`, CSS token architecture). This is the only ws-uikit source reference for this project; do not use the older `react-aria` branch.

Project constraints:

- reusable primitives live in `packages/ui`;
- app code consumes UI-kit layout and text primitives instead of restyling common flex/grid/typography patterns;
- frontend screens stay dense and operational, not marketing-oriented;
- app-local CSS is allowed only for shell composition or view-specific product layout;
- TypeScript stays strict, with typed props and no `any`, unsafe casts, or non-null assertions;
- API-facing types continue to come from generated OpenAPI clients.

## PR phases and ownership

### PR 1: UI foundation

Owned files:

- `docs/frontend-refactor-plan.md`;
- `packages/ui/**`;
- `apps/web/src/main.tsx`;
- `apps/web/src/ui/App.tsx` for shell, header, navigation, and state panel only;
- `apps/web/src/styles.css` for CSS tied to shell, header, navigation, and state panel only.

Scope:

- add minimal layout, text, button, badge, and surface primitives inspired by ws-uikit `MBox`, `MFlex`, `MText`, `MHeading`, `MButton`, and `MCard`;
- expose `@task/ui/styles.css` so product apps can consume shared tokens and primitive styling;
- move App shell/topbar/nav/status/state-panel composition to the primitives;
- keep `WorkspaceView` and `DashboardView` behavior unchanged.

### PR 2: View layout cleanup

Owned files:

- `apps/web/src/ui/views/DashboardView.tsx`;
- `apps/web/src/ui/views/WorkspaceView.tsx`;
- related tests;
- `packages/ui/**` only when a missing reusable primitive is needed.

Scope:

- replace repeated app-local flex/grid wrappers with `Stack`, `Inline`, `Box`, and `Surface`;
- migrate repeated metric/list/card surfaces into UI-kit primitives;
- keep business data shaping in the app view layer.

### PR 3: Form and input primitives

Owned files:

- `packages/ui/**`;
- dashboard/workspace form fragments;
- relevant tests.

Scope:

- introduce typed input, field, validation text, and form action primitives;
- migrate project/task create forms out of bespoke app CSS;
- preserve accessible labels and disabled/submitting states.

### PR 4: Product navigation and route primitives

Owned files:

- route shell components in `apps/web`;
- reusable navigation primitives in `packages/ui`;
- route-level tests where available.

Scope:

- extract sidebar/topbar/route header patterns from `App.tsx`;
- keep route state in app code while moving purely presentational pieces into UI-kit;
- prepare for React Router or TanStack Router without forcing that dependency into PR 1.

### PR 5: Complex operational views

Owned files:

- Kanban, Matrix, Table, Templates, Settings view modules;
- new table/tabs/drawer primitives in `packages/ui`.

Scope:

- introduce higher-order UI-kit primitives only after repeated usage is clear;
- migrate view-specific CSS incrementally;
- add focused tests for keyboard behavior and regressions in dense views.

## App-local CSS migration map

Move into `packages/ui`:

- basic token values: colors, spacing, radius, borders;
- flex row/column wrappers and gap handling;
- text, heading, tone, and weight styles;
- button and icon button base states;
- surface/card shell styling;
- badge/status pill styling;
- shared form field styling once form primitives exist.

Keep in `apps/web/src/styles.css`:

- page shell grid and responsive breakpoints;
- sidebar width and workspace padding;
- brand mark sizing;
- route-specific layout constraints;
- dense board/table/matrix/product row layout until their owning PR migrates them;
- integration styles that depend on app-only markup or data density.

## Readiness criteria

Foundation PR is ready when:

- `@task/ui` builds as a strict TypeScript package with TSX primitives;
- `@task/ui/styles.css` is imported by the web app;
- App shell, sidebar navigation, topbar, route status strip, and state panel consume UI-kit primitives;
- no `WorkspaceView` or `DashboardView` rewrite is included;
- relevant typecheck/build/test/lint commands pass or failures are documented;
- `graphify update .` has been run and `graphify-out/` changes are committed with the code.

Later PRs are ready when:

- each migration has one clear ownership slice;
- app-local CSS shrinks for the touched slice;
- reusable patterns land in `packages/ui` before app usage spreads;
- accessibility and keyboard behavior are verified for interactive primitives;
- generated API/client files remain current when API contracts change.
