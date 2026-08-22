import { apiRequest } from "@/api/apiRequest";
import {
  correctBusinessDeskQuotePayment,
  getBusinessDeskQuoteLifecycle,
  getBusinessDeskQuotePaymentEvidenceChains,
  getBusinessDeskQuotePaymentSummary,
  recordBusinessDeskQuotePayment,
  voidBusinessDeskQuotePayment
} from "@/api/businessDesk";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const quoteRecordId = "507f191e810c19729de86020";
const paymentEvidenceId = "507f191e810c19729de86021";
const correctionEvidenceId = "507f191e810c19729de86022";

function paymentSummary(overrides: Record<string, unknown> = {}) {
  return {
    quoteRecordId,
    quoteRevisionNumber: 4,
    currency: "USD",
    minorUnitDigits: 2,
    quoteTotalMinor: 10_000,
    requestedDepositMinor: 2_500,
    requestedDepositIsPaymentEvidence: false,
    paidMinor: 2_000,
    userConfirmedPaidMinor: 2_000,
    outstandingMinor: 8_000,
    overpaymentMinor: 0,
    depositOutstandingMinor: 500,
    depositSatisfied: false,
    evidenceSource: "user_confirmed",
    evidenceScope: "user_confirmed_only",
    evidenceEventCount: 1,
    paymentChainCount: 1,
    activePaymentCount: 1,
    voidedPaymentCount: 0,
    providerObservation: {
      supported: false,
      code: "BUSINESS_DESK_PAYMENT_PROVIDER_OBSERVATION_NOT_CONFIGURED"
    },
    ...overrides
  };
}

function lifecycle(overrides: Record<string, unknown> = {}) {
  return {
    quoteRecordId,
    quoteRevisionNumber: 4,
    derivedAt: "2026-08-22T18:00:00.000Z",
    facets: {
      content: "reviewed",
      artifact: "copy_prepared",
      provider: "none",
      time: "current",
      revision: "current"
    },
    displayStatus: "reviewed",
    evidence: { verifiedArtifactCount: 1, verifiedProviderEventCount: 0 },
    providerHandoff: {
      supported: false,
      code: "BUSINESS_DESK_PAYMENT_HANDOFF_NOT_CONFIGURED"
    },
    ...overrides
  };
}

function paymentResult(
  eventType: "payment" | "correction" | "void",
  overrides: Record<string, unknown> = {}
) {
  const isPayment = eventType === "payment";
  const id = isPayment ? paymentEvidenceId : correctionEvidenceId;
  return {
    evidence: {
      id,
      quoteRecordId,
      quoteRevisionNumber: 4,
      eventType,
      source: "user_confirmed",
      amountMinor: eventType === "void" ? 0 : eventType === "correction" ? 2_200 : 2_000,
      currency: "USD",
      minorUnitDigits: 2,
      occurredAt: "2026-08-20T00:00:00.000Z",
      reference: isPayment ? "Receipt 12" : "",
      reason: isPayment ? "" : "Operator reviewed the bank receipt",
      rootPaymentEvidenceId: paymentEvidenceId,
      supersedesEvidenceId: isPayment ? null : paymentEvidenceId,
      sequence: isPayment ? 1 : 2,
      confirmation: {
        confirmed: true,
        confirmedAt: "2026-08-22T18:01:00.000Z"
      },
      createdAt: "2026-08-22T18:01:00.000Z",
      ...overrides
    },
    idempotentReplay: false
  };
}

