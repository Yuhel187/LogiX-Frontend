import { z } from "zod";

const uuid = z.uuid();
const version = z.number().int().positive().safe();
const sha256 = z.string().regex(/^[a-f0-9]{64}$/i);
const timestamp = z.iso.datetime();

export const dispatchPreviewInputSchema = z.object({ version }).strict();

export const dispatchPreviewSchema = z
  .object({
    tripId: uuid,
    version,
    approvedPlanId: uuid,
    inputHash: sha256,
    dispatchVersion: version,
    shipmentCount: z.number().int().positive(),
    previewToken: z.string().min(1),
    expiresAt: timestamp,
  })
  .strict();
export type DispatchPreview = z.infer<typeof dispatchPreviewSchema>;

export const dispatchCommandSchema = z
  .object({
    requestId: uuid,
    version,
    previewToken: z.string().min(1),
    confirmed: z.literal(true),
  })
  .strict();
export type DispatchCommand = z.infer<typeof dispatchCommandSchema>;

export const dispatchOperationSchema = z
  .object({
    tripId: uuid,
    requestId: uuid,
    kind: z.literal("DISPATCH"),
    status: z.enum(["PENDING", "REJECTED", "COMPLETED"]),
    stage: z.enum([
      "ACCEPTED",
      "SUBMITTED",
      "RECEIPTED",
      "COMPLETED",
      "REJECTED",
    ]),
    payloadHash: sha256,
    version,
    result: z
      .object({
        tripId: uuid,
        status: z.literal("IN_PROGRESS"),
        version,
        dispatchVersion: version,
        dispatchedAt: timestamp,
      })
      .strict()
      .nullable(),
    error: z.string().nullable(),
    nextRetryAt: timestamp.nullable(),
    results: z.array(
      z.object({ shipmentId: uuid, state: z.string() }).strict()
    ),
  })
  .strict();
export type DispatchOperation = z.infer<typeof dispatchOperationSchema>;

export const dispatchIntentPayloadSchema = z
  .object({ version, previewToken: z.string().min(1), confirmed: z.literal(true) })
  .strict();
