// src/api/me.ts
// Contract-locked: returns canonical { user, ctx } shape or throws ApiError.
import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import type { AuthUser } from "./auth";
import { getToken } from "../auth/tokenStore";

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
let inflightToken: string | null = null;

// Short cache window to collapse sequential duplicate calls during boot
let lastToken: string | null = null;
let lastResult: MeResponse | null = null;
let lastFetchedAt = 0;
const CACHE_WINDOW_MS = 2000;

/** Fetch current user profile. Returns MeResponse or throws ApiError. */
export async function apiMe(options: { silent?: boolean } = {}): Promise<MeResponse> {
  const token = await getToken();

  if (
    token &&
    lastToken === token &&
    lastResult &&
    Date.now() - lastFetchedAt < CACHE_WINDOW_MS
  ) {
    return lastResult;
  }

  // If a request is already in flight, return that promise instead of making a new one.
  // This handles StrictMode remounts and concurrent calls within the same tick.
  if (inflightPromise && inflightToken === token) {
    console.log("[API/ME] Request already in flight, returning cached promise");
    return inflightPromise;
  }

  inflightToken = token ?? null;

  inflightPromise = (async () => {
    try {
      const result = await apiRequest(endpoints.me, {
        ...options
      });
      const typed = result as MeResponse;
      if (token) {
        lastToken = token;
        lastResult = typed;
        lastFetchedAt = Date.now();
      }
      return typed;
    } finally {
      // Clear on completion so next call can make a fresh request
      inflightPromise = null;
      inflightToken = null;
    }
  })();

  return inflightPromise;
}
