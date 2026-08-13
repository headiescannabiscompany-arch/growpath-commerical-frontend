import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { radius } from "@/theme/theme";
import { useAppTheme } from "@/theme/appTheme";
import { sanitizeViewChildren } from "./sanitizeViewChildren";
export type AppCardProps = {
  style?: any;
  title?: string;
  titleLevel?: 1 | 2 | 3;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export default function AppCard({
  title,
  titleLevel,
  subtitle,
  children,
  onPress,
  accessibilityLabel,
  style
}: AppCardProps) {
  const { palette } = useAppTheme();
  const Inner = (
    <View
      accessibilityLabel={onPress ? undefined : accessibilityLabel}
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          shadowColor: palette.shadow
        },
        style
      ]}
    >
      {!!title && (
        <Text
          accessibilityRole={titleLevel ? "header" : undefined}
          aria-level={titleLevel}
          style={[styles.title, { color: palette.text }]}
        >
          {title}
        </Text>
      )}
      {!!subtitle && (
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>{subtitle}</Text>
      )}
      {!!children && (
        <View style={styles.content}>
          {sanitizeViewChildren(children, "AppCard.content")}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title || "Open card"}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {Inner}
      </TouchableOpacity>
    );
  }
  return Inner;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18
  },
  title: { fontSize: 16, fontWeight: "800" },
  subtitle: { marginTop: 4 },
  content: { marginTop: 12 }
});
