import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import MarketplaceDetailScreen from "@/screens/MarketplaceDetailScreen";

const mockGetMarketplaceContent = jest.fn();
const mockGetPurchaseStatus = jest.fn();
const mockReportPaymentIssue = jest.fn();
const mockRequestRefund = jest.fn();
const mockDownloadMarketplaceContent = jest.fn();
const mockOpenAuthorizedExternalUrl = jest.fn();
const mockPurchase = jest.fn();
let mockUser = { id: "buyer-1" };
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/utils/marketplaceDownload", () => ({
  downloadAndSaveMarketplaceContent: (...args: any[]) =>
    mockDownloadMarketplaceContent(...args)
}));

jest.mock("@/api/marketplace", () => ({
  getMarketplaceContent: (...args: any[]) => mockGetMarketplaceContent(...args),
  getPurchaseStatus: (...args: any[]) => mockGetPurchaseStatus(...args),
  purchaseContent: (...args: any[]) => mockPurchase(...args),
  reportMarketplacePaymentIssue: (...args: any[]) => mockReportPaymentIssue(...args),
  requestMarketplaceRefund: (...args: any[]) => mockRequestRefund(...args)
}));

jest.mock("@/api/marketplaceBuyer", () => ({
  downloadMarketplaceContent: (...args: any[]) => mockDownloadMarketplaceContent(...args),
  marketplaceDownloadUrl: (response: any) => response?.downloadUrl || ""
}));

jest.mock("@/utils/openAuthorizedExternalUrl", () => ({
  openAuthorizedExternalUrl: (...args: any[]) => mockOpenAuthorizedExternalUrl(...args)
}));

jest.mock("@/screens/MarketplaceScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    MarketplaceDetailContent: ({ item }: any) =>
      React.createElement(Text, null, item.title)
  };
});

jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockScreenContainer({ children }: any) {
    return React.createElement(View, null, children);
  };
});

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});

describe("MarketplaceDetailScreen payment support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: "buyer-1" };
    mockGetMarketplaceContent.mockResolvedValue({
      id: "market-1",
      title: "Exact paid Marketplace guide",
      price: 18,
      deliveryReady: true
    });
    mockGetPurchaseStatus.mockResolvedValue({
      recordId: "507f191e810c19729de86001",
      paymentStatus: "paid",
      amountCents: 1800,
      currency: "usd",
      refundedAmountCents: 200,
      refundRequestStatus: "none",
      refundLifecycleStatus: "partial",
      disputeReportStatus: "none",
      providerDisputeStatus: "none",
      connectRecoveryStatus: "not_attempted"
    });
    mockRequestRefund.mockResolvedValue({ accepted: true });
    mockReportPaymentIssue.mockResolvedValue({ accepted: true });
    mockDownloadMarketplaceContent.mockResolvedValue({
      downloadUrl: "https://downloads.example/market-1"
    });
    mockOpenAuthorizedExternalUrl.mockResolvedValue(undefined);
  });

  test("submits a support report for the exact paid Marketplace record", async () => {
    const screen = render(
      <MarketplaceDetailScreen
        route={{ params: { id: "market-1" } }}
        navigation={{ goBack: jest.fn() }}
      />
    );

    await screen.findByText("Exact paid Marketplace guide");
    await waitFor(() => expect(mockGetPurchaseStatus).toHaveBeenCalledWith("market-1"));
    fireEvent.press(screen.getByLabelText("Open payment support"));
    fireEvent.changeText(
      screen.getByLabelText("Payment issue reason"),
      "This payment needs a separate GrowPath support review."
    );
    fireEvent.press(screen.getByText("Report payment issue"));

    await waitFor(() =>
      expect(mockReportPaymentIssue).toHaveBeenCalledWith("market-1", {
        recordId: "507f191e810c19729de86001",
        expectedRefundedAmountCents: 200,
        reason: "This payment needs a separate GrowPath support review."
      })
    );
    expect(
      screen.getByText(/does not open a bank, card-network, or Stripe dispute/i)
    ).toBeTruthy();
  });

  test("opens a download only through the server-authorized delivery endpoint", async () => {
    mockGetPurchaseStatus.mockResolvedValue({
      recordId: "507f191e810c19729de86001",
      paymentStatus: "paid",
      amountCents: 1800,
      currency: "usd",
      refundedAmountCents: 0,
      refundRequestStatus: "none",
      disputeReportStatus: "none",
      canDownload: true
    });
    const screen = render(
      <MarketplaceDetailScreen
        route={{ params: { id: "market-1" } }}
        navigation={{ goBack: jest.fn() }}
      />
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Download storefront offer")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Download storefront offer"));

    await waitFor(() =>
      expect(mockDownloadMarketplaceContent).toHaveBeenCalledWith("market-1", {
        signal: expect.any(AbortSignal),
        allowLegacyExternal: false
      })
    );
    expect(mockOpenAuthorizedExternalUrl).not.toHaveBeenCalled();
  });
  test.each([null, { id: "different", price: 12 }, new Error("Not found")])(
    "missing/failed/mismatched detail cannot start checkout",
    async (result) => {
      if (result instanceof Error)
        mockGetMarketplaceContent.mockRejectedValueOnce(result);
      else mockGetMarketplaceContent.mockResolvedValueOnce(result);
      const screen = render(
        <MarketplaceDetailScreen route={{ params: { id: "market-1" } }} navigation={{}} />
      );
      await screen.findAllByText("Storefront offer not found.");
      const purchase = screen.getByLabelText("Start storefront offer checkout");
      expect(purchase).toBeDisabled();
      fireEvent.press(purchase);
      expect(mockPurchase).not.toHaveBeenCalled();
    }
  );
  test("unverified paid legacy delivery blocks checkout", async () => {
    mockGetMarketplaceContent.mockResolvedValueOnce({
      id: "market-1",
      title: "Legacy paid",
      price: 12,
      fileUrl: "https://example.test/file"
    });
    const screen = render(
      <MarketplaceDetailScreen route={{ params: { id: "market-1" } }} navigation={{}} />
    );
    await screen.findByText("Legacy paid");
    expect(screen.getByLabelText("Start storefront offer checkout")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("Start storefront offer checkout"));
    expect(mockPurchase).not.toHaveBeenCalled();
  });
  test("account switch aborts in-flight download and clears the previous buyer", async () => {
    mockGetPurchaseStatus.mockResolvedValueOnce({ canDownload: true });
    mockDownloadMarketplaceContent.mockImplementationOnce(() => new Promise(() => {}));
    const props = { route: { params: { id: "market-1" } }, navigation: {} };
    const screen = render(<MarketplaceDetailScreen {...props} />);
    fireEvent.press(await screen.findByLabelText("Download storefront offer"));
    const signal = mockDownloadMarketplaceContent.mock.calls[0][1].signal;
    mockUser = { id: "buyer-2" };
    mockGetPurchaseStatus.mockResolvedValue({ canDownload: false });
    screen.rerender(<MarketplaceDetailScreen {...props} />);
    await screen.findByText("Exact paid Marketplace guide");
    expect(signal.aborted).toBe(true);
    expect(screen.queryByLabelText("Download storefront offer")).toBeNull();
  });
});
