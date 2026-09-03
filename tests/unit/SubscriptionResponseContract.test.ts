import { getSubscription } from "@/api/subscription";

const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("subscription billing response contract", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it.each(["paid", "nonpaid"])("accepts paymentState %s", async (paymentState) => {
    mockApiRequest.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: paymentState === "paid" ? "stripe" : "platform",
      paymentState,
      paymentKind: paymentState === "paid" ? "provider" : "nonpaid"
    });

    await expect(getSubscription()).resolves.toMatchObject({ paymentState });
  });

  it("rejects provider when it is incorrectly returned as paymentState", async () => {
    mockApiRequest.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "stripe",
      paymentState: "provider",
      paymentKind: "provider"
    });

    await expect(getSubscription()).rejects.toThrow(
      "The subscription billing response was invalid."
    );
  });

  it("fails closed when paymentState is omitted", async () => {
    mockApiRequest.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "stripe",
      paymentKind: "provider"
    });

    await expect(getSubscription()).rejects.toThrow(
      "The subscription billing response was invalid."
    );
  });
});
