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

// Module-level single-flight: only one /api/me in flight at a time
let inflightPromise: Promise<MeResponse> | null = null;

/** Fetch current user profile. Returns MeResponse or throws ApiError. */
export async function apiMe(options: { silent?: boolean } = {}): Promise<MeResponse> {
  // If a request is already in flight, return that promise instead of making a new one.
  // This handles StrictMode remounts and concurrent calls within the same tick.
  if (inflightPromise) {
    console.log("[API/ME] Request already in flight, returning cached promise");
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      const result = await api.get(endpoints.me, {
        ...options,
        invalidateOn401: false
      });
      return result as MeResponse;
    } finally {
      // Clear on completion so next call can make a fresh request
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}
