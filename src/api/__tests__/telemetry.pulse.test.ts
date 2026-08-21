import { listPulseDevices, TELEMETRY_ROUTES, verifyPulseApiKey } from "../telemetry";
import { apiRequest } from "../apiRequest";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("telemetry Pulse credential API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  test("verifies a key in the canonical Personal workspace", async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { verified: true } });

    await expect(
      verifyPulseApiKey({ workspaceType: "personal", apiKey: "pulse-secret" })
    ).resolves.toEqual({ ok: true, verified: true });

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.PULSE_VERIFY, {
      method: "POST",
      body: { workspaceType: "personal", apiKey: "pulse-secret" }
    });
  });

  test("lists devices only in the selected Facility without a client account ID", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: { devices: [{ deviceId: "pulse-1", name: "Flower Room" }] }
    });

    await expect(
      listPulseDevices({
        workspaceType: "facility",
        facilityId: "facility-1",
        apiKey: "pulse-secret"
      })
    ).resolves.toEqual([{ id: "pulse-1", deviceId: "pulse-1", name: "Flower Room" }]);

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.PULSE_DEVICES, {
      method: "POST",
      body: {
        workspaceType: "facility",
        facilityId: "facility-1",
        apiKey: "pulse-secret"
      }
    });
    expect(mockApiRequest.mock.calls[0][1]?.body).not.toHaveProperty("workspaceId");
  });
});
