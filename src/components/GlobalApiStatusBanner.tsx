import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
      style={styles.banner}
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
      flex: 1
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
