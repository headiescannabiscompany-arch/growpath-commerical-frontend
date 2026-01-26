// src/api/events.ts
import { api } from "./client";
import { useAuth } from "../auth/AuthContext";

export type CoreEventType =
  | "view_feed"
  | "create_post"
  | "like_post"
  | "hit_paywall"
  | "upgrade_click"
  | "upgrade_success"
  | "USER_LOGIN"
  | "USER_REGISTER";

export async function logEvent(type: CoreEventType, meta: Record<string, any> = {}) {
  try {
    await api.post("/api/events", { type, meta });
  } catch {
    // swallow — analytics must never break UX
  }
}
