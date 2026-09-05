const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

import {
  downloadMarketplaceContent,
  getMarketplacePurchases,
  marketplaceDownloadUrl
} from "@/api/marketplaceBuyer";

describe("marketplace buyer API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("posts to the server-authorized download endpoint and extracts its URL", async () => {
    mockApiRequest.mockResolvedValue({
      delivery: { fileUrl: "https://downloads.example/offer-1" }
    });

    const response = await downloadMarketplaceContent("offer 1");

    expect(mockApiRequest).toHaveBeenCalledWith("/api/marketplace/offer%201/download", {
      method: "POST"
    });
    expect(marketplaceDownloadUrl(response)).toBe("https://downloads.example/offer-1");
  });

  it("loads the authenticated buyer library without receiving delivery URLs", async () => {
    mockApiRequest.mockResolvedValue({
      purchases: [
        {
          purchaseId: "purchase-1",
          purchasedAt: "2026-09-02T10:00:00.000Z",
          upload: { id: "offer-1", title: "Protected worksheet" }
        }
      ],
      pagination: { page: 1, pages: 1 }
    });

    await expect(getMarketplacePurchases(1, 100)).resolves.toMatchObject({
      purchases: [{ purchaseId: "purchase-1", upload: { id: "offer-1" } }]
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/marketplace/user/purchases", {
      method: "GET",
      params: { page: 1, limit: 50 }
    });
  });
});
