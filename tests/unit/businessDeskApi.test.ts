import { apiRequest } from "@/api/apiRequest";
import {
  archiveBusinessDeskRecord,
  businessDeskBase,
  calculateBusinessDesk,
  COMMERCIAL_BUSINESS_DESK_WORKSPACE,
  createBusinessDeskRecord,
  getBusinessDeskRevision,
  getBusinessDeskWorkspaceTimeZone,
  listBusinessDeskRecordPage,
  listBusinessDeskRecords,
  listBusinessDeskRevisions,
  patchBusinessDeskWorkspaceTimeZone,
  prepareBusinessDeskExpenseBatchCsv,
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

  it("uses the exact GET/PATCH workspace-time-zone contract and preserves CAS input", async () => {
    const workspace = { workspaceType: "facility" as const, facilityId: "facility-2" };
    const configured = {
      configured: true,
      workspaceType: "facility",
      workspaceId: "facility-2",
      timeZone: "America/New_York",
      version: 4,
      selectedByUserId: "owner-1",
      selectedByRole: "OWNER",
      selectedAt: "2026-08-22T12:00:00.000Z"
    };
    mockApiRequest
      .mockResolvedValueOnce({ success: true, data: { workspaceTimeZone: configured } })
      .mockResolvedValueOnce({
        success: true,
        data: {
          workspaceTimeZone: {
            ...configured,
            timeZone: "America/Chicago",
            version: 5,
            idempotentReplay: false
          }
        }
      });

    await expect(getBusinessDeskWorkspaceTimeZone(workspace)).resolves.toMatchObject(
      configured
    );
    await expect(
      patchBusinessDeskWorkspaceTimeZone(workspace, {
        timeZone: "America/Chicago",
        expectedVersion: 4,
        idempotencyKey: "workspace-zone-retry-1"
      })
    ).resolves.toMatchObject({ timeZone: "America/Chicago", version: 5 });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/facility/facility-2/business-desk/workspace-time-zone",
      {}
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/facility/facility-2/business-desk/workspace-time-zone",
      {
        method: "PATCH",
        body: {
          timeZone: "America/Chicago",
          expectedVersion: 4,
          idempotencyKey: "workspace-zone-retry-1"
        }
      }
    );
  });

  it("accepts only the canonical unset workspace-time-zone response", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        workspaceTimeZone: {
          configured: false,
          workspaceType: "commercial",
          workspaceId: "owner-1",
          timeZone: null,
          version: 0
        }
      }
    });
    await expect(
      getBusinessDeskWorkspaceTimeZone(COMMERCIAL_BUSINESS_DESK_WORKSPACE)
    ).resolves.toMatchObject({ configured: false, timeZone: null, version: 0 });

    mockApiRequest.mockResolvedValueOnce({
      data: {
        workspaceTimeZone: {
          configured: false,
          workspaceType: "commercial",
          workspaceId: "owner-1",
          timeZone: "UTC",
          version: 0
        }
      }
    });
    await expect(
      getBusinessDeskWorkspaceTimeZone(COMMERCIAL_BUSINESS_DESK_WORKSPACE)
    ).rejects.toThrow("response was invalid");

    mockApiRequest.mockResolvedValueOnce({
      data: {
        workspaceTimeZone: {
          configured: true,
          workspaceType: "commercial",
          workspaceId: "owner-1",
          timeZone: "America/New_York",
          version: 1
        }
      }
    });
    await expect(
      getBusinessDeskWorkspaceTimeZone(COMMERCIAL_BUSINESS_DESK_WORKSPACE)
    ).rejects.toThrow("response was invalid");
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

  it("sends an explicit valid IANA time zone in the real cash-flow request body", async () => {
    const input = {
      calculator: "cash_flow" as const,
      currency: "USD",
      minorUnitDigits: 2,
      currentCashMinor: null,
      asOf: "2026-08-22T16:00:00.000Z",
      timeZone: "America/New_York",
      timeZoneVersion: 3,
      staleAfterDays: 30,
      horizonsDays: [30, 60, 90],
      entries: []
    };
    const result = { ...input, horizons: [], complete: false };
    mockApiRequest.mockResolvedValue({ success: true, data: result });

    await expect(
      calculateBusinessDesk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, input)
    ).resolves.toBe(result);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/business-desk/calculate", {
      method: "POST",
      body: expect.objectContaining({
        calculator: "cash_flow",
        timeZone: "America/New_York",
        timeZoneVersion: 3,
        horizonsDays: [30, 60, 90]
      })
    });

    mockApiRequest.mockClear();
    await expect(
      calculateBusinessDesk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        ...input,
        timeZone: "Moon/Sea"
      })
    ).rejects.toThrow("valid IANA time zone");
    expect(mockApiRequest).not.toHaveBeenCalled();

    await expect(
      calculateBusinessDesk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        ...input,
        timeZoneVersion: 0
      })
    ).rejects.toThrow("authoritative workspace time-zone version");
    expect(mockApiRequest).not.toHaveBeenCalled();
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

  it("reads one exact authorized revision without searching or substituting", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        revision: {
          recordId: "quote/1",
          revisionNumber: 17,
          snapshot: { title: "Exact historical quote" }
        }
      }
    });

    await expect(
      getBusinessDeskRevision(COMMERCIAL_BUSINESS_DESK_WORKSPACE, "quote/1", 17)
    ).resolves.toMatchObject({ revisionNumber: 17 });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/business-desk/quote%2F1/revisions/17"
    );
  });

  it("rejects a mismatched exact-revision response instead of substituting it", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        revision: {
          recordId: "quote/1",
          revisionNumber: 16,
          snapshot: { title: "Wrong revision" }
        }
      }
    });

    await expect(
      getBusinessDeskRevision(COMMERCIAL_BUSINESS_DESK_WORKSPACE, "quote/1", 17)
    ).rejects.toThrow("exact Business Desk revision response was invalid");
  });

  it("loads every record page without exposing the disabled implicit export", async () => {
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
      });

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
  });

  it("prepares one exact reviewed Expense batch and validates its audit receipt", async () => {
    const first = { recordId: "507f191e810c19729de86020", expectedVersion: 3 };
    const second = { recordId: "507f191e810c19729de86021", expectedVersion: 5 };
    const recordPins = [first, second].map((record) => ({
      recordId: record.recordId,
      recordKind: "expense" as const,
      version: record.expectedVersion,
      snapshotDigest: "a".repeat(64)
    }));
    const artifact = {
      mode: "csv" as const,
      contentType: "text/csv; charset=utf-8" as const,
      filename: "expenses-2-reviewed.csv",
      content: '"section","field"\r\n',
      checksumSha256: "b".repeat(64),
      rowCount: 22,
      recordCount: 2,
      deliveryStatus: "not_observed" as const
    };
    const packet = {
      artifact,
      recordPins,
      receipt: {
        _id: "export-receipt-1",
        exportKind: "expense_csv_batch" as const,
        recordPins,
        preparedArtifact: artifact
      },
      idempotentReplay: false
    };
    mockApiRequest.mockResolvedValue({ success: true, data: packet });

    await expect(
      prepareBusinessDeskExpenseBatchCsv(
        { workspaceType: "facility", facilityId: "facility/1" },
        {
          records: [second, first],
          idempotencyKey: "expense-batch-operation-1"
        }
      )
    ).resolves.toEqual(packet);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facility/facility%2F1/business-desk/exports/expenses/prepare-csv",
      {
        method: "POST",
        body: {
          records: [first, second],
          idempotencyKey: "expense-batch-operation-1"
        }
      }
    );

    mockApiRequest.mockResolvedValueOnce({
      data: {
        ...packet,
        artifact: { ...artifact, deliveryStatus: "delivered" }
      }
    });
    await expect(
      prepareBusinessDeskExpenseBatchCsv(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        records: [first, second],
        idempotencyKey: "expense-batch-operation-2"
      })
    ).rejects.toThrow("prepared Expense export response was invalid");
  });

  it("rejects duplicate or malformed Expense batch selections before the API call", async () => {
    const record = { recordId: "507f191e810c19729de86020", expectedVersion: 3 };
    await expect(
      prepareBusinessDeskExpenseBatchCsv(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        records: [record, record],
        idempotencyKey: "duplicate-expense-batch"
      })
    ).rejects.toThrow("unique saved revision");
    await expect(
      prepareBusinessDeskExpenseBatchCsv(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        records: [{ recordId: "not-an-object-id", expectedVersion: 0 }],
        idempotencyKey: "malformed-expense-batch"
      })
    ).rejects.toThrow("unique saved revision");
    expect(mockApiRequest).not.toHaveBeenCalled();
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
