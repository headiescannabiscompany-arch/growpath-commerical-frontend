/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "./AuthContext";
import { useAppTheme } from "@/theme/appTheme";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user, isHydrating, meStatus, meError, retryMe, logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { palette } = useAppTheme();

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
        if (!inAuthGroup) router.replace("/login");
        return;
      }
      if (inAuthGroup) router.replace("/home");
    }
  }, [isHydrating, meStatus, token, user, segments]);

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
        <ActivityIndicator />
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
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: "700" }}>
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
              router.replace("/login");
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

  return <>{children}</>;
}
