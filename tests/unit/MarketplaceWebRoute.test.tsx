import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import MarketplaceRoute from "@/app/marketplace";
import { createMarketplaceDetailStyles } from "@/screens/MarketplaceDetailScreen";

let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPurchase = jest.fn();
const mockStatus = jest.fn();
const mockRefund = jest.fn();
const mockDownload = jest.fn();
const mockOpen = jest.fn();
const mockBrowse = jest.fn();
const mockDetail = jest.fn();
const mockOffer = { _id: "offer-web-1", title: "QA paid grow guide", price: 12 };

jest.setTimeout(15000);

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));
jest.mock("@/api/marketplace", () => ({
  browseMarketplace: (...args: unknown[]) => mockBrowse(...args),
  searchContent: (...args: unknown[]) => mockBrowse(...args),
  getMarketplaceContent: (...args: unknown[]) => mockDetail(...args),
  getPurchaseStatus: (...args: unknown[]) => mockStatus(...args),
  purchaseContent: (...args: unknown[]) => mockPurchase(...args),
  requestMarketplaceRefund: (...args: unknown[]) => mockRefund(...args),
  reportMarketplacePaymentIssue: jest.fn()
}));
jest.mock("@/api/marketplaceBuyer", () => ({
  downloadMarketplaceContent: (...args: unknown[]) => mockDownload(...args),
  getMarketplacePurchases: jest.fn(async () => ({ purchases: [] })),
  marketplaceDownloadUrl: (response: { downloadUrl: string }) => response.downloadUrl
}));
jest.mock("@/utils/openAuthorizedExternalUrl", () => ({
  openAuthorizedExternalUrl: (...args: unknown[]) => mockOpen(...args)
}));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});

describe("existing Marketplace web route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockBrowse.mockResolvedValue({ data: [mockOffer], hasMore: false });
    mockDetail.mockResolvedValue(mockOffer);
    mockStatus.mockResolvedValue({
      recordId: "purchase-web-1",
      paymentStatus: "paid",
      amountCents: 1200,
      currency: "usd",
      refundedAmountCents: 0,
      refundRequestStatus: "none",
      disputeReportStatus: "none",
      canDownload: true,
      isPurchased: true
    });
    mockRefund.mockResolvedValue({ accepted: true });
    mockDownload.mockResolvedValue({ downloadUrl: "https://downloads.example/guide" });
  });

  it("opens the existing purchase-aware detail from a web directory card", async () => {
    const screen = render(<MarketplaceRoute />);
    fireEvent.press(await screen.findByText("Open details"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/marketplace",
      params: { content: "offer-web-1" }
    });

    mockParams = { content: "offer-web-1" };
    screen.rerender(<MarketplaceRoute />);
    await screen.findByLabelText("Download storefront offer");
    expect(screen.getByLabelText("Open payment support")).toBeTruthy();
    expect(screen.queryByLabelText("Start storefront offer checkout")).toBeNull();
    expect(mockPurchase).not.toHaveBeenCalled();
    expect(mockStatus).toHaveBeenCalledWith("offer-web-1");

    fireEvent.press(screen.getByLabelText("Download storefront offer"));
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith("offer-web-1"));
    expect(mockOpen).toHaveBeenCalledWith("https://downloads.example/guide");
    fireEvent.press(screen.getByText("Back to offers"));
    expect(mockReplace).toHaveBeenCalledWith("/marketplace");
  });

  it("opens a bookmarked paid offer without starting another checkout", async () => {
    mockParams = { content: "offer-web-1" };
    const screen = render(<MarketplaceRoute />);
    await screen.findByLabelText("Open payment support");
    expect(mockPurchase).not.toHaveBeenCalled();
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("submits refund intake against the exact purchase while partial access remains", async () => {
    mockParams = { content: "offer-web-1" };
    mockStatus.mockResolvedValue({
      recordId: "purchase-web-1",
      paymentStatus: "paid",
      amountCents: 1200,
      currency: "usd",
      refundedAmountCents: 100,
      refundLifecycleStatus: "partial",
      canDownload: true,
      isPurchased: true
    });
    const screen = render(<MarketplaceRoute />);
    fireEvent.press(await screen.findByLabelText("Open payment support"));
    fireEvent.changeText(
      screen.getByLabelText("Refund request reason"),
      "QA remaining purchase refund review."
    );
    fireEvent.press(screen.getByLabelText("Submit refund review request"));
    await waitFor(() =>
      expect(mockRefund).toHaveBeenCalledWith("offer-web-1", {
        recordId: "purchase-web-1",
        expectedRefundedAmountCents: 100,
        reason: "QA remaining purchase refund review."
      })
    );
    expect(screen.getByLabelText("Download storefront offer")).toBeTruthy();
    expect(mockPurchase).not.toHaveBeenCalled();
  });

  it("withholds the download after a fully refunded purchase", async () => {
    mockParams = { content: "offer-web-1" };
    mockStatus.mockResolvedValue({
      recordId: "purchase-web-1",
      paymentStatus: "refunded",
      amountCents: 1200,
      refundedAmountCents: 1200,
      canDownload: false,
      isPurchased: false
    });
    const screen = render(<MarketplaceRoute />);
    await screen.findByText("QA paid grow guide");
    expect(screen.queryByLabelText("Download storefront offer")).toBeNull();
    fireEvent.press(await screen.findByLabelText("Open payment support"));
    expect(screen.getByText(/This payment is fully refunded/)).toBeTruthy();
    expect(screen.getByLabelText("Submit refund review request")).toBeDisabled();
    expect(screen.getByLabelText("Submit payment issue report")).toBeDisabled();
    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockPurchase).not.toHaveBeenCalled();
  });

  it("uses the existing active theme for the reused detail controls", () => {
    const palette = {
      link: "link",
      accent: "accent",
      accentText: "accentText",
      surfaceMuted: "surfaceMuted",
      textSoft: "textSoft",
      textMuted: "textMuted"
    };
    const styles = createMarketplaceDetailStyles(palette);
    expect(styles.link.color).toBe(palette.link);
    expect(styles.button.backgroundColor).toBe(palette.accent);
    expect(styles.buttonText.color).toBe(palette.accentText);
    expect(styles.feedback.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.feedback.color).toBe(palette.textSoft);
    expect(styles.emptyText.color).toBe(palette.textMuted);
  });

  it("preserves the existing read-only successful Checkout return", async () => {
    mockParams = { content: "offer-web-1", checkout: "success" };
    const screen = render(<MarketplaceRoute />);
    await screen.findByText(
      "Payment confirmed. This storefront offer is available in your library."
    );
    expect(mockPurchase).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("preserves the canceled Checkout return without another payment", async () => {
    mockParams = { content: "offer-web-1", checkout: "canceled" };
    const screen = render(<MarketplaceRoute />);
    await screen.findByText("Checkout canceled. No new payment was confirmed.");
    expect(mockPurchase).not.toHaveBeenCalled();
  });
});
