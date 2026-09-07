import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AdminCommercePaymentReviewCard from "../AdminCommercePaymentReviewCard";
import {
  executeDestinationRefund,
  listCommercePaymentReviewCases,
  reverifyDestinationRefundRecovery,
  resolveCommercePaymentIssue
} from "@/api/adminCommercePaymentReview";

jest.mock("@/api/adminCommercePaymentReview", () => ({
  executeDestinationRefund: jest.fn(),
  listCommercePaymentReviewCases: jest.fn(),
  reverifyDestinationRefundRecovery: jest.fn(),
  resolveCommercePaymentIssue: jest.fn()
}));

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});

const reviewCase = {
  recordId: "507f191e810c19729de86001",
  sourceType: "storefront" as const,
  itemId: "507f191e810c19729de86002",
  buyerUserId: "507f191e810c19729de86003",
  sellerUserId: "507f191e810c19729de86004",
  amountCents: 4200,
  currency: "usd",
  refundedAmountCents: 200,
  remainingRefundableAmountCents: 4000,
  refundRequestStatus: "requested",
  refundLifecycleStatus: "partial",
  disputeReportStatus: "none",
  providerDisputeStatus: "none",
  connectChargeEvidenceStatus: "recorded",
  connectRecoveryStatus: "not_attempted",
  caseStatus: "refund_requested",
  reason: "The delivered item was not the item shown in the listing.",
  updatedAt: "2026-09-04T20:00:00.000Z",
  retryOperation: null,
  canRetryRefundOperation: false,
  connectRecoveryReverifyOperationId: null,
  connectRecoveryReverifyConfirmation: null,
  canExecuteRefund: true,
  fullRefundConfirmation: "REFUND storefront:507f191e810c19729de86001 4000 usd AFTER 200",
  canResolvePaymentIssue: false,
  paymentIssueResolutionConfirmations: null
};

const paymentIssueCase = {
  ...reviewCase,
  refundRequestStatus: "none",
  disputeReportStatus: "reported",
  caseStatus: "payment_issue_reported",
  reason: "The buyer reported an unexplained storefront payment.",
  canResolvePaymentIssue: true,
  paymentIssueResolutionConfirmations: {
    resolve: "RESOLVE PAYMENT ISSUE storefront:507f191e810c19729de86001 FROM reported",
    decline: "DECLINE PAYMENT ISSUE storefront:507f191e810c19729de86001 FROM reported"
  }
};

const retryCase = {
  ...reviewCase,
  refundRequestStatus: "none",
  connectRecoveryStatus: "policy_pending",
  caseStatus: "reconciliation_pending",
  reason: "",
  canExecuteRefund: false,
  canRetryRefundOperation: true,
  retryOperation: {
    operationId: "persisted-refund-operation-001",
    amountCents: 1200,
    expectedRefundedAmountCents: 200,
    currency: "usd",
    providerReason: "duplicate" as const,
    state: "provider_unconfirmed",
    providerStatus: "pending",
    requestedAt: "2026-09-04T20:00:00.000Z",
    lastAttemptAt: "2026-09-04T20:01:00.000Z"
  },
  connectRecoveryReverifyOperationId: "persisted-refund-operation-001",
  connectRecoveryReverifyConfirmation:
    "REVERIFY CONNECT storefront:507f191e810c19729de86001 persisted-refund-operation-001"
};

const reverifyCase = {
  ...retryCase,
  canRetryRefundOperation: false,
  retryOperation: { ...retryCase.retryOperation, state: "manual_review" }
};

const externalReverifyCase = {
  ...reviewCase,
  connectRecoveryStatus: "manual_review",
  caseStatus: "reconciliation_pending",
  canExecuteRefund: false,
  retryOperation: null,
  connectRecoveryReverifyOperationId:
    "connect-recovery-storefront-507f191e810c19729de86001",
  connectRecoveryReverifyConfirmation:
    "REVERIFY CONNECT storefront:507f191e810c19729de86001 connect-recovery-storefront-507f191e810c19729de86001"
};

describe("AdminCommercePaymentReviewCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listCommercePaymentReviewCases as jest.Mock).mockResolvedValue({
      cases: [reviewCase],
      pagination: { page: 1, limit: 5, total: 1, pages: 1 }
    });
  });

  test("is collapsed by default and loads only when deliberately opened", async () => {
    const screen = render(<AdminCommercePaymentReviewCard />);
    expect(listCommercePaymentReviewCases).not.toHaveBeenCalled();
    expect(screen.queryByText(/Record 507f/)).toBeNull();

    fireEvent.press(screen.getByLabelText("Open Commerce payment review"));
    await waitFor(() => expect(listCommercePaymentReviewCases).toHaveBeenCalled());
    expect(screen.getByText(/Record 507f191e810c19729de86001/)).toBeTruthy();
    expect(screen.getByText(/provider dispute: none/i)).toBeTruthy();
  });

  test("requires the exact phrase and reuses one stable operation on retry", async () => {
    (executeDestinationRefund as jest.Mock)
      .mockRejectedValueOnce(new Error("Provider outcome is not yet confirmed."))
      .mockResolvedValueOnce({
        accepted: true,
        reconciliationStatus: "webhook_pending"
      });
    const screen = render(<AdminCommercePaymentReviewCard />);
    fireEvent.press(screen.getByLabelText("Open Commerce payment review"));
    await screen.findByText(/Record 507f191e810c19729de86001/);
    fireEvent.press(
      screen.getByLabelText(
        "Prepare refund for storefront record 507f191e810c19729de86001"
      )
    );
    const execute = screen.getByLabelText(
      "Execute reviewed refund for storefront record 507f191e810c19729de86001"
    );
    expect(execute).toBeDisabled();

    fireEvent.changeText(
      screen.getByLabelText("Exact Commerce refund confirmation"),
      reviewCase.fullRefundConfirmation
    );
    fireEvent.press(execute);
    await waitFor(() => expect(executeDestinationRefund).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/not yet confirmed/i)).toBeTruthy());

    fireEvent.press(execute);
    await waitFor(() => expect(executeDestinationRefund).toHaveBeenCalledTimes(2));
    const first = (executeDestinationRefund as jest.Mock).mock.calls[0][0];
    const retry = (executeDestinationRefund as jest.Mock).mock.calls[1][0];
    expect(first).toMatchObject({
      sourceType: "storefront",
      recordId: reviewCase.recordId,
      amountCents: 4000,
      expectedRefundedAmountCents: 200,
      confirmation: reviewCase.fullRefundConfirmation,
      reason: reviewCase.reason
    });
    expect(first.operationId).toMatch(/^commerce-refund-/);
    expect(retry.operationId).toBe(first.operationId);
    expect(JSON.stringify(first)).not.toMatch(/stripe/i);
  });

  test("resumes the exact server operation after reload without inventing a new ID", async () => {
    (listCommercePaymentReviewCases as jest.Mock).mockResolvedValue({
      cases: [retryCase],
      pagination: { page: 1, limit: 5, total: 1, pages: 1 }
    });
    (executeDestinationRefund as jest.Mock).mockResolvedValue({
      accepted: true,
      reconciliationStatus: "webhook_pending"
    });
    const screen = render(<AdminCommercePaymentReviewCard />);
    fireEvent.press(screen.getByLabelText("Open Commerce payment review"));
    await screen.findByText(/provider unconfirmed/i);
    fireEvent.press(
      screen.getByLabelText(
        `Open exact refund recovery for storefront record ${retryCase.recordId}`
      )
    );

    expect(screen.queryByLabelText("Refund amount in cents")).toBeNull();
    fireEvent.changeText(
      screen.getByLabelText("Commerce refund reason"),
      "Admin retried the exact provider operation after review."
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact Commerce refund confirmation"),
      `REFUND storefront:${retryCase.recordId} 1200 usd AFTER 200`
    );
    fireEvent.press(
      screen.getByLabelText(
        `Resume exact refund operation for storefront record ${retryCase.recordId}`
      )
    );

    await waitFor(() => expect(executeDestinationRefund).toHaveBeenCalledTimes(1));
    expect(executeDestinationRefund).toHaveBeenCalledWith({
      sourceType: "storefront",
      recordId: retryCase.recordId,
      operationId: "persisted-refund-operation-001",
      amountCents: 1200,
      expectedRefundedAmountCents: 200,
      confirmation: `REFUND storefront:${retryCase.recordId} 1200 usd AFTER 200`,
      reason: "Admin retried the exact provider operation after review.",
      providerReason: "duplicate"
    });
  });

  test("reverifies only the exact persisted recovery operation", async () => {
    (listCommercePaymentReviewCases as jest.Mock).mockResolvedValue({
      cases: [reverifyCase],
      pagination: { page: 1, limit: 5, total: 1, pages: 1 }
    });
    (reverifyDestinationRefundRecovery as jest.Mock).mockResolvedValue({
      accepted: true,
      reconciliationStatus: "verified"
    });
    const screen = render(<AdminCommercePaymentReviewCard />);
    fireEvent.press(screen.getByLabelText("Open Commerce payment review"));
    await screen.findByText(/manual review/i);
    fireEvent.press(
      screen.getByLabelText(
        `Reverify Stripe recovery for storefront record ${reverifyCase.recordId}`
      )
    );

    fireEvent.changeText(
      screen.getByLabelText("Connect recovery reverify reason"),
      "Admin verified the exact Stripe evidence after review."
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact Connect recovery reverify confirmation"),
      reverifyCase.connectRecoveryReverifyConfirmation
    );
    fireEvent.press(
      screen.getByLabelText(
        `Confirm Stripe recovery reverify for storefront record ${reverifyCase.recordId}`
      )
    );

    await waitFor(() =>
      expect(reverifyDestinationRefundRecovery).toHaveBeenCalledWith({
        sourceType: "storefront",
        recordId: reverifyCase.recordId,
        operationId: "persisted-refund-operation-001",
        confirmation: reverifyCase.connectRecoveryReverifyConfirmation,
        reason: "Admin verified the exact Stripe evidence after review."
      })
    );
    expect(await screen.findByText(/exact refund recovery was reconciled/i)).toBeTruthy();
  });

  test("reverifies a Dashboard refund with the exact server-bound recovery ID", async () => {
    (listCommercePaymentReviewCases as jest.Mock).mockResolvedValue({
      cases: [externalReverifyCase],
      pagination: { page: 1, limit: 5, total: 1, pages: 1 }
    });
    (reverifyDestinationRefundRecovery as jest.Mock).mockResolvedValue({
      accepted: true,
      reconciliationStatus: "verified"
    });
    const screen = render(<AdminCommercePaymentReviewCard />);
    fireEvent.press(screen.getByLabelText("Open Commerce payment review"));
    await screen.findByText(/reconciliation pending/i);
    fireEvent.press(
      screen.getByLabelText(
        `Reverify Stripe recovery for storefront record ${externalReverifyCase.recordId}`
      )
    );
    fireEvent.changeText(
      screen.getByLabelText("Connect recovery reverify reason"),
      "Admin verified the exact external Stripe refund evidence."
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact Connect recovery reverify confirmation"),
      externalReverifyCase.connectRecoveryReverifyConfirmation
    );
    fireEvent.press(
      screen.getByLabelText(
        `Confirm Stripe recovery reverify for storefront record ${externalReverifyCase.recordId}`
      )
    );

    await waitFor(() =>
      expect(reverifyDestinationRefundRecovery).toHaveBeenCalledWith({
        sourceType: "storefront",
        recordId: externalReverifyCase.recordId,
        operationId: externalReverifyCase.connectRecoveryReverifyOperationId,
        confirmation: externalReverifyCase.connectRecoveryReverifyConfirmation,
        reason: "Admin verified the exact external Stripe refund evidence."
      })
    );
  });

  test("resolves only the local support report with exact confirmation and stable retry", async () => {
    (listCommercePaymentReviewCases as jest.Mock).mockResolvedValue({
      cases: [paymentIssueCase],
      pagination: { page: 1, limit: 5, total: 1, pages: 1 }
    });
    (resolveCommercePaymentIssue as jest.Mock)
      .mockRejectedValueOnce(new Error("Support outcome is not yet confirmed."))
      .mockResolvedValueOnce({
        accepted: true,
        created: false,
        message: "The buyer payment issue was marked resolved."
      });
    const screen = render(<AdminCommercePaymentReviewCard />);
    fireEvent.press(screen.getByLabelText("Open Commerce payment review"));
    await screen.findByText(/payment issue reported/i);
    expect(screen.getByText(/provider dispute: none/i)).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText(
        "Resolve payment issue for storefront record 507f191e810c19729de86001"
      )
    );
    const confirm = screen.getByLabelText(
      "Confirm resolution for storefront record 507f191e810c19729de86001"
    );
    expect(confirm).toBeDisabled();
    fireEvent.changeText(
      screen.getByLabelText("Payment issue resolution reason"),
      "Support verified the payment and answered the buyer."
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact payment issue resolution confirmation"),
      paymentIssueCase.paymentIssueResolutionConfirmations.resolve
    );
    fireEvent.press(confirm);
    await waitFor(() => expect(resolveCommercePaymentIssue).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/not yet confirmed/i)).toBeTruthy());

    fireEvent.press(confirm);
    await waitFor(() => expect(resolveCommercePaymentIssue).toHaveBeenCalledTimes(2));
    const first = (resolveCommercePaymentIssue as jest.Mock).mock.calls[0][0];
    const retry = (resolveCommercePaymentIssue as jest.Mock).mock.calls[1][0];
    expect(first).toMatchObject({
      sourceType: "storefront",
      recordId: paymentIssueCase.recordId,
      decision: "resolve",
      expectedStatus: "reported",
      confirmation: paymentIssueCase.paymentIssueResolutionConfirmations.resolve,
      reason: "Support verified the payment and answered the buyer."
    });
    expect(first.operationId).toMatch(/^commerce-support-/);
    expect(retry.operationId).toBe(first.operationId);
    expect(JSON.stringify(first)).not.toMatch(/stripe/i);
  });
});
