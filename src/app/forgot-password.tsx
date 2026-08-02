import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ApiError } from "@/api/apiRequest";
import { forgotPassword } from "@/api/auth";
import BackButton from "@/components/nav/BackButton";
import { SUPPORT_CONTACTS } from "@/config/supportContacts";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { claimLoginPath, parseClaimReturnPath } from "@/utils/claimReturnPath";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string | string[];
    next?: string | string[];
  }>();
  const { palette } = useAppTheme();
  const styles = createForgotPasswordStyles(palette);
  const claimNext = parseClaimReturnPath(params.next);
  const initialEmail = String(
    Array.isArray(params.email) ? params.email[0] || "" : params.email || ""
  );
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && !submitting;
  }, [email, submitting]);

  async function onSubmit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || submitting) return;

    setMessage(null);
    setError(null);
    setSubmitting(true);
    try {
      const response = claimNext
        ? await forgotPassword(normalizedEmail, claimNext)
        : await forgotPassword(normalizedEmail);
      if (response.emailSent === false) {
        setError(
          `Password reset email is not available right now. Email ${SUPPORT_CONTACTS.general} to reset this account.`
        );
        return;
      }
      setMessage(
        response.message || "If an account exists, reset instructions have been sent."
      );
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(forgotPasswordErrorMessage(err));
      } else {
        setError(
          `Unable to reach GrowPath right now. Check your connection and try again. If it keeps happening, email ${SUPPORT_CONTACTS.general}.`
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <BackButton fallbackHref={claimLoginPath(email, claimNext)} />
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Reset password
        </Text>
        <Text style={styles.message}>
          Enter your account email and GrowPath will send password reset instructions if
          the account exists.
        </Text>

        <TextInput
          accessibilityLabel="Account email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={palette.textMuted}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          onSubmitEditing={onSubmit}
          returnKeyType="send"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send password reset email"
          disabled={!canSubmit}
          onPress={onSubmit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.buttonText}>Send reset email</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          onPress={() => router.replace(claimLoginPath(email, claimNext) as any)}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Back to sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

function forgotPasswordErrorMessage(error: ApiError) {
  if (
    error.code === "NETWORK_ERROR" ||
    error.code === "OFFLINE" ||
    error.code === "TIMEOUT" ||
    error.code === "API_URL_NOT_CONFIGURED" ||
    (typeof error.status === "number" && error.status >= 500)
  ) {
    return `Unable to reach GrowPath right now. Check your connection and try again. If it keeps happening, email ${SUPPORT_CONTACTS.general}.`;
  }
  return error.message || "Unable to request password reset instructions.";
}

export const createForgotPasswordStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.page,
      padding: 16
    },
    panel: {
      width: "100%",
      maxWidth: 420,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 22,
      gap: 14
    },
    title: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "800"
    },
    message: {
      color: palette.textSoft,
      fontSize: 15,
      lineHeight: 22
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      color: palette.text,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: radius.card
    },
    error: {
      color: palette.danger,
      fontSize: 13,
      fontWeight: "700"
    },
    success: {
      color: palette.success,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18
    },
    button: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      borderRadius: radius.card,
      backgroundColor: palette.accent,
      paddingHorizontal: 16
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: {
      color: palette.accentText,
      fontSize: 15,
      fontWeight: "700"
    },
    linkButton: { alignItems: "center" },
    linkText: { color: palette.link, fontSize: 14, fontWeight: "800" }
  });
