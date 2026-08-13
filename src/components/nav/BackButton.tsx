import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { radius } from "@/theme/theme";
import { useAppTheme } from "@/theme/appTheme";

const styles = StyleSheet.create({
  btn: {
    alignSelf: "flex-start",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  txt: { fontWeight: "800" }
});

export default function BackButton({
  label = "< Back",
  fallbackHref = "/account/workspace",
  preferFallback = false
}: {
  label?: string;
  fallbackHref?: string;
  preferFallback?: boolean;
}) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [focused, setFocused] = useState(false);

  const goBack = () => {
    const canGoBack =
      typeof (router as any).canGoBack === "function"
        ? (router as any).canGoBack()
        : typeof window !== "undefined"
          ? window.history.length > 1
          : true;

    if (!preferFallback && canGoBack) {
      router.back();
      return;
    }

    router.replace(fallbackHref as any);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      accessibilityHint="Returns to the previous page"
      hitSlop={4}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.btn,
        {
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.borderSoft
        },
        focused
          ? ({
              outlineColor: palette.link,
              outlineOffset: 2,
              outlineStyle: "solid",
              outlineWidth: 2
            } as any)
          : null
      ]}
      onPress={goBack}
    >
      <Text style={[styles.txt, { color: palette.link }]}>{label}</Text>
    </Pressable>
  );
}
