import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityBillingHome from "@/features/billing/screens/FacilityBillingHome";
import { openExternalUrl } from "@/utils/openExternalUrl";

const mockUseFacilityBilling = jest.fn();
const mockUseRecurringPriceQuotes = jest.fn();
const mockCancelPlan = jest.fn();
const mockRefetch = jest.fn();
const mockStartCheckout = jest.fn();
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

jest.mock("@/hooks/useRecurringPriceQuotes", () => ({
  useRecurringPriceQuotes: () => mockUseRecurringPriceQuotes()
}));

jest.mock("@/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

function facilityQuote(interval: "monthly" | "yearly") {
  const unitAmount = interval === "monthly" ? 10000 : 100000;
  return {
    plan: "facility",
    interval,
    available: true,
    unitAmount,
    currency: "usd",
    formattedAmount: `$${(unitAmount / 100).toFixed(2)}`,
    verifiedAt: "2026-09-04T12:00:00.000Z",
    trialTerms: {
      days: 30,
      eligibility: "account_and_plan_history",
      paymentMethodRequired: true,
      renewsUnlessCanceled: true
    }
  };
}

describe("FacilityBillingHome", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntitlements.facilityRole = "STAFF";
    mockCancelPlan.mockResolvedValue({ ok: true });
    mockRefetch.mockResolvedValue({ data: null });
    mockStartCheckout.mockResolvedValue({
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_facility"
    });
    (openExternalUrl as jest.Mock).mockResolvedValue(undefined);
    mockUseRecurringPriceQuotes.mockReturnValue({
      loading: false,
      ready: true,
      quotes: {
        facility: {
          monthly: facilityQuote("monthly"),
          yearly: facilityQuote("yearly")
        }
      }
    });
    mockUseFacilityBilling.mockReturnValue({
      billing: {
        status: "active",
        billingSource: "stripe",
        canManageBilling: true,
        canCancelSubscription: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-09-22T00:00:00.000Z"
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      startCheckout: mockStartCheckout,
      cancelPlan: mockCancelPlan,
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

  it("cancels only after the inline confirmation in the web-safe interaction flow", async () => {
    mockEntitlements.facilityRole = "OWNER";
    const screen = render(<FacilityBillingHome />);

    fireEvent.press(screen.getByLabelText("Cancel Facility renewal"));
    expect(mockCancelPlan).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Confirm Facility cancellation")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Confirm cancel Facility renewal"));

    await waitFor(() => {
      expect(mockCancelPlan).toHaveBeenCalledTimes(1);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(
          "Facility renewal was canceled. Access remains active through the current billing period."
        )
      ).toBeTruthy();
    });
  });

  it("shows an inline error when Facility cancellation fails", async () => {
    mockEntitlements.facilityRole = "OWNER";
    mockCancelPlan.mockRejectedValueOnce(
      new Error("Facility cancellation could not be confirmed.")
    );
    const screen = render(<FacilityBillingHome />);

    fireEvent.press(screen.getByLabelText("Cancel Facility renewal"));
    fireEvent.press(screen.getByLabelText("Confirm cancel Facility renewal"));

    await waitFor(() =>
      expect(
        screen.getByText("Facility cancellation could not be confirmed.")
      ).toBeTruthy()
    );
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it("requires explicit backend permission before exposing Facility checkout", () => {
    mockEntitlements.facilityRole = "OWNER";
    mockUseFacilityBilling.mockReturnValue({
      billing: {
        plan: "free",
        status: "inactive",
        billingSource: "free",
        canManageBilling: true,
        canCancelSubscription: false,
        canStartCheckout: false
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      startCheckout: jest.fn(),
      cancelPlan: jest.fn(),
      isStartingCheckout: false,
      isCanceling: false
    });

    const blocked = render(<FacilityBillingHome />);
    expect(blocked.queryByLabelText("Start Facility plan checkout")).toBeNull();
    blocked.unmount();

    mockUseFacilityBilling.mockReturnValue({
      billing: {
        plan: "free",
        status: "inactive",
        billingSource: "free",
        canManageBilling: true,
        canCancelSubscription: false,
        canStartCheckout: true
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      startCheckout: jest.fn(),
      cancelPlan: jest.fn(),
      isStartingCheckout: false,
      isCanceling: false
    });

    const allowed = render(<FacilityBillingHome />);
    expect(allowed.getByLabelText("Start Facility plan checkout")).toBeEnabled();
  });

  it("opens only the interval with a verified Facility quote", async () => {
    mockEntitlements.facilityRole = "OWNER";
    mockUseFacilityBilling.mockReturnValue({
      billing: {
        plan: "free",
        status: "inactive",
        billingSource: "free",
        canManageBilling: true,
        canCancelSubscription: false,
        canStartCheckout: true
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      startCheckout: mockStartCheckout,
      cancelPlan: mockCancelPlan,
      isStartingCheckout: false,
      isCanceling: false
    });
    const screen = render(<FacilityBillingHome />);

    expect(screen.getByText("Monthly: $100")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Choose Facility yearly billing"));
    expect(screen.getByText("Yearly: $1,000")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Start Facility plan checkout"));

    await waitFor(() => expect(mockStartCheckout).toHaveBeenCalledWith("yearly"));
    expect(openExternalUrl).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/cs_test_facility"
    );
  });

  it("leaves Facility checkout disabled when its quote is unavailable", () => {
    mockEntitlements.facilityRole = "OWNER";
    mockUseRecurringPriceQuotes.mockReturnValue({
      loading: false,
      ready: false,
      quotes: {}
    });
    mockUseFacilityBilling.mockReturnValue({
      billing: {
        plan: "free",
        status: "inactive",
        billingSource: "free",
        canManageBilling: true,
        canCancelSubscription: false,
        canStartCheckout: true
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      startCheckout: mockStartCheckout,
      cancelPlan: mockCancelPlan,
      isStartingCheckout: false,
      isCanceling: false
    });
    const screen = render(<FacilityBillingHome />);

    expect(
      screen.getByText("Stripe pricing is unavailable. Checkout is disabled.")
    ).toBeTruthy();
    expect(screen.getByLabelText("Start Facility plan checkout")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("Start Facility plan checkout"));
    expect(mockStartCheckout).not.toHaveBeenCalled();
  });
});
