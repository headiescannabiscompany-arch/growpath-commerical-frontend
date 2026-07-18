import { initUnauthorizedHandler } from "@/auth/initUnauthorized";
import React, { useEffect } from "react";
import { Slot } from "expo-router";
import { View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../auth/AuthContext";
import { SessionProvider } from "../session/SessionProvider";
import { EntitlementsProvider } from "../entitlements/EntitlementsProvider";
import { FacilityProvider } from "../facility/FacilityProvider";
import { GlobalApiStatusBanner } from "../components/GlobalApiStatusBanner";
import GlobalReportBugButton from "../components/GlobalReportBugButton";
import { RouteAccessGuard } from "../navigation/RouteAccessGuard";
import { initMonitoring, wrapWithMonitoring } from "@/utils/monitoring";

initUnauthorizedHandler();
initMonitoring();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5
    }
  }
});

function RootLayout() {
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
              <View style={{ flex: 1 }}>
                <GlobalApiStatusBanner />
                <View style={{ flex: 1 }}>
                  <RouteAccessGuard>
                    <Slot />
                  </RouteAccessGuard>
                </View>
                <GlobalReportBugButton />
              </View>
            </FacilityProvider>
          </EntitlementsProvider>
        </SessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default wrapWithMonitoring(RootLayout);
