const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

import {
  coursePaymentReconciliationState,
  getCourseAccessStatus
} from "@/api/coursePayments";

describe("course Checkout recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires server-confirmed enrollment and fails closed on terminal payment state", () => {
    expect(
      coursePaymentReconciliationState({ paymentStatus: "paid", enrolled: false })
    ).toBe("pending");
    expect(
      coursePaymentReconciliationState({ paymentStatus: "paid", enrolled: true })
    ).toBe("confirmed");
    expect(
      coursePaymentReconciliationState({ paymentStatus: "refunded", enrolled: true })
    ).toBe("terminal");
    expect(
      coursePaymentReconciliationState({
        paymentStatus: "paid",
        enrolled: true,
        providerDisputeStatus: "open"
      })
    ).toBe("terminal");
  });

  it("combines canonical payment and enrollment authority", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ paymentStatus: "paid", checkoutStatus: "completed" })
      .mockResolvedValueOnce({ enrolled: true, enrollmentId: "enrollment-1" });

    await expect(getCourseAccessStatus("course 1")).resolves.toMatchObject({
      paymentStatus: "paid",
      checkoutStatus: "completed",
      enrolled: true,
      enrollmentId: "enrollment-1"
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/payments/course/course 1/status",
      { method: "GET" }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/courses/course 1/enrollment-status",
      { method: "GET" }
    );
  });
});
