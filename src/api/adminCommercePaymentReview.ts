import { apiRequest } from "./apiRequest";

export type CommercePaymentReviewSource = "course" | "marketplace" | "storefront";

export type DestinationRefundProviderReason =
  | "duplicate"
  | "fraudulent"
  | "requested_by_customer";

export type CommerceRefundRetryOperation = {
  operationId: string;
  amountCents: number;
  expectedRefundedAmountCents: number;
  currency: string;
  providerReason: DestinationRefundProviderReason;
  state: string;
  providerStatus: string;
  requestedAt: string | null;
  lastAttemptAt: string | null;
};

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
  retryOperation: CommerceRefundRetryOperation | null;
  canRetryRefundOperation: boolean;
  connectRecoveryReverifyOperationId: string | null;
  connectRecoveryReverifyConfirmation: string | null;
  canExecuteRefund: boolean;
  fullRefundConfirmation: string | null;
  canResolvePaymentIssue: boolean;
  paymentIssueResolutionConfirmations: {
    resolve: string;
    decline: string;
  } | null;
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
  providerReason?: DestinationRefundProviderReason;
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

export type ReverifyDestinationRefundRecoveryInput = {
  sourceType: CommercePaymentReviewSource;
  recordId: string;
  operationId: string;
  confirmation: string;
  reason: string;
};

export type ReverifyDestinationRefundRecoveryResult = {
  accepted: boolean;
  sourceType: CommercePaymentReviewSource;
  recordId: string;
  connectRecoveryStatus: string;
  reconciliationStatus: string;
};

export async function reverifyDestinationRefundRecovery(
  input: ReverifyDestinationRefundRecoveryInput
): Promise<ReverifyDestinationRefundRecoveryResult> {
  const { sourceType, recordId, ...body } = input;
  return apiRequest(
    `/api/payments/admin/destination-refunds/${encodeURIComponent(sourceType)}/${encodeURIComponent(recordId)}/reverify-connect`,
    { method: "POST", body }
  );
}

export type ResolveCommercePaymentIssueInput = {
  sourceType: CommercePaymentReviewSource;
  recordId: string;
  operationId: string;
  decision: "resolve" | "decline";
  expectedStatus: "reported";
  confirmation: string;
  reason: string;
};

export type ResolveCommercePaymentIssueResult = {
  accepted: boolean;
  created: boolean;
  sourceType: CommercePaymentReviewSource;
  recordId: string;
  decision: "resolve" | "decline";
  disputeReportStatus: "resolved" | "declined";
  notificationCreated: boolean;
  message: string;
};

export async function resolveCommercePaymentIssue(
  input: ResolveCommercePaymentIssueInput
): Promise<ResolveCommercePaymentIssueResult> {
  const { sourceType, recordId, ...body } = input;
  return apiRequest(
    `/api/payments/admin/payment-issue-resolutions/${encodeURIComponent(sourceType)}/${encodeURIComponent(recordId)}`,
    { method: "POST", body }
  );
}
