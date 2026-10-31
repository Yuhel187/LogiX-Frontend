import { beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch } from "@/lib/api";
import { createCustomerApi, updateCustomerApi } from "./customers.api";
import { createWarehouseApi, updateWarehouseApi } from "./warehouses.api";
import { createVehicleApi, updateVehicleApi } from "./vehicles.api";
import { createProductApi, updateProductApi } from "./products.api";

vi.mock("@/lib/config", () => ({ apiBaseUrl: "https://gateway.example/api/v1" }));
vi.mock("@/lib/api", async (original) => {
  const actual = await original<typeof import("@/lib/api")>();
  return { ...actual, authFetch: vi.fn() };
});

const fetchApi = vi.mocked(authFetch);
const audit = { id: "record-1", status: "ACTIVE", createdAt: "2026-10-31", updatedAt: "2026-10-31" };
const cases = [
  {
    name: "customer", path: "customers", field: "code",
    response: { ...audit, code: "CUS-000001", name: "Customer", taxCode: null, phone: null,
      email: null, disabledAt: null, disabledReason: null },
    create: () => createCustomerApi({ code: " ", name: "Customer" }),
    edit: (code: string) => updateCustomerApi("record-1", { code }),
  },
  {
    name: "warehouse", path: "warehouses", field: "code",
    response: { ...audit, code: "WH-000001", name: "Warehouse", addressLine: "Address",
      province: "Province", ward: null, district: null, postalCode: null, latitude: null, longitude: null },
    create: () => createWarehouseApi({ name: "Warehouse", addressLine: "Address", province: "Province" }),
    edit: (code: string) => updateWarehouseApi("record-1", { code }),
  },
  {
    name: "vehicle", path: "vehicles", field: "code",
    response: { ...audit, code: "VEH-000001", licensePlate: "51C-12345", capacityWeight: "1000", capacityVolume: "10" },
    create: () => createVehicleApi({ code: "", licensePlate: "51C-12345", capacityWeight: "1000", capacityVolume: "10" }),
    edit: (code: string) => updateVehicleApi("record-1", { code }),
  },
  {
    name: "product", path: "products", field: "sku",
    response: { ...audit, sku: "PRD-000001", name: "Product", baseUnit: "piece", weight: "1", volume: "0.1" },
    create: () => createProductApi({ name: "Product", baseUnit: "piece", weight: "1", volume: "0.1" }),
    edit: (sku: string) => updateProductApi("record-1", { sku }),
  },
];

describe.each(cases)("$name code adapter", (resource) => {
  beforeEach(() => {
    fetchApi.mockReset();
    fetchApi.mockImplementation(async () => new Response(JSON.stringify(resource.response), {
      headers: { "Content-Type": "application/json" },
    }));
  });

  it("does not send a blank create code and returns the backend-generated metadata", async () => {
    expect(await resource.create()).toMatchObject(resource.response);
    const [url, options] = fetchApi.mock.calls[0];
    expect(url).toBe(`https://gateway.example/api/v1/${resource.path}`);
    expect(options?.method).toBe("POST");
    if (typeof options?.body !== "string") throw new Error("Expected JSON request body");
    expect(JSON.parse(options.body)).not.toHaveProperty(resource.field);
  });

  it("transmits trimmed metadata edits without changing the resource identifier", async () => {
    await resource.edit(" CUSTOM-002 ");
    expect(fetchApi).toHaveBeenCalledWith(
      `https://gateway.example/api/v1/${resource.path}/record-1`,
      { method: "PATCH", body: JSON.stringify({ [resource.field]: "CUSTOM-002" }) }
    );
  });

  it("rejects a blank edit before sending a request", async () => {
    await expect(resource.edit(" ")).rejects.toThrow();
    expect(fetchApi).not.toHaveBeenCalled();
  });
});
