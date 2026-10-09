import { apiRequest } from "@/api/apiRequest";
import { getWorkspaceGrow } from "@/features/grows/workspaceData";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));
const request = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => {
  request.mockReset();
  jest.spyOn(Date, "now").mockReturnValue(1791554400000);
});

describe("Commercial selected-grow export verification", () => {
  it.each([
    { grow: { _id: "older-grow", name: "Older saved grow" } },
    { commercialGrow: { _id: "older-grow", name: "Older saved grow" } },
    { data: { grow: { _id: "older-grow", name: "Older saved grow" } } },
    { data: { _id: "older-grow", name: "Older saved grow" } }
  ])(
    "reuses the exact owner endpoint and normalizes its verified identity: %p",
    async (response) => {
      request.mockResolvedValueOnce(response);
      await expect(
        getWorkspaceGrow("commercial", "older-grow", { verifyRecords: true })
      ).resolves.toEqual({
        id: "older-grow",
        _id: "older-grow",
        name: "Older saved grow"
      });
      expect(request).toHaveBeenCalledTimes(1);
      expect(request).toHaveBeenCalledWith("/api/commercial/grows/older-grow", {
        method: "GET",
        cache: "no-store",
        params: { _fresh: "1791554400000" }
      });
    }
  );

  it.each([
    null,
    undefined,
    {},
    [],
    "unavailable",
    { grow: null },
    { grow: {} },
    { grow: [] },
    { grow: { id: "another-grow" } },
    { grow: { id: "older-grow", _id: "another-grow" } },
    { grow: { id: "older-grow", name: {} } },
    { success: false, grow: { id: "older-grow" } },
    { grow: { id: "older-grow" }, data: { error: "private failure detail" } },
    { grow: null, commercialGrow: { id: "older-grow" } },
    { data: { grow: null, id: "older-grow" } }
  ])("rejects missing, foreign, malformed or failed exact data: %p", async (response) => {
    request.mockResolvedValueOnce(response);
    await expect(
      getWorkspaceGrow("commercial", "older-grow", { verifyRecords: true })
    ).rejects.toThrow("Selected grow could not be verified. Please retry.");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("propagates endpoint access failures without a list or another-workspace fallback", async () => {
    const failure = Object.assign(new Error("not available"), { status: 404 });
    request.mockRejectedValueOnce(failure);
    await expect(
      getWorkspaceGrow("commercial", "older-grow", { verifyRecords: true })
    ).rejects.toBe(failure);
    expect(request).toHaveBeenCalledTimes(1);
    await expect(
      getWorkspaceGrow("commercial", "", { verifyRecords: true })
    ).rejects.toThrow(/could not be verified/);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("preserves the default helper's legacy aliases, permissive identity and null result", async () => {
    request
      .mockResolvedValueOnce({ grow: null, commercialGrow: { _id: "legacy-grow" } })
      .mockResolvedValueOnce({});
    await expect(getWorkspaceGrow("commercial", "requested-grow")).resolves.toEqual({
      id: "legacy-grow",
      _id: "legacy-grow"
    });
    await expect(getWorkspaceGrow("commercial", "requested-grow")).resolves.toBeNull();
    await expect(getWorkspaceGrow("commercial", "")).resolves.toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("leaves the Personal helper unchanged without a detail or archived read", async () => {
    request.mockResolvedValueOnce({
      grows: [{ _id: "personal-grow", name: "Saved grow" }]
    });
    await expect(
      getWorkspaceGrow("personal", "personal-grow", { verifyRecords: true })
    ).resolves.toEqual({ _id: "personal-grow", name: "Saved grow" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("/api/personal/grows", { params: undefined });
  });
});
