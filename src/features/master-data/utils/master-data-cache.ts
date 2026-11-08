import { getStoredAccessToken } from "@/features/identity/api/auth.api";
import { getWarehouseApi, listWarehousesApi } from "../api/warehouses.api";
import { getProductApi, listProductsApi } from "../api/products.api";
import { getVehicleApi, listVehiclesApi } from "../api/vehicles.api";
import { getDriverApi, listDriversApi } from "../api/drivers.api";
import type { Paginated } from "../schemas/common.schema";
import type { Warehouse } from "../schemas/warehouse.schema";
import type { Product } from "../schemas/product.schema";
import type { Vehicle } from "../schemas/vehicle.schema";
import type { Driver } from "../schemas/driver.schema";
import type { MasterDataQueryParams } from "../types/master-data.types";

const MASTER_DATA_TTL_MS = 60_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface TenantMasterDataStore {
  warehousesById: Map<string, CacheEntry<Warehouse>>;
  productsById: Map<string, CacheEntry<Product>>;
  vehiclesById: Map<string, CacheEntry<Vehicle>>;
  driversById: Map<string, CacheEntry<Driver>>;
  listEntries: Map<string, CacheEntry<unknown>>;
  inFlight: Map<string, Promise<unknown>>;
}

let activeScopeKey: string | null = null;
let activeStore: TenantMasterDataStore = createEmptyStore();

function createEmptyStore(): TenantMasterDataStore {
  return {
    warehousesById: new Map(),
    productsById: new Map(),
    vehiclesById: new Map(),
    driversById: new Map(),
    listEntries: new Map(),
    inFlight: new Map(),
  };
}

function getStore(explicitScope?: string | null): TenantMasterDataStore {
  const tokenScope = getStoredAccessToken() ?? "anonymous";
  const scopeKey = explicitScope ? `${explicitScope}:${tokenScope}` : tokenScope;
  if (activeScopeKey !== scopeKey) {
    activeScopeKey = scopeKey;
    activeStore = createEmptyStore();
  }
  return activeStore;
}

function readValidEntry<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  now = Date.now()
): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function writeEntry<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  now = Date.now()
): void {
  map.set(key, {
    value,
    expiresAt: now + MASTER_DATA_TTL_MS,
  });
}

function runSingleFlight<T>(
  store: TenantMasterDataStore,
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  const existing = store.inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = loader().finally(() => {
    if (store.inFlight.get(key) === promise) {
      store.inFlight.delete(key);
    }
  });
  store.inFlight.set(key, promise);
  return promise;
}

export function invalidateMasterDataCache(): void {
  activeStore = createEmptyStore();
}

export async function getCachedWarehouses(
  params: MasterDataQueryParams = {},
  options?: { forceRefresh?: boolean; tenantId?: string | null }
): Promise<Paginated<Warehouse>> {
  const store = getStore(options?.tenantId);
  const cacheKey = `warehouses:list:${JSON.stringify(params)}`;

  if (!options?.forceRefresh) {
    const cached = readValidEntry(store.listEntries, cacheKey) as
      | Paginated<Warehouse>
      | null;
    if (cached) return cached;
  }

  return runSingleFlight(store, cacheKey, async () => {
    const page = await listWarehousesApi(params);
    const now = Date.now();
    writeEntry(store.listEntries, cacheKey, page, now);
    for (const item of page.items) {
      writeEntry(store.warehousesById, item.id, item, now);
    }
    return page;
  });
}

export async function getCachedProducts(
  params: MasterDataQueryParams = {},
  options?: { forceRefresh?: boolean; tenantId?: string | null }
): Promise<Paginated<Product>> {
  const store = getStore(options?.tenantId);
  const cacheKey = `products:list:${JSON.stringify(params)}`;

  if (!options?.forceRefresh) {
    const cached = readValidEntry(store.listEntries, cacheKey) as
      | Paginated<Product>
      | null;
    if (cached) return cached;
  }

  return runSingleFlight(store, cacheKey, async () => {
    const page = await listProductsApi(params);
    const now = Date.now();
    writeEntry(store.listEntries, cacheKey, page, now);
    for (const item of page.items) {
      writeEntry(store.productsById, item.id, item, now);
    }
    return page;
  });
}

export async function getCachedVehicles(
  params: MasterDataQueryParams = {},
  options?: { forceRefresh?: boolean; tenantId?: string | null }
): Promise<Paginated<Vehicle>> {
  const store = getStore(options?.tenantId);
  const cacheKey = `vehicles:list:${JSON.stringify(params)}`;

  if (!options?.forceRefresh) {
    const cached = readValidEntry(store.listEntries, cacheKey) as
      | Paginated<Vehicle>
      | null;
    if (cached) return cached;
  }

  return runSingleFlight(store, cacheKey, async () => {
    const page = await listVehiclesApi(params);
    const now = Date.now();
    writeEntry(store.listEntries, cacheKey, page, now);
    for (const item of page.items) {
      writeEntry(store.vehiclesById, item.id, item, now);
    }
    return page;
  });
}

