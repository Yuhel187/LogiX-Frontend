# Transport Trip and Route API Contract

This frontend-facing contract records the settled Phase 2–5 Transport surface.
Transport owns the wire format and domain decisions; UI state is never a
source of authorization or logistics rules. All paths below follow
`/api/v1`, supplied by the API Gateway.

## Human-readable labels

- Trip assignment displays the frozen vehicle license plate and Driver display
  name from `vehicleSnapshot` / `driverSnapshot`, not their UUIDs or current
  Master Data names. Missing snapshot labels are shown as unavailable.
- Route cards display the route version. Approval actors are resolved through
  the existing tenant-scoped Identity member directory, with explicit loading,
  unavailable and retryable error states; their UUID is not rendered.
- The eligible shipment pool includes the optional `shipmentNumber` display
  field from Fulfillment. Memberships use their saved shipment number; neither
  surface falls back to `shipmentId`.
- Request UUIDs remain in internal mutation recovery state and API payloads.
  End-user operation feedback is localized and does not print those UUIDs.

## Lifecycle foundation and implemented business transitions

The owner-approved [lifecycle refactor](../../../delivery-trip-dispatch-lifecycle-refactor.vi.md)
has completed LS001–LS007; all five implementation phases are complete in the
approved non-browser scope:

- Trip: DRAFT → APPROVED → IN_PROGRESS → COMPLETED; DRAFT/APPROVED may cancel
  before grant. No PLANNED transition/CTA. Draft may calculate/select route
  versions without holding a vehicle/Driver.
- One approval confirmation selects the route and acquires resource
  exclusivity. No separate RoutePlan approval workflow/status. Reopen is
  APPROVED → DRAFT with pointer invalidation/resource release, blocked during
  pending dispatch or committed/unknown grant.
- RoutePlan versions retain immutable input, sequence and approval evidence;
  approvedRoutePlanId selects the execution route. No replacement isApproved
  flag or persisted stale/superseded status.
- Stop: next PENDING → DELIVERED/FAILED on IN_PROGRESS. No arrive endpoint,
  arrival preview/receipt or start/finish-trip button. Failure requires a
  reason; the last terminal stop completes the trip automatically.
- DeliveryAttempt is a terminal result/receipt, with exact request replay,
  actor/assignee binding and immutable outcome; not an independent lifecycle.
- Keep membership/operation/dispatch technical progress as feedback, not a
  sequence of manual status-change buttons. Keep preview/confirmation,
  server-side permissions/tenant/sequence guards and explicit unknown recovery.

The active read contract accepts the five trip statuses and three stop
statuses above; PLANNED and ARRIVED are rejected. Draft, approval, override,
reopen, pre-dispatch cancellation, dispatch and Driver execution are
implemented. Do not infer action availability from accepting a read status.
Preserve legacy history/committed request replay
through the agreed rollout; never reinterpret an old arrive request as delivery.
Phase 2 stop fields such as arrivedAt/currentAttempt below describe existing
responses, not a requirement to implement arrival or redelivery.
The sample optimizer adapter and demo map/types are removed. `/routes` redirects
to `/transport` and requires trip read permission; the sidebar uses the same
grant. Real route operations live in trip detail. Transport owns endpoint
adapters; the routes feature exposes domain-neutral route summary/map components
through its public surface. No timer, fabricated Driver/vehicle, sample run,
coordinate-magnitude heuristic or client approval is used.
When implementing, update all four VI/EN dictionaries, filters, badges, CTAs,
preview copy, adapters and tests together. Reuse current Button/Dialog/Alert
components, theme tokens and feature boundaries. Browser/visual validation
remains unverified under the approved non-browser scope.

## Phase 3 route and approval contract

Backend authority is `libs/messaging/src/interfaces/trip-route.contract.ts`.
All suffixes below are under `/trips/:tripId`. Requests are strict; UUIDs,
positive safe versions, lowercase SHA-256 input hashes and reasons (trimmed,
nonblank, maximum 1000 characters) are validated at the feature boundary.

