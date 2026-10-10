# Agent Instructions

<!-- HARNESS:BEGIN -->
## Harness

Start with the requested outcome and use the repository as the system of record.
Read `docs/WORKFLOW.md` and only relevant product, design, plan, code, and
validation material.

- Answers, explanations, reviews, diagnoses, plans, and status reports are
  read-only. Inspect only what is needed; change nothing.
- For a bounded change, inspect affected behavior and proof, implement, and
  validate. No control-plane operation is required.
- Use one `docs/plans/active/` file when work spans sessions, coordinates
  contributors, has dependencies, or needs recovery. Move it to
  `docs/plans/completed/` only after validation.
- Before editing, identify repository authority for each new externally
  observable policy. If materially different choices remain open, stop before
  edits; configurable defaults are not authority.
- For architecture, reliability, security, or quality invariant work, read
  `docs/patterns/encoding-invariants.md` and enforce only accepted rules.
- Report reusable agent friction. Change guidance, tools, runbooks, or validation
  for that purpose only when explicitly asked to use `$improve-harness`.
- Also pause when product intent remains ambiguous, recovery is difficult,
  validation is weakened, or authority is insufficient.
- Claim completion only with executable or observable evidence. Report outcome,
  changes, validation, and unresolved risks.

Harness has no task database or orchestration lifecycle. Use repository plans
and behavior-level proof; do not create parallel control-plane state.
<!-- HARNESS:END -->

## Frontend Scope

This repository is the LogiX web frontend. Do not apply backend service,
database, Prisma, NestJS, Kafka, Python, or infrastructure conventions here
unless the request explicitly crosses the frontend/backend contract boundary.

### Stack Authority

- Next.js App Router with React and TypeScript.
- Tailwind CSS v4; keep styling in the existing CSS-first configuration.
- shadcn/ui components live in `src/components/ui/` and are configured by
  `components.json`.
- Shared frontend helpers live in `src/lib/`.
- Backend API contracts are external inputs; do not invent response shapes when
  the backend contract or an accepted product document is unavailable.

### Frontend Contract Routing

Before adding or moving frontend code, read `docs/ARCHITECTURE.md`. It owns the
placement and dependency contract for `app`, `features`, `components`, and
`lib`. For API calls, transport types, errors, caching, request context, or
mutations, also read `docs/product/frontend-api-contract.md`.

- Pages and layouts own routing and composition, not reusable business logic.
- Endpoint-specific operations live under `src/features/<domain>/api`; raw HTTP
  is confined to `src/lib/api` and explicitly approved `app/api` adapters.
- Keep backend DTOs generated or traceable to an accepted backend contract;
  keep feature/view types with their feature and component props local.
- Server Components are the default. Keep Client Component boundaries small and
  never import server-only modules into them.
- Treat these boundaries as review contracts. If a lasting boundary changes,
  update the accepted decision and owner documents in the same change.

### Product And Architecture Boundary

The frontend implements the Experience layer from the LogiX architecture. The
backend BRD is at `../LogiX-Backend/docs/plan_ghi_ro_so_task_backlog/brd.md`;
the architecture entrypoint is at
`../LogiX-Backend/docs/architecture/README.md`.

- Access backend capabilities through the API boundary/contracts; never access
  service databases or encode service persistence in the UI.
- Render and collect intent for identity, master data, order, inventory,
  shipment, trip/driver, forecast, notification, audit, and Planner flows, but
  keep business rules and authorization server-side.
- Preserve the Order-to-Delivery state shown by the backend contract. The UI
  must not invent transitions, bypass confirmation, or dispatch a sensitive
  action without the backend preview/confirmation flow.
- Treat tenant context, RBAC, audit, idempotency, and event ordering as backend
  responsibilities. The frontend may provide context and display evidence but
  is not a security boundary.
- Keep the driver experience responsive and limited to the assigned trip and
  valid stop actions. Do not add out-of-scope MVP features such as payment,
  3PL marketplace, deep WMS, live GPS/ETA/geofencing, split multi-warehouse
  orders, or reverse logistics without an accepted architecture decision.
- Planner UI may submit natural-language requests and display preview/results;
  it must never call an LLM directly to mutate business state.

### Production Code Standards

LogiX is a public repository for a B2B production platform. Every change must
be safe to deploy as-is.

