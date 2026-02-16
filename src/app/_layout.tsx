import { initUnauthorizedHandler } from "@/auth/initUnauthorized";
import React, { useEffect } from "react";
import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../auth/AuthContext";
import { SessionProvider } from "../session/SessionProvider";
import { EntitlementsProvider } from "../entitlements/EntitlementsProvider";
import { FacilityProvider } from "../facility/FacilityProvider";

/* __gpTextNodeTraceInstalled */
if (process.env.NODE_ENV !== "production") {
  const anyConsole = console as any;
  if (!anyConsole.__gpTextNodeTraceInstalled) {
    anyConsole.__gpTextNodeTraceInstalled = true;
    const origError = console.error.bind(console);
    console.error = (...args: any[]) => {
      origError(...args);
      try {
        const first = args?.[0];
        if (typeof first === "string" && first.includes("Unexpected text node: .")) {
          console.trace("[TRACE] Unexpected '.' text node (raw text inside <View>)");
        }
      } catch {}
    };
  }
}
initUnauthorizedHandler();

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
