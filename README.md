# LogiX Frontend

LogiX Frontend is the Next.js App Router Experience layer for the LogiX
distribution platform. Backend services own business rules, authorization,
tenant isolation, persistence, and state transitions; this repository owns the
web experience and consumes accepted API contracts.

## Requirements

- Node.js 22
- pnpm 11.9.0

## Start Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

## Read Before Coding

- [`AGENTS.md`](AGENTS.md): repository scope and developer entry rules.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): where pages, features,
  components, hooks, state, and shared infrastructure belong.
- [`docs/product/frontend-api-contract.md`](docs/product/frontend-api-contract.md):
  where APIs and types belong and how contracts cross the backend boundary.
- [`docs/product/frontend-stack.md`](docs/product/frontend-stack.md): framework,
  UI, styling, and baseline proof commands.

## Shared Validation

Run the complete repository validation before requesting review:

```bash
pnpm validate
```

Focused commands:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Browser-visible changes also require validation through the running application;
static commands do not prove interaction, accessibility, or responsive behavior.
