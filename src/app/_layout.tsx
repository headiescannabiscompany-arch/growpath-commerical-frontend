import { initUnauthorizedHandler } from "@/auth/initUnauthorized";
initUnauthorizedHandler();
import React, { useEffect } from "react";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../auth/AuthContext";
import { SessionProvider } from "../session/SessionProvider";
import { EntitlementsProvider } from "../entitlements/EntitlementsProvider";
import { FacilityProvider } from "../facility/FacilityProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5
    }
  }
});

export default function RootLayout() {
  useEffect(() => {
    if (process.env.EXPO_PUBLIC_E2E === "1") {
      (globalThis as any).__E2E__ = { ready: true };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionProvider>
          <EntitlementsProvider>
            <FacilityProvider>
              <Slot />
            </FacilityProvider>
          </EntitlementsProvider>
        </SessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
