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

import { apiRequest } from "@/api/apiRequest";
import { setToken } from "@/auth/tokenStore";

function extractToken(payload: any): string | null {
  if (!payload) return null;

  const candidates = [
    payload.token,
    payload?.data?.token,
    payload?.data?.accessToken,
    payload?.accessToken,
    payload?.jwt,
    payload?.data?.jwt
  ];

  const raw = candidates.find((x) => typeof x === "string" && x.length > 10);
  if (!raw) return null;

  const t = raw.startsWith("Bearer ") ? raw.slice("Bearer ".length) : raw;
  const out = t.trim();
  return out ? out : null;
}

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length > 0 && !submitting;
  }, [email, password, submitting]);

  async function onSubmit() {
    setErrMsg(null);
    setSubmitting(true);

    try {
      const out = await apiRequest<any>("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
        auth: false
      });

      const token = extractToken(out);
      if (!token) throw new Error("Login response missing token.");

      await setToken(token);
      router.replace("/");
    } catch (e: any) {
      setErrMsg(e?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {errMsg ? <Text style={styles.error}>{errMsg}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        {submitting ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  error: { color: "#b00020", marginBottom: 12 },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#111"
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: "700" }
});
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

import { apiRequest } from "@/api/apiRequest";
import { setToken } from "@/auth/tokenStore";

function extractToken(payload: any): string | null {
  if (!payload) return null;

  const candidates = [
    payload.token,
    payload?.data?.token,
    payload?.data?.accessToken,
    payload?.accessToken,
    payload?.jwt,
    payload?.data?.jwt
  ];

  const raw = candidates.find((x) => typeof x === "string" && x.length > 10);
  if (!raw) return null;

  const t = raw.startsWith("Bearer ") ? raw.slice("Bearer ".length) : raw;
  return t.trim() ? t.trim() : null;
}

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length > 0 && !submitting;
  }, [email, password, submitting]);

  async function onSubmit() {
    setErrMsg(null);
    setSubmitting(true);

    try {
      const out = await apiRequest<any>("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
        auth: false
      });

      const token = extractToken(out);
      if (!token) throw new Error("Login response missing token.");

      await setToken(token);

      // Let index.tsx bootstrap /api/me + entitlements deterministically
      router.replace("/");
    } catch (e: any) {
      setErrMsg(e?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {errMsg ? <Text style={styles.error}>{errMsg}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        {submitting ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  error: { color: "#b00020", marginBottom: 12 },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#111"
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: "700" }
});
