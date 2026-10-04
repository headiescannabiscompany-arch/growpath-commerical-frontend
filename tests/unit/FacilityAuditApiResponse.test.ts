import { listAuditLogs } from "@/api/audit";
import { apiRequest } from "@/api/apiRequest";
jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));
describe("audit response validation", () => {
  it.each([
    null,
    {},
    { success: false, data: [] },
    { data: {} },
    [null],
    ["invalid"],
    [[]]
  ])("rejects unavailable envelope %#", async (value) => {
    jest.mocked(apiRequest).mockResolvedValueOnce(value);
    await expect(listAuditLogs("facility-1")).rejects.toThrow(
      "Audit history response is unavailable"
    );
  });
  it.each([[], { data: [] }, { logs: [] }, { items: [] }])(
    "preserves explicit empty collection %#",
    async (value) => {
      jest.mocked(apiRequest).mockResolvedValueOnce(value);
      await expect(listAuditLogs("facility-1")).resolves.toEqual({
        success: true,
        data: []
      });
    }
  );
});
