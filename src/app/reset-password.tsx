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
import { resetPassword } from "@/api/auth";
import BackButton from "@/components/nav/BackButton";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string | string[];
    resetToken?: string | string[];
    code?: string | string[];
  }>();
  const token = useMemo(() => {
    const raw = params.token || params.resetToken || params.code;
    return Array.isArray(raw) ? raw[0] || "" : raw || "";
  }, [params.code, params.resetToken, params.token]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !submitting;
  }, [submitting]);

  async function onSubmit() {
    setMessage(null);
    setError(null);

    if (!token) {
      setError("This reset link is missing a token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setMessage("Your password has been updated. You can sign in now.");
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || "Unable to reset password.");
      } else {
        setError(err?.message || "Unable to reset password.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <BackButton fallbackHref="/login" />
        <Text style={styles.title}>Choose new password</Text>
        <Text style={styles.message}>
          Enter a new password for your GrowPathAI account. Reset links expire after 1
          hour.
        </Text>

        <TextInput
          accessibilityLabel="New password"
          placeholder="New password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TextInput
          accessibilityLabel="Confirm new password"
          placeholder="Confirm new password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Update password"
          disabled={!canSubmit}
          onPress={onSubmit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Update password</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to sign in"
          onPress={() => router.replace("/login")}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Go to sign in</Text>
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
