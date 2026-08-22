import React from "react";
import { render } from "@testing-library/react-native";

import FacilityBillingHome from "@/features/billing/screens/FacilityBillingHome";

const mockUseFacilityBilling = jest.fn();
const mockEntitlements: Record<string, any> = {
  facilityId: "facility-1",
  facilityRole: "STAFF"
};

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    selectedId: "facility-1",
    selected: { id: "facility-1", name: "Triple Bag Genetics" }
  })
}));

jest.mock("@/hooks/useFacilityBilling", () => ({
  useFacilityBilling: (...args: any[]) => mockUseFacilityBilling(...args)
}));

describe("FacilityBillingHome", () => {
  beforeEach(() => {
    mockEntitlements.facilityRole = "STAFF";
    mockUseFacilityBilling.mockReset();
    mockUseFacilityBilling.mockReturnValue({
      billing: {
        status: "active",
        billingSource: "stripe",
        canManageBilling: true,
        canCancelSubscription: true,
        stripeSubscriptionId: "sub_facility",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-09-22T00:00:00.000Z"
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      startCheckout: jest.fn(),
      cancelPlan: jest.fn(),
      isStartingCheckout: false,
      isCanceling: false
    });
  });

  it("shows the selected Facility status without exposing personal billing or mutation to staff", () => {
    const screen = render(<FacilityBillingHome />);

    expect(screen.getByText("Triple Bag Genetics")).toBeTruthy();
    expect(screen.getByText("active")).toBeTruthy();
    expect(screen.getByText(/Your STAFF access is read-only here/)).toBeTruthy();
    expect(screen.queryByLabelText("Cancel Facility renewal")).toBeNull();
    expect(screen.queryByLabelText("Start Facility plan checkout")).toBeNull();
    expect(screen.queryByText(/Plan: pro/i)).toBeNull();
  });

  it("exposes the exact Facility cancellation action to its owner", () => {
    mockEntitlements.facilityRole = "OWNER";

    const screen = render(<FacilityBillingHome />);

    expect(screen.getByLabelText("Cancel Facility renewal")).toBeTruthy();
    expect(screen.queryByText(/read-only here/)).toBeNull();
  });
});
