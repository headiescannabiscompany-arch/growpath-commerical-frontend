import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export type EducationPostCardProps = {
  cta?: string;
  title?: string;
  body?: string;
  href?: string;
  onPress?: () => void;
};

export default function EducationPostCard({
  cta,
  title,
  href = "/courses",
  body,
  onPress
}: EducationPostCardProps) {
  const { palette } = useAppTheme();
  function openHref() {
    const location = (globalThis as any)?.window?.location;
    if (location) location.href = href;
  }

  const Content = (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ]}
    >
      {!!title && <Text style={[styles.title, { color: palette.text }]}>{title}</Text>}
      {!!body && <Text style={[styles.body, { color: palette.textMuted }]}>{body}</Text>}
      {!!cta && (
        <Text style={[styles.cta, { color: palette.link }]}>
          {cta} {"\u2192"}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity accessibilityRole="link" onPress={onPress} activeOpacity={0.85}>
        {Content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity accessibilityRole="link" onPress={openHref} activeOpacity={0.85}>
      {Content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderWidth: 1,
    borderRadius: radius.card
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 20 },
  cta: { fontWeight: "800", marginTop: 8 }
});
