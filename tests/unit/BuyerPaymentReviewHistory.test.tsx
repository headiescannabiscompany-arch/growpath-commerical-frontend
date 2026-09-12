import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import BuyerPaymentReviewCard from "@/components/commerce/BuyerPaymentReviewCard";

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});

const refundedStatus = {
  recordId: "order-history-1",
  paymentStatus: "refunded",
  amountCents: 1000,
  currency: "usd",
  refundedAmountCents: 1000,
  refundRequestStatus: "none",
  refundLifecycleStatus: "full",
  disputeReportStatus: "none",
  providerDisputeStatus: "none"
};

function invokePressHandler(element: any) {
  let control = element;
  while (control && typeof control.props.onPress !== "function") {
    control = control.parent;
  }
  expect(control).toBeTruthy();
  control.props.onPress();
}

describe("Buyer payment refund history", () => {
  it("retains a fully refunded record but prevents both review handlers", async () => {
    const refund = jest.fn();
    const issue = jest.fn();
    const screen = render(
      <BuyerPaymentReviewCard
        status={refundedStatus}
        onRequestRefund={refund}
        onReportPaymentIssue={issue}
      />
    );

    expect(screen.getByText("$10.00 paid · $10.00 refunded")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open payment support"));
    expect(screen.getByText(/provider refund: full/)).toBeTruthy();
    expect(screen.getByText(/This payment is fully refunded/)).toBeTruthy();
    const refundInput = screen.getByLabelText("Refund request reason");
    const issueInput = screen.getByLabelText("Payment issue reason");
    expect(refundInput.props.editable).toBe(false);
    expect(issueInput.props.editable).toBe(false);

    // Invoke callbacks directly as a defense beyond disabled-control presentation.
    act(() => {
      refundInput.props.onChangeText("Do not submit another refund.");
      issueInput.props.onChangeText("Do not submit unsupported review.");
    });
    const refundButton = screen.getByLabelText("Submit refund review request");
    const issueButton = screen.getByLabelText("Submit payment issue report");
    expect(refundButton).toBeDisabled();
    expect(issueButton).toBeDisabled();
    await act(async () => {
      invokePressHandler(refundButton);
      invokePressHandler(issueButton);
    });
    expect(refund).not.toHaveBeenCalled();
    expect(issue).not.toHaveBeenCalled();
  });

  it("blocks additional refunds if a paid record already has a full refund", async () => {
    const refund = jest.fn();
    const screen = render(
      <BuyerPaymentReviewCard
        status={{ ...refundedStatus, paymentStatus: "paid" }}
        onRequestRefund={refund}
        onReportPaymentIssue={jest.fn()}
      />
    );
    fireEvent.press(screen.getByLabelText("Open payment support"));
    fireEvent.changeText(
      screen.getByLabelText("Refund request reason"),
      "No amount remains."
    );
    const button = screen.getByLabelText("Submit refund review request");
    expect(button).toBeDisabled();
    await act(async () => invokePressHandler(button));
    expect(refund).not.toHaveBeenCalled();
  });

  it.each(["pending", "failed", "not_started", "not_required"])(
    "does not turn %s into payment history",
    (paymentStatus) => {
      const screen = render(
        <BuyerPaymentReviewCard
          status={{ ...refundedStatus, paymentStatus }}
          onRequestRefund={jest.fn()}
          onReportPaymentIssue={jest.fn()}
        />
      );
      expect(screen.queryByText("Payment support")).toBeNull();
    }
  );

  it("does not show refunded history without an authenticated record identity", () => {
    const screen = render(
      <BuyerPaymentReviewCard
        status={{ ...refundedStatus, recordId: null }}
        onRequestRefund={jest.fn()}
        onReportPaymentIssue={jest.fn()}
      />
    );
    expect(screen.queryByText("Payment support")).toBeNull();
  });
});
