import { apiRequest } from "./apiRequest";

export type TwitchConnectionStatus = {
  configured: boolean;
  connection?: {
    broadcasterId?: string;
    broadcasterLogin?: string;
    broadcasterName?: string;
    status?: "pending" | "connected" | "error" | "revoked";
    eventSubStatus?: string;
    tokenExpiresAt?: string;
    lastValidatedAt?: string;
    lastEventAt?: string;
    lastError?: string;
  } | null;
};

export async function getTwitchConnection(): Promise<TwitchConnectionStatus> {
  try {
    return await apiRequest("/api/twitch/status");
  } catch (error: any) {
    if (error?.status === 404 || error?.code === "NOT_FOUND") {
      return { configured: false, connection: null };
    }
    throw error;
  }
}

export function beginTwitchConnection(): Promise<{
  configured: boolean;
  authorizationUrl?: string;
  message?: string;
}> {
  return apiRequest("/api/twitch/connect", { method: "POST", body: {} });
}

export function disconnectTwitch() {
  return apiRequest("/api/twitch/connection", { method: "DELETE" });
}

export function validateTwitchConnection() {
  return apiRequest("/api/twitch/validate", { method: "POST", body: {} });
}
