# Driver Management API Contract

## Scope and authority

This document specializes the [shared frontend API contract](frontend-api-contract.md)
for Driver management. Business authority is the
[delivery-trip specification](../../../delivery-trip-dispatch-spec.vi.md),
including REQ-014 and account-link correction in §6.5. Backend persistence
ownership remains in the
[database design](../../../LogiX-Backend/docs/architecture/database-design.md#66-drivers).
Task progress and test evidence belong to the
[execution record](../../../LogiX-Backend/docs/plans/active/2026-10-25-delivery-trip-dispatch.md).

Eligibility, permanent identity locking and correction are Driver-specific
policies, not default behavior for other master-data screens. This contract
does not replace the shared frontend architecture, session or transport rules.

## Gateway endpoints

All paths below are relative to `/api/v1`. Feature API adapters validate
responses at their boundary; components do not call internal service APIs.

| Method/path | Request | Response |
|---|---|---|
| `GET /drivers` | `q`, `status`, `page`, `pageSize` | `{items,total,page,pageSize}` |
| `GET /drivers/:id` | Driver UUID | Driver view |
| `POST /drivers` | `{code,userId,licenseNumber,licenseExpiry,phone?}` | Driver view |
| `PATCH /drivers/:id` | `{version,licenseNumber?,licenseExpiry?,phone?}` | Driver view |
| `POST /drivers/:id/enable` or `/disable` | `{version}` | Driver view |
| `GET /drivers/eligible-users` | `q`, `page`, `pageSize` | `{items,total,page,pageSize}`, items `{id,displayName,email,status}` |
| `POST /drivers/:id/relink-user/preview` | `{version,expectedUserId,userId,reason}` | `{driverId,version,previousUserId,userId,previousDisplayName,displayName,reason}` |
| `POST /drivers/:id/relink-user` | Same frozen request reviewed in preview | Driver view |

Driver view contains `id`, `tenantId`, `code`, `userId`, `displayName`,
`licenseNumber`, `licenseExpiry`, nullable `phone`, `status`, `version`,
`createdAt` and `updatedAt`. IDs are UUIDs, versions are positive safe integers,
license expiry is a date-only `YYYY-MM-DD`, and timestamps are strings.
Driver list search covers code and license number; the eligible-member
search covers display name and email.

Ordinary editing cannot change code or linked user. A `null` phone clears
the number. The UI does not invent an expired-license prohibition.

## Access and eligible members

Page/sidebar access requires `master-data:driver:read`; mutations and the
eligible-member picker require `master-data:driver:manage`, subject to the
existing verified permission exemptions. Unknown permission context fails
closed; authorization is enforced by the backend, not by control visibility.

Identity decides eligibility for the active tenant: user, tenant and membership
must be active, with both effective `transport:driver:read` and
`transport:driver:update`, or effective OWNER/wildcard/Super Admin authority.
The UI does not infer eligibility from a role name or grant capabilities when
creating/relinking a profile. No built-in role named DRIVER is assumed.

## Account-link correction

The separate manage-only workflow reuses the eligible-member picker, rejects
the same account and requires a trimmed reason of 1–1,000 characters. Preview
shows backend-provided old/new names, IDs and reason. It is validation/display,
not a signed authorization token, lock or reservation; confirmation repeats
all server-side checks.

A distinct confirmation submits the exact frozen preview body. Changed inputs
discard preview. A failed confirmation also discards it; stale conflicts or
uncertain outcomes refresh the list and require reopening the latest record
and obtaining a new preview, not automatic resubmission.

Relink requests pin the originating credential and disable transport token
refresh. The workflow rejects changed/unknown tenant, session or permission
context; it must never replay an operation under a different organization.

Any historical trip use, including a draft, prevents correction. Cancellation,
deletion or unassignment must not unlock identity. The server owns this rule;
the UI never infers eligibility from an absent trip list. This permanent
identity lock is distinct from a dispatch resource lease.

## Errors and outcomes

The backend envelope is
`{statusCode,error,message,details?,correlationId?,timestamp}`. Domain error
codes `DRIVER_LINK_LOCKED`, `DRIVER_LINK_UNCHANGED` and
`CONCURRENCY_CONFLICT` are in the top-level `error` field.
For a locked link, `details.reason` is `USED`; `details.code` is not required.
Shared transport normalization may support alternate compatible envelopes,
but components consume normalized errors, not raw JSON.

Use localized VI/EN messages for domain errors, uniqueness conflicts and
upstream failures. Never display raw backend text or imply success after an
uncertain response. Ordinary stale edits require refreshing/reopening the
latest record as well. Keep all changed keys aligned in source and runtime
dictionaries.

## Backend integration boundary

Before persisting any Driver reference, Transport writers must acquire the
permanent link lock with expected user/version. The frontend cannot enforce
that invariant, and the existence of a lock endpoint is not proof that a
future trip writer uses it.

Actor/target/reason evidence and atomic persistence remain backend-owned.
Local audit outbox persistence does not prove centralized relay/ingestion;
the frontend must not claim that an Audit service has consumed the event.
