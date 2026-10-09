import React from "react";
import { render } from "@testing-library/react-native";

import AccountBillingRoute from "@/app/account/billing";
import PersonalBillingRoute from "@/app/home/personal/(tabs)/profile/billing";

const mockCan = jest.fn();
const mockBillingHome = jest.fn();
const mockScreenBoundary = jest.fn();
let mockFrom: string | undefined;
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ from: mockFrom }) }));

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
    mockFrom = undefined;
  });

  it("only gives Personal Billing an explicit More return without changing payout eligibility", () => {
    mockFrom = "personal-more";
    mockCan.mockReturnValue(false);
    render(<Route />);
    expect(mockBillingHome).toHaveBeenCalledWith({ showCreatorPayouts: false });
    expect(mockScreenBoundary).toHaveBeenCalledWith(
      expect.objectContaining({
        backFallbackHref:
          _name === "Personal profile" ? "/home/personal/more" : backFallbackHref,
        ...(_name === "Personal profile" ? { preferBackFallback: true } : {})
      })
    );
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
