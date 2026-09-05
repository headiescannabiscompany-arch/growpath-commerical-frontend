import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import BuyerPaymentReviewCard from "../BuyerPaymentReviewCard";

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});

const status = {
  recordId: "507f191e810c19729de86001",
  paymentStatus: "paid",
  amountCents: 4200,
  currency: "usd",
  refundedAmountCents: 300,
  refundRequestStatus: "none",
  refundLifecycleStatus: "partial",
  disputeReportStatus: "none",
  providerDisputeStatus: "none",
  connectRecoveryStatus: "not_attempted"
};

describe("BuyerPaymentReviewCard", () => {
  test("stays collapsed and is absent without an exact paid local record", () => {
    const hidden = render(
      <BuyerPaymentReviewCard
        status={{ ...status, recordId: null }}
        onRequestRefund={jest.fn()}
        onReportPaymentIssue={jest.fn()}
      />
    );
    expect(hidden.queryByText("Payment support")).toBeNull();

    const collapsed = render(
      <BuyerPaymentReviewCard
        status={status}
        onRequestRefund={jest.fn()}
        onReportPaymentIssue={jest.fn()}
      />
    );
    expect(collapsed.getByText("Payment support")).toBeTruthy();
    expect(collapsed.queryByLabelText("Refund request reason")).toBeNull();
  });

  test("binds refund and support intake to the exact record and current refund state", async () => {
    const requestRefund = jest.fn().mockResolvedValue({
      message: "Refund request recorded for GrowPath payment review."
    });
    const reportIssue = jest.fn().mockResolvedValue({
      message:
        "Payment issue recorded for GrowPath support review. This does not create a bank or card dispute."
    });
    const refresh = jest.fn().mockResolvedValue(status);
    const screen = render(
      <BuyerPaymentReviewCard
        status={status}
        onRequestRefund={requestRefund}
        onReportPaymentIssue={reportIssue}
        onRefresh={refresh}
      />
    );

    fireEvent.press(screen.getByLabelText("Open payment support"));
    fireEvent.changeText(
      screen.getByLabelText("Refund request reason"),
      "The delivered item did not match its description."
    );
    fireEvent.press(screen.getByText("Request refund review"));
    await waitFor(() =>
      expect(requestRefund).toHaveBeenCalledWith({
        recordId: status.recordId,
        expectedRefundedAmountCents: 300,
        reason: "The delivered item did not match its description."
      })
    );

    fireEvent.changeText(
      screen.getByLabelText("Payment issue reason"),
      "The card activity shows an unexpected payment entry."
    );
    fireEvent.press(screen.getByText("Report payment issue"));
    await waitFor(() =>
      expect(reportIssue).toHaveBeenCalledWith({
        recordId: status.recordId,
        expectedRefundedAmountCents: 300,
        reason: "The card activity shows an unexpected payment entry."
      })
    );
    expect(
      screen.getByText(/does not open a bank, card-network, or Stripe dispute/i)
    ).toBeTruthy();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test.each([
    ["resolved", "Payment issue resolved"],
    ["declined", "Payment issue report declined"]
  ])("shows final support status %s and prevents duplicate reporting", (state, label) => {
    const reportIssue = jest.fn();
    const screen = render(
      <BuyerPaymentReviewCard
        status={{ ...status, disputeReportStatus: state }}
        onRequestRefund={jest.fn()}
        onReportPaymentIssue={reportIssue}
      />
    );
    fireEvent.press(screen.getByLabelText("Open payment support"));
    fireEvent.changeText(
      screen.getByLabelText("Payment issue reason"),
      "This duplicate report must remain blocked."
    );
    expect(screen.getByText(label)).toBeTruthy();
    const button = screen.getByLabelText("Submit payment issue report");
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(reportIssue).not.toHaveBeenCalled();
  });
});
