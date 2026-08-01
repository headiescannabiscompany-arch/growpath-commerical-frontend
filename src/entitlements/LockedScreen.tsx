import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export function LockedScreen({
  title = "Access restricted",
  message = "Your account does not have access to this area.",
  onAction,
  actionLabel = "Go back"
}: {
  title?: string;
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createLockedScreenStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onAction ? (
        <Pressable onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const createLockedScreenStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.page,
      flex: 1,
      justifyContent: "center",
      padding: 20
    },
    title: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 8
    },
    message: {
      color: palette.textMuted,
      fontSize: 16,
      marginBottom: 18
    },
    action: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    actionText: { color: palette.link, fontSize: 16, fontWeight: "600" }
  });
