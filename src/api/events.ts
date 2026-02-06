// src/api/events.ts
import { api } from "./client";

export type CoreEventType =
  | "view_feed"
  | "create_post"
  | "like_post"
  | "hit_paywall"
  | "upgrade_click"
  | "upgrade_success"
  | "USER_LOGIN"
  | "USER_REGISTER";

type EventPayload = {
  eventType: string; // backend requires this
  meta?: Record<string, any>;
  source?: string;
  ts?: string;
};

export async function logEvent(type: CoreEventType, meta: Record<string, any> = {}) {
  try {
    const payload: EventPayload = {
      eventType: type, // ✅ map frontend "type" -> backend "eventType"
      meta,
      source: meta?.source || "app",
      ts: new Date().toISOString()
    };

    await api.post("/api/events", payload);
  } catch {
    // swallow — analytics must never break UX
  }
}
