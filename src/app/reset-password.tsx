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
import { radius } from "@/theme/theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string | string[];
    resetToken?: string | string[];
    code?: string | string[];
    token_hash?: string | string[];
    access_token?: string | string[];
  }>();
  const token = useMemo(() => {
    return firstTokenValue(
      params.token,
      params.resetToken,
      params.code,
      params.token_hash,
      params.access_token,
      browserResetToken()
    );
  }, [
    params.access_token,
    params.code,
    params.resetToken,
    params.token,
    params.token_hash
  ]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const resetComplete = Boolean(message);

  const canSubmit = useMemo(() => {
    return !submitting && !resetComplete;
  }, [resetComplete, submitting]);

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
      const response = await resetPassword(token, password);
      setAccountEmail(
        String(response.email || "")
          .trim()
          .toLowerCase()
      );
      setMessage("Your password has been updated. You can sign in now.");
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(resetErrorMessage(err));
      } else {
        setError(
          "Unable to reach GrowPath right now. Check your connection and try again."
        );
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
          Enter a new password for your GrowPath account. Reset links expire after 1 hour.
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
        {error && (error.toLowerCase().includes("expired") || !token) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Request another reset link"
            onPress={() => router.replace("/forgot-password")}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Request another reset link</Text>
          </Pressable>
        ) : null}

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
          onPress={() =>
            router.replace(
              accountEmail
                ? (`/login?email=${encodeURIComponent(accountEmail)}&reset=success` as any)
                : "/login"
            )
          }
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Go to sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

function firstTokenValue(...values: Array<string | string[] | null | undefined>) {
  for (const value of values) {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function browserResetToken() {
  const location = (globalThis as any)?.window?.location;
  const rawParts = [location?.search, location?.hash].filter(
    (value) => typeof value === "string" && value.length
  );
  for (const raw of rawParts) {
    const clean = String(raw).replace(/^[?#]/, "");
    const queryText = clean.includes("?") ? clean.slice(clean.indexOf("?") + 1) : clean;
    const searchParams = new URLSearchParams(queryText);
    const token = firstTokenValue(
      searchParams.get("token"),
      searchParams.get("resetToken"),
      searchParams.get("code"),
      searchParams.get("token_hash"),
      searchParams.get("access_token")
    );
    if (token) return token;
  }
  return "";
}

function resetErrorMessage(error: ApiError) {
  if (error.code === "INVALID_RESET_TOKEN") {
    return "This reset link is invalid or expired. Request a new reset email.";
  }
  if (
    error.code === "NETWORK_ERROR" ||
    error.code === "OFFLINE" ||
    error.code === "TIMEOUT" ||
    error.code === "API_URL_NOT_CONFIGURED" ||
    (typeof error.status === "number" && error.status >= 500)
  ) {
    return "Unable to reach GrowPath right now. Check your connection and try again.";
  }
  return error.message || "Unable to reset password.";
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
    borderRadius: radius.card,
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
    borderRadius: radius.card
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
    borderRadius: radius.card,
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
