import {
  createTelemetrySource,
  getUbiBotMqttSettings,
  listTelemetrySources,
  listUbiBotChannels,
  pullUbiBotWindow,
  TELEMETRY_ROUTES,
  verifyUbiBotCredentials
} from "../telemetry";
import { apiRequest } from "../apiRequest";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("telemetry UbiBot API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  test("verifies UbiBot credentials through the telemetry API", async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { account: "ok" } });

    await expect(
      verifyUbiBotCredentials({ accountKey: "acct", userId: "user_1" })
    ).resolves.toEqual({ ok: true, account: "ok" });

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.UBIBOT_VERIFY, {
      method: "POST",
      body: { accountKey: "acct", userId: "user_1" }
    });
  });

  test("lists UbiBot channels and normalizes ids", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        channels: [
          { channel_id: 1419, name: "Flower Room" },
          { id: "abc", name: "Dry Room" }
        ]
      }
    });

    await expect(listUbiBotChannels({ accountKey: "acct" })).resolves.toEqual([
      { id: "1419", channel_id: 1419, name: "Flower Room" },
      { id: "abc", name: "Dry Room" }
    ]);

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.UBIBOT_CHANNELS, {
      method: "POST",
      body: { accountKey: "acct" }
    });
  });

  test("pulls a UbiBot window and preserves ingest counts", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        pulled: "10",
        ingested: "8",
        updated: "2",
        skipped: "1",
        lastPointIso: "2026-06-22T06:00:00.000Z"
      }
    });

    await expect(
      pullUbiBotWindow(
        "source_1",
        "2026-06-22T00:00:00.000Z",
        "2026-06-22T06:00:00.000Z"
      )
    ).resolves.toEqual({
      sourceId: "source_1",
      pulled: 10,
      ingested: 8,
      updated: 2,
      skipped: 1,
      startIso: "2026-06-22T00:00:00.000Z",
      endIso: "2026-06-22T06:00:00.000Z",
      lastPointIso: "2026-06-22T06:00:00.000Z"
    });

    expect(mockApiRequest).toHaveBeenCalledWith(TELEMETRY_ROUTES.UBIBOT_PULL, {
      method: "POST",
      body: {
        sourceId: "source_1",
        startIso: "2026-06-22T00:00:00.000Z",
        endIso: "2026-06-22T06:00:00.000Z"
      }
    });
  });

  test("gets UbiBot MQTT settings through the backend", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: {
        host: "mqtt-api.ubibot.com",
        port: "1883",
        username: "user_id=user_1",
        topic: "/user/user_1/channel_feeds/#",
        heartbeatIntervalMs: "240000"
      }
    });

    await expect(getUbiBotMqttSettings("source_1")).resolves.toEqual({
      host: "mqtt-api.ubibot.com",
      port: 1883,
      username: "user_id=user_1",
      password: undefined,
      topic: "/user/user_1/channel_feeds/#",
      heartbeatUrl: undefined,
      heartbeatIntervalMs: 240000
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      TELEMETRY_ROUTES.UBIBOT_MQTT_SETTINGS,
      {
        method: "POST",
        body: { sourceId: "source_1" }
      }
    );
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
        config: { ubibot: { channelId: "1419" } }
      }
    });
  });
});
