import React from "react";
import { render } from "@testing-library/react-native";

import BillingAndReportingScreen from "@/screens/facility/BillingAndReportingScreen";

const mockCancelPlan = jest.fn();

jest.mock("@/facility/FacilityProvider", () => ({
  useFacility: () => ({ activeFacilityId: "facility-1" })
}));

jest.mock("@/hooks/useFacilityBilling", () => ({
  useFacilityBilling: () => ({
    billing: {
      status: "active",
      currentPeriodEnd: "2030-05-15T18:30:00.000Z",
      cancelAtPeriodEnd: true
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    startCheckout: jest.fn(),
    cancelPlan: mockCancelPlan,
    isStartingCheckout: false,
    isCanceling: false
  })
}));

jest.mock("@/hooks/useSubscriptionStatus", () => ({
  useSubscriptionStatus: () => ({
    subscription: { status: "active" },
    error: null,
    refetch: jest.fn()
  })
}));

jest.mock("@/hooks/useFacilityReport", () => ({
  useFacilityReport: () => ({
    data: null,
    refetch: jest.fn(),
    isFetching: false
  })
}));

describe("Facility cancellation status", () => {
  it("keeps the plan active through period end without offering repeat cancellation", () => {
    const screen = render(<BillingAndReportingScreen />);

    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("Access through")).toBeTruthy();
    expect(
      screen.getByText(
        "Renewal is canceled. Facility access remains active through this billing period."
      )
    ).toBeTruthy();
    expect(screen.queryByText("Cancel at Period End")).toBeNull();
    expect(screen.queryByText("Subscribe Now")).toBeNull();
    expect(mockCancelPlan).not.toHaveBeenCalled();
  });
});
