export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface BalanceQueryParams {
  warehouseId?: string;
  productId?: string;
  lowStockOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MovementQueryParams {
  warehouseId?: string;
  productId?: string;
  referenceType?: string;
  referenceId?: string;
  page?: number;
  pageSize?: number;
}

export interface BalanceKey {
  warehouseId: string;
  productId: string;
}
