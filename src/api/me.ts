// src/api/me.ts
// Contract-locked: returns canonical { user, ctx } shape or throws ApiError.
import { api } from "./client";
import { endpoints } from "./endpoints";
import type { AuthUser } from "./auth";

export type MeCtx = {
  mode: "personal" | "commercial" | "facility";
  capabilities: Record<string, boolean>;
  limits: Record<string, number>;
  facilityId?: string | null;
  facilityRole?: string | null;
  facilityFeaturesEnabled?: boolean;
};

export type MeResponse = {
  user: AuthUser;
  ctx: MeCtx;
};

/** Fetch current user profile. Returns MeResponse or throws ApiError. */
export async function apiMe(): Promise<MeResponse> {
  return api.get(endpoints.me) as Promise<MeResponse>;
}
