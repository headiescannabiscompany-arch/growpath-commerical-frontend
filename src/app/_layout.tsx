import { initUnauthorizedHandler } from "@/auth/initUnauthorized";
import React, { useEffect, useMemo } from "react";
import { Slot, usePathname } from "expo-router";
import { View } from "react-native";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { enableScreens } from "react-native-screens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { useNotificationDeepLinks } from "@/notifications/useNotificationDeepLinks";
import { applyPublicRouteMetadata } from "@/seo/publicRouteMetadata";

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
  const pathname = usePathname();
  const { palette } = useAppTheme();
  useNotificationDeepLinks();
  useEffect(() => {
    applyPublicRouteMetadata(pathname);
  }, [pathname]);
  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: palette.resolvedMode === "night",
      colors: {
        ...DefaultTheme.colors,
        primary: palette.accent,
        background: palette.page,
        card: palette.surface,
        text: palette.text,
        border: palette.border,
        notification: palette.danger
      }
    }),
    [palette]
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <View
        style={{
          flex: 1,
          backgroundColor: pathname === "/live-overlay" ? "transparent" : palette.page
        }}
      >
        {pathname === "/live-overlay" ? (
          <Slot />
        ) : (
          <>
            <GlobalApiStatusBanner />
            <View style={{ flex: 1, backgroundColor: palette.page }}>
              <RouteAccessGuard>
                <Slot />
              </RouteAccessGuard>
            </View>
            <GlobalReportBugButton />
          </>
        )}
      </View>
    </ThemeProvider>
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
