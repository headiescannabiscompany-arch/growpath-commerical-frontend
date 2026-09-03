import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import MarketplaceScreen, {
  createStyles,
  MarketplaceDetailContent
} from "@/screens/MarketplaceScreen";

const realMarketplaceApi = jest.requireActual("@/api/marketplace");

const mockBrowseMarketplace = jest.fn();
const mockGetMarketplacePurchases = jest.fn();

jest.mock("@/api/marketplace", () => ({
  browseMarketplace: (...args) => mockBrowseMarketplace(...args),
  getMarketplaceContent: jest.fn(),
  purchaseContent: jest.fn(),
  searchContent: jest.fn()
}));

jest.mock("@/api/marketplaceBuyer", () => ({
  ...jest.requireActual("@/api/marketplaceBuyer"),
  getMarketplacePurchases: (...args) => mockGetMarketplacePurchases(...args)
}));

describe("Marketplace compatibility screen copy", () => {
  beforeEach(() => {
    mockBrowseMarketplace.mockReset();
    mockBrowseMarketplace.mockResolvedValue({ data: [] });
    mockGetMarketplacePurchases.mockReset();
    mockGetMarketplacePurchases.mockResolvedValue({
      pagination: { page: 1, totalPages: 1 },
      purchases: []
    });
  });

  it("loads server-confirmed purchases into the Purchased view", async () => {
    mockGetMarketplacePurchases.mockResolvedValue({
      pagination: { page: 1, totalPages: 1 },
      purchases: [
        {
          purchaseId: "purchase-1",
          purchasedAt: "2026-09-02T10:00:00.000Z",
          upload: { id: "offer-1", title: "Protected worksheet", price: 12 }
        }
      ]
    });
    const screen = render(<MarketplaceScreen />);
    await screen.findByText("Storefront Offers");

    fireEvent.press(screen.getByLabelText("View purchased storefront offers"));

    expect(await screen.findByText("Protected worksheet")).toBeTruthy();
    expect(mockGetMarketplacePurchases).toHaveBeenCalledWith(1, 20);
    expect(
      screen.getByText(
        "Your server-confirmed purchases. Downloads are authorized when opened."
      )
    ).toBeTruthy();
    screen.unmount();
  });

  it("presents the compatibility route as Storefront Offers", async () => {
    const screen = render(<MarketplaceScreen />);

    await waitFor(() => expect(screen.getByText("Storefront Offers")).toBeTruthy());

    expect(screen.getByPlaceholderText("Search storefront offers...")).toBeTruthy();
    expect(screen.getByLabelText("View purchased storefront offers")).toBeTruthy();
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

  it("exposes the server-authorized download without enabling an unconfirmed paid item", () => {
    const paid = render(
      <MarketplaceDetailContent
        item={{ id: "offer-1", title: "NPK Workshop", price: 12 }}
        onDownload={jest.fn()}
        onPurchase={jest.fn()}
        purchasing={false}
      />
    );
    expect(paid.getByLabelText("Download storefront offer")).toBeDisabled();
    expect(paid.getByText("Download Locked")).toBeTruthy();

    const free = render(
      <MarketplaceDetailContent
        item={{ id: "offer-2", title: "Free worksheet", price: 0 }}
        onDownload={jest.fn()}
        onPurchase={jest.fn()}
        purchasing={false}
      />
    );
    expect(free.getByLabelText("Download storefront offer")).toBeEnabled();
    expect(free.getByText("Download Item")).toBeTruthy();
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
