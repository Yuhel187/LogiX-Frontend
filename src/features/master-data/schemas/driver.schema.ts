import { z } from "zod";
import { metadataCodeSchema, optionalGeneratedCodeSchema, paginatedSchema } from "./common.schema";

export const driverSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  code: z.string().min(1),
  userId: z.string().min(1),
  displayName: z.string().min(1),
  licenseNumber: z.string().min(1),
  licenseExpiry: z.iso.date(),
  phone: z.string().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  version: z.number().int().positive().safe(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paginatedDriversSchema = paginatedSchema(driverSchema);

export const eligibleDriverUserSchema = z.object({
  id: z.string().min(1),
  displayName: z.string(),
  email: z.string(),
  status: z.enum(["ACTIVE", "DISABLED"]),
});

export const paginatedEligibleDriverUsersSchema = paginatedSchema(
  eligibleDriverUserSchema
);

export const createDriverSchema = z.object({
  code: optionalGeneratedCodeSchema(50),
  userId: z
    .string()
    .trim()
    .min(1, "masterData.driver.validation.userRequired"),
  licenseNumber: z
    .string()
    .trim()
    .min(1, "masterData.driver.validation.licenseRequired")
    .max(100, "masterData.driver.validation.licenseTooLong"),
  licenseExpiry: z.iso.date({
    error: "masterData.driver.validation.expiryInvalid",
  }),
  phone: z
    .string()
    .max(30, "masterData.driver.validation.phoneTooLong")
    .optional(),
}).strict();

export const updateDriverSchema = z.object({
  version: z.number().int().positive().safe(),
  code: metadataCodeSchema(50).optional(),
  licenseNumber: z
    .string()
    .trim()
    .min(1, "masterData.driver.validation.licenseRequired")
    .max(100, "masterData.driver.validation.licenseTooLong")
    .optional(),
  licenseExpiry: z
    .iso.date({ error: "masterData.driver.validation.expiryInvalid" })
    .optional(),
  phone: z
    .string()
    .max(30, "masterData.driver.validation.phoneTooLong")
    .nullable()
    .optional(),
}).strict();

export const driverFormSchema = z.object({
  code: createDriverSchema.shape.code,
  userId: createDriverSchema.shape.userId,
  licenseNumber: createDriverSchema.shape.licenseNumber,
  licenseExpiry: createDriverSchema.shape.licenseExpiry,
  phone: createDriverSchema.shape.phone,
});

export const updateDriverFormSchema = driverFormSchema.extend({
  code: metadataCodeSchema(50),
});

export const relinkDriverUserSchema = z.object({
  version: z.number().int().positive().safe(),
  expectedUserId: z.uuid(),
  userId: z.uuid({ error: "masterData.driver.validation.userRequired" }),
  reason: z.string().trim()
    .min(1, "masterData.driver.validation.reasonRequired")
    .max(1000, "masterData.driver.validation.reasonTooLong"),
}).strict().refine((input) => input.userId !== input.expectedUserId, {
  path: ["userId"],
  message: "masterData.driver.validation.differentUser",
});

export const driverRelinkPreviewSchema = z.object({
  driverId: z.uuid(),
  version: z.number().int().positive().safe(),
  previousUserId: z.uuid(),
  userId: z.uuid(),
  previousDisplayName: z.string().min(1),
  displayName: z.string().min(1),
  reason: z.string().trim().min(1).max(1000),
});

export type Driver = z.infer<typeof driverSchema>;
export type EligibleDriverUser = z.infer<typeof eligibleDriverUserSchema>;
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type RelinkDriverUserInput = z.infer<typeof relinkDriverUserSchema>;
export type DriverRelinkPreview = z.infer<typeof driverRelinkPreviewSchema>;
