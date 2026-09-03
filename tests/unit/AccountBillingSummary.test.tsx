import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import type { AccountBillingReadModel } from "@/api/auth";
import AccountBillingSummary from "@/features/billing/AccountBillingSummary";
import { getThemePalette } from "@/theme/appTheme";

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});

function billing(
  overrides: Partial<AccountBillingReadModel> = {}
): AccountBillingReadModel {
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
    },
    ...overrides
  };
}

describe("AccountBillingSummary", () => {
  it("shows authoritative Stripe payment, renewal, end, and link state", () => {
    const palette = getThemePalette("night", "dark");
    const screen = render(<AccountBillingSummary billing={billing()} />);

    expect(screen.getByText("Source: Stripe")).toBeTruthy();
    expect(screen.getByText("Status: Active")).toBeTruthy();
    expect(screen.getByText("Payment: Paid")).toBeTruthy();
    expect(screen.getByText("Renewal: Renews automatically")).toBeTruthy();
    expect(screen.getByText(/Current billing period through:/)).toBeTruthy();
    expect(screen.getByText("Stripe-linked record: Yes")).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByLabelText("Account billing summary").props.style)
    ).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.borderSoft
      })
    );
  });

  it("shows nonpaid complimentary access without implying renewal or Stripe payment", () => {
    const screen = render(
      <AccountBillingSummary
        billing={billing({
          source: "complimentary",
          paymentState: "nonpaid",
          paymentKind: "nonpaid",
          billingOwner: "platform",
          renews: false,
          endsAt: "2099-10-31T12:00:00.000Z",
          paidThrough: null,
          complimentaryExpiresAt: "2099-10-31T12:00:00.000Z",
          stripeLinked: false,
          actions: {
            canManageBilling: false,
            canCancelSubscription: false,
            canStartCheckout: false,
            canClaimPaidGift: false,
            canClaimComplimentary: false
          }
        })}
      />
    );

    expect(screen.getByText("Source: Complimentary access")).toBeTruthy();
    expect(screen.getByText("Payment: Nonpaid")).toBeTruthy();
    expect(screen.getByText("Renewal: Does not renew")).toBeTruthy();
    expect(screen.getByText(/Access ends:/)).toBeTruthy();
    expect(screen.getByText("Stripe-linked record: No")).toBeTruthy();
  });

  it.each([
    ["platform" as const, "Platform-provided access"],
    ["test" as const, "Test access"]
  ])("shows %s authority as explicitly nonpaid", (source, label) => {
    const screen = render(
      <AccountBillingSummary
        billing={billing({
          source,
          paymentState: "nonpaid",
          paymentKind: "nonpaid",
          billingOwner: source === "platform" ? "platform" : null,
          renews: false,
          stripeLinked: false
        })}
      />
    );

    expect(screen.getByText(`Source: ${label}`)).toBeTruthy();
    expect(screen.getByText("Payment: Nonpaid")).toBeTruthy();
    expect(screen.getByText("Renewal: Does not renew")).toBeTruthy();
  });

  it("fails closed for unresolved billing and reports cancel-at-period-end distinctly", () => {
    const unresolved = render(
      <AccountBillingSummary
        billing={billing({
          source: "unknown",
          paymentState: "paid",
          paymentKind: "unknown",
          consistency: "review_needed"
        })}
      />
    );

    expect(unresolved.getByText("Payment: Nonpaid / unconfirmed")).toBeTruthy();
    expect(unresolved.queryByText("Payment: Paid")).toBeNull();
    expect(
      unresolved.getByText(
        "Billing authority needs review. This account is not treated as paid from its displayed plan or status."
      )
    ).toBeTruthy();

    unresolved.rerender(
      <AccountBillingSummary
        billing={billing({ cancelAtPeriodEnd: true, renews: false })}
      />
    );
    expect(unresolved.getByText("Renewal: Scheduled to stop at period end")).toBeTruthy();
  });
});
