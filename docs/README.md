# Documentation Map

Start with the smallest authoritative surface.

## Current Product

- `WORKFLOW.md`: request shape, planning, judgment, operation, validation, and
  completion.
- `ARCHITECTURE.md`: frontend code placement, dependency, state, and
  server/client boundaries.
- `product/`: current product behavior and installation contract.
- `decisions/`: lasting choices future work must inherit.
- `plans/`: one durable working-memory document for work that needs it.
- [`patterns/encoding-invariants.md`](patterns/encoding-invariants.md): turn
  accepted architecture, reliability, security, and quality rules into native
  mechanical validation.
- `templates/`: optional decision, plan, runbook, and Harness-improvement
  structures.

## Consumer-Owned Truth

The consumer's README, product documents, architecture, code, tests, CI,
runtime signals, and application behavior remain authoritative. Harness does
not overwrite those with upstream product assumptions.

## Frontend Repository

- Root `README.md`: onboarding and shared commands.
- `src/app/`: Next.js routes and route composition.
- `src/features/`: business-facing frontend modules.
- `src/components/`: UI primitives and shared domain-agnostic composition.
- `src/lib/`: cross-cutting frontend infrastructure.

## Start Here By Task

- Adding a page or component: read `ARCHITECTURE.md`.
- Calling or changing an API: read `product/frontend-api-contract.md` and the
  accepted backend contract.
- Changing a lasting boundary: add or supersede a record in `decisions/`.
- Enforcing a rule: follow `patterns/encoding-invariants.md`.
