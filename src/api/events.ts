// src/api/events.ts
import { apiRequest } from "./apiRequest";

export type CoreEventType =
  | "view_feed"
  | "create_post"
  | "like_post"
  | "hit_paywall"
  | "upgrade_click"
  | "upgrade_success"
  | "USER_LOGIN"
  | "USER_REGISTER"
  | "PAYWALL_VIEW" // Phase 2.3.2 - RequirePlan tracking
  | "FACILITY_SELECTED"; // Phase 2.3.2 - FacilityProvider tracking

type EventPayload = {
  eventType: CoreEventType;
  metadata?: Record<string, any>;
  source?: string;
  ts?: string;
};

export async function logEvent(type: CoreEventType, metadata: Record<string, any> = {}) {
  try {
    const payload: EventPayload = {
      eventType: type,
      metadata,
      source: metadata?.source || "app",
      ts: new Date().toISOString()
    };

    await apiRequest("/api/events", {
      method: "POST",
      body: payload
    });
  } catch {
    // swallow — analytics must never break UX
  }
}
