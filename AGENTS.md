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
- Keep light and dark theme tokens compatible with the existing `.dark` theme.
- Keep client-only state and browser APIs in Client Components.
- Keep user-visible behavior accessible: labels, keyboard interaction, focus
  states, and responsive layouts are part of the frontend contract.

### Repository Boundary

The sibling `LogiX-Backend` repository has its own Harness and backend
instructions. This frontend Harness owns only this directory. Coordinate a
cross-repository API change through the backend contract, tests, and a durable
plan when the change spans sessions or contributors.
