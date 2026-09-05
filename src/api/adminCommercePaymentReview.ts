import { apiRequest } from "./apiRequest";

export type CommercePaymentReviewSource = "course" | "marketplace" | "storefront";

export type CommercePaymentReviewCase = {
  recordId: string;
  sourceType: CommercePaymentReviewSource;
  itemId: string;
  buyerUserId: string;
  sellerUserId: string;
  amountCents: number;
  currency: string;
  refundedAmountCents: number;
  remainingRefundableAmountCents: number;
  refundRequestStatus: string;
  refundLifecycleStatus: string;
  disputeReportStatus: string;
  providerDisputeStatus: string;
  connectChargeEvidenceStatus: string;
  connectRecoveryStatus: string;
  caseStatus: string;
  reason: string;
  updatedAt: string | null;
  canExecuteRefund: boolean;
  fullRefundConfirmation: string | null;
};

export type CommercePaymentReviewPage = {
  cases: CommercePaymentReviewCase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export async function listCommercePaymentReviewCases(input?: {
  page?: number;
  limit?: number;
}): Promise<CommercePaymentReviewPage> {
  return apiRequest("/api/payments/admin/review-cases", {
    method: "GET",
    params: {
      page: input?.page || 1,
      limit: input?.limit || 10
    }
  });
}

export type ExecuteDestinationRefundInput = {
  sourceType: CommercePaymentReviewSource;
  recordId: string;
  operationId: string;
  amountCents: number;
  expectedRefundedAmountCents: number;
  confirmation: string;
  reason: string;
  providerReason?: "duplicate" | "fraudulent" | "requested_by_customer";
};

export type ExecuteDestinationRefundResult = {
  accepted: boolean;
  operationId: string;
  amountCents: number;
  currency: string;
  providerStatus: string;
  connectRecoveryStatus: string;
  reconciliationStatus: string;
};

export async function executeDestinationRefund(
  input: ExecuteDestinationRefundInput
): Promise<ExecuteDestinationRefundResult> {
  const { sourceType, recordId, ...body } = input;
  return apiRequest(
    `/api/payments/admin/destination-refunds/${encodeURIComponent(sourceType)}/${encodeURIComponent(recordId)}`,
    { method: "POST", body }
  );
}
