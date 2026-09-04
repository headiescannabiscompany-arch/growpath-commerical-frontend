import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AdminAccountBillingVerification from "../AdminAccountBillingVerification";
import { verifyAdminAccountBilling } from "@/api/adminBillingVerification";

jest.mock("@/api/adminBillingVerification", () => ({
  verifyAdminAccountBilling: jest.fn()
}));

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      surfaceMuted: "#eef7ef",
      border: "#ccd9cc",
      borderSoft: "#dde7dd",
      link: "#166534",
      accent: "#166534",
      textMuted: "#5f6f5f",
      success: "#166534",
      warning: "#b45309"
    }
  })
}));

const mockVerify = verifyAdminAccountBilling as jest.MockedFunction<
  typeof verifyAdminAccountBilling
>;

describe("AdminAccountBillingVerification", () => {
  beforeEach(() => jest.clearAllMocks());

  test("does not contact Stripe until the Admin requests one account check", async () => {
    mockVerify.mockResolvedValue({
      readOnly: true,
      inspectedAt: "2030-02-01T12:00:00.000Z",
      complete: true,
      classification: "verified_active",
      consistency: "consistent",
      requiresReview: false,
      reason: "account_subscriptions_found",
      local: {
        requestedPlan: "pro",
        effectivePlan: "pro",
        status: "active",
        source: "stripe",
        active: true,
        paymentState: "paid",
        renews: true,
        cancelAtPeriodEnd: false,
        accessEndsAt: "2030-03-01T00:00:00.000Z",
        currentPeriodEnd: "2030-03-01T00:00:00.000Z",
        trialExpiry: null,
        trialUsed: false,
        aiTokens: 88,
        maxTokens: 100,
        stripeCustomerLinked: true,
        stripeSubscriptionLinked: true,
        lastStripeVerificationAt: "2030-02-01T00:00:00.000Z",
        consistency: "consistent"
      },
      provider: {
        customerCount: 1,
        relevantSubscriptionCount: 1,
        activeSubscriptionCount: 1,
        blockingSubscriptionCount: 1,
        storedCustomerBinding: "matched",
        selected: {
          status: "active",
          plan: "pro",
          interval: "monthly",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: "2030-03-01T00:00:00.000Z",
          subscriptionReference: "sub_…654321",
          customerReference: "cus_…123456"
        }
      }
    });
    const screen = render(
      <AdminAccountBillingVerification
        userId="000000000000000000000123"
        email="member@example.com"
      />
    );

    expect(mockVerify).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Read-only check. It does not charge, cancel, downgrade, or repair anything."
      )
    ).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("Verify member@example.com billing with Stripe")
    );

    await waitFor(() =>
      expect(mockVerify).toHaveBeenCalledWith("000000000000000000000123")
    );
    expect(await screen.findByText("Stripe confirms active paid access")).toBeTruthy();
    expect(screen.getByText(/Local: requested pro/)).toBeTruthy();
    expect(screen.getByText(/cus_…123456 \/ sub_…654321/)).toBeTruthy();
  });

  test("states that a failed check made no billing change", async () => {
    mockVerify.mockRejectedValue(new Error("Provider unavailable"));
    const screen = render(
      <AdminAccountBillingVerification
        userId="000000000000000000000123"
        email="member@example.com"
      />
    );

    fireEvent.press(
      screen.getByLabelText("Verify member@example.com billing with Stripe")
    );

    expect(
      await screen.findByText(
        "Provider unavailable No account or payment data was changed."
      )
    ).toBeTruthy();
  });
});
