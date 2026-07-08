import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { radius } from "@/theme/theme";

const styles = StyleSheet.create({
  btn: {
    alignSelf: "flex-start",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  txt: { fontWeight: "800" }
});

export default function BackButton({
  label = "< Back",
  fallbackHref = "/home"
}: {
  label?: string;
  fallbackHref?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    const canGoBack =
      typeof (router as any).canGoBack === "function"
        ? (router as any).canGoBack()
        : typeof window !== "undefined"
          ? window.history.length > 1
          : true;

    if (canGoBack) {
      router.back();
      return;
    }

    router.replace(fallbackHref as any);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={styles.btn}
      onPress={goBack}
    >
      <Text style={styles.txt}>{label}</Text>
    </Pressable>
  );
}
