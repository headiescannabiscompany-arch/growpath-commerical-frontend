import React from "react";
import { render } from "@testing-library/react-native";

import AccountBillingRoute from "@/app/account/billing";
import PersonalBillingRoute from "@/app/home/personal/(tabs)/profile/billing";

const mockCan = jest.fn();
const mockBillingHome = jest.fn();
const mockScreenBoundary = jest.fn();

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { COURSES_SELL_PAID: "COURSES_SELL_PAID" },
  useEntitlements: () => ({ can: mockCan })
}));

jest.mock(
  "@/auth/RequireAuthGate",
  () =>
    ({ children }: any) =>
      children
);

jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: (props: any) => {
    mockScreenBoundary(props);
    return props.children;
  }
}));

jest.mock("@/features/billing/screens/BillingHome", () => (props: any) => {
  mockBillingHome(props);
  return null;
});

describe.each([
  ["canonical", AccountBillingRoute, "/account/workspace"],
  ["Personal profile", PersonalBillingRoute, "/home/personal/profile"]
] as const)("%s billing payout eligibility", (_name, Route, backFallbackHref) => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])("passes paid-course seller capability %p", (allowed) => {
    mockCan.mockImplementation(
      (capability: string) => capability === "COURSES_SELL_PAID" && allowed
    );

    render(<Route />);

    expect(mockCan).toHaveBeenCalledWith("COURSES_SELL_PAID");
    expect(mockBillingHome).toHaveBeenCalledWith({ showCreatorPayouts: allowed });
    expect(mockScreenBoundary).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Billing", showBack: true, backFallbackHref })
    );
  });
});
