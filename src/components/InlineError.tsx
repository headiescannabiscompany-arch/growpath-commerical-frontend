import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export type InlineErrorProps = {
  // Newer pattern
  error?: any;

  // Legacy / explicit pattern used in some screens
  title?: string;
  message?: string;
  requestId?: string;

  // Optional retry affordance
  onRetry?: () => void;

  // Optional layout styling
  style?: any;
};

function pickTitle(p: InlineErrorProps) {
  return (
    p.title ??
    p.error?.title ??
    p.error?.error?.title ??
    p.error?.code ??
    "Something went wrong"
  );
}

function pickMessage(p: InlineErrorProps) {
  return (
    p.message ??
    p.error?.message ??
    p.error?.error?.message ??
    (typeof p.error === "string" ? p.error : null) ??
    ""
  );
}

function pickRequestId(p: InlineErrorProps) {
  return p.requestId ?? p.error?.requestId ?? p.error?.error?.requestId ?? "";
}

export function InlineError(props: InlineErrorProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createInlineErrorStyles(palette), [palette]);
  const hasSource = Boolean(
    props.error || props.title || props.message || props.requestId
  );
  if (!hasSource) return null;

  const title = pickTitle(props);
  const message = pickMessage(props);
  const requestId = pickRequestId(props);

  const hasAnything = Boolean(title || message || requestId);
  if (!hasAnything) return null;

  return (
    <View style={[styles.box, props.style]}>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {!!requestId && <Text style={styles.meta}>Request: {requestId}</Text>}
      {!!props.onRetry && (
        <Pressable
          onPress={props.onRetry}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel={`Retry ${String(title || "request").toLowerCase()}`}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

export default InlineError;

export const createInlineErrorStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    box: {
      padding: 12,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.danger,
      backgroundColor: palette.surfaceMuted
    },
    title: {
      color: palette.danger,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 4
    },
    message: { color: palette.text, fontSize: 13, opacity: 0.9 },
    meta: { color: palette.textMuted, fontSize: 12, opacity: 0.8, marginTop: 6 },
    retryBtn: {
      marginTop: 10,
      alignSelf: "flex-start",
      justifyContent: "center",
      minHeight: 44,
      minWidth: 44,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.accent,
      backgroundColor: palette.surface
    },
    retryText: { color: palette.link, fontSize: 13, fontWeight: "600" }
  });