| Endpoint | Request and response |
|---|---|
| `GET route-plans` | `{items: RoutePlanView[]}` |
| `GET route-plans/:planId` | RoutePlanView |
| `POST route-plans/manual` | `{requestId,expectedTripVersion,orderedStopIds}` → 201 RoutePlanView |
| `POST route-optimizations` | `{requestId,expectedTripVersion}` → 201 RoutePlanView |
| `POST route-approval-preview` | Selection plus optional override order/reason → PreviewView |
| `POST approve-route` | Selection + `{requestId,previewToken,confirmed:true}` → trip detail |
| `POST override-route` | Same confirmation plus `{orderedStopIds,reason}` → trip detail |
| `POST reopen` | `{requestId,expectedVersion,reason}` → trip detail |

Selection is `{expectedVersion,planId,planVersion,inputHash}`. Override preview
requires both orderedStopIds and reason; ordinary approval supplies neither.
PreviewView adds `{previewToken,expiresAt,tripId,action,orderedStopIds,reason,
vehicleSnapshot,driverSnapshot,totalWeight,totalVolume}`. Action is APPROVE
or OVERRIDE. Confirmation sends the original preview binding without silently
refreshing versions or tokens. A stale or expired unconfirmed preview is invalid.

RoutePlanView contains `id,tenantId,tripId,planVersion,version,routeRequestId,
source,inputHash,inputSnapshot,optimizationRunId,solverName,solverVersion,
objective,totalDistance,estimatedCost,metrics,originalPlanId,overrideReason,
approvedBy,approvedAt,vehicleSnapshot,driverSnapshot,createdAt,stops`.
Source is MANUAL/OPTIMIZED/OVERRIDE, never a workflow status. Each stop has
`tripStopId,sequence,eta,legDistance,legDurationSeconds`. Unknown metrics,
solver metadata and snapshots are nullable, not fabricated zeros.
Distance fields are decimal **metres**, converted to km for display; leg
duration is seconds. Provider `metrics.total_duration_minutes` is minutes.
GeoJSON coordinates are explicitly `[longitude,latitude]`; Leaflet uses the
reversed pair. Road geometry is not verified by the distance-matrix provider:
the UI labels the saved polyline as visualization that may be estimated.
Manual plans show a clearly labeled schematic and unknown distance/duration.

Approval creates a new immutable approved version. Trip detail returns
approvedRoutePlanId, not nested routePlans; reload the version list separately.
Historical input/address/resource snapshots are displayed from their saved
version, not refreshed from current Master Data.

Permissions are independent: route reads require `transport:route:read`;
optimizer `transport:route:optimize`; manual/preview/approve/override
`transport:route:approve`; reopen `transport:trip:update`. The UI does not widen
these grants. Backend constraints remain authoritative for resources, readiness,
full permutation, capacity, pending operations and grant barriers.

Manual/optimizer/approve/override retain the original request for explicit
replay after unknown responses. Approval replay keeps its original token even
after expiry. Reopen is CAS-only: after uncertainty, read latest trip, clear the
uncertain input only after a successful read, and do not call the read proof of
success. A separately scoped optimization intent does not block manual planning
when optimization is unavailable; its original request remains recoverable.

## Phase 5 Driver delivery contract

Driver endpoints are under `/api/v1/driver/trips` and use the authenticated
workspace tenant. `transport:driver:read` is required for list/detail and
`transport:driver:update` for preview/deliver/fail. The backend derives the
Driver identity from the authenticated user; a client-supplied `driverId` is
accepted only for a Super Admin and remains filtered to that request's tenant.
No separate Driver authentication/layout is used.

The Super Admin Driver filter loads server-paginated Driver pages (20 per
page), with previous/next controls and search by code/license number. Changing
the search resets the Driver picker page; the selected Driver remains selected
when moving between picker pages. Trip pagination is independent.

| Method and path | Request | Response / rules |
|---|---|---|
| `GET /driver/trips` | `scope=current\|history`, `page`, `pageSize`; optional `driverId` for Super Admin | `{items,total,page,pageSize}`. Current is `IN_PROGRESS`; history is `COMPLETED`/`CANCELED`. |
| `GET /driver/trips/:tripId` | None | Tenant-scoped trip detail with frozen vehicle/Driver/depot context, approved stop order, shipment/contact snapshots and `nextStopId`. |
| `POST /driver/trips/:tripId/stops/:stopId/action-preview` | `{action:"DELIVER"\|"FAIL",expectedTripVersion,expectedStopVersion,actingReason,reason?}` | Super Admin only; returns before/after status, bound assignee, versions, signed `previewToken` and `expiresAt`. `reason` is required only for FAIL. |
| `POST /driver/trips/:tripId/stops/:stopId/deliver` | `{requestId,expectedTripVersion,expectedStopVersion,confirmed:true,previewToken?,actingReason?,reason?}` | Terminal receipt. Driver commands omit admin fields; Super Admin command must match its tenant/actor/assignee/versions/reason-bound preview. |
| `POST /driver/trips/:tripId/stops/:stopId/fail` | Same command shape; nonblank `reason` required | Terminal `FAILED` receipt. Acting reason is separate from delivery-failure reason. |

