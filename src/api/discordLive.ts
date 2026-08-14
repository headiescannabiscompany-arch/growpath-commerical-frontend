import { apiRequest } from "@/api/apiRequest";

export type DiscordLiveConnection = {
  id: string;
  connected: boolean;
  status: "connected" | "error" | "disabled";
  webhookIdPreview: string;
  channelName: string;
  guildName: string;
  enabledEvents: string[];
  lastDeliveryAt?: string | null;
  lastDeliveryStatus?: string;
  lastError?: string;
};

export function getDiscordLiveConnection() {
  return apiRequest<{ configured: boolean; connection: DiscordLiveConnection | null }>(
    "/api/discord-live/connection"
  );
}

export function connectDiscordLive(data: {
  webhookUrl: string;
  guildName?: string;
  channelName?: string;
  enabledEvents?: string[];
}) {
  return apiRequest<{ configured: boolean; connection: DiscordLiveConnection }>(
    "/api/discord-live/connection",
    { method: "POST", body: data }
  );
}

export function testDiscordLiveConnection() {
  return apiRequest<{ delivered: boolean; providerMessageId?: string }>(
    "/api/discord-live/connection/test",
    { method: "POST", body: {} }
  );
}

export function disconnectDiscordLive() {
  return apiRequest<{ disconnected: boolean }>("/api/discord-live/connection", {
    method: "DELETE"
  });
}
