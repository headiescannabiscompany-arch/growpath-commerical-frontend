/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, usePathname, useRouter, useSegments } from "expo-router";
import { useAuth } from "./AuthContext";
import { useAppTheme } from "@/theme/appTheme";
import { resolveAuthReturnPath } from "@/utils/authReturnPath";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user, isHydrating, meStatus, meError, retryMe, logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const searchParams = useLocalSearchParams() as Record<
    string,
    string | string[] | undefined
  >;
  const { palette } = useAppTheme();
  const fragment = String((globalThis as any)?.window?.location?.hash || "");
  const browserLocation = (globalThis as any)?.window?.location;
  const rawBrowserPath =
    Platform.OS === "web"
      ? browserLocation
        ? `${String(browserLocation.pathname || "")}${String(
            browserLocation.search || ""
          )}${String(browserLocation.hash || "")}`
        : null
      : undefined;
  const authReturnPath = resolveAuthReturnPath(
    pathname,
    searchParams,
    fragment,
    rawBrowserPath
  );
  const loginTarget = authReturnPath
    ? ({ pathname: "/login", params: { next: authReturnPath } } as const)
    : "/login";

  React.useEffect(() => {
    if (!isHydrating) {
      const inAuthGroup = segments[0] === "(auth)";
      if (
        token &&
        (meStatus === "loading" || meStatus === "idle" || meStatus === "error")
      ) {
        return;
      }
      if (!token || !user) {
        if (!inAuthGroup) router.replace(loginTarget as any);
        return;
      }
      if (inAuthGroup) router.replace("/home");
    }
  }, [authReturnPath, isHydrating, meStatus, token, user, segments]);

  if (isHydrating || (token && (meStatus === "loading" || meStatus === "idle"))) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.page
        }}
      >
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (token && meStatus === "error") {
    return (
      <View
        accessibilityRole="alert"
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: palette.page
        }}
      >
        <Text
          accessibilityRole="header"
          aria-level={1}
          style={{ color: palette.text, fontSize: 20, fontWeight: "700" }}
        >
          Session check failed
        </Text>
        <Text
          style={{
            color: palette.textMuted,
            fontSize: 14,
            marginTop: 8,
            maxWidth: 420,
            textAlign: "center"
          }}
        >
          {meError || "Unable to verify your session from /api/me."}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            marginTop: 18
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry /api/me"
            onPress={() => retryMe()}
            style={{
              backgroundColor: palette.accent,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10
            }}
          >
            <Text style={{ color: palette.accentText, fontWeight: "800" }}>
              Retry /api/me
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear session and sign in"
            onPress={async () => {
              await logout();
              router.replace(loginTarget as any);
            }}
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
              borderRadius: 12,
              borderWidth: 1,
              paddingHorizontal: 14,
              paddingVertical: 10
            }}
          >
            <Text style={{ color: palette.text, fontWeight: "800" }}>
              Clear session and sign in
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!token || !user) {
    return (
      <View
        accessibilityLabel="Redirecting to sign in"
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.page
        }}
      >
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return <>{children}</>;
}
