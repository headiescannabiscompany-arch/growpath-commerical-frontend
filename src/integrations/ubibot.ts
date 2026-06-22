export type UbiBotCredentials = {
  accountKey?: string;
  apiKey?: string;
  userId?: string;
};

export type UbiBotSummaryOptions = {
  channelId: string | number;
  credentials: UbiBotCredentials;
  baseUrl?: string;
  start?: string;
  end?: string;
  timezone?: string;
  results?: number;
  format?: "json" | "csv";
};

export type UbiBotChannel = {
  channel_id?: string | number;
  name?: string;
  [field: string]: unknown;
};

export type UbiBotFeedSummary = {
  created_at?: string;
  [field: string]: unknown;
};

export type UbiBotSummaryResponse = {
  result?: string;
  is_truncated?: boolean;
  channel?: UbiBotChannel;
  feeds?: UbiBotFeedSummary[];
};

export type UbiBotMqttSettings = {
  host: string;
  port: number;
  username: string;
  password: string;
  topic: string;
  heartbeatUrl: string;
  heartbeatIntervalMs: number;
};

export type UbiBotTelemetryObservation = {
  ts: string;
  vendorField: string;
  label: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number | null;
  unit?: string;
};

const DEFAULT_WEBAPI_BASE_URL = "https://webapi.ubibot.com";
const DEFAULT_MQTT_HOST = "mqtt-api.ubibot.com";
const DEFAULT_MQTT_PORT = 1883;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 240000;

const KNOWN_UNITS: Record<string, string> = {
  Temperature: "C",
  Humidity: "%",
  Light: "lux",
  Voltage: "V",
  "WIFI RSSI": "dBm",
  "External Temperature Sensor": "C"
};

function requireNonEmpty(value: unknown, label: string): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function appendQuery(url: URL, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  url.searchParams.set(key, String(value));
}

export function buildUbiBotSummaryUrl(options: UbiBotSummaryOptions): string {
  const channelId = requireNonEmpty(options.channelId, "channelId");
  const credential = options.credentials.apiKey || options.credentials.accountKey;
  requireNonEmpty(credential, "apiKey or accountKey");

  const format = options.format ?? "json";
  const baseUrl = (options.baseUrl || DEFAULT_WEBAPI_BASE_URL).replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/channels/${encodeURIComponent(channelId)}/summary.${format}`);

  if (options.credentials.apiKey) {
    url.searchParams.set("api_key", options.credentials.apiKey);
  } else if (options.credentials.accountKey) {
    url.searchParams.set("account_key", options.credentials.accountKey);
  }

  appendQuery(url, "results", options.results);
  appendQuery(url, "start", options.start);
  appendQuery(url, "end", options.end);
  appendQuery(url, "timezone", options.timezone);

  return url.toString();
}

export function buildUbiBotMqttSettings(credentials: UbiBotCredentials): UbiBotMqttSettings {
  const userId = requireNonEmpty(credentials.userId, "userId");
  const accountKey = requireNonEmpty(credentials.accountKey, "accountKey");
  const heartbeatUrl = new URL(`${DEFAULT_WEBAPI_BASE_URL}/mqtt-user-feeds/subcribe-ping`);
  heartbeatUrl.searchParams.set("account_key", accountKey);

  return {
    host: DEFAULT_MQTT_HOST,
    port: DEFAULT_MQTT_PORT,
    username: `user_id=${userId}`,
    password: `account_key=${accountKey}`,
    topic: `/user/${userId}/channel_feeds/#`,
    heartbeatUrl: heartbeatUrl.toString(),
    heartbeatIntervalMs: DEFAULT_HEARTBEAT_INTERVAL_MS
  };
}

function numericStat(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as Record<string, unknown>)[key];
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function channelFieldLabel(channel: UbiBotChannel | undefined, field: string): string {
  const label = channel?.[field];
  return typeof label === "string" && label.trim() ? label.trim() : field;
}

export function normalizeUbiBotSummaryResponse(
  response: UbiBotSummaryResponse
): UbiBotTelemetryObservation[] {
  const feeds = Array.isArray(response.feeds) ? response.feeds : [];
  const observations: UbiBotTelemetryObservation[] = [];

  for (const feed of feeds) {
    const ts = String(feed.created_at || "");
    if (!ts) continue;

    for (const [field, stats] of Object.entries(feed)) {
      if (!/^field\d+$/.test(field)) continue;

      const label = channelFieldLabel(response.channel, field);
      observations.push({
        ts,
        vendorField: field,
        label,
        avg: numericStat(stats, "avg"),
        min: numericStat(stats, "min"),
        max: numericStat(stats, "max"),
        count: numericStat(stats, "count"),
        unit: KNOWN_UNITS[label]
      });
    }
  }

  return observations;
}

export const UBIBOT_PROVIDER_CONTRACT = Object.freeze({
  id: "ubibot",
  documentationUrl:
    "https://www.ubibot.com/platform-api/2735/get-channel-feed-summaries/",
  mqttDocumentationUrl:
    "https://www.ubibot.com/platform-api/6966/mqtt-real-time-feed-topics/",
  developerMembershipUrl: "https://www.ubibot.com/ubibot-developer-membership/",
  capabilities: ["feed_summary", "mqtt_realtime_feeds"],
  implemented: false
});
