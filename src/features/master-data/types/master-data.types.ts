import type { RecordStatus } from "../schemas/common.schema";

/** Every list request sends `status` explicitly; see the plan decision. */
export interface MasterDataQueryParams {
  q?: string;
  status?: RecordStatus;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
