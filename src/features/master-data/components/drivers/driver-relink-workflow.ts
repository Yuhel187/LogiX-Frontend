import { ApiError } from "@/lib/api";
import { DRIVER_RELINK_ERRORS } from "../../constants/driver-relink-errors";
import {
  previewDriverRelinkApi,
  relinkDriverUserApi,
} from "../../api/drivers.api";
import {
  relinkDriverUserSchema,
  type Driver,
  type DriverRelinkPreview,
  type RelinkDriverUserInput,
} from "../../schemas/driver.schema";

export interface DriverRelinkContext {
  tenantId: string | null;
  accessToken: string | null;
  canManage: boolean;
  tenantTransition: string;
}

export interface DriverRelinkSnapshot {
  readonly driverId: string;
  readonly tenantId: string;
  readonly accessToken: string;
  readonly body: Readonly<RelinkDriverUserInput>;
  readonly preview: Readonly<DriverRelinkPreview>;
}

function requireContext(context: DriverRelinkContext, tenantId: string) {
  if (
    !context.canManage ||
    context.tenantTransition !== "idle" ||
    !context.accessToken ||
    context.tenantId !== tenantId
  ) {
    throw new ApiError(403, "Context changed", DRIVER_RELINK_ERRORS.contextChanged);
  }
  return context.accessToken;
}

function requireSnapshotContext(
  snapshot: Pick<DriverRelinkSnapshot, "tenantId" | "accessToken">,
  getContext: () => DriverRelinkContext
) {
  const token = requireContext(getContext(), snapshot.tenantId);
  if (token !== snapshot.accessToken) {
    throw new ApiError(403, "Context changed", DRIVER_RELINK_ERRORS.contextChanged);
  }
}

export async function prepareDriverRelink(
  driver: Driver,
  input: RelinkDriverUserInput,
  getContext: () => DriverRelinkContext
): Promise<DriverRelinkSnapshot> {
  const accessToken = requireContext(getContext(), driver.tenantId);
  const body = Object.freeze(relinkDriverUserSchema.parse(input));
  const context = { tenantId: driver.tenantId, accessToken };
  const preview = await previewDriverRelinkApi(driver.id, body, accessToken);
  requireSnapshotContext(context, getContext);
  if (
    preview.driverId !== driver.id ||
    preview.version !== body.version ||
    preview.previousUserId !== body.expectedUserId ||
    preview.userId !== body.userId ||
    preview.reason !== body.reason
  ) {
    throw new ApiError(502, "Preview does not match request", DRIVER_RELINK_ERRORS.invalidPreview);
  }
  return Object.freeze({
    ...context,
    driverId: driver.id,
    body,
    preview: Object.freeze(preview),
  });
}

export async function confirmDriverRelink(
  snapshot: DriverRelinkSnapshot,
  getContext: () => DriverRelinkContext
): Promise<Driver> {
  requireSnapshotContext(snapshot, getContext);
  // Pin the original credential and disable transport refresh: never replay in a new org.
  const result = await relinkDriverUserApi(
    snapshot.driverId, snapshot.body, snapshot.accessToken
  );
  requireSnapshotContext(snapshot, getContext);
  return result;
}
