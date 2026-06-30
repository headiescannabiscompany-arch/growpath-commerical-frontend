const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("automation API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("normalizes facility automation policy envelopes", async () => {
    mockApiRequest.mockResolvedValue({
      policies: [
        {
          _id: "policy-1",
          facilityId: "facility-1",
          trigger: { source: "tool_run", eventType: "dew_point_high_risk" },
          name: "Dew Point High Risk Alert",
          enabled: true,
          config: { threshold: "high" },
          triggerCount: 2
        }
      ]
    });

    const { listAutomationPolicies } = require("@/api/automation");
    const result = await listAutomationPolicies("facility-1");

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facilities/facility-1/automation/policies"
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "policy-1",
        facilityId: "facility-1",
        type: "dew_point_high_risk",
        name: "Dew Point High Risk Alert",
        enabled: true,
        triggerCount: 2
      })
    ]);
  });

  it("toggles and triggers automation policies through facility endpoints", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        policy: {
          id: "policy-1",
          facilityId: "facility-1",
          type: "task_overdue",
          name: "Task overdue escalation",
          enabled: true
        }
      })
      .mockResolvedValueOnce({
        policy: {
          id: "policy-1",
          facilityId: "facility-1",
          type: "task_overdue",
          name: "Task overdue escalation",
          enabled: true
        },
        deliveries: [{ id: "delivery-1", status: "success" }]
      });

    const { setAutomationPolicyEnabled, triggerAutomationPolicy } =
      require("@/api/automation");

    await expect(
      setAutomationPolicyEnabled("facility-1", "policy-1", true)
    ).resolves.toMatchObject({ id: "policy-1", enabled: true });
    await expect(
      triggerAutomationPolicy("facility-1", "policy-1", "release smoke")
    ).resolves.toMatchObject({
      policy: { id: "policy-1", enabled: true },
      deliveries: [{ id: "delivery-1", status: "success" }]
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/facilities/facility-1/automation/policies/policy-1",
      {
        method: "PATCH",
        body: { enabled: true }
      }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/facilities/facility-1/automation/policies/policy-1/trigger",
      {
        method: "POST",
        body: { reason: "release smoke" }
      }
    );
  });
});
