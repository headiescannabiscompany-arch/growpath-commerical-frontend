import { apiRequest } from "@/api/apiRequest";
import {
  archiveBusinessDeskRecord,
  businessDeskBase,
  calculateBusinessDesk,
  COMMERCIAL_BUSINESS_DESK_WORKSPACE,
  createBusinessDeskRecord,
  getBusinessDeskRecordsCsv,
  listBusinessDeskRecordPage,
  listBusinessDeskRecords,
  listBusinessDeskRevisions,
  resolveFacilityBusinessDeskWorkspace,
  updateBusinessDeskRecord
} from "@/api/businessDesk";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("Business Desk API", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("uses actor-owned Commercial and encoded Facility bases", () => {
    expect(businessDeskBase(COMMERCIAL_BUSINESS_DESK_WORKSPACE)).toBe(
      "/api/business-desk"
    );
    expect(
      businessDeskBase({ workspaceType: "facility", facilityId: " north / east " })
    ).toBe("/api/facility/north%20%2F%20east/business-desk");
  });

  it("fails closed when Facility scope is missing or invalid", async () => {
    expect(resolveFacilityBusinessDeskWorkspace(null)).toBeNull();
    expect(resolveFacilityBusinessDeskWorkspace("   ")).toBeNull();
    expect(resolveFacilityBusinessDeskWorkspace("bad\u0000facility")).toBeNull();
    expect(() => businessDeskBase(undefined as any)).toThrow("No Commercial fallback");
    expect(() =>
      businessDeskBase({ workspaceType: "facility", facilityId: "   " })
    ).toThrow("No Commercial fallback");
    await expect(
      listBusinessDeskRecords(undefined as any, { kind: "quote" })
    ).rejects.toThrow("No Commercial fallback");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("sends exact integer calculation inputs and unwraps data", async () => {
    const input = {
      calculator: "price_margin" as const,
      currency: "USD",
      minorUnitDigits: 2,
      unitPriceMinor: 2500,
      quantityMicros: 2_000_000,
      unitDirectCostMinor: 1000
    };
    const result = { calculator: "price_margin", currency: "USD", totals: {} };
    mockApiRequest.mockResolvedValue({ success: true, data: result });

    await expect(
      calculateBusinessDesk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, input)
    ).resolves.toBe(result);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/business-desk/calculate", {
      method: "POST",
      body: input
    });
  });

  it("keeps create, compare-and-swap update, archive, and revisions scoped", async () => {
    const record = {
      id: "quote/1",
      kind: "quote",
      title: "Spring install",
      status: "draft",
      version: 1,
      payload: { quote: {} }
    };
    mockApiRequest
      .mockResolvedValueOnce({ data: { record } })
      .mockResolvedValueOnce({ data: { record: { ...record, version: 2 } } })
      .mockResolvedValueOnce({ data: { record: { ...record, status: "archived" } } })
      .mockResolvedValueOnce({
        data: { revisions: [{ recordId: "quote/1", version: 1 }] }
      });

    await createBusinessDeskRecord(
      { workspaceType: "facility", facilityId: "facility/1" },
      {
        kind: "quote",
        title: record.title,
        payload: record.payload,
        idempotencyKey: "create-1"
      }
    );
    await updateBusinessDeskRecord(COMMERCIAL_BUSINESS_DESK_WORKSPACE, "quote/1", {
      expectedVersion: 1,
      title: "Spring install revised",
      idempotencyKey: "update-1"
    });
    await archiveBusinessDeskRecord(COMMERCIAL_BUSINESS_DESK_WORKSPACE, "quote/1", {
      expectedVersion: 2,
      reason: "Owner withdrew draft",
      idempotencyKey: "archive-1"
    });
    await listBusinessDeskRevisions(COMMERCIAL_BUSINESS_DESK_WORKSPACE, "quote/1");

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/facility/facility%2F1/business-desk",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/business-desk/quote%2F1",
      expect.objectContaining({
        method: "PATCH",
        body: expect.objectContaining({ expectedVersion: 1 })
      })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/business-desk/quote%2F1/archive",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/business-desk/quote%2F1/revisions"
    );
  });

  it("loads every record page and validates raw CSV exports", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        data: {
          records: [
            {
              id: "quote-1",
              kind: "quote",
              title: "Spring",
              status: "draft",
              version: 1,
              payload: {}
            }
          ],
          page: { limit: 100, hasMore: true, nextCursor: "page-2" }
        }
      })
      .mockResolvedValueOnce({
        data: {
          records: [
            {
              id: "quote-2",
              kind: "quote",
              title: "Summer",
              status: "reviewed",
              version: 1,
              payload: {}
            }
          ],
          page: { limit: 100, hasMore: false, nextCursor: null }
        }
      })
      .mockResolvedValueOnce('"kind","title"\r\n"quote","Spring"')
      .mockResolvedValueOnce({ csv: "invalid" });

    await expect(
      listBusinessDeskRecords(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        kind: "quote",
        includeArchived: true
      })
    ).resolves.toEqual([
      expect.objectContaining({ id: "quote-1" }),
      expect.objectContaining({ id: "quote-2" })
    ]);
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/business-desk?kind=quote&includeArchived=true&limit=100"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/business-desk?kind=quote&includeArchived=true&limit=100&cursor=page-2"
    );
    await expect(
      getBusinessDeskRecordsCsv(COMMERCIAL_BUSINESS_DESK_WORKSPACE)
    ).resolves.toContain("Spring");
    await expect(
      getBusinessDeskRecordsCsv(COMMERCIAL_BUSINESS_DESK_WORKSPACE)
    ).rejects.toThrow("empty or invalid");
  });

  it("forwards cancellation without changing the resolved workspace", async () => {
    const controller = new AbortController();
    mockApiRequest.mockResolvedValueOnce({
      data: {
        records: [],
        page: { limit: 100, hasMore: false, nextCursor: null }
      }
    });

    await listBusinessDeskRecords(
      { workspaceType: "facility", facilityId: "facility-2" },
      { kind: "job" },
      { signal: controller.signal }
    );

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facility/facility-2/business-desk?kind=job&limit=100",
      { signal: controller.signal }
    );
  });

  it("exposes bounded single-page loading and rejects incomplete page truth", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        data: {
          records: [
            {
              id: "expense-1",
              kind: "expense",
              title: "Compost",
              status: "reviewed",
              version: 1,
              payload: {}
            }
          ],
          page: { limit: 1, hasMore: true, nextCursor: "expense-next" }
        }
      })
      .mockResolvedValueOnce({ data: { records: [] } });

    await expect(
      listBusinessDeskRecordPage(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        kind: "expense",
        limit: 1
      })
    ).resolves.toEqual(
      expect.objectContaining({
        records: [expect.objectContaining({ id: "expense-1" })],
        page: { limit: 1, hasMore: true, nextCursor: "expense-next" }
      })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/business-desk?kind=expense&limit=1"
    );
    await expect(
      listBusinessDeskRecordPage(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        kind: "expense"
      })
    ).rejects.toThrow("page response was invalid");
  });
});
