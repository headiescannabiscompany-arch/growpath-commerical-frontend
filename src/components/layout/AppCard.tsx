import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { radius } from "@/theme/theme";
import { sanitizeViewChildren } from "./sanitizeViewChildren";
export type AppCardProps = {
  style?: any;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export default function AppCard({
  title,
  subtitle,
  children,
  onPress,
  accessibilityLabel,
  style
}: AppCardProps) {
  const Inner = (
    <View accessibilityLabel={accessibilityLabel} style={[styles.card, style]}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {!!children && (
        <View style={styles.content}>
          {sanitizeViewChildren(children, "AppCard.content")}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {Inner}
      </TouchableOpacity>
    );
  }
  return Inner;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18
  },
  title: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  subtitle: { color: "#64748B", marginTop: 4 },
  content: { marginTop: 12 }
});
