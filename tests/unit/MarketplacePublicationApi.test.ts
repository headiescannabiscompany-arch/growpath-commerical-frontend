const mockApiRequest = jest.fn();
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));
import { setMarketplacePublication } from "@/api/marketplace";

describe("owner offer publication API", () => {
  beforeEach(() => jest.resetAllMocks());
  it.each([true, false])(
    "saves only the explicit publication state %s through the existing owner endpoint",
    async (isPublished) => {
      const saved = { _id: "offer 1", isPublished };
      mockApiRequest.mockResolvedValue({ data: saved });
      await expect(setMarketplacePublication("offer 1", isPublished)).resolves.toEqual(
        saved
      );
      expect(mockApiRequest).toHaveBeenCalledWith("/api/marketplace/offer%201", {
        method: "PUT",
        body: { isPublished }
      });
      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    }
  );
  it("rejects missing identities and implicit visibility before making requests", async () => {
    await expect(setMarketplacePublication("", true)).rejects.toThrow("saved offer");
    await expect(setMarketplacePublication("offer-1", "true" as any)).rejects.toThrow(
      "explicit publication"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
  it("preserves a server failure instead of claiming a saved publication", async () => {
    mockApiRequest.mockRejectedValue(new Error("Not the owner"));
    await expect(setMarketplacePublication("offer-1", true)).rejects.toThrow(
      "Not the owner"
    );
  });
});
