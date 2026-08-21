import {
  createTelemetrySource,
  listTelemetrySources,
  TELEMETRY_ROUTES
} from "../telemetry";
import { apiRequest } from "../apiRequest";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("generic UbiBot telemetry source compatibility", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  test("redacts UbiBot credentials when normalizing telemetry sources", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        sources: [
          {
            id: "source_1",
            growId: "grow_1",
            type: "ubibot",
            name: "UbiBot Room",
            timezone: "America/New_York",
            config: {
              ubibot: {
                accountKey: "secret",
                apiKey: "channel-secret",
                accountKeyEncrypted: "cipher",
                channelId: "1419"
              }
            }
          }
        ]
      }
    });

    await expect(listTelemetrySources("grow_1")).resolves.toEqual([
      expect.objectContaining({
        id: "source_1",
        type: "ubibot",
        config: { ubibot: { channelId: "1419" } }
      })
    ]);
  });

  test("creates UbiBot telemetry sources without changing the generic source contract", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        source: {
          id: "source_1",
          growId: "grow_1",
          type: "ubibot",
          name: "UbiBot Room",
          timezone: "America/New_York",
          config: { ubibot: { channelId: "1419" } }
        }
      }
    });

    await expect(
      createTelemetrySource({
        growId: "grow_1",
        type: "ubibot",
        name: "UbiBot Room",
        timezone: "America/New_York",
        config: { ubibot: { channelId: "1419" } }
      })
    ).resolves.toEqual(
      expect.objectContaining({
        id: "source_1",
        type: "ubibot",
        config: { ubibot: { channelId: "1419" } }
      })
    );

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.SOURCES, {
      method: "POST",
      body: {
        growId: "grow_1",
        type: "ubibot",
        name: "UbiBot Room",
        timezone: "America/New_York",
        isActive: true,
        workspaceType: "personal",
        targetType: "grow",
        targetRef: "grow_1",
        config: { ubibot: { channelId: "1419" } }
      }
    });
  });
});
