// src/api/me.ts
// Contract-locked wrapper: returns current user profile or throws ApiError
import { api } from "./client";
import { endpoints } from "./endpoints";
import type { AuthUser } from "./auth";

export type MeResponse = AuthUser & {
  mode?: "personal" | "commercial" | "facility";
  plan?: string;
  subscriptionStatus?: string;
  capabilities?: Record<string, boolean>;
  limits?: Record<string, number>;
};

/** Fetch current user profile. Throws ApiError on failure (e.g., 401 if token invalid). */
export async function apiMe(): Promise<MeResponse> {
  return api.get(endpoints.me);
}
