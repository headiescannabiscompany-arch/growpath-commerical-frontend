import React from "react";
import { render } from "@testing-library/react-native";

import Profile from "@/app/profile";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUser: any = {
  id: "user-1",
  email: "grower@example.com",
  displayName: "Grower",
  role: "user",
  plan: "pro",
  subscriptionStatus: "active",
  emailVerified: true
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: jest.fn(),
    retryMe: jest.fn()
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ plan: "pro", mode: "personal" })
}));

jest.mock("@/api/auth", () => ({ requestEmailVerification: jest.fn() }));
jest.mock("@/api/users", () => ({
  deleteAccount: jest.fn(),
  exportPrivacyData: jest.fn(),
  updateProfile: jest.fn()
}));

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ header, children }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppCard({ children }: any) {
    return React.createElement(View, null, children);
  };
});

jest.mock("@/components/LegalLinks", () => () => null);

function stripeBilling() {
  return {
    plan: "pro",
    status: "active",
    source: "stripe",
    active: true,
    paymentState: "paid",
    paymentKind: "provider",
    billingOwner: "account",
    renews: true,
    cancelAtPeriodEnd: false,
    endsAt: "2099-09-30T12:00:00.000Z",
    paidThrough: "2099-09-30T12:00:00.000Z",
    trialExpiry: null,
    complimentaryExpiresAt: null,
    stripeLinked: true,
    consistency: "consistent",
    actions: {
      canManageBilling: true,
      canCancelSubscription: true,
      canStartCheckout: false,
      canClaimPaidGift: false,
      canClaimComplimentary: false
    }
  };
}

describe("shared Profile billing summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete mockUser.billing;
  });

  it("mounts backend billing truth inside the existing Plan status card", () => {
    mockUser.billing = stripeBilling();
    const screen = render(<Profile />);

    expect(screen.getByText("Plan status")).toBeTruthy();
    expect(screen.getByLabelText("Account billing summary")).toBeTruthy();
    expect(screen.getByText("Source: Stripe")).toBeTruthy();
    expect(screen.getByText("Payment: Paid")).toBeTruthy();
  });

  it("does not invent a billing summary when /api/me did not provide one", () => {
    const screen = render(<Profile />);

    expect(screen.getByText("Plan status")).toBeTruthy();
    expect(screen.queryByLabelText("Account billing summary")).toBeNull();
  });
});
