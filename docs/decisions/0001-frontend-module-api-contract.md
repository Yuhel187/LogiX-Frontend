# 0001 Frontend Module And API Contract

Date: 2026-09-10

## Status

Accepted

## Context

LogiX is a Next.js App Router frontend expected to be developed by multiple
people in parallel. The existing stack contract names the framework and UI
primitive locations but does not define where routes, domain UI, API calls,
transport types, view models, or shared infrastructure belong. Without a
boundary, pages and shared folders can accumulate business logic and duplicate
backend contracts.

The repository owner accepted a feature-first frontend contract on 2026-09-10
and required it to remain runnable by the whole team without personal tooling.

## Decision

Use these layers and dependency directions:

```text
app -> features -> components/shared -> components/ui
  \       \              \               \
   +------>+-------------->+---------------> lib
```

- `src/app` owns URL routing, layouts, route lifecycle files, and composition.
- `src/features/<domain>` owns domain-aware API functions, components, hooks,
  schemas, and view-model types.
- `src/components/ui` owns domain-agnostic shadcn primitives.
- `src/components/shared` owns domain-agnostic composed UI shared across route
  or feature boundaries.
- `src/lib` owns cross-cutting infrastructure and cannot own domain rules.
- Raw HTTP calls are confined to `src/lib/api` and exceptional
  `src/app/api/**/route.ts` adapters. Pages and components call feature
  query/command functions.
- Backend transport types are generated from or explicitly traced to an
  accepted backend contract. Feature types and component props remain close to
  their consumers; there is no global `src/types` dumping ground.
- Server Components are the default. Client Components form small interactive
  boundaries and cannot import server-only modules.
- Feature-to-feature access cannot reach another feature's internals. App-level
  composition is preferred; an explicit root `index`, `client`, or `server`
  entrypoint is required when cross-feature access is accepted.

The exact browser authentication and BFF topology remains a separate contract
decision because it depends on the backend gateway and session model.

## Alternatives Considered

1. Route-only colocation under `src/app`: simple initially, but domain code is
   duplicated when several routes or experiences use the same capability.
2. Layer-first global folders such as `services`, `hooks`, and `types`: easy to
   start, but ownership becomes unclear as the number of business domains grows.
3. Unrestricted imports with review-only guidance: low setup cost, but drift is
   discovered late and inconsistently across contributors.

## Consequences

Positive:

- Domain ownership and placement decisions are predictable.
- Backend contracts enter the frontend through one visible boundary.
- Server/client and shared/domain dependencies have one reviewable contract.
- The rules use tools already installed by the project.

Tradeoffs:

- Some small features have more folders than a route-only layout.
- Accepted cross-feature collaboration needs an explicit public entrypoint.
- The browser/server API topology cannot be fully scaffolded until auth and the
  backend schema artifact are confirmed.

## Follow-Up

- Resolve the backend-owned OpenAPI or equivalent contract artifact.
- Record the authentication/BFF decision before implementing browser transport.
- Revisit rules through a superseding ADR when real feature evidence shows a
  boundary is too strict.
