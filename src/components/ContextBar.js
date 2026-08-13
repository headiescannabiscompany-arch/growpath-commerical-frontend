import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { radius } from "../theme/theme";
import { useAppTheme } from "@/theme/appTheme";

// ContextBar for commercial/facility users
// Displays facility/commercial name, role, and quick actions
export default function ContextBar({ name, role, onAction, actions = [] }) {
  const { palette } = useAppTheme();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: palette.surfaceStrong,
          borderBottomColor: palette.border
        }
      ]}
    >
      <Text style={[styles.name, { color: palette.text }]}>{name}</Text>
      <Text style={[styles.role, { color: palette.textMuted }]}>{role}</Text>
      <View style={styles.actions}>
        {actions.map((action, idx) => (
          <TouchableOpacity
            key={idx}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel || action.label}
            style={[styles.actionBtn, { backgroundColor: palette.accent }]}
            onPress={action.onPress}
          >
            <Text style={[styles.actionText, { color: palette.accentText }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: 44
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
    marginRight: 12
  },
  role: {
    fontSize: 14,
    marginRight: 12
  },
  actions: {
    flexDirection: "row"
  },
  actionBtn: {
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 8
  },
  actionText: {
    fontWeight: "600",
    fontSize: 13
  }
});