Only the next approved-sequence `PENDING` stop on an `IN_PROGRESS` trip can
become `DELIVERED` or `FAILED`; no ARRIVED, force-complete or redelivery
endpoint exists. The terminal receipt returns `requestId`, `tripId`,
`tripStopId`, `shipmentId`, `driverId`, `assigneeUserId`, actual
`actorUserId`/`actorMode`, terminal `status`, reason fields, attempt and
resulting trip/stop versions. It is immutable. A committed exact command is
replayed before current-state or preview-expiry checks; changed actor/context/
payload conflicts. After an uncertain response, recover by repeating the same
endpoint and exact saved body/request ID in the original tenant/user scope;
never mint a replacement request from a stale or unknown result.

The last stop result completes the trip and releases vehicle/Driver
exclusivity atomically. Transport publishes strict Delivery Result v2 events
with `DeliveryTrip` aggregate; payload binds tenant/trip/stop/shipment/attempt,
Driver/assignee, outcome, timestamp, reason and request ID. Actual actor is
event-envelope metadata. Fulfillment validates the binding and uses durable
defer/retry plus semantic dedupe; Shipment lifecycle/history/outbox remains
authoritative for Order projection. Delivery results do not mutate Inventory
or issue stock a second time.

Migration `20261026222454_phase5_driver_terminal_receipts` must be applied
through Prisma migrate only; never use `prisma db push`. Phase 5 evidence is
layered across Transport API/PostgreSQL and Fulfillment Kafka/PostgreSQL
integration suites; it is not one single runtime journey from `CONFIRMED`
through every service to Order projection. Browser/visual validation,
live-frontend-to-Gateway validation and centralized Audit ingestion were not
performed in this non-browser handoff.

Cancel now accepts DRAFT/APPROVED; resources remain held until durable claim
release completes, then the approved pointer/sequence are cleared and history
is retained. Non-rejected dispatch authority blocks cancellation.

Validation: frontend 158 tests/22 files, lint/typecheck/build passed. Four
temporary parser checks against sanitized actual isolated Gateway responses
passed and the temporary test file was removed. Both locale pairs have 168
Transport leaves and three routes-entry leaves with runtime/key/placeholder
parity. No browser/visual or external map-server proof is claimed.

## Simplification contract and rollout

The [whole-task refactor artifact](../../../delivery-trip-dispatch-simplification-refactor.vi.md)
defines the change from persisted `previewId` to signed `previewToken`,
and from durable replay to version/CAS plus read-back for local-only draft
edits. Create, Driver-reference, membership/cancellation and critical
dispatch/delivery guarantees remain protected. Stop demand may be derived
without changing the public read shape; its duplicate storage has been removed.

The wire contract below targets the refactored implementation. Deployment is a
separate operation: coordinate backend and frontend rollout, expire old
unconfirmed previews, and retain replay of committed legacy commands. Never
send a token in a UUID `previewId` field. GR evidence and deployment limits are
tracked in the existing shared execution record, not implied by this document.
The backend requires a dedicated validated `TRIP_CANCEL_PREVIEW_SECRET`; it
must not be either session-JWT or internal-service-JWT secret and is never
exposed through frontend configuration.

## Wire and error format

- Successful responses are the resource or operation object directly; there is
  no success `data` envelope.
- Errors are `{ statusCode, error, message, details?, correlationId?,
  timestamp }`. `error` is the platform error code. `details` is contextual
  information, not another code. The frontend localizes known platform codes
  and never renders backend `message` text as localized UI copy.
- Decimal quantities and coordinates are decimal strings or `null` where
  specified. Versions are safe JSON integers.
- Tenant and actor are resolved from the authenticated request; clients do not
  submit either as mutation authority.

## Draft trip resources

