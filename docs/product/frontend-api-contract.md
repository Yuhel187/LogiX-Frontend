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

When the user selects a different organization in the workspace switcher,
wait for the tenant-switch operation to complete and store the new session
before navigating. Then perform a full browser navigation to `/`, including
when already on the home page, to discard the previous organization's
in-memory data and App Router cache. Do not retain the previous resource URL.
Selecting the already-active organization does not reload. A failed switch
shows the localized error and does not navigate; concurrent selections are
blocked until completion.

The choice between same-origin HttpOnly cookies, bearer tokens, and a
server-mediated BFF is intentionally unresolved. Record that decision before
implementing browser transport or storing any credential.

## Reads, Cache, And Revalidation

### Shipment lifecycle (GĐ5C)

- Authority: backend `docs/plan_ghi_ro_so_task_backlog/ke-hoach-trien-khai-quan-ly-don-hang.md`
  §7.4 and Fulfillment `ShipmentQueryService`, DTOs and `shipmentView`.
- `src/features/shipments` owns `/shipments` and `/shipments/[shipmentId]`.
  Its public `OrderShipmentPanel` looks up the real shipment using `orderId`;
  a missing shipment is an explicit empty state, not a fabricated identifier.
- All reads and commands go through the Gateway `/api/v1/shipments` boundary
  and validate backend JSON. Decimal quantities remain strings; versions must
  be positive safe integers. The UI never sets an Order lifecycle state.
- Route/sidebar visibility requires `fulfillment:shipment:read`. Preparing,
  dispatching and completing use the independent `update`, `dispatch` and
  `complete` permissions; backend guards remain authoritative.
- Dispatch loads a backend preview and requires a themed confirmation dialog.
  The exact `requestId`, `version`, `orderVersion` and `confirmed: true` body is
  reused after uncertain responses, including closing/reopening the dialog
  on the same mounted detail screen. A pending intent locks actions and is
  not displayed as proof of Inventory ISSUE. After a full navigation/reload,
  the persisted backend intent governs recovery; do not create a replacement
  request for a pending intent.
- Completion also requires confirmation; a failed delivery requires a trimmed,
  nonblank reason of at most 1,000 characters. Conflicts require an explicit
  reload rather than silently submitting with a newer version.
- Order list/detail include nullable `dispatchGrantedAt` and
  `dispatchShipmentId`. Once granted, cancellation is hidden even before
  event-driven Order status projection catches up. Pre-grant cancellation
  remains available in PICKING/READY_TO_SHIP, subject to permission and version.
- Shared `src/lib/config/live-refresh.ts` defines a 5-second interval and a
  maximum of 12 visible-tab poll attempts per resource window. Focus/manual
  refresh remains available; requests are not overlapped in Shipment views.
  A failed read remains visible and requires explicit retry. Dialogs pause
  automatic detail refresh so a confirmed version cannot silently change.
- Validation for this batch is code/contract-only at the user's request.
  Light/dark, VI/EN and responsive styles are implemented but browser/visual
  verification and full lifecycle acceptance remain unverified until GĐ5D.

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

## Order And Shipment Presentation

- The delivery-address picker uses a non-modal Popover/Command combobox, like
  the other entity pickers, rather than a modal Select that locks body scrolling
  and changes page scrollbar compensation while Copilot is open. Its trigger
  stays one line; options wrap and scroll within the available viewport. Search
  matches address titles and full address text; only active SHIPPING addresses
  are selectable and a legacy current address remains disabled.
- Order detail groups its four summary cards into two columns when its actual
  content container is at least 40rem wide, otherwise one column. Lifecycle
  notices stay outside the grid so they never displace a card into a third row.
  Snapshot values wrap without imposing a minimum card width.

- Shipment routes own their page padding and a container-query boundary so
  filters and detail cards adapt to the content width remaining beside the
  workspace and Copilot sidebars. Wide tables scroll locally; action dialogs
  remain scrollable within the viewport.
- Order/Shipment messages, status labels, confirmation copy, and customer,
  warehouse, and product picker states must exist in VI and EN in both the
  canonical and currently loaded dictionaries. Picker fetch errors are explicit
  localized retry states, never successful empty results.
- Map Order domain reasons and HTTP failures to localized copy. Do not display
  raw backend-language messages in another UI locale; preserve structured
  header/line field targeting and translate known status codes in messages.
- Presentation changes must not alter server-owned permissions, lifecycle
  transitions, dispatch idempotency, or bounded refresh behavior.
- Order list background refresh preserves the current rows and pagination;
  skeletons are reserved for an unloaded filter/page resource. Requests for the
  same resource do not overlap, changing resources aborts the old request, and
  refresh failures retain the last successful page with an explicit retry alert.
- Human-readable entity labels prefer a name plus business code (SKU, warehouse
  code, receipt number, or shipment number). Keep technical IDs for API payloads,
  keys and routes; expose the full ID only in expandable technical details.
  Order product labels use immutable name/SKU snapshots, not current master data.
- Actor history in Shipment, Order and Inventory uses the user-selected
  **current-directory** policy, not historical identity snapshots. Resolve the
  authenticated user from Auth and other actors through the existing authorized
  `GET /auth/organizations/:tenantId/members` endpoint. Match `userId`, not the
  membership's `id`; display both current display name and email when available.
  Fetch the directory once per mounted history/auth scope, not per actor or
  background Shipment poll. Directory changes are visible on a fresh lookup.
- A null actor means System; an unavailable non-null actor remains an unknown
  user, never System. Loading, permission denial and failed lookups have localized
  VI/EN states and explicit retry. Abort stale directory requests and hide old
  tenant/session profiles immediately on scope changes. Do not bypass membership
  authorization or infer identities for former/deleted members.
- `GET /inventory/movements` adds `referenceNumber: string | null`, resolved by
  Inventory from its own tenant-scoped receipt records for `STOCK_RECEIPT`
  references. Other reference types return null. The frontend accepts omission
  for older servers and accepts the existing `SHIPMENT` reference type. Resolve
  shipment numbers only through the public Shipment API and only with read
  permission; deduplicate lookups per history page. Manual adjustments show a
  localized label plus their separately resolved actor, not a user UUID.
- Inventory balance metadata is deduplicated by entity ID and scoped to the
  active tenant/session. Failed lookups remain explicit retry states, not silent
  UUID fallbacks or automatic retry loops.
- Inventory row actions use a non-modal dropdown so opening the menu does not
  lock document scrolling or change scrollbar compensation beside Copilot.
  Keep the menu viewport-bounded and use item selection events for both keyboard
  and pointer activation; action dialogs retain their own modal behavior.
- Copilot sidebar (including expanded mode) and its launcher occupy layer 40,
  below application modal portals at layer 50. Sheet/Dialog overlays cover and
  block chat while open; their content must not be hidden behind the sidebar.
  Preserve modal focus trapping, Escape handling and scroll locking instead of
  making business dialogs non-modal or closing/remounting the chat.
- Workspace scrolling belongs to `#main-content`, not the document body.
  While Radix locks scrolling, suppress its body right-padding compensation only
  in the workspace. Copilot already reserves its width through a body inline
  margin; copying that margin into padding reserves chat width twice and shifts
  the underlying content/scrollbar. Preserve the reserved margin and all modal
  overflow, focus and pointer protections. Auth/document-scrolling pages retain
  the library's default compensation.

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
