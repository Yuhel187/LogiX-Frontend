import { z } from "zod";

// Shapes traced to LogiX-Backend
// `apps/inventory-service/src/inventory/inventory.types.ts` and
// `apps/inventory-service/src/inventory/dto/`. No OpenAPI artifact exists yet,
// so they are hand-written at this endpoint boundary.

/** Decimal(18,3) crosses the boundary as a string; never parse it to a number. */
const POSITIVE_DECIMAL = /^\d{1,15}(\.\d{1,3})?$/;
const SIGNED_DECIMAL = /^-?\d{1,15}(\.\d{1,3})?$/;

export const MOVEMENT_TYPES = [
  "RECEIPT",
  "ISSUE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "REVERSAL",
] as const;

export const REFERENCE_TYPES = ["STOCK_RECEIPT", "MANUAL_ADJUSTMENT"] as const;

export const movementTypeSchema = z.enum(MOVEMENT_TYPES);
export const referenceTypeSchema = z.enum(REFERENCE_TYPES);

// =======================================================
// RESPONSE SHAPES
// =======================================================
export const inventoryBalanceSchema = z.object({
  id: z.string(),
  warehouseId: z.string(),
  productId: z.string(),
  onHandQuantity: z.string(),
  reservedQuantity: z.string(),
  availableQuantity: z.string(),
  lowStockThreshold: z.string(),
  isLowStock: z.boolean(),
  updatedAt: z.string(),
});

export const stockMovementSchema = z.object({
  id: z.string(),
  warehouseId: z.string(),
  productId: z.string(),
  movementType: movementTypeSchema,
  quantityDelta: z.string(),
  beforeOnHand: z.string(),
  afterOnHand: z.string(),
  referenceType: referenceTypeSchema,
  referenceId: z.string(),
  reason: z.string().nullable(),
  actorId: z.string().nullable(),
  occurredAt: z.string(),
});

export const stockReceiptLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  quantity: z.string(),
  movementId: z.string(),
});

export const stockReceiptSchema = z.object({
  id: z.string(),
  receiptNumber: z.string(),
  warehouseId: z.string(),
  status: z.string(),
  receivedAt: z.string(),
  lines: z.array(stockReceiptLineSchema),
});

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  });
}

export const paginatedBalancesSchema = paginatedSchema(inventoryBalanceSchema);
export const paginatedMovementsSchema = paginatedSchema(stockMovementSchema);

// =======================================================
// WRITE INPUT SHAPES
// =======================================================
const uuid = (message: string) => z.string().uuid(message);

export const stockReceiptLineInputSchema = z.object({
  productId: uuid("Mã sản phẩm không hợp lệ"),
  quantity: z
    .string()
    .regex(POSITIVE_DECIMAL, "Số lượng phải là số dương, tối đa 3 chữ số thập phân"),
});

export const createStockReceiptSchema = z.object({
  warehouseId: uuid("Mã kho không hợp lệ"),
  receiptNumber: z.string().max(50, "Số phiếu nhập tối đa 50 ký tự").optional(),
  receivedAt: z.string().optional(),
  lines: z
    .array(stockReceiptLineInputSchema)
    .min(1, "Phiếu nhập phải có ít nhất một dòng hàng"),
});

export const adjustStockSchema = z.object({
  quantityDelta: z
    .string()
    .regex(SIGNED_DECIMAL, "Chênh lệch phải là số, tối đa 3 chữ số thập phân")
    .refine((value) => !/^-?0(\.0{1,3})?$/.test(value), {
      message: "Chênh lệch phải khác 0",
    }),
  reason: z
    .string()
    .min(1, "Phải nhập lý do điều chỉnh")
    .max(500, "Lý do tối đa 500 ký tự"),
});

export const updateLowStockThresholdSchema = z.object({
  lowStockThreshold: z
    .string()
    .regex(POSITIVE_DECIMAL, "Ngưỡng tồn tối thiểu phải là số không âm, tối đa 3 chữ số thập phân"),
});

// =======================================================
// TYPES
// =======================================================
export type MovementType = z.infer<typeof movementTypeSchema>;
export type ReferenceType = z.infer<typeof referenceTypeSchema>;
export type InventoryBalance = z.infer<typeof inventoryBalanceSchema>;
export type StockMovement = z.infer<typeof stockMovementSchema>;
export type StockReceipt = z.infer<typeof stockReceiptSchema>;
export type StockReceiptLine = z.infer<typeof stockReceiptLineSchema>;
export type StockReceiptLineInput = z.infer<typeof stockReceiptLineInputSchema>;
export type CreateStockReceiptInput = z.infer<typeof createStockReceiptSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type UpdateLowStockThresholdInput = z.infer<
  typeof updateLowStockThresholdSchema
>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