`GET /trips` accepts `warehouseId`, `status`, `vehicleId`, `driverId`,
`plannedStartFrom`, `plannedStartTo`, `search`, `page`, and `pageSize`.
It returns `{ items, total, page, pageSize }`. Each summary has
`id, tripNumber, warehouseId, depotSnapshot, status, plannedStartAt,
vehicleId, driverId, totalWeight, totalVolume, version`; Phase 2 statuses are
`DRAFT` and `CANCELED` for implemented writes; foundation reads/filters also
accept `APPROVED`, `IN_PROGRESS`, and `COMPLETED` for existing history and
Phase 3–5 readiness, without exposing new mutation buttons.

`GET /trips/:tripId` returns the trip directly. `POST /trips` accepts
`{ requestId, warehouseId, plannedStartAt, vehicleId?, driverId? }` and
returns the created trip. `PATCH /trips/:tripId` accepts
`{ requestId, expectedVersion, plannedStartAt?, vehicleId?, driverId? }`.
Vehicle and Driver are optional references in this phase; their approval
snapshots remain `null`.

Assignment changes use `POST /trips/:tripId/assignment` with
`{ requestId, expectedVersion, vehicleId?, driverId? }`; at least one
assignment field must be supplied.

Local-only schedule/vehicle edits and clearing a Driver use expected-version
CAS without creating a new durable operation. `requestId` remains in the DTO,
but is not a durable recovery key for those edits. After a timeout, explicitly
read the latest trip and review its values before another edit; do not
automatically resend or display read-back as proof of successful saving.
The frontend keeps the uncertain input locked until that read succeeds.
Submitting a non-null Driver reference (including a mixed-field PATCH) keeps
the durable path and exact request replay. Unchanged Driver fields are omitted
from vehicle-only UI edits. Existing completed UPDATE/ASSIGNMENT receipts remain
replayable; their history is not deleted.

The immutable `depotSnapshot` is the WarehouseView copied at trip creation:
`id, code, name, addressLine, ward, district, province, postalCode, latitude,
longitude, status, createdAt, updatedAt, version`.

Trip detail contains shipment memberships and stop snapshots. Membership
fields are `id, tripId, shipmentId, orderId, warehouseId, shipmentVersion,
orderVersion, state, weight, volume, assignedAt, removedAt, claimReceipt,
releaseReceipt, shipmentSnapshot`. `orderId`, `shipmentVersion`, and
`orderVersion` are `null` until claim succeeds. States are `CLAIM_PENDING`,
`ACTIVE`, `RELEASE_PENDING`, or `RELEASED`. `assignedAt` is the local durable
intent time. A shipment snapshot is `null` only until claim succeeds;
`removedAt` and receipts are `null` when their corresponding operation has not
applied.
The snapshot guarantees shipment/order IDs and numbers, warehouse, delivery
address, versions, decimal totals, and an item array. Order number and customer
data are not guaranteed.

A stop has preserved identity and fields `id, tenantId, tripId, shipmentId,
deliveryAddressId, addressSnapshot, latitude, longitude, weight, volume,
plannedSequence, approvedSequence, status, currentAttempt, arrivedAt,
completedAt, createdAt, updatedAt, version, deletedAt`. During Phase 2 status
is `PENDING` for new draft stops; reads also accept `DELIVERED`/`FAILED`.
`arrivedAt` may retain legacy historical evidence but is not written by new
arrival commands (none exist). `currentAttempt` is a safe integer, and `plannedSequence` is
1-based. Removed and re-added memberships may preserve stop identity; deleted
stops remain in detail and are excluded from the effective totals. Its
`addressSnapshot` is copied verbatim from the shipment's delivery-address
snapshot:
`addressId, addressVersion, addressType, label, recipientName, phone,
addressLine, ward, district, province, postalCode, latitude, longitude,
deliveryNote`. Its `latitude` and `longitude` also preserve the address
coordinates and must be both null or a valid coordinate pair; stop coordinates
follow the same rule. Stop `weight` and `volume` are nullable decimal strings.
No live Master Data lookup may replace these shipment/depot snapshots in the
detail view.
Stop weight/volume remain nullable decimal strings in the read DTO, derived
from the matching membership rather than stored a second time on the stop.
Remove/re-add history must not select an older released membership ahead of an
active one. Historical rows without sufficient evidence return null, not a
fabricated zero. Future route versions freeze their own demand input.

## Eligible shipment pool and membership commands

