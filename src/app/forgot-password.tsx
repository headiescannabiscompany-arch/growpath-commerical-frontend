import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "@/api/apiRequest";
import { forgotPassword } from "@/api/auth";
import BackButton from "@/components/nav/BackButton";
import { SUPPORT_CONTACTS } from "@/config/supportContacts";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
      const response = await forgotPassword(normalizedEmail);
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
        setError(err.message || "Unable to request password reset instructions.");
      } else {
        setError(err?.message || "Unable to request password reset instructions.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <BackButton fallbackHref="/login" />
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.message}>
          Enter your account email and GrowPathAI will send password reset instructions if
          the account exists.
        </Text>

        <TextInput
          accessibilityLabel="Account email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#6b7280"
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
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Send reset email</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          onPress={() => router.replace("/login")}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Back to sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: 16
  },
  panel: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe3ea",
    backgroundColor: "#ffffff",
    padding: 22,
    gap: 14
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800"
  },
  message: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 22
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "700"
  },
  success: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#166534",
    paddingHorizontal: 16
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  linkButton: { alignItems: "center" },
  linkText: { color: "#166534", fontSize: 14, fontWeight: "800" }
});
