import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

export default InlineError;

const styles = StyleSheet.create({
  box: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(200,0,0,0.25)",
    backgroundColor: "rgba(255,0,0,0.06)"
  },
  title: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  message: { fontSize: 13, opacity: 0.9 },
  meta: { fontSize: 12, opacity: 0.65, marginTop: 6 },
  retryBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)"
  },
  retryText: { fontSize: 13, fontWeight: "600" }
});
