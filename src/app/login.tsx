import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const auth = useAuth();

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
      const normalizedEmail = email.trim().toLowerCase();
      await auth.login(normalizedEmail, password);
      router.replace("/");
    } catch (e: any) {
      if (e instanceof ApiError) {
        const backendMessage =
          e.data?.error?.message || e.data?.message || "Invalid email or password";
        setErrMsg(backendMessage);
      } else {
        setErrMsg(e?.message || "Login failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.bannerFrame}>
        <Image
          source={require("../../assets/banner.png")}
          style={styles.bannerImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.brandBlock}>
        <View style={styles.logoMark}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brand}>GrowPath</Text>
        <Text style={styles.tagline}>Commercial growing intelligence</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Sign in</Text>

        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#6b7280"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />

        {errMsg ? <Text style={styles.error}>{errMsg}</Text> : null}

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/register")} style={styles.linkBtn}>
          <Text style={styles.linkText}>Create account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16
  },
  bannerFrame: {
    width: "100%",
    maxWidth: 720,
    aspectRatio: 1.5,
    alignSelf: "center",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#eef2f7"
  },
  bannerImage: {
    width: "100%",
    height: "100%"
  },
  brandBlock: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 8
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db"
  },
  logo: {
    width: 58,
    height: 58
  },
  brand: {
    color: "#111827",
    fontSize: 32,
    fontWeight: "800"
  },
  tagline: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6
  },
  form: {
    paddingTop: 24
  },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 16, color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  error: { color: "#b91c1c", marginBottom: 12, fontWeight: "600" },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#166534"
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: "800", color: "#ffffff" },
  linkBtn: { marginTop: 14, alignItems: "center" },
  linkText: { fontWeight: "800", color: "#166534" }
});
