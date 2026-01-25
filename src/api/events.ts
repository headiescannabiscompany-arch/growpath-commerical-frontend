// src/api/events.ts
import { api } from "./client";

export type CoreEventType =
  | "view_feed"
  | "create_post"
  | "like_post"
  | "hit_paywall"
  | "upgrade_click"
  | "upgrade_success";

export async function logEvent(type: CoreEventType, meta: Record<string, any> = {}) {
  try {
    await api.post("/api/events", { type, meta });
  } catch {
    // swallow — analytics must never break UX
  }
}