describe("exact Quote payment evidence API", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("loads and validates the exact revision summary and independent lifecycle facets", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ data: { paymentSummary: paymentSummary() } })
      .mockResolvedValueOnce({ data: { lifecycle: lifecycle() } });

    await expect(
      getBusinessDeskQuotePaymentSummary(
        { workspaceType: "facility", facilityId: "facility/1" },
        quoteRecordId,
        4
      )
    ).resolves.toMatchObject({ paidMinor: 2_000, outstandingMinor: 8_000 });
    await expect(
      getBusinessDeskQuoteLifecycle(
        { workspaceType: "facility", facilityId: "facility/1" },
        quoteRecordId,
        4
      )
    ).resolves.toMatchObject({ displayStatus: "reviewed" });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      `/api/facility/facility%2F1/business-desk/quotes/${quoteRecordId}/revisions/4/payment-summary`,
      {}
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      `/api/facility/facility%2F1/business-desk/quotes/${quoteRecordId}/revisions/4/lifecycle`,
      {}
    );
  });

  it("loads only the durable user-confirmed chain projection for correction targets", async () => {
    const paymentEvidenceChains = {
      quoteRecordId,
      quoteRevisionNumber: 4,
      currency: "USD",
      minorUnitDigits: 2,
      evidenceScope: "user_confirmed_only",
      chains: [
        {
          rootPaymentEvidenceId: paymentEvidenceId,
          latestEvidenceId: correctionEvidenceId,
          latestEventType: "correction",
          source: "user_confirmed",
          amountMinor: 2_200,
          occurredAt: "2026-08-20T00:00:00.000Z",
          reference: "Receipt 12",
          reason: "Operator reviewed the bank receipt",
          sequence: 2,
          active: true,
          canCorrect: true,
          canVoid: true,
          createdAt: "2026-08-22T18:01:00.000Z"
        }
      ]
    };
    mockApiRequest.mockResolvedValue({ data: { paymentEvidenceChains } });

    await expect(
      getBusinessDeskQuotePaymentEvidenceChains(
        { workspaceType: "commercial" },
        quoteRecordId,
        4
      )
    ).resolves.toEqual(paymentEvidenceChains);
    expect(mockApiRequest).toHaveBeenCalledWith(
      `/api/business-desk/quotes/${quoteRecordId}/revisions/4/payment-evidence`,
      {}
    );
  });

  it("rejects arithmetic, provider, or revision substitution in public responses", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        data: { paymentSummary: paymentSummary({ outstandingMinor: 7_999 }) }
      })
      .mockResolvedValueOnce({
        data: { lifecycle: lifecycle({ quoteRevisionNumber: 3 }) }
      });

    await expect(
      getBusinessDeskQuotePaymentSummary(
        { workspaceType: "commercial" },
        quoteRecordId,
        4
      )
    ).rejects.toThrow("payment summary response was invalid");
    await expect(
      getBusinessDeskQuoteLifecycle({ workspaceType: "commercial" }, quoteRecordId, 4)
    ).rejects.toThrow("lifecycle response was invalid");
  });

  it("records only an explicitly confirmed exact-revision manual payment", async () => {
    mockApiRequest.mockResolvedValue({ data: paymentResult("payment") });

    await expect(
      recordBusinessDeskQuotePayment({ workspaceType: "commercial" }, quoteRecordId, {
        expectedVersion: 4,
        amountMinor: 2_000,
        currency: "USD",
        minorUnitDigits: 2,
        occurredAt: "2026-08-20",
        reference: "Receipt 12",
        confirmed: true,
        idempotencyKey: "quote-payment-retry-1"
      })
    ).resolves.toMatchObject({ evidence: { eventType: "payment", sequence: 1 } });

    expect(mockApiRequest).toHaveBeenCalledWith(
      `/api/business-desk/quotes/${quoteRecordId}/revisions/4/payments`,
      {
        method: "POST",
        body: {
          expectedVersion: 4,
          amountMinor: 2_000,
          currency: "USD",
          minorUnitDigits: 2,
          occurredAt: "2026-08-20T00:00:00.000Z",
          reference: "Receipt 12",
          confirmed: true,
          idempotencyKey: "quote-payment-retry-1"
        }
      }
    );
  });

  it("uses the selected evidence event for correction and void without provider claims", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ data: paymentResult("correction") })
      .mockResolvedValueOnce({
        data: paymentResult("void", { id: correctionEvidenceId, sequence: 2 })
      });

    await correctBusinessDeskQuotePayment(
      { workspaceType: "commercial" },
      quoteRecordId,
      paymentEvidenceId,
      {
        expectedVersion: 4,
        amountMinor: 2_200,
        currency: "USD",
        minorUnitDigits: 2,
        occurredAt: "2026-08-20",
        reason: "Operator reviewed the bank receipt",
        confirmed: true,
        idempotencyKey: "quote-correction-retry-1"
      }
    );
    await voidBusinessDeskQuotePayment(
      { workspaceType: "commercial" },
      quoteRecordId,
      paymentEvidenceId,
      {
        expectedVersion: 4,
        currency: "USD",
        minorUnitDigits: 2,
        occurredAt: "2026-08-20",
        reason: "Operator reviewed the bank receipt",
        confirmed: true,
        idempotencyKey: "quote-void-retry-1"
      }
    );

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      `/api/business-desk/quotes/${quoteRecordId}/revisions/4/payments/${paymentEvidenceId}/corrections`,
      expect.objectContaining({ method: "POST" })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      `/api/business-desk/quotes/${quoteRecordId}/revisions/4/payments/${paymentEvidenceId}/void`,
      expect.objectContaining({ method: "POST" })
    );
    expect(mockApiRequest.mock.calls[0][1]?.body).not.toHaveProperty("provider");
    expect(mockApiRequest.mock.calls[1][1]?.body).not.toHaveProperty("provider");
  });

  it("fails closed before transport for missing confirmation or an unsafe target", async () => {
    await expect(
      recordBusinessDeskQuotePayment({ workspaceType: "commercial" }, quoteRecordId, {
        expectedVersion: 4,
        amountMinor: 2_000,
        currency: "USD",
        minorUnitDigits: 2,
        occurredAt: "2026-08-20",
        confirmed: false as true,
        idempotencyKey: "quote-payment-retry-1"
      })
    ).rejects.toThrow("confirmation");
    await expect(
      voidBusinessDeskQuotePayment(
        { workspaceType: "commercial" },
        quoteRecordId,
        "not-an-evidence-id",
        {
          expectedVersion: 4,
          currency: "USD",
          minorUnitDigits: 2,
          occurredAt: "2026-08-20",
          reason: "Wrong record",
          confirmed: true,
          idempotencyKey: "quote-void-retry-1"
        }
      )
    ).rejects.toThrow("exact active evidence event");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