`GET /trips/eligible-shipments` accepts only `warehouseId`, `page`, and
`pageSize`; it returns `{ items, total, page, pageSize }`. Each item exposes
`shipmentId, orderId, warehouseId, shipmentVersion, orderVersion, status,
totalWeight, totalVolume`. The backend filters the eligible pool before
pagination and applies other in-flight shipment exclusions before counting.
There is no public pool search parameter.

`POST /trips/:tripId/shipments` accepts
`{ requestId, expectedTripVersion, shipments: [{ shipmentId,
expectedShipmentVersion }] }`. The remove endpoint
`POST /trips/:tripId/shipments/remove` accepts
`{ requestId, expectedTripVersion, shipmentIds }`.

Both commands always return a durable operation
`{ tripId, requestId, kind, status, version, results }`, where each result has
`shipmentId, state` and optional `reason`. Kinds are `CREATE`, `UPDATE`,
`ASSIGNMENT`, `ADD`, `REMOVE`, `CANCEL`, or `SHIPMENT_CANCELED`; result state
uses the membership-state values. Operation status is `PENDING`, `COMPLETED`,
or `REJECTED`. A `202` means the outcome is pending; it is not proof of
completion. Recover it through
`GET /trips/:tripId/operations/:requestId`. Do not issue a replacement
request ID or replay automatically after a timeout. A saved ID is scoped to
the same authenticated tenant, actor, operation, and exact request payload.
Different payload or actor with the same ID conflicts.

Competing active shipment membership, changed actor/payload for a saved request,
and same-trip pending mutation conflicts return HTTP 409 with top-level
`BUSINESS_RULE_VIOLATION`. A definitively compensated add rejection also returns
HTTP 409 with contextual `details: { requestId, results }`; its durable operation
query returns HTTP 200 with status `REJECTED`. Missing/null shipment coordinates
reject membership; a known successful upstream claim is durably released before
that operation becomes `REJECTED`. Nullable stop fields in the read DTO do not
authorize adding a shipment without valid coordinates.

## Draft cancellation

`POST /trips/:tripId/cancel-preview` accepts `{ expectedVersion }` and returns
`{ previewToken, tripId, expectedVersion, expiresAt, activeShipmentCount,
releaseCount, blockers }`. The signed preview expires after five minutes.
The frontend treats the token as opaque, not as authorization or proof that a
resource has been reserved.

`POST /trips/:tripId/cancel` accepts
`{ requestId, expectedVersion, previewToken, confirmed: true, reason }`.
Reason must be trimmed and nonempty, with a maximum of 1,000 characters.
The preview is explicit and confirmation is required. A pending release returns
the durable operation shape; the trip becomes canceled only after release
completes. A timeout remains an unknown outcome until the exact operation is
recovered. Cancellation does not cancel the underlying Order.
Retrying an uncertain signed-token cancellation uses the exact saved body and
request ID, even after token expiry: an existing committed command is replayed
before current preview-expiry/version checks. A new command with an expired
token requires a fresh preview and explicit confirmation. The token itself
does not provide independent single-use/revocation; domain versions, receipts
and transactions prevent repeated effects.

Only the saved-intent replay adapter accepts a legacy `previewId` body. The
backend returns an existing exact command receipt or rejects the old preview
with HTTP 422 and requires a fresh signed preview; it never authorizes a new
cancel from the old ID. The new-command validator rejects `previewId`.
This compatibility path stores no preview rows and does not change request
IDs/payloads when recovering old commands.

An expired or invalid preview returns HTTP 422 `BUSINESS_RULE_VIOLATION`
with contextual rule `CANCEL_PREVIEW_EXPIRED_OR_INVALID`; a matching preview
version with a changed membership digest returns the same status/code with rule
`CANCEL_PREVIEW_STALE`. A stale trip `expectedVersion` instead returns HTTP 409
`CONCURRENCY_CONFLICT`. Preview validation failures require an explicit reload
and a fresh preview/confirmation, never an automatic retry with bumped versions.

## Error codes used by Phase 2

The frontend may receive platform codes including `CONCURRENCY_CONFLICT`,
`BUSINESS_RULE_VIOLATION`, `INVALID_STATE_TRANSITION`, `ENTITY_NOT_FOUND`,
`DRIVER_LINK_LOCKED`, and `SERVICE_UNAVAILABLE`. It maps known codes and
HTTP statuses to local copy, keeps conflicts/unknown outcomes distinct, and
offers explicit reload/recovery actions instead of silently incrementing
versions or retrying with a new intent.
