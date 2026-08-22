import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/api/apiRequest";
import type {
  BusinessDeskProviderOperation,
  BusinessDeskProviderResult
} from "@/api/businessDeskProvider";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export function businessDeskProviderErrorMessage(error: Error | null | undefined) {
  if (!error) return "";
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "The operation changed or this retry key belongs to different inputs. Refresh the status; if the inputs changed, start a new attempt.";
    }
    if (
      /credit|balance|allowance|insufficient/i.test(error.code) ||
      /credit|balance|allowance/i.test(error.message)
    ) {
      return "This workspace does not have enough AI credit for the request. No other account or Facility was charged.";
    }
    if (error.code === "ABORTED") return "The local status request was canceled.";
    if (error.code === "TIMEOUT" || error.code === "NETWORK_ERROR") {
      return "The server response was not confirmed. Retry with the same request so the existing operation can be recovered safely.";
    }
    if (error.status === 501 || /NOT_CONFIGURED|UNAVAILABLE/.test(error.code)) {
      return "Provider-backed help is not configured for this workspace yet. Manual Business Desk tools remain available.";
    }
  }
  return error.message || "The Business Desk provider request failed.";
}

export function businessDeskCapabilityCopy(code: string | null | undefined) {
  if (/CREDIT/i.test(String(code || ""))) {
    return "Provider-backed help is paused because the workspace credit service is unavailable.";
  }
  return "Provider-backed help is not configured for this workspace yet. Nothing will be sent to an AI provider, and manual Business Desk work remains available.";
}

function creditCopy(operation: BusinessDeskProviderOperation) {
  const count = operation.credit.credits;
  const unit = count === 1 ? "credit" : "credits";
  switch (operation.credit.status) {
    case "not_reserved":
      return `No AI credit was reserved for this operation.`;
    case "reserved":
      return `${count} AI ${unit} reserved in this workspace; this is not yet a final charge.`;
    case "charged":
      return `${count} AI ${unit} charged to this workspace for the completed provider request.`;
    case "refunded":
      return `${count} AI ${unit} refunded to this workspace after the provider request did not complete.`;
  }
}

export default function ProviderOperationStatus<
  TResult extends BusinessDeskProviderResult
>({
  operation,
  busy,
  error,
  notice,
  onRefresh,
  onCancel,
  onRecoverRecent,
  onStartNewAttempt
}: {
  operation: BusinessDeskProviderOperation<TResult> | null;
  busy: string | null;
  error: Error | null;
  notice: string;
  onRefresh: () => void;
  onCancel: () => void;
  onRecoverRecent: () => void;
  onStartNewAttempt: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const state = operation?.state || null;
  const working = Boolean(busy) || state === "queued" || state === "processing";
  const canRestart = state === "failed" || state === "cancelled";

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.headingRow}>
        {working ? <ActivityIndicator color={palette.accent} /> : null}
        <Text style={styles.heading}>
          {operation
            ? `Provider operation: ${operation.state.toUpperCase()}`
            : busy
              ? "Checking provider operation"
              : "Provider result recovery"}
        </Text>
      </View>
      {operation ? <Text style={styles.detail}>{creditCopy(operation)}</Text> : null}
      {operation?.error ? (
        <Text style={styles.error}>{operation.error.message}</Text>
      ) : null}
      {error ? (
        <Text style={styles.error}>{businessDeskProviderErrorMessage(error)}</Text>
      ) : null}
      {notice ? <Text style={styles.detail}>{notice}</Text> : null}
      {operation ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh provider operation status"
            accessibilityState={{ disabled: Boolean(busy), busy: busy === "refreshing" }}
            disabled={Boolean(busy)}
            onPress={onRefresh}
            style={[styles.button, busy && styles.disabled]}
          >
            <Text style={styles.buttonText}>Refresh status</Text>
          </Pressable>
          {operation.cancellable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel provider operation"
              accessibilityState={{ disabled: Boolean(busy), busy: busy === "canceling" }}
              disabled={Boolean(busy)}
              onPress={onCancel}
              style={[styles.dangerButton, busy && styles.disabled]}
            >
              <Text style={styles.dangerText}>Cancel safely</Text>
            </Pressable>
          ) : null}
          {canRestart ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new provider attempt"
              accessibilityState={{ disabled: Boolean(busy) }}
              disabled={Boolean(busy)}
              onPress={onStartNewAttempt}
              style={[styles.button, busy && styles.disabled]}
            >
              <Text style={styles.buttonText}>Start a new attempt</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recover recent provider results"
            accessibilityState={{ disabled: Boolean(busy), busy: busy === "restoring" }}
            disabled={Boolean(busy)}
            onPress={onRecoverRecent}
            style={[styles.button, busy && styles.disabled]}
          >
            <Text style={styles.buttonText}>Recover recent results</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    button: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    buttonText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    dangerButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    dangerText: { color: palette.danger, fontSize: 13, fontWeight: "900" },
    detail: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    disabled: { opacity: 0.6 },
    error: { color: palette.danger, fontSize: 12, fontWeight: "800", lineHeight: 18 },
    heading: { color: palette.text, fontSize: 13, fontWeight: "900" },
    headingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
    wrap: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      padding: 12
    }
  });
}
