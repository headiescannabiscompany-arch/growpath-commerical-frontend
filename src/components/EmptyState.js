import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing } from "../theme/theme.js";

/**
 * EmptyState Component
 * Displays when no data is available
 */

const EmptyState = ({
  icon = "inbox-multiple",
  title = "No data",
  subtitle = "Nothing to display yet",
  actionLabel = null,
  onAction = null
}) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={56} color={Colors.textSecondary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg * 3,
    paddingHorizontal: Spacing.md
  },
  title: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.md,
    textAlign: "center"
  },
  subtitle: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: "center"
  },
  actionBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 8
  },
  actionText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: Typography.size.caption
  }
});

export default EmptyState;
