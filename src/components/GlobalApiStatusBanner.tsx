import React, { useContext, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import {
  subscribeToApiTransport,
  type ApiError,
  type ApiTransportEvent
} from "../api/apiRequest";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

function isGlobalTransportError(error: ApiError) {
  return (
    error.code === "OFFLINE" ||
    error.code === "NETWORK_ERROR" ||
    error.code === "TIMEOUT" ||
    (error.status !== null && error.status >= 500)
  );
}

function bannerTitle(error: ApiError) {
  if (error.code === "OFFLINE") return "Offline";
  if (error.code === "TIMEOUT") return "Request timed out";
  if (error.status !== null && error.status >= 500) return "Server unavailable";
  return "Connection problem";
}

export function GlobalApiStatusBanner() {
  const { palette } = useAppTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const styles = useMemo(() => createGlobalApiStatusBannerStyles(palette), [palette]);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    return subscribeToApiTransport((event: ApiTransportEvent) => {
      if (event.type === "recovered") {
        setError(null);
      } else if (isGlobalTransportError(event.error)) {
        setError(event.error);
      }
    });
  }, []);

  if (!error) return null;

  return (
    <View
      accessibilityRole="alert"
      testID="global-api-status-banner"
      style={[styles.banner, connectionBannerInsets(insets)]}
    >
      <View style={styles.copy}>
        <Text style={styles.title}>{bannerTitle(error)}</Text>
        <Text style={styles.message}>{error.message}</Text>
        {error.requestId ? (
          <Text style={styles.reference}>Reference: {error.requestId}</Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss connection message"
        onPress={() => setError(null)}
        style={styles.dismiss}
      >
        <Text style={styles.dismissText}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

// This banner sits above the routed SafeAreaView. Web must also cover the first
// render before a safe-area provider has measured Safari's status/notch insets.
export function connectionBannerInsets(insets: { top: number; left: number; right: number } | null): ViewStyle {
  const edge = (name: "top" | "left" | "right", padding: number) =>
    Platform.OS === "web"
      ? `calc(${padding}px + max(${Math.max(0, insets?.[name] || 0)}px, env(safe-area-inset-${name}, 0px)))`
      : padding + Math.max(0, insets?.[name] || 0);
  return { paddingTop: edge("top", 10), paddingLeft: edge("left", 16), paddingRight: edge("right", 16) } as ViewStyle;
}

export function createGlobalApiStatusBannerStyles(palette: ThemePalette) {
  return StyleSheet.create({
    banner: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderBottomColor: palette.danger,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10
    },
    copy: {
      flex: 1,
      minWidth: 0,
      flexShrink: 1
    },
    title: {
      color: palette.danger,
      fontSize: 14,
      fontWeight: "700"
    },
    message: {
      color: palette.text,
      fontSize: 13,
      marginTop: 2
    },
    reference: {
      color: palette.textMuted,
      fontSize: 11,
      marginTop: 2
    },
    dismiss: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      paddingHorizontal: 8
    },
    dismissText: {
      color: palette.danger,
      fontSize: 13,
      fontWeight: "600"
    }
  });
}
