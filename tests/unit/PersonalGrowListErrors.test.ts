const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

import { listPersonalGrows } from "@/api/grows";
import { listWorkspaceGrows } from "@/features/grows/workspaceData";

describe("Grow-management list error boundary", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it.each([401, 503])(
    "preserves HTTP %s through the real workspace adapter",
    async (status) => {
      const failure = Object.assign(new Error("Grow request failed"), { status });
      mockApiRequest.mockRejectedValue(failure);
      await expect(listWorkspaceGrows("personal", { throwOnError: true })).rejects.toBe(
        failure
      );
    }
  );

  it("does not hide an archived-list failure as no archived grows", async () => {
    const failure = new Error("Not authenticated");
    mockApiRequest.mockRejectedValue(failure);
    await expect(listPersonalGrows({ archived: true, throwOnError: true })).rejects.toBe(
      failure
    );
    expect(mockApiRequest).toHaveBeenCalledWith("/api/personal/grows", {
      params: { archived: "true" }
    });
  });

  it.each([[], { grows: [] }, { data: { grows: [] } }])(
    "accepts a genuinely empty successful response: %p",
    async (response) => {
      mockApiRequest.mockResolvedValue(response);
      await expect(
        listWorkspaceGrows("personal", { throwOnError: true })
      ).resolves.toEqual([]);
    }
  );

  it("preserves existing grows and recovers after a failed request", async () => {
    mockApiRequest
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({ grows: [{ id: "existing-grow" }] });
    await expect(listWorkspaceGrows("personal", { throwOnError: true })).rejects.toThrow(
      "Temporary failure"
    );
    await expect(listWorkspaceGrows("personal", { throwOnError: true })).resolves.toEqual(
      [{ id: "existing-grow" }]
    );
  });

  it("rejects an unrecognized successful payload instead of inventing an empty list", async () => {
    mockApiRequest.mockResolvedValue({ unexpected: true });
    await expect(listWorkspaceGrows("personal", { throwOnError: true })).rejects.toThrow(
      "Could not read your grow list"
    );
  });

  it("preserves the legacy optional-picker fallback outside strict grow management", async () => {
    mockApiRequest.mockRejectedValue(new Error("Temporary failure"));
    await expect(listPersonalGrows()).resolves.toEqual([]);
  });
});
