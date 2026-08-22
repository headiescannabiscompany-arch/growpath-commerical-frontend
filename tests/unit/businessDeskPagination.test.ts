import { loadAllBusinessDeskPages } from "@/api/businessDeskPagination";

describe("Business Desk complete record loading", () => {
  it("loads every cursor page in order", async () => {
    const loadPage = jest
      .fn()
      .mockResolvedValueOnce({
        records: [{ id: "one" }, { id: "two" }],
        page: { hasMore: true, nextCursor: "cursor-2" }
      })
      .mockResolvedValueOnce({
        records: [{ id: "three" }],
        page: { hasMore: false, nextCursor: null }
      });

    await expect(
      loadAllBusinessDeskPages<{ id: string }>(loadPage, {
        maxRecords: 10,
        recordKey: (record) => record.id
      })
    ).resolves.toEqual([{ id: "one" }, { id: "two" }, { id: "three" }]);
    expect(loadPage).toHaveBeenNthCalledWith(1, undefined);
    expect(loadPage).toHaveBeenNthCalledWith(2, "cursor-2");
  });

  it("fails explicitly instead of returning a capped first-page total", async () => {
    const loadPage = jest.fn().mockResolvedValue({
      records: [{ id: "one" }, { id: "two" }],
      page: { hasMore: true, nextCursor: "cursor-2" }
    });

    await expect(
      loadAllBusinessDeskPages<{ id: string }>(loadPage, {
        maxRecords: 2,
        recordKey: (record) => record.id
      })
    ).rejects.toThrow(/more than 2 matching records|pagination cursor was invalid/i);
  });

  it("rejects repeated cursors and records rather than double-counting", async () => {
    const repeatedCursor = jest.fn().mockResolvedValue({
      records: [{ id: "one" }],
      page: { hasMore: true, nextCursor: "same" }
    });
    await expect(
      loadAllBusinessDeskPages<{ id: string }>(repeatedCursor, {
        maxRecords: 10,
        recordKey: (record) => record.id
      })
    ).rejects.toThrow(/changed while all pages|pagination cursor/i);
  });
});
