import {
  UBIBOT_PROVIDER_CONTRACT,
  buildUbiBotMqttSettings,
  buildUbiBotSummaryUrl,
  normalizeUbiBotSummaryResponse
} from "../ubibot";

describe("UbiBot integration contract", () => {
  test("builds feed summary URL with account key and time window", () => {
    const url = buildUbiBotSummaryUrl({
      channelId: 123,
      credentials: { accountKey: "acct_key" },
      start: "2026-06-22 00:00:00",
      end: "2026-06-22 06:00:00",
      timezone: "America/New_York",
      results: 100
    });

    expect(url).toBe(
      "https://webapi.ubibot.com/channels/123/summary.json?account_key=acct_key&results=100&start=2026-06-22+00%3A00%3A00&end=2026-06-22+06%3A00%3A00&timezone=America%2FNew_York"
    );
  });

  test("builds feed summary URL with channel API key", () => {
    const url = buildUbiBotSummaryUrl({
      channelId: "channel a",
      credentials: { apiKey: "channel_key" },
      format: "csv"
    });

    expect(url).toBe(
      "https://webapi.ubibot.com/channels/channel%20a/summary.csv?api_key=channel_key"
    );
  });

  test("requires a summary credential", () => {
    expect(() =>
      buildUbiBotSummaryUrl({ channelId: 123, credentials: {} })
    ).toThrow("apiKey or accountKey is required");
  });

  test("builds MQTT settings from UbiBot account credentials", () => {
    expect(
      buildUbiBotMqttSettings({ userId: "user_1", accountKey: "acct_key" })
    ).toEqual({
      host: "mqtt-api.ubibot.com",
      port: 1883,
      username: "user_id=user_1",
      password: "account_key=acct_key",
      topic: "/user/user_1/channel_feeds/#",
      heartbeatUrl:
        "https://webapi.ubibot.com/mqtt-user-feeds/subcribe-ping?account_key=acct_key",
      heartbeatIntervalMs: 240000
    });
  });

  test("normalizes feed summaries into telemetry observations", () => {
    const observations = normalizeUbiBotSummaryResponse({
      result: "success",
      channel: {
        channel_id: "1419",
        field1: "Temperature",
        field2: "Humidity",
        field5: "WIFI RSSI"
      },
      feeds: [
        {
          created_at: "2026-06-22T06:00:00+00:00",
          field1: { avg: 24.5, min: 24, max: 25, count: 4 },
          field2: { avg: 62, min: 60, max: 64, count: 4 },
          field5: { avg: -42, min: -45, max: -40, count: 4 }
        }
      ]
    });

    expect(observations).toEqual([
      {
        ts: "2026-06-22T06:00:00+00:00",
        vendorField: "field1",
        label: "Temperature",
        avg: 24.5,
        min: 24,
        max: 25,
        count: 4,
        unit: "C"
      },
      {
        ts: "2026-06-22T06:00:00+00:00",
        vendorField: "field2",
        label: "Humidity",
        avg: 62,
        min: 60,
        max: 64,
        count: 4,
        unit: "%"
      },
      {
        ts: "2026-06-22T06:00:00+00:00",
        vendorField: "field5",
        label: "WIFI RSSI",
        avg: -42,
        min: -45,
        max: -40,
        count: 4,
        unit: "dBm"
      }
    ]);
  });

  test("provider contract stays pending until real-device tests exist", () => {
    expect(UBIBOT_PROVIDER_CONTRACT).toMatchObject({
      id: "ubibot",
      capabilities: ["feed_summary", "mqtt_realtime_feeds"],
      implemented: false
    });
  });
});
