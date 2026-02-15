import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export type AppCardProps = {
  style?: any;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
};

export default function AppCard({ title, subtitle, children, onPress }: AppCardProps) {
  const Inner = (
    <View style={styles.card}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {!!children && <View style={styles.content}>{children}</View>}
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
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "rgba(0,0,0,0.15)"
  },
  title: { fontSize: 16, fontWeight: "600" },
  subtitle: { marginTop: 4, opacity: 0.75 },
  content: { marginTop: 10 }
});
