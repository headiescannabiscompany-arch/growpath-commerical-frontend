import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import AdminPayoutsScreen from "@/screens/AdminPayoutsScreen";
import CreatorPayoutScreen from "@/screens/CreatorPayoutScreen";
import EarningsScreen from "@/screens/EarningsScreen";

const mockGetEarnings = jest.fn();
const mockGetPayoutHistory = jest.fn();
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
  getEarnings: (...args) => mockGetEarnings(...args),
  getPayoutHistory: (...args) => mockGetPayoutHistory(...args)
}));

jest.mock("@/api/earnings", () => ({
  getMyEarnings: (...args) => mockGetMyEarnings(...args),
  getEarningsByCourse: (...args) => mockGetEarningsByCourse(...args)
}));

jest.mock("@/components/account/StripeConnectPayoutCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockStripeConnectPayoutCard() {
    return React.createElement(Text, null, "Stripe payout readiness");
  };
});

function safeLedger() {
  return {
    earnings: [
      {
        id: "earning-1",
        amount: 85,
        earningStatus: "available",
        bankPayoutStatus: "verify_in_stripe",
        createdAt: "2026-09-02T10:00:00.000Z"
      }
    ],
    stats: {
      estimatedSellerNet: "85.00",
      heldOrAdjustmentPending: "0.00",
      totalPaidOut: null,
      pendingPayout: null,
      totalSales: 1
    },
    payoutManagement: {
      provider: "stripe_connect",
      bankPayoutStatusSource: "stripe_dashboard",
      localPayoutRequestsSupported: false
    }
  };
}

describe("provider-backed payout screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEarnings.mockResolvedValue(safeLedger());
    mockGetMyEarnings.mockResolvedValue(safeLedger());
    mockGetEarningsByCourse.mockResolvedValue([]);
    mockGetPayoutHistory.mockResolvedValue([]);
  });

  it("uses the safe earnings ledger and exposes no local payout request", async () => {
    const screen = render(<CreatorPayoutScreen />);

    expect(await screen.findAllByText("$85.00")).toHaveLength(2);
    expect(screen.getByText("Bank Payout Status")).toBeTruthy();
    expect(screen.queryByText(/Request Payout/i)).toBeNull();
    expect(mockGetEarnings).toHaveBeenCalledTimes(1);
  });

  it("keeps earnings separate from Stripe bank-payout state", async () => {
    const screen = render(<EarningsScreen />);

    expect(await screen.findByText("Estimated Seller Net")).toBeTruthy();
    expect(screen.getByText("Bank Payout Status")).toBeTruthy();
    expect(screen.getByText("Bank payout: verify in Stripe")).toBeTruthy();
    expect(screen.queryByText(/Request Payout/i)).toBeNull();
  });

  it("keeps Admin payout history read-only and flags legacy markers as unverified", async () => {
    mockGetPayoutHistory.mockResolvedValue([
      {
        id: "legacy-earning",
        amount: 25,
        paidOut: true,
        status: "paid",
        createdAt: "2026-09-02T10:00:00.000Z"
      }
    ]);
    const screen = render(<AdminPayoutsScreen />);

    await waitFor(() => expect(mockGetPayoutHistory).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Legacy local paid marker — unverified/)).toBeTruthy();
    expect(screen.getByText("Bank payout: verify in Stripe")).toBeTruthy();
    expect(screen.queryByText("Mark as Paid")).toBeNull();
  });
});
