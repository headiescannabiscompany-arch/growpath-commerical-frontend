import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Typography, Spacing, radius } from "../theme/theme.js";
import { useAppTheme } from "@/theme/appTheme";

/**
 * ErrorState Component
 * Displays when an error occurs with retry option
 */

/**
 * @typedef {{
 *  title?: string;
 *  message?: string;
 *  icon?: string;
 *  onRetry?: (() => void) | null;
 *  retryLabel?: string;
 * }} ErrorStateProps
 */

/** @param {ErrorStateProps} props */
const ErrorState = ({
  title = "Something went wrong",
  message = "Please try again",
  icon = "alert-circle",
  onRetry = null,
  retryLabel = "Retry"
}) => {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createErrorStateStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={56} color={palette.danger} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color={palette.accentText}
            style={styles.retryIcon}
          />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const createErrorStateStyles = (palette) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.lg * 3,
      paddingHorizontal: Spacing.md,
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderWidth: 1,
      borderRadius: radius.card,
      marginVertical: Spacing.md
    },
    title: {
      fontSize: Typography.size.body,
      fontWeight: "600",
      color: palette.danger,
      marginTop: Spacing.md,
      textAlign: "center"
    },
    message: {
      fontSize: Typography.size.caption,
      color: palette.textMuted,
      marginTop: Spacing.xs,
      textAlign: "center"
    },
    retryBtn: {
      marginTop: Spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: palette.accent,
      borderRadius: radius.card
    },
    retryIcon: {
      marginRight: Spacing.xs
    },
    retryText: {
      color: palette.accentText,
      fontWeight: "600",
      fontSize: Typography.size.caption
    }
  });

export default ErrorState;
