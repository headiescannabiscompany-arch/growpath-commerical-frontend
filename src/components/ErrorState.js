import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing } from "../theme/theme.js";

/**
 * ErrorState Component
 * Displays when an error occurs with retry option
 */

const ErrorState = ({
  title = "Something went wrong",
  message = "Please try again",
  icon = "alert-circle",
  onRetry = null,
  retryLabel = "Retry"
}) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={56} color="#EF4444" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color="#FFF"
            style={styles.retryIcon}
          />
          <Text style={styles.retryText}>{retryLabel}</Text>
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
    paddingHorizontal: Spacing.md,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    marginVertical: Spacing.md
  },
  title: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: "#DC2626",
    marginTop: Spacing.md,
    textAlign: "center"
  },
  message: {
    fontSize: Typography.size.caption,
    color: "#7F1D1D",
    marginTop: Spacing.xs,
    textAlign: "center"
  },
  retryBtn: {
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: "#EF4444",
    borderRadius: 8
  },
  retryIcon: {
    marginRight: Spacing.xs
  },
  retryText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: Typography.size.caption
  }
});

export default ErrorState;
