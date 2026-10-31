import { z } from "zod";
import {
  POSITIVE_VOLUME,
  POSITIVE_WEIGHT,
  auditResponseFields,
  paginatedSchema,
  metadataCodeSchema,
  optionalGeneratedCodeSchema,
} from "./common.schema";

export const vehicleSchema = z.object({
  id: z.string(),
  code: z.string(),
  licensePlate: z.string(),
  capacityWeight: z.string(),
  capacityVolume: z.string(),
  ...auditResponseFields,
});

export const paginatedVehiclesSchema = paginatedSchema(vehicleSchema);

export const createVehicleSchema = z.object({
  code: optionalGeneratedCodeSchema(50),
  licensePlate: z
    .string()
    .min(1, "Biển số không được để trống")
    .max(30, "Biển số tối đa 30 ký tự"),
  capacityWeight: z
    .string()
    .regex(
      POSITIVE_WEIGHT,
      "Tải trọng phải lớn hơn 0, tối đa 3 chữ số thập phân"
    ),
  capacityVolume: z
    .string()
    .regex(
      POSITIVE_VOLUME,
      "Thể tích chở phải lớn hơn 0, tối đa 6 chữ số thập phân"
    ),
});

export const updateVehicleSchema = createVehicleSchema
  .partial()
  .extend({ code: metadataCodeSchema(50).optional() });

export type Vehicle = z.infer<typeof vehicleSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
