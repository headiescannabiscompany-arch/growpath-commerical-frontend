import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import MarketplaceScreen, {
  createStyles,
  MarketplaceDetailContent
} from "@/screens/MarketplaceScreen";

const realMarketplaceApi = jest.requireActual("@/api/marketplace");

const mockBrowseMarketplace = jest.fn();
const mockDownloadMarketplaceContent = jest.fn();
const mockGetPurchaseStatus = jest.fn();
const mockGetMarketplacePurchases = jest.fn();
const mockOpenAuthorizedExternalUrl = jest.fn();
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "buyer-1" } }) }));
jest.mock("@/utils/marketplaceDownload", () => ({
  downloadAndSaveMarketplaceContent: (...args) => mockDownloadMarketplaceContent(...args)
}));

jest.mock("@/api/marketplace", () => ({
  browseMarketplace: (...args) => mockBrowseMarketplace(...args),
  getMarketplaceContent: jest.fn(),
  getPurchaseStatus: (...args) => mockGetPurchaseStatus(...args),
  purchaseContent: jest.fn(),
  searchContent: jest.fn()
}));

jest.mock("@/api/marketplaceBuyer", () => ({
  downloadMarketplaceContent: (...args) => mockDownloadMarketplaceContent(...args),
  getMarketplacePurchases: (...args) => mockGetMarketplacePurchases(...args),
  marketplaceDownloadUrl: (response) => response?.downloadUrl || ""
}));

jest.mock("@/utils/openAuthorizedExternalUrl", () => ({
  openAuthorizedExternalUrl: (...args) => mockOpenAuthorizedExternalUrl(...args)
}));

describe("Marketplace compatibility screen copy", () => {
  beforeEach(() => {
    mockBrowseMarketplace.mockReset();
    mockDownloadMarketplaceContent.mockReset();
    mockGetPurchaseStatus.mockReset();
    mockGetMarketplacePurchases.mockReset();
    mockOpenAuthorizedExternalUrl.mockReset();
    mockBrowseMarketplace.mockResolvedValue({ data: [] });
    mockGetPurchaseStatus.mockResolvedValue({
      isPurchased: true,
      paymentStatus: "paid"
    });
    mockGetMarketplacePurchases.mockResolvedValue({
      purchases: [
        {
          purchaseId: "purchase-1",
          purchasedAt: "2026-09-04T12:00:00.000Z",
          upload: { id: "offer-owned", title: "Owned grow worksheet", price: 12 }
        }
      ],
      pagination: { page: 1, pages: 1, total: 1 }
    });
    mockDownloadMarketplaceContent.mockResolvedValue({
      downloadUrl: "https://downloads.example/offer-owned"
    });
    mockOpenAuthorizedExternalUrl.mockResolvedValue(undefined);
  });

  it("presents the compatibility route as Storefront Offers", async () => {
    const screen = render(<MarketplaceScreen />);

    await waitFor(() => expect(screen.getByText("Storefront Offers")).toBeTruthy());

    expect(screen.getByPlaceholderText("Search storefront offers...")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Storefront Offers" })).toHaveProp(
      "aria-level",
      1
    );
    expect(
      screen.getByRole("header", { name: "No storefront offers found." })
    ).toHaveProp("aria-level", 2);
    expect(
      screen.getByText("Browse storefront offers from compatibility offer endpoints.")
    ).toBeTruthy();
    expect(screen.queryByText("Marketplace")).toBeNull();
    expect(screen.queryByText(/creator content/i)).toBeNull();
    expect(screen.queryByPlaceholderText("Search marketplace...")).toBeNull();
  });

  it("verifies a Checkout return without creating another purchase", async () => {
    const screen = render(
      <MarketplaceScreen
        route={{ params: { checkout: "success", content: "offer-1" } }}
      />
    );

    await waitFor(() => expect(mockGetPurchaseStatus).toHaveBeenCalledWith("offer-1"));
    expect(
      await screen.findByText(
        "Payment confirmed. This storefront offer is available in your library."
      )
    ).toBeTruthy();
  });

  it("uses the active palette for the directory and loaded offer states", () => {
    const palette = {
      surface: "#151D27",
      surfaceMuted: "#1A2330",
      border: "#283545",
      text: "#F4F7FB",
      textMuted: "#C9D4DF",
      textSoft: "#DEE7F0",
      accent: "#78AAFF",
      accentSoft: "#16263A",
      accentText: "#FFFFFF",
      link: "#78AAFF"
    };
    const styles = createStyles(palette);

    expect(styles.header.color).toBe(palette.text);
    expect(styles.search).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.filterBtn.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.card.backgroundColor).toBe(palette.surface);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.detailBody.color).toBe(palette.textSoft);
    expect(styles.purchaseButton.backgroundColor).toBe(palette.accent);
  });

  it("uses storefront offer checkout labels in the detail content", () => {
    const paid = render(
      <MarketplaceDetailContent
        item={{ id: "offer-1", title: "NPK Workshop", price: 12 }}
        onPurchase={jest.fn()}
        purchasing={false}
      />
    );

    expect(paid.getByLabelText("Start storefront offer checkout")).toBeTruthy();
    expect(paid.queryByLabelText("Start marketplace checkout")).toBeNull();
  });

  it("loads the authenticated purchased library and authorizes its download", async () => {
    const screen = render(<MarketplaceScreen />);
    await screen.findByText("Storefront Offers");

    fireEvent.press(screen.getByLabelText("View purchased storefront offers"));

    await waitFor(() => expect(mockGetMarketplacePurchases).toHaveBeenCalledWith(1, 20));
    expect(screen.getByText("Owned grow worksheet")).toBeTruthy();
    expect(screen.getByText(/confirmed purchases/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Download Owned grow worksheet"));
    await waitFor(() =>
      expect(mockDownloadMarketplaceContent).toHaveBeenCalledWith("offer-owned", {
        signal: expect.any(AbortSignal),
        allowLegacyExternal: false
      })
    );
    expect(mockOpenAuthorizedExternalUrl).not.toHaveBeenCalled();
  });

  it("keeps compatibility sales summary fallback copy storefront-oriented", () => {
    const summary = realMarketplaceApi.buildSalesSummary([
      { id: "offer-1", sales: 1, revenue: 24 }
    ]);

    expect(summary.recentSales[0]).toMatchObject({
      title: "Storefront offer",
      buyer: "Storefront customer"
    });
    expect(JSON.stringify(summary)).not.toMatch(/Marketplace/i);
  });
});
