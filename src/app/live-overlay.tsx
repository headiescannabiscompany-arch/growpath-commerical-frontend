import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";

import { getLiveOverlay } from "@/api/lives";

type OverlayMessage = {
  id: string;
  body: string;
  createdAt?: string;
  author: { displayName: string; avatarUrl?: string };
};

export default function LiveOverlayRoute() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = String(
    Array.isArray(params.token) ? params.token[0] : params.token || ""
  );
  const [messages, setMessages] = useState<OverlayMessage[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const previousBody = document.body.style.backgroundColor;
    const previousHtml = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = "transparent";
    document.documentElement.style.backgroundColor = "transparent";
    return () => {
      document.body.style.backgroundColor = previousBody;
      document.documentElement.style.backgroundColor = previousHtml;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setError("This overlay link is missing its private token.");
      return undefined;
    }
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const result: any = await getLiveOverlay(token);
        if (!active) return;
        setSettings(result?.settings || {});
        setMessages(Array.isArray(result?.messages) ? result.messages : []);
        setError("");
      } catch (err: any) {
        if (active) setError(String(err?.message || err || "Overlay unavailable."));
      } finally {
        if (active) timeout = setTimeout(() => void poll(), 2000);
      }
    }
    void poll();
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [token]);

  const styles = useMemo(() => createStyles(settings), [settings]);

  return (
    <View pointerEvents="none" style={styles.page}>
      <View style={styles.stack}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {messages.map((message) => (
          <View key={message.id} style={styles.message}>
            {settings.showGrowPathBadge !== false ? (
              <Image
                accessibilityLabel="GrowPath"
                source={require("../../assets/icon.png")}
                style={styles.brand}
              />
            ) : null}
            {settings.showAvatars !== false && message.author.avatarUrl ? (
              <Image
                accessibilityLabel={`${message.author.displayName} avatar`}
                source={{ uri: message.author.avatarUrl }}
                style={styles.avatar}
              />
            ) : null}
            <View style={styles.copy}>
              <Text style={styles.author}>{message.author.displayName}</Text>
              <Text style={styles.body}>{message.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(settings: any) {
  const theme = String(settings?.theme || "dark");
  const light = theme === "light";
  const transparent = theme === "transparent";
  const position = String(settings?.position || "bottom_left");
  return StyleSheet.create({
    page: {
      alignItems: position.endsWith("right") ? "flex-end" : "flex-start",
      backgroundColor: "transparent",
      flex: 1,
      justifyContent: position.startsWith("top") ? "flex-start" : "flex-end",
      padding: 20,
      ...(Platform.OS === "web"
        ? ({
            bottom: 0,
            height: "100vh",
            left: 0,
            position: "fixed",
            right: 0,
            top: 0,
            width: "100vw"
          } as any)
        : {})
    },
    stack: { gap: 8, maxWidth: 620, width: "92%" },
    message: {
      alignItems: "center",
      backgroundColor: transparent
        ? "rgba(10, 16, 24, 0.72)"
        : light
          ? "rgba(255,255,255,0.94)"
          : "rgba(14,20,27,0.94)",
      borderColor: String(settings?.accentColor || "#58a6ff"),
      borderLeftWidth: 4,
      borderRadius: 12,
      flexDirection: "row",
      gap: 9,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    brand: { borderRadius: 8, height: 24, width: 24 },
    avatar: { borderRadius: 18, height: 36, width: 36 },
    copy: { flex: 1 },
    author: {
      color: light ? "#123018" : "#BBD5FF",
      fontSize: Math.max(11, Number(settings?.fontSize || 20) - 5),
      fontWeight: "900"
    },
    body: {
      color: light ? "#101820" : "#F7FAFF",
      fontSize: Number(settings?.fontSize || 20),
      fontWeight: "700",
      marginTop: 2
    },
    error: {
      backgroundColor: "rgba(127,29,29,0.92)",
      borderRadius: 10,
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
      padding: 12
    }
  });
}
