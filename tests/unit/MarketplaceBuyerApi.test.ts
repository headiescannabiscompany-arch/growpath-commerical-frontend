const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

import {
  downloadMarketplaceContent,
  getMarketplaceBuyerStatus,
  getMarketplacePurchases,
  marketplaceBuyerState,
  marketplaceDownloadUrl
} from "@/api/marketplaceBuyer";

describe("marketplace buyer API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("treats only explicit server buyer fields as entitlement", async () => {
    expect(marketplaceBuyerState({ status: "active", price: 20 })).toBe("unknown");
    expect(marketplaceBuyerState({ purchaseStatus: "processing" })).toBe("pending");
    expect(
      marketplaceBuyerState({
        entitled: false,
        hasAccess: false,
        paymentStatus: "paid"
      })
    ).toBe("pending");
    expect(marketplaceBuyerState({ entitlement: { canDownload: true } })).toBe(
      "confirmed"
    );
    expect(marketplaceBuyerState({ paymentStatus: "refunded" })).toBe("terminal");
    expect(marketplaceBuyerState({ entitled: true, paymentStatus: "refunded" })).toBe(
      "terminal"
    );

    mockApiRequest.mockResolvedValue({
      uploadId: "offer-1",
      entitled: true,
      paymentStatus: "paid"
    });
    await expect(getMarketplaceBuyerStatus("offer-1")).resolves.toMatchObject({
      state: "confirmed",
      content: { uploadId: "offer-1" }
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/marketplace/offer-1/purchase-status",
      { method: "GET" }
    );
  });

  it("posts to the paid/free download endpoint and extracts its authorized URL", async () => {
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
      pagination: { page: 1, totalPages: 1 }
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
