# Frontend Architecture Contract

## Purpose And Authority

This document is the canonical code-organization and dependency contract for
the LogiX frontend. Decision
[`0001-frontend-module-api-contract.md`](decisions/0001-frontend-module-api-contract.md)
authorizes these boundaries. `AGENTS.md` owns product and repository scope;
[`product/frontend-api-contract.md`](product/frontend-api-contract.md) owns the
detailed API boundary.

When a new case does not fit, do not hide it in a generic shared folder. Record
the missing choice and amend or supersede the decision before changing an
enforced boundary.

## Target Structure

```text
src/
  app/
    (auth)/                  authentication experience routes
    (workspace)/             authenticated operations and management routes
    (driver)/                responsive assigned-trip experience
    **/page.tsx              thin route entry
    **/layout.tsx            route composition and providers
    **/{loading,error,not-found}.tsx
    **/_components/          components private to one route subtree
    **/_lib/                 helpers private to one route subtree
    api/**/route.ts          exceptional browser/BFF HTTP adapters
  features/
    <domain>/
      api/                   endpoint-specific queries and commands
      components/            domain-aware UI
      hooks/                 client-only feature behavior
      schemas/               boundary validation when required
      types/                 feature and view-model types
      index.ts               optional environment-neutral public surface
      client.ts              optional client-safe public surface
      server.ts              optional server-only public surface
  components/
    ui/                      shadcn/domain-agnostic primitives
    shared/                  domain-agnostic composed UI
  lib/
    api/                     endpoint-agnostic transport and errors
      generated/             generated backend transport contracts only
    auth/                    frontend auth/session adapters
    config/                  validated frontend configuration
```

Directories are created only when their responsibility exists. The tracked
README files establish the top-level skeleton; a feature adds only the
subdirectories it actually needs.

## Placement Decision

Use the first matching rule:

1. Does it define a URL or route lifecycle? Put it in `src/app`.
2. Is it used only by one route subtree? Colocate it in `_components` or `_lib`.
3. Does it know a LogiX business concept? Put it in `src/features/<domain>`.
4. Is it a visual primitive with no domain knowledge? Put it in
   `src/components/ui`.
5. Is it composed UI shared across domains but still domain-agnostic? Put it in
   `src/components/shared`.
6. Is it endpoint-agnostic infrastructure? Put it in `src/lib`.

Do not create global `services`, `hooks`, `utils`, or `types` folders as
catch-alls. Shared code must still have a single named responsibility.

## Layer Responsibilities

### App Router

- Pages and layouts compose features and route-private UI.
- Pages are Server Components by default.
- Route files do not contain reusable domain logic or backend response types.
- Route groups organize experiences and layouts without changing URLs.
- `loading`, `error`, and `not-found` states belong at the narrowest route
  segment that owns the experience.

### Features

- Feature names follow backend/business capabilities: identity, master data,
  orders, inventory, fulfillment, transport, forecast, notifications, audit,
  and planner.
- Feature API modules define endpoint-specific operations and map transport
  DTOs into UI-facing models.
- Feature components may use their own API/types and lower layers.
- Feature A cannot import Feature B internals. Prefer app-level composition. If
  sharing is intentional, expose the smallest surface from Feature B's root
  `index.ts`, `client.ts`, or `server.ts`.

### Components

- `components/ui` follows `components.json` and may depend only on other UI
  primitives and `lib` helpers.
- `components/shared` may compose UI primitives and `lib`, but cannot know a
  business feature or route.
- A component used by only one feature remains in that feature even if it looks
  visually reusable.

### Lib

- `lib` contains cross-cutting mechanics such as HTTP transport, configuration,
  auth adapters, formatting, and small generic helpers.
- `lib` cannot import `app`, `features`, or components.
- Business state transitions, permissions, tenant isolation, persistence, and
  logistics rules remain backend responsibilities.

## Server And Client Boundary

- Add `"use client"` only for state, event handlers, effects, custom client
  hooks, or browser APIs.
- Client entrypoints cannot import `server-only`, `*.server.*`, a `/server/`
  module, or a feature's `server.ts` entrypoint.
- Data passed from a Server Component to a Client Component must be
  serializable and minimized for that UI.
- Providers should be placed as deep as practical instead of turning the root
  layout or an entire feature into a client bundle.

## Dependency Matrix

| Source | May import | Must not import |
| --- | --- | --- |
| `app` | features, shared, ui, lib | backend implementation |
| feature | own internals, other feature public entrypoint, shared, ui, lib | app, other feature internals |
| shared component | shared, ui, lib | app, features |
| UI primitive | ui, lib | app, features, shared |
| lib | lib | app, features, components |

## State Ownership

- Server/API state is loaded through feature API functions.
- URL-relevant state such as filters, sorting, pagination, and selected tabs
  should use route/search parameters when it must survive navigation or sharing.
- Ephemeral interaction state stays in the smallest Client Component that owns
  it.
- Add a client query or global-state library only when a real requirement such
  as polling, optimistic updates, offline behavior, or cross-route state makes
  local/server state insufficient.

## Naming And Imports

- Use `@/` for cross-directory imports and relative imports inside a small local
  module.
- File names use kebab-case except Next.js special files.
- Use explicit named exports for reusable modules. Next.js route files keep the
  required default export.
- Environment-specific public surfaces use `client.ts` and `server.ts`; do not
  create a barrel that mixes client and server modules.

## Review Contract

Code review verifies the dependency matrix, HTTP ownership, feature isolation,
and Client/Server boundary described above. These are architecture rules, not
automated checks. When an exception is genuinely needed, update or supersede
the accepted decision and this document instead of relying on an undocumented
local convention.

## Validation

Run:

```text
pnpm lint
pnpm typecheck
pnpm build
```

Structural changes require review against this contract. Browser-visible
changes additionally need proof through the running application.
