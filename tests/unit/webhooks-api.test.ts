const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("webhooks API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("preserves one-time signing secret when creating a webhook", async () => {
    mockApiRequest.mockResolvedValue({
      webhook: {
        id: "hook-1",
        url: "https://example.com/hook",
        events: ["TASK_ASSIGNED"],
        enabled: true,
        secretPreview: "whsec_ab...1234",
        failureCount: 0
      },
      signingSecret: "whsec_full"
    });

    const { createWebhook } = require("@/api/webhooks");
    const result = await createWebhook({
      url: "https://example.com/hook",
      events: ["TASK_ASSIGNED"],
      enabled: true
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/webhooks", {
      method: "POST",
      body: {
        url: "https://example.com/hook",
        events: ["TASK_ASSIGNED"],
        enabled: true
      }
    });
    expect(result.signingSecret).toBe("whsec_full");
    expect(result.secretPreview).toBe("whsec_ab...1234");
  });

  it("calls hardening endpoints for secret rotation and test delivery", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        webhook: { id: "hook-1", url: "https://example.com/hook", events: [] },
        signingSecret: "whsec_rotated"
      })
      .mockResolvedValueOnce({
        webhook: { id: "hook-1", url: "https://example.com/hook", events: [] },
        delivery: {
          id: "delivery-1",
          webhookId: "hook-1",
          event: "WEBHOOK_TEST",
          status: "success",
          attemptCount: 1,
          httpStatus: 202
        }
      });

    const { rotateWebhookSecret, testWebhookDelivery } = require("@/api/webhooks");

    await expect(rotateWebhookSecret("hook-1")).resolves.toMatchObject({
      signingSecret: "whsec_rotated"
    });
    await expect(testWebhookDelivery("hook-1")).resolves.toMatchObject({
      delivery: {
        id: "delivery-1",
        event: "WEBHOOK_TEST",
        status: "success",
        attemptCount: 1,
        httpStatus: 202
      }
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/webhooks/hook-1/rotate-secret",
      {
        method: "POST"
      }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/webhooks/hook-1/test-delivery",
      {
        method: "POST"
      }
    );
  });

  it("normalizes delivery log rows", async () => {
    mockApiRequest.mockResolvedValue({
      deliveries: [
        {
          _id: "delivery-1",
          webhookId: "hook-1",
          event: "WEBHOOK_TEST",
          status: "failed",
          attemptCount: 3,
          httpStatus: 503,
          error: "HTTP 503"
        }
      ]
    });

    const { listWebhookDeliveries } = require("@/api/webhooks");
    const result = await listWebhookDeliveries("hook-1");

    expect(mockApiRequest).toHaveBeenCalledWith("/api/webhooks/hook-1/deliveries");
    expect(result).toEqual([
      expect.objectContaining({
        id: "delivery-1",
        webhookId: "hook-1",
        event: "WEBHOOK_TEST",
        status: "failed",
        attemptCount: 3,
        httpStatus: 503,
        error: "HTTP 503"
      })
    ]);
  });
});
