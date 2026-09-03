import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking, Text } from "react-native";

import AdminPayoutsScreen from "@/screens/AdminPayoutsScreen";
import CreatorPayoutScreen from "@/screens/CreatorPayoutScreen";
import EarningsScreen from "@/screens/EarningsScreen";

const mockGetPayoutSummary = jest.fn();
const mockGetPayoutHistory = jest.fn();
const mockGetConnectPayoutStatus = jest.fn();
const mockCreateConnectPayoutDashboardLink = jest.fn();
const mockGetMyEarnings = jest.fn();
const mockGetEarningsByCourse = jest.fn();

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    CREATOR_EARNINGS_VIEW: "CREATOR_EARNINGS_VIEW",
    CREATOR_PAYOUT_REQUEST: "CREATOR_PAYOUT_REQUEST",
    CREATOR_PAYOUT_ADMIN: "CREATOR_PAYOUT_ADMIN"
  },
  useEntitlements: () => ({ can: () => true })
}));

jest.mock("@/api/creator.js", () => ({
  getPayoutSummary: (...args) => mockGetPayoutSummary(...args),
  getPayoutHistory: (...args) => mockGetPayoutHistory(...args),
  getConnectPayoutStatus: (...args) => mockGetConnectPayoutStatus(...args),
  createConnectPayoutDashboardLink: (...args) =>
    mockCreateConnectPayoutDashboardLink(...args)
}));

jest.mock("@/api/earnings", () => ({
  getMyEarnings: (...args) => mockGetMyEarnings(...args),
  getEarningsByCourse: (...args) => mockGetEarningsByCourse(...args),
  getConnectPayoutStatus: (...args) => mockGetConnectPayoutStatus(...args),
  createConnectPayoutDashboardLink: (...args) =>
    mockCreateConnectPayoutDashboardLink(...args)
}));

describe("provider-backed payout screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPayoutSummary.mockResolvedValue({
      totalEarned: 85,
      estimatedSellerNet: 85,
      heldOrAdjustmentPending: 0
    });
    mockGetPayoutHistory.mockResolvedValue({ items: [] });
    mockGetConnectPayoutStatus.mockResolvedValue({
      status: { connected: true, payoutsEnabled: true }
    });
    mockCreateConnectPayoutDashboardLink.mockResolvedValue({
      url: "https://connect.stripe.com/express/acct_test"
    });
    mockGetMyEarnings.mockResolvedValue({
      earnings: [],
      stats: { totalEarned: 85, totalSales: 1, heldOrAdjustmentPending: 0 }
    });
    mockGetEarningsByCourse.mockResolvedValue([]);
    jest.spyOn(Linking, "openURL").mockResolvedValue();
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
  });

  test("creator payout management renders provider access and no local payout request", async () => {
    const screen = render(<CreatorPayoutScreen />);
    await waitFor(() => expect(mockGetConnectPayoutStatus).toHaveBeenCalled());
    const rendered = screen
      .UNSAFE_getAllByType(Text)
      .flatMap((node) => [node.props.children].flat(Infinity))
      .filter((value) => typeof value === "string")
      .join(" ");

    expect(rendered).toContain("Open Stripe Payouts");
    expect(rendered).toContain("Bank Payout Status");
    expect(rendered).not.toContain("Request Payout");
  });

  test("earnings management opens Stripe and labels bank payout status as provider state", async () => {
    const screen = render(<EarningsScreen />);
    const openButton = await screen.findByText("Open Stripe Payouts");

    expect(screen.getByText("Bank Payout Status")).toBeTruthy();
    expect(screen.queryByText(/Request Payout/)).toBeNull();
    fireEvent.press(openButton);

    await waitFor(() => expect(mockCreateConnectPayoutDashboardLink).toHaveBeenCalled());
  });

  test("admin reconciliation never renders a mark-paid control", async () => {
    mockGetPayoutHistory.mockResolvedValue({
      items: [
        {
          id: "earning-1",
          amount: 85,
          earningStatus: "held",
          createdAt: "2026-09-02T10:00:00.000Z"
        }
      ]
    });
    const screen = render(<AdminPayoutsScreen />);

    expect(await screen.findByText("Status: held")).toBeTruthy();
    expect(screen.queryByText("Mark as Paid")).toBeNull();
    expect(screen.getByText("Bank payout: verify in Stripe")).toBeTruthy();
  });
});
