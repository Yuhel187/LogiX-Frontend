# Frontend Stack Contract

## Scope

The frontend is a Next.js App Router application using React, TypeScript,
Tailwind CSS v4, and shadcn/ui. This document records frontend conventions;
backend service implementation remains owned by `LogiX-Backend`.

The frontend is the Experience layer. Its business-facing surfaces correspond
to the backend capabilities for identity, master data, order, inventory,
fulfillment, transport/driver, forecast, notification, audit, and Planner
interaction. It does not own those capabilities or their persistence.

The canonical business scope is the sibling backend BRD at
`../LogiX-Backend/docs/plan_ghi_ro_so_task_backlog/brd.md`; the canonical
architecture map is `../LogiX-Backend/docs/architecture/README.md`.

## UI Ownership

- Reusable UI primitives live in `src/components/ui/`.
- `components.json` is the shadcn configuration authority.
- `src/app/globals.css` is the Tailwind v4 theme and token authority.
- New screens should compose existing primitives before introducing custom
  equivalents.

Detailed ownership is defined by:

- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for routes, features, components,
  shared infrastructure, dependencies, and server/client boundaries.
- [`frontend-api-contract.md`](frontend-api-contract.md) for API calls,
  transport types, mapping, errors, caching, and mutations.
- [`../decisions/0001-frontend-module-api-contract.md`](../decisions/0001-frontend-module-api-contract.md)
  for the accepted architectural decision.

## Proof Commands

```text
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Browser behavior requires a running `pnpm dev` instance and should be checked
through the actual page interaction rather than inferred from static checks.

## Cross-Repository Changes

When a UI change depends on a backend endpoint or response shape, the accepted
backend contract, contract tests, or an explicit product decision is the
authority. The frontend must not silently define a new API contract from an
unverified assumption.

The frontend is not a security boundary: tenant isolation, RBAC, state
transitions, idempotency, audit, sensitive-action confirmation, and AI/tool
permissions must be enforced by backend services. UI guards improve usability
but cannot replace server-side enforcement.
