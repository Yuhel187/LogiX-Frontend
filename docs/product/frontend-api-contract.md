# Frontend API Contract

## Scope

This document owns how the LogiX frontend consumes backend APIs. Backend
endpoint behavior and response shapes remain external inputs owned by the
backend contract. The frontend never treats TypeScript convenience as business
or authorization authority.

## Call Path

```text
Server page/layout
  -> feature api query/command
  -> shared server transport
  -> API Gateway

Client interaction (only when required)
  -> feature client api function
  -> approved browser transport or app/api adapter
  -> API Gateway
```

- Pages, layouts, components, and hooks do not call raw `fetch`.
- Endpoint paths and endpoint-specific request/response mapping live in
  `src/features/<domain>/api`.
- `src/lib/api` owns endpoint-agnostic mechanics: base URL, request headers,
  serialization, abort/timeout, HTTP status handling, and normalized transport
  errors.
- Server Components call feature server API functions directly. They do not
  call this frontend's own Route Handler.
- `src/app/api/**/route.ts` is reserved for an accepted browser/BFF need such as
  server-mediated credentials or protocol adaptation. It cannot contain LogiX
  business rules or persistence.

## Contract And Type Ownership

Use these type categories:

| Type | Owner | Rule |
| --- | --- | --- |
| Backend transport DTO | `src/lib/api/generated` | Generated from a versioned backend-owned artifact |
| Endpoint-local fallback DTO | feature API module | Allowed only with a citation to an accepted endpoint contract |
| Feature/view model | `src/features/<domain>/types` or beside mapper | UI-focused and independent of transport quirks |
| Component props | beside component | Private unless intentionally exported |
| Generic infrastructure type | owning `src/lib` module | Must not mention a business domain |

Do not create a global `src/types` folder. Do not infer a backend response from
mock data or a screen design. When the backend contract is unavailable, record
the blocker and stop the dependent implementation.

## Boundary Mapping

- Treat external JSON as untrusted until the accepted contract or runtime
  schema validates it.
- Map transport DTOs to feature/view models at the feature API boundary.
- Normalize missing/optional values once at that boundary rather than adding
  defensive checks throughout UI components.
- Do not leak generated DTOs into presentational component props when a smaller
  view model expresses the UI need.

No runtime schema library is selected by this contract. Adopt one through an
accepted decision when real endpoints demonstrate the need.

## Errors

`src/lib/api` normalizes network, timeout, cancellation, non-success HTTP, and
unreadable-response failures into a small transport error model. Feature API
modules translate only domain-relevant error codes into feature results. UI
layers own accessible user messaging and retry controls; they do not parse raw
backend error bodies.

Never expose tokens, raw credentials, internal stack traces, or sensitive
backend payloads in user messages or client logs.

## Authentication And Request Context

The frontend may attach the accepted session, tenant context, correlation ID,
locale, and idempotency key through shared transport. It does not establish
tenant isolation or authorization; the backend must enforce both.

The choice between same-origin HttpOnly cookies, bearer tokens, and a
server-mediated BFF is intentionally unresolved. Record that decision before
implementing browser transport or storing any credential.

## Reads, Cache, And Revalidation

- Server reads are the default for initial route data.
- The feature operation owns cache/revalidation semantics because freshness is
  endpoint-specific; the generic transport does not silently cache everything.
- Use parallel requests for independent data and explicit sequential requests
  when one result controls the next.
- Introduce client polling/query state only for a demonstrated interactive need.

## Mutations And Sensitive Actions

- Mutations call accepted backend commands and preserve the backend state
  machine.
- Confirm/cancel order, approve route, dispatch, and other sensitive actions
  must display the backend preview and require explicit confirmation in the
  same user/tenant context.
- UI guards, hidden controls, and disabled buttons improve usability but do not
  replace backend authorization.
- Idempotency keys and correlation IDs are passed when required by the backend
  contract; the frontend does not invent their semantics.

## Environment Configuration

- Server-only API origins and secrets must not use `NEXT_PUBLIC_`.
- Browser-visible configuration must be explicitly safe for public bundles.
- Configuration is read and validated in `src/lib/config`, not scattered across
  features and components.
- Commit an `.env.example` only after the required variable names and exposure
  levels are accepted; never commit real credentials.

## Contract Change Workflow

1. Locate the backend-owned endpoint specification or contract test.
2. Coordinate the cross-repository change and update the durable plan when it
   spans contributors or sessions.
3. Regenerate transport types once from the accepted artifact.
4. Update feature mapping and boundary tests.
5. Verify failure, loading, empty, permission, and sensitive confirmation paths.
6. Run the frontend validation suite.
