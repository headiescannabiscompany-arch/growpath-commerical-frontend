import React, { useEffect } from "react";
import { Slot } from "expo-router";
import { Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../auth/AuthContext";
import { SessionProvider } from "../session/SessionProvider";
import { EntitlementsProvider } from "../entitlements/EntitlementsProvider";

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
    console.log("[BOOT] RootLayout loaded fingerprint=layout-2026-02-05-A");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionProvider>
          <EntitlementsProvider>
            <Slot />
            {/* TEMP FINGERPRINT */}
            <Text
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                fontSize: 10,
                opacity: 0.6
              }}
            >
              layout-2026-02-05-A
            </Text>
          </EntitlementsProvider>
        </SessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
