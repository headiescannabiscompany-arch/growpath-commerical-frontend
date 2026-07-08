import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import MarketplaceScreen, { MarketplaceDetailContent } from "@/screens/MarketplaceScreen";

const realMarketplaceApi = jest.requireActual("@/api/marketplace");

const mockBrowseMarketplace = jest.fn();

jest.mock("@/api/marketplace", () => ({
  browseMarketplace: (...args) => mockBrowseMarketplace(...args),
  getMarketplaceContent: jest.fn(),
  purchaseContent: jest.fn(),
  searchContent: jest.fn()
}));

describe("Marketplace compatibility screen copy", () => {
  beforeEach(() => {
    mockBrowseMarketplace.mockReset();
    mockBrowseMarketplace.mockResolvedValue({ data: [] });
  });

  it("presents the compatibility route as Storefront Offers", async () => {
    const screen = render(<MarketplaceScreen />);

    await waitFor(() => expect(screen.getByText("Storefront Offers")).toBeTruthy());

    expect(screen.getByPlaceholderText("Search storefront offers...")).toBeTruthy();
    expect(screen.getByText("Browse storefront offers from compatibility offer endpoints.")).toBeTruthy();
    expect(screen.queryByText("Marketplace")).toBeNull();
    expect(screen.queryByText(/creator content/i)).toBeNull();
    expect(screen.queryByPlaceholderText("Search marketplace...")).toBeNull();
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
