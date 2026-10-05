import React from "react";
import { Image, Platform, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAppTheme } from "@/theme/appTheme";
import screenshots from "./productScreenshots.json";

// Public, reviewed image files only. Never load an account or accept record IDs.
export default function ProductScreenshots({ page }: { page: string }) {
  const { palette } = useAppTheme();
  return (
    <>
      {screenshots
        .filter((shot) => shot.pages.includes(page))
        .map((shot) => (
          <View
            key={shot.id}
            style={{
              gap: 12,
              padding: 20,
              borderRadius: 18,
              backgroundColor: palette.card
            }}
          >
            <Text
              accessibilityRole="header"
              aria-level={2}
              style={{ color: palette.text, fontSize: 23, fontWeight: "800" }}
            >
              {shot.title}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 16, lineHeight: 24 }}>
              {shot.description}
            </Text>
            <Text style={{ color: palette.textMuted, fontSize: 14, lineHeight: 21 }}>
              {shot.caption}
            </Text>
            <Image
              source={{
                uri:
                  Platform.OS === "web"
                    ? shot.image
                    : `https://growpathai.com${shot.image}`
              }}
              alt={shot.alt}
              accessibilityLabel={shot.alt}
              resizeMode="contain"
              style={{
                width: "100%",
                maxWidth: shot.width,
                alignSelf: "center",
                aspectRatio: shot.width / shot.height,
                borderRadius: 12
              }}
            />
            <Link
              href={shot.image as any}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: palette.link,
                minHeight: 44,
                paddingVertical: 12,
                fontWeight: "700"
              }}
            >
              Open full-size{" "}
              {shot.id === "diagnosis" ? "diagnosis form" : "Facility dashboard"}{" "}
              screenshot
            </Link>
          </View>
        ))}
    </>
  );
}
