import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import MarketplaceDetailScreen from "@/screens/MarketplaceDetailScreen";

const mockGetMarketplaceContent = jest.fn();
const mockGetPurchaseStatus = jest.fn();
const mockReportPaymentIssue = jest.fn();
const mockRequestRefund = jest.fn();

jest.mock("@/api/marketplace", () => ({
  getMarketplaceContent: (...args: any[]) => mockGetMarketplaceContent(...args),
  getPurchaseStatus: (...args: any[]) => mockGetPurchaseStatus(...args),
  purchaseContent: jest.fn(),
  reportMarketplacePaymentIssue: (...args: any[]) => mockReportPaymentIssue(...args),
  requestMarketplaceRefund: (...args: any[]) => mockRequestRefund(...args)
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
    mockGetMarketplaceContent.mockResolvedValue({
      id: "market-1",
      title: "Exact paid Marketplace guide"
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
});