export async function getCachedDrivers(
  params: MasterDataQueryParams = {},
  options?: { forceRefresh?: boolean; tenantId?: string | null }
): Promise<Paginated<Driver>> {
  const store = getStore(options?.tenantId);
  const cacheKey = `drivers:list:${JSON.stringify(params)}`;

  if (!options?.forceRefresh) {
    const cached = readValidEntry(store.listEntries, cacheKey) as
      | Paginated<Driver>
      | null;
    if (cached) return cached;
  }

  return runSingleFlight(store, cacheKey, async () => {
    const page = await listDriversApi(params);
    const now = Date.now();
    writeEntry(store.listEntries, cacheKey, page, now);
    for (const item of page.items) {
      writeEntry(store.driversById, item.id, item, now);
    }
    return page;
  });
}

export async function getCachedVehicleById(
  id: string,
  options?: { forceRefresh?: boolean; tenantId?: string | null }
): Promise<Vehicle> {
  const store = getStore(options?.tenantId);
  if (!options?.forceRefresh) {
    const cached = readValidEntry(store.vehiclesById, id);
    if (cached) return cached;
  }
  return runSingleFlight(store, `vehicles:id:${id}`, async () => {
    const item = await getVehicleApi(id);
    writeEntry(store.vehiclesById, item.id, item);
    return item;
  });
}

export async function getCachedDriverById(
  id: string,
  options?: { forceRefresh?: boolean; tenantId?: string | null }
): Promise<Driver> {
  const store = getStore(options?.tenantId);
  if (!options?.forceRefresh) {
    const cached = readValidEntry(store.driversById, id);
    if (cached) return cached;
  }
  return runSingleFlight(store, `drivers:id:${id}`, async () => {
    const item = await getDriverApi(id);
    writeEntry(store.driversById, item.id, item);
    return item;
  });
}

export async function resolveWarehousesByIds(
  ids: string[],
  options?: { forceRefresh?: boolean; tenantId?: string | null }
): Promise<{ items: Record<string, Warehouse>; failed: boolean }> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { items: {}, failed: false };
  }

  const store = getStore(options?.tenantId);
  const items: Record<string, Warehouse> = {};
  let missingIds: string[] = [];

  if (!options?.forceRefresh) {
    for (const id of uniqueIds) {
      const cached = readValidEntry(store.warehousesById, id);
      if (cached) {
        items[id] = cached;
      } else {
        missingIds.push(id);
      }
    }
  } else {
    missingIds = [...uniqueIds];
  }

  if (missingIds.length === 0) {
    return { items, failed: false };
  }

  // Batch warm with a single list page when more than 1 warehouse is missing
  if (missingIds.length > 1) {
    try {
      await getCachedWarehouses(
        { page: 1, pageSize: 100 },
        { forceRefresh: options?.forceRefresh, tenantId: options?.tenantId }
      );
      const stillMissing: string[] = [];
      for (const id of missingIds) {
        const cached = readValidEntry(store.warehousesById, id);
        if (cached) {
          items[id] = cached;
        } else {
          stillMissing.push(id);
        }
      }
      missingIds = stillMissing;
    } catch {
      // Fallback to individual lookups if list warm fails
    }
  }

  if (missingIds.length === 0) {
    return { items, failed: false };
  }

  const results = await Promise.allSettled(
    missingIds.map((id) =>
      runSingleFlight(store, `warehouses:id:${id}`, async () => {
        const wh = await getWarehouseApi(id);
        writeEntry(store.warehousesById, wh.id, wh);
        return wh;
      })
    )
  );

  let failed = false;
  for (const result of results) {
    if (result.status === "fulfilled") {
      items[result.value.id] = result.value;
    } else {
      failed = true;
    }
  }

  return { items, failed };
}

export async function resolveProductsByIds(
  ids: string[],
  options?: { forceRefresh?: boolean; tenantId?: string | null }
): Promise<{ items: Record<string, Product>; failed: boolean }> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { items: {}, failed: false };
  }

  const store = getStore(options?.tenantId);
  const items: Record<string, Product> = {};
  let missingIds: string[] = [];

  if (!options?.forceRefresh) {
    for (const id of uniqueIds) {
      const cached = readValidEntry(store.productsById, id);
      if (cached) {
        items[id] = cached;
      } else {
        missingIds.push(id);
      }
    }
  } else {
    missingIds = [...uniqueIds];
  }

  if (missingIds.length === 0) {
    return { items, failed: false };
  }

  // Batch warm with a single list page when more than 1 product is missing
  if (missingIds.length > 1) {
    try {
      await getCachedProducts(
        { page: 1, pageSize: 100 },
        { forceRefresh: options?.forceRefresh, tenantId: options?.tenantId }
      );
      const stillMissing: string[] = [];
      for (const id of missingIds) {
        const cached = readValidEntry(store.productsById, id);
        if (cached) {
          items[id] = cached;
        } else {
          stillMissing.push(id);
        }
      }
      missingIds = stillMissing;
    } catch {
      // Fallback to individual lookups if list warm fails
    }
  }

  if (missingIds.length === 0) {
    return { items, failed: false };
  }

  const results = await Promise.allSettled(
    missingIds.map((id) =>
      runSingleFlight(store, `products:id:${id}`, async () => {
        const prod = await getProductApi(id);
        writeEntry(store.productsById, prod.id, prod);
        return prod;
      })
    )
  );

  let failed = false;
  for (const result of results) {
    if (result.status === "fulfilled") {
      items[result.value.id] = result.value;
    } else {
      failed = true;
    }
  }

  return { items, failed };
}
