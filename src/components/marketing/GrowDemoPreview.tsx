import React from "react";
import { Image, Platform, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAppTheme } from "@/theme/appTheme";
import demo from "./syntheticGrowDemo.json";

export default function GrowDemoPreview() {
  const { palette } = useAppTheme();
  return (
    <View
      style={{ gap: 12, backgroundColor: palette.card, padding: 20, borderRadius: 18 }}
    >
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={{ color: palette.text, fontSize: 23, fontWeight: "800" }}
      >
        See the notes behind each timeline point
      </Text>
      <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 24 }}>
        A starting photo, an observation, a change and a follow-up, together in one
        journal. Open the sample and select a point to read its entry.
      </Text>
      <Link
        href="/demo"
        accessibilityLabel="Open the synthetic sample journal"
        style={{ display: "flex", width: "100%" }}
      >
        <Image
          source={{
            uri:
              Platform.OS === "web"
                ? demo.screenshot
                : `https://growpathai.com${demo.screenshot}`
          }}
          alt={demo.screenshotAlt}
          accessibilityLabel={demo.screenshotAlt}
          style={{ width: "100%", aspectRatio: 1.28, borderRadius: 12 }}
          resizeMode="contain"
        />
      </Link>
      <Text style={{ color: palette.textMuted, fontSize: 14, lineHeight: 21 }}>
        {demo.screenshotCaption}
      </Text>
      <Link
        href="/demo"
        style={{
          minHeight: 44,
          paddingVertical: 12,
          color: palette.link,
          fontWeight: "700"
        }}
      >
        Try the sample journal — no signup
      </Link>
    </View>
  );
}
