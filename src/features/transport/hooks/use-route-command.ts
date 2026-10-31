"use client";

import { useState } from "react";
import { z } from "zod";
import {
  approveTripRouteApi, createManualRouteApi, optimizeTripRouteApi,
  overrideTripRouteApi, reopenTripApi,
} from "../api/routes.api";
import { getTripApi } from "../api/trips.api";
import {
  approveRouteInputSchema, manualRouteInputSchema, optimizeRouteInputSchema,
  overrideRouteInputSchema, reopenTripInputSchema,
} from "../schemas/route.schema";
import { tripOutcomeUnknown } from "../utils/trip-errors";
import type { MutationScope } from "../utils/mutation-intent";
import { useMutationIntent } from "./use-mutation-intent";

const savedCommand = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("manual"), input: manualRouteInputSchema.omit({ requestId: true }) }),
  z.object({ kind: z.literal("optimize"), input: optimizeRouteInputSchema.omit({ requestId: true }) }),
  z.object({ kind: z.literal("approve"), input: approveRouteInputSchema.omit({ requestId: true }) }),
  z.object({ kind: z.literal("override"), input: overrideRouteInputSchema.omit({ requestId: true }) }),
  z.object({ kind: z.literal("reopen"), input: reopenTripInputSchema.omit({ requestId: true }) }),
]);
export type RouteCommand = z.infer<typeof savedCommand>;

export function useRouteCommand(
  tripId: string,
  scope: MutationScope,
  onChanged: () => void,
  operation = "route"
) {
  const intent = useMutationIntent(scope, `trip:${tripId}:${operation}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");

  async function run(command?: RouteCommand) {
    setError(null);
    setMessage("");
    let requestId: string | null = null;
    try {
      setBusy(true);
      if (intent.intent) {
        const previous = savedCommand.parse(intent.intent.payload);
        if (previous.kind === "reopen") {
          await getTripApi(tripId);
          intent.complete(intent.intent.requestId);
          setMessage("transport.operations.localEditReadBack");
          onChanged();
          return;
        }
      }
      const payload = savedCommand.parse(intent.intent?.payload ?? command);
      const saved = intent.begin(payload);
      requestId = saved.requestId;
      switch (payload.kind) {
        case "manual":
          await createManualRouteApi(tripId, { requestId, ...payload.input });
          setMessage("transport.route.saved");
          break;
        case "optimize":
          await optimizeTripRouteApi(tripId, { requestId, ...payload.input });
          setMessage("transport.route.saved");
          break;
        case "approve":
          await approveTripRouteApi(tripId, { requestId, ...payload.input });
          setMessage("transport.route.approved");
          break;
        case "override":
          await overrideTripRouteApi(tripId, { requestId, ...payload.input });
          setMessage("transport.route.approved");
          break;
        case "reopen":
          await reopenTripApi(tripId, { requestId, ...payload.input });
          setMessage("transport.route.reopened");
          break;
      }
      intent.complete(requestId);
      onChanged();
    } catch (reason: unknown) {
      setError(reason);
      if (requestId && !tripOutcomeUnknown(reason)) intent.complete(requestId);
    } finally {
      setBusy(false);
    }
  }

  const recoveryKind = intent.intent
    ? savedCommand.safeParse(intent.intent.payload)
    : null;
  return {
    busy,
    error,
    message,
    run,
    intent,
    locked: busy || !intent.ready || intent.storageFailed || Boolean(intent.intent),
    canRecover: recoveryKind?.success === true,
    recoveryKind: recoveryKind?.success ? recoveryKind.data.kind : null,
  };
}
