import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

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
  function openHref() {
    const location = (globalThis as any)?.window?.location;
    if (location) location.href = href;
  }

  const Content = (
    <View style={styles.card}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!body && <Text style={styles.body}>{body}</Text>}
      {!!cta && (
        <Text style={styles.cta}>
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
    borderRadius: radius.card,
    borderColor: "rgba(0,0,0,0.15)"
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  body: { opacity: 0.8 },
  cta: { color: "#166534", fontWeight: "800", marginTop: 8 }
});
