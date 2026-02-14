import { Platform } from "react-native";
import { router } from "expo-router";

import { setOnUnauthorized } from "@/api/client";
import { clearToken } from "@/auth/tokenStore";

let didInit = false;

/**
 * Global 401 handler (contract-locked):
 * - Clears stored token
 * - Routes to /login
 * - Safe to call multiple times (idempotent)
 */
export function initUnauthorizedHandler() {
  if (didInit) return;
  didInit = true;

  setOnUnauthorized(async () => {
    await clearToken();

    // Best-effort navigation
    try {
      router.replace("/login");
    } catch {
      // Fallback for early/edge cases (mostly web)
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  });
}
