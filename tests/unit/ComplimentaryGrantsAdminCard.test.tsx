import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ComplimentaryGrantsAdminCard from "@/features/admin/ComplimentaryGrantsAdminCard";

const mockList = jest.fn();
const mockIssue = jest.fn();
const mockResend = jest.fn();
const mockRevoke = jest.fn();

jest.mock("@/api/complimentaryGrants", () => ({
  listComplimentaryGrants: (...args: any[]) => mockList(...args),
  issueComplimentaryGrant: (...args: any[]) => mockIssue(...args),
  resendComplimentaryGrant: (...args: any[]) => mockResend(...args),
  revokeComplimentaryGrant: (...args: any[]) => mockRevoke(...args)
}));

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppCard({ title, subtitle, children }: any) {
    return (
      <View>
        <Text>{title}</Text>
        <Text>{subtitle}</Text>
        {children}
      </View>
    );
  };
});

const pendingGrant = {
  id: "grant-1",
  recipientEmail: "recipient@example.com",
  recipientName: "Recipient",
  message: "Welcome",
  plan: "pro",
  duration: "month",
  status: "pending",
  reason: "Influencer evaluation",
  issuedAt: "2026-09-03T12:00:00.000Z",
  claimExpiresAt: "2026-09-10T12:00:00.000Z",
  entitlementEndsAt: null,
  revocationReason: "",
  complimentary: true,
  paymentState: "nonpaid",
  renews: false,
  emailDelivery: {
    status: "sent",
    attempts: 1,
    lastAttemptAt: "2026-09-03T12:00:00.000Z",
    sentAt: "2026-09-03T12:00:01.000Z",
    failureKind: null,
    nextAttemptAt: null,
    exhaustedAt: null,
    lastErrorCode: ""
  }
} as const;

describe("ComplimentaryGrantsAdminCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue({ grants: [pendingGrant], nextCursor: null });
  });

  it("loads recent nonpaid grants and states the Stripe boundary", async () => {
    const screen = render(<ComplimentaryGrantsAdminCard />);

    await waitFor(() =>
      expect(screen.getByText("recipient@example.com · pro · month")).toBeTruthy()
    );
    expect(mockList).toHaveBeenCalledWith({ limit: 5 });
    expect(
      screen.getByText(
        "Grant one non-renewing month or year by email. This never creates a Stripe Customer, Checkout Session, Subscription, Invoice, or PaymentIntent."
      )
    ).toBeTruthy();
    expect(screen.getByText(/pending · nonpaid · does not renew/)).toBeTruthy();
  });

  it("normalizes form text and issues default one-month Pro access", async () => {
    const issued = {
      ...pendingGrant,
      id: "grant-2",
      recipientEmail: "new@example.com"
    };
    mockIssue.mockResolvedValue({ grant: issued, deliveryAccepted: true });
    const screen = render(<ComplimentaryGrantsAdminCard />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.changeText(
      screen.getByLabelText("Complimentary recipient email"),
      " NEW@Example.com "
    );
    fireEvent.changeText(
      screen.getByLabelText("Complimentary recipient name"),
      " New Recipient "
    );
    fireEvent.changeText(
      screen.getByLabelText("Complimentary message"),
      " Welcome aboard "
    );
    fireEvent.changeText(
      screen.getByLabelText("Complimentary audit reason"),
      " Influencer evaluation "
    );
    fireEvent.press(screen.getByText("Issue complimentary access"));

    await waitFor(() =>
      expect(mockIssue).toHaveBeenCalledWith({
        recipientEmail: "new@example.com",
        recipientName: "New Recipient",
        message: "Welcome aboard",
        plan: "pro",
        duration: "month",
        reason: "Influencer evaluation"
      })
    );
    expect(
      screen.getByText(
        "Complimentary access was issued and the claim email was accepted."
      )
    ).toBeTruthy();
    expect(screen.getByText("new@example.com · pro · month")).toBeTruthy();
  });

  it("keeps issuance disabled until email and audit reason are valid", async () => {
    const screen = render(<ComplimentaryGrantsAdminCard />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    expect(
      screen.getByRole("button", { name: "Issue complimentary access" }).props
        .accessibilityState
    ).toEqual({ disabled: true });
    fireEvent.changeText(
      screen.getByLabelText("Complimentary recipient email"),
      "recipient@example.com"
    );
    fireEvent.changeText(screen.getByLabelText("Complimentary audit reason"), "short");
    expect(
      screen.getByRole("button", { name: "Issue complimentary access" }).props
        .accessibilityState
    ).toEqual({ disabled: true });
    fireEvent.changeText(
      screen.getByLabelText("Complimentary audit reason"),
      "Valid reason"
    );
    expect(
      screen.getByRole("button", { name: "Issue complimentary access" }).props
        .accessibilityState
    ).toEqual({ disabled: false });
  });

  it("passes an audited reason through resend and revoke actions", async () => {
    mockResend.mockResolvedValue({ grant: pendingGrant, deliveryAccepted: true });
    mockRevoke.mockResolvedValue({ ...pendingGrant, status: "revoked" });
    const screen = render(<ComplimentaryGrantsAdminCard />);
    await waitFor(() =>
      expect(screen.getByText("recipient@example.com · pro · month")).toBeTruthy()
    );

    const reasonInput = screen.getByLabelText("Action reason for recipient@example.com");
    fireEvent.changeText(reasonInput, " Retry after delivery repair ");
    fireEvent.press(screen.getByText("Resend claim email"));

    await waitFor(() =>
      expect(mockResend).toHaveBeenCalledWith("grant-1", "Retry after delivery repair")
    );
    expect(screen.getByText("The claim email was accepted for delivery.")).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Action reason for recipient@example.com"),
      " Recipient request "
    );
    fireEvent.press(screen.getByText("Cancel invitation"));

    await waitFor(() =>
      expect(mockRevoke).toHaveBeenCalledWith("grant-1", "Recipient request")
    );
    expect(
      screen.getByText("Complimentary access was revoked. No Stripe action was taken.")
    ).toBeTruthy();
    expect(screen.queryByText("Resend claim email")).toBeNull();
  });

  it("loads older grants through the server cursor without losing the first page", async () => {
    const olderGrant = {
      ...pendingGrant,
      id: "grant-older",
      recipientEmail: "older@example.com",
      status: "expired"
    } as const;
    mockList
      .mockResolvedValueOnce({ grants: [pendingGrant], nextCursor: "next-cursor" })
      .mockResolvedValueOnce({ grants: [olderGrant], nextCursor: null });

    const screen = render(<ComplimentaryGrantsAdminCard />);
    await waitFor(() =>
      expect(screen.getByText("recipient@example.com · pro · month")).toBeTruthy()
    );

    fireEvent.press(
      screen.getByRole("button", { name: "Load more complimentary grants" })
    );

    await waitFor(() =>
      expect(mockList).toHaveBeenNthCalledWith(2, {
        limit: 5,
        cursor: "next-cursor"
      })
    );
    expect(screen.getByText("recipient@example.com · pro · month")).toBeTruthy();
    expect(screen.getByText("older@example.com · pro · month")).toBeTruthy();
  });
});
