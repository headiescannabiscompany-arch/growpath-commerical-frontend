const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

import { reverifyDestinationRefundRecovery } from "@/api/adminCommercePaymentReview";

describe("Admin Commerce payment recovery API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reverifies the exact source, record, operation, reason, and confirmation", async () => {
    mockApiRequest.mockResolvedValue({
      accepted: true,
      sourceType: "storefront",
      recordId: "507f191e810c19729de86001",
      connectRecoveryStatus: "applied",
      reconciliationStatus: "verified"
    });
    const input = {
      sourceType: "storefront" as const,
      recordId: "507f191e810c19729de86001",
      operationId: "persisted-refund-operation-001",
      confirmation:
        "REVERIFY CONNECT storefront:507f191e810c19729de86001 persisted-refund-operation-001",
      reason: "Admin verified the exact Stripe evidence after review."
    };

    await expect(reverifyDestinationRefundRecovery(input)).resolves.toEqual(
      expect.objectContaining({ reconciliationStatus: "verified" })
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/payments/admin/destination-refunds/storefront/507f191e810c19729de86001/reverify-connect",
      {
        method: "POST",
        body: {
          operationId: input.operationId,
          confirmation: input.confirmation,
          reason: input.reason
        }
      }
    );
  });
});
