import { initUnauthorizedHandler } from "@/auth/initUnauthorized";
import React, { useEffect, useMemo } from "react";
import { Slot } from "expo-router";
import { View } from "react-native";
import { enableScreens } from "react-native-screens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { AuthProvider } from "../auth/AuthContext";
import { SessionProvider } from "../session/SessionProvider";
import { EntitlementsProvider } from "../entitlements/EntitlementsProvider";
import { FacilityProvider } from "../facility/FacilityProvider";
import { ThemeModeProvider } from "../theme/appTheme";
import { useAppTheme } from "../theme/appTheme";
import { GlobalApiStatusBanner } from "../components/GlobalApiStatusBanner";
import GlobalReportBugButton from "../components/GlobalReportBugButton";
import { RouteAccessGuard } from "../navigation/RouteAccessGuard";
import { initMonitoring, wrapWithMonitoring } from "@/utils/monitoring";
import { getNavigationTheme } from "@/theme/navigationTheme";

enableScreens(true);
initUnauthorizedHandler();
initMonitoring();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5
    }
  }
});

function RootShell() {
  const { palette } = useAppTheme();
  const navigationTheme = useMemo(() => getNavigationTheme(palette), [palette]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={{ flex: 1, backgroundColor: palette.page }}>
        <GlobalApiStatusBanner />
        <View style={{ flex: 1 }}>
          <RouteAccessGuard>
            <Slot />
          </RouteAccessGuard>
        </View>
        <GlobalReportBugButton />
      </View>
    </NavigationThemeProvider>
  );
}

function RootLayout() {
  useEffect(() => {
    if (process.env.EXPO_PUBLIC_E2E === "1") {
      (globalThis as any).__E2E__ = { ready: true };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeModeProvider>
          <SessionProvider>
            <EntitlementsProvider>
              <FacilityProvider>
                <RootShell />
              </FacilityProvider>
            </EntitlementsProvider>
          </SessionProvider>
        </ThemeModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default wrapWithMonitoring(RootLayout);
