import { apiRequest } from "@/api/apiRequest";
import {
  applyBusinessInventoryImport,
  applyBusinessInventoryMovement,
  businessInventoryBase,
  createBusinessInventoryLot,
  getBusinessInventoryAuditCsv,
  getBusinessInventoryImport,
  getBusinessInventoryItem,
  listBusinessInventoryImports,
  listBusinessInventory,
  mergeBusinessInventoryMovements,
  previewBusinessInventoryImport,
  reviewBusinessInventoryImport,
  withdrawBusinessInventoryImport
} from "@/api/businessInventory";

jest.mock("@/api/apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("business inventory API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("builds canonical Commercial and encoded Facility bases", () => {
    expect(businessInventoryBase()).toBe("/api/business-inventory");
    expect(businessInventoryBase({ facilityId: "  " })).toBe("/api/business-inventory");
    expect(businessInventoryBase({ facilityId: " north / east " })).toBe(
      "/api/facility/north%20%2F%20east/business-inventory"
    );
  });

  it("normalizes list and detail envelopes without inventing child records", async () => {
    const items = [
      { id: "item-1", name: "Kelp Meal", sku: "KELP-1", quantity: 4, unit: "lb" }
    ];
    mockApiRequest
      .mockResolvedValueOnce({ items })
      .mockResolvedValueOnce({
        item: items[0],
        lots: [{ id: "lot-1", itemId: "item-1", lotCode: "LOT-1" }],
        movements: null
      })
      .mockResolvedValueOnce({ data: items });

    await expect(listBusinessInventory()).resolves.toEqual(items);
    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/business-inventory");

    await expect(
      getBusinessInventoryItem({ facilityId: "facility/1" }, "item/1")
    ).resolves.toEqual({
      item: items[0],
      lots: [{ id: "lot-1", itemId: "item-1", lotCode: "LOT-1" }],
      movements: [],
      movementPage: null
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/facility/facility%2F1/business-inventory/item%2F1"
    );

    await expect(listBusinessInventory()).resolves.toEqual([]);
  });

  it("preserves movement keyset metadata and merges pages without duplicates", async () => {
    mockApiRequest.mockResolvedValueOnce({
      item: { id: "item-1" },
      lots: [],
      movements: [
        { id: "movement-2", movementType: "consume", reason: "Used stock" }
      ],
      movementPage: { limit: 25, hasMore: true, nextCursor: "cursor/2" }
    });

    await expect(
      getBusinessInventoryItem({}, "item-1", {
        movementLimit: 25,
        movementCursor: "cursor/1"
      })
    ).resolves.toMatchObject({
      movementPage: { limit: 25, hasMore: true, nextCursor: "cursor/2" }
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/business-inventory/item-1?movementLimit=25&movementCursor=cursor%2F1"
    );

    expect(
      mergeBusinessInventoryMovements(
        [
          { id: "movement-1", movementType: "receive", reason: "Delivery" },
          { id: "movement-2", movementType: "consume", reason: "Old copy" }
        ],
        [
          { id: "movement-2", movementType: "consume", reason: "Used stock" },
          { id: "movement-3", movementType: "adjust", reason: "Count" }
        ]
      )
    ).toEqual([
      { id: "movement-1", movementType: "receive", reason: "Delivery" },
      { id: "movement-2", movementType: "consume", reason: "Used stock" },
      { id: "movement-3", movementType: "adjust", reason: "Count" }
    ]);
  });

  it("posts lots and audited movements to the selected workspace", async () => {
    mockApiRequest.mockResolvedValue({ ok: true });
    const lot = { lotCode: "LOT-7", batchCode: "BATCH-2" };
    const movement = {
      movementType: "receive" as const,
      quantity: 8,
      reason: "Reviewed delivery",
      idempotencyKey: "movement-key-1",
      lotId: "lot-7"
    };

    await createBusinessInventoryLot({ facilityId: "facility-1" }, "item-1", lot);
    await applyBusinessInventoryMovement({}, "item-1", movement);

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/facility/facility-1/business-inventory/item-1/lots",
      { method: "POST", body: lot }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/business-inventory/item-1/movements",
      { method: "POST", body: movement }
    );
  });

  it("keeps preview, review, and apply as distinct import requests", async () => {
    const previewRecord = {
      _id: "import/1",
      sourceName: "inventory.csv",
      sourceDigest: "digest-1",
      status: "preview" as const
    };
    const reviewedRecord = { ...previewRecord, status: "conflict" as const };
    mockApiRequest
      .mockResolvedValueOnce({ import: previewRecord })
      .mockResolvedValueOnce({ import: reviewedRecord })
      .mockResolvedValueOnce({ import: { ...reviewedRecord, status: "applied" } });

    const previewInput = {
      sourceName: "inventory.csv",
      rows: [{ sku: "SOIL-1", name: "Living Soil" }],
      mapping: { sku: "sku", name: "name" }
    };
    await expect(
      previewBusinessInventoryImport({ facilityId: "facility-1" }, previewInput)
    ).resolves.toEqual(previewRecord);

    const reviewInput = {
      conflictPolicy: "update_fields" as const,
      quantityMode: "set_on_hand" as const,
      mapping: { quantity: "count" }
    };
    await expect(
      reviewBusinessInventoryImport({}, previewRecord, reviewInput)
    ).resolves.toEqual(reviewedRecord);
    await applyBusinessInventoryImport({}, reviewedRecord);

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/facility/facility-1/business-inventory/imports/preview",
      { method: "POST", body: previewInput }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/business-inventory/imports/import%2F1/review",
      { method: "PATCH", body: reviewInput }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/business-inventory/imports/import%2F1/apply",
      { method: "POST" }
    );
  });

  it("recovers, withdraws, and exports imports through scoped canonical endpoints", async () => {
    const record = {
      _id: "import/1",
      sourceName: "inventory.csv",
      sourceDigest: "digest-1",
      status: "conflict" as const
    };
    const rejected = { ...record, status: "rejected" as const };
    mockApiRequest
      .mockResolvedValueOnce({ imports: [record] })
      .mockResolvedValueOnce({ import: record })
      .mockResolvedValueOnce({ import: rejected })
      .mockResolvedValueOnce('"recordType","action"\r\n"movement","receive"');

    await expect(
      listBusinessInventoryImports({ facilityId: "facility/1" })
    ).resolves.toEqual([record]);
    await expect(getBusinessInventoryImport({}, "import/1")).resolves.toEqual(record);
    await expect(withdrawBusinessInventoryImport({}, record)).resolves.toEqual(rejected);
    await expect(getBusinessInventoryAuditCsv({})).resolves.toContain(
      '"movement","receive"'
    );

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/facility/facility%2F1/business-inventory/imports"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/business-inventory/imports/import%2F1"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/business-inventory/imports/import%2F1/withdraw",
      { method: "POST" }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/business-inventory/exports/audit.csv",
      { method: "GET", responseType: "text" }
    );
  });

  it("rejects an invalid audit response instead of inventing an export", async () => {
    mockApiRequest.mockResolvedValue({ csv: "not raw text" });

    await expect(getBusinessInventoryAuditCsv({})).rejects.toThrow(
      "The inventory audit export was empty or invalid."
    );
  });
});