**No hardcoding**

- Never commit secrets, tokens, API keys, internal hosts/ports, tenant/user
  IDs, or environment-specific URLs. `.env*.local` stays local; document
  required variables with placeholders only. `NEXT_PUBLIC_*` values are
  browser-visible: never put a secret in them.
- Read environment variables only through a typed config module in
  `src/lib/config`; components and features must not read `process.env`
  directly.
- User-visible copy comes from `src/locales/{vi,en}.json` (both updated in the
  same change); colors/spacing come from theme tokens; statuses, permission
  codes, and error codes come from typed constants traceable to the backend
  contract, not repeated string literals.

**No dangerous fallbacks (fail fast, fail closed)**

- A required configuration value that is missing or invalid must fail the
  build/startup with a clear error. Never fall back to `http://localhost:...`,
  a default API host, or a guessed endpoint.
- Do not mask backend failures: never replace an error with fake/empty data,
  optimistic success, or a silent `catch {}`. Show the localized error state
  (mapped from the backend error code) and keep retry explicit.
- The UI is not a security boundary, but it must not widen access: hide or
  disable actions when permission/tenant context is unknown, and never infer
  permissions, tenant, or state transitions client-side when the backend has
  not provided them.
- Acceptable `??` defaults are limited to neutral display values (e.g., `—`
  for an absent optional field, an empty list for an absent optional array).

**Clean code**

- Follow `docs/ARCHITECTURE.md` placement rules; keep pages thin, feature
  logic in `src/features/<domain>`, raw HTTP in `src/lib/api`.
- No dead code, unused exports, commented-out blocks, `console.log`, `any`, or
  non-null assertions without a justified comment. Reuse existing shadcn
  components, buttons, and patterns before adding new ones.

**Testing**

- Every change must pass `pnpm lint`, `pnpm typecheck`, and `pnpm build`
  without new warnings, plus a manual check of the affected flow (light/dark,
  VI/EN, mobile/desktop) when behavior or UI changes. When a project test
  runner exists, add tests for non-trivial logic (mappers, permission/state
  helpers, form validation).
- Verify against the real backend through the API Gateway, including error
  paths (401/403/validation/network failure), not only the happy path.
- Temporary test pages, scripts, mock data, and QA accounts must be removed
  after verification; never commit them. Never weaken or skip existing checks
  to make a change pass.

### Validation

For a frontend change, run the narrowest relevant proof and normally finish
with:

```text
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Use `pnpm dev` only when browser-level behavior is required. Do not claim a
visual or interaction change is verified from TypeScript and lint alone.

### UI Rules

- Prefer existing shadcn components before adding a new primitive.
- Preserve the Tailwind v4 setup in `src/app/globals.css`; do not introduce a
  Tailwind v3 config or migrate CSS variables without an accepted design
  decision.
- When displaying logos or site icons, ALWAYS use the official assets in `public/` (`/logo_logix.png` for application logos and `/fav_logo_logix.png` for favicons/browser icons). Do not invent inline placeholder SVG logos when public brand assets exist.
- All user-visible copy MUST be localized and maintained in separate JSON locale files under `src/locales/` (`src/locales/vi.json` for Vietnamese and `src/locales/en.json` for English). Hardcoded strings without localization are strictly forbidden.
- Use `Inter` font (`subsets: ["latin", "vietnamese"]`) across the entire application to ensure proper Vietnamese diacritic rendering.
- Every UI change MUST support and be verified for both Light and Dark themes, maintaining full token compatibility with light mode and the `.dark` theme without broken contrast or hardcoded color values.
- Every UI design and component modification MUST mandatorily include full responsive layout support across all device breakpoints (mobile, tablet, desktop). Unhandled overflow, horizontal scrolling, overlapping elements, or fixed non-responsive widths on components are strictly forbidden.
- Keep client-only state and browser APIs in Client Components.
- Keep user-visible behavior accessible: labels, keyboard interaction, focus
  states, and responsive layouts are part of the frontend contract.

### Repository Boundary

The sibling `LogiX-Backend` repository has its own Harness and backend
instructions. This frontend Harness owns only this directory. Coordinate a
cross-repository API change through the backend contract, tests, and a durable
plan when the change spans sessions or contributors.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
