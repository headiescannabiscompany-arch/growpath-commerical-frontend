import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "@/api/apiRequest";
import { requestEmailVerification } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import LegalLinks from "@/components/LegalLinks";

export default function LoginScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [verificationMsg, setVerificationMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length > 0 && !submitting;
  }, [email, password, submitting]);

  async function onSubmit() {
    setErrMsg(null);
    setVerificationMsg(null);
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
        if (e.code === "EMAIL_NOT_VERIFIED") {
          setVerificationEmail(email.trim().toLowerCase());
        }
      } else {
        setErrMsg(e?.message || "Login failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendVerification() {
    const targetEmail = verificationEmail || email.trim().toLowerCase();
    if (!targetEmail || resendingVerification) return;

    setVerificationMsg(null);
    setResendingVerification(true);
    try {
      await requestEmailVerification(targetEmail);
      setVerificationMsg(
        "If that account exists, a new verification email has been sent."
      );
    } catch (e: any) {
      setVerificationMsg(e?.message || "Unable to request a verification email.");
    } finally {
      setResendingVerification(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.shell, isWide ? styles.shellWide : null]}>
        <View style={[styles.visualPanel, isWide ? styles.visualPanelWide : null]}>
          <View style={styles.bannerFrame}>
            <Image
              source={require("../../assets/banner.png")}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={[styles.formCard, isWide ? styles.formCardWide : null]}>
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
          {verificationEmail ? (
            <View style={styles.verificationBox}>
              <Text style={styles.verificationText}>
                Check your inbox for the GrowPathAI verification link.
              </Text>
              {verificationMsg ? (
                <Text style={styles.verificationNote}>{verificationMsg}</Text>
              ) : null}
              <Pressable
                onPress={onResendVerification}
                disabled={resendingVerification}
                accessibilityRole="button"
                accessibilityLabel="Resend verification email"
                style={[
                  styles.secondaryButton,
                  resendingVerification && styles.buttonDisabled
                ]}
              >
                {resendingVerification ? (
                  <ActivityIndicator color="#166534" />
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    Resend verification email
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push("/register")}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Create account</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/forgot-password")}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            style={styles.linkBtnTight}
          >
            <Text style={styles.linkText}>Forgot password?</Text>
          </Pressable>

          <LegalLinks />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  content: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    padding: 16
  },
  shell: {
    alignItems: "stretch",
    gap: 18,
    maxWidth: 1120,
    width: "100%"
  },
  shellWide: {
    alignItems: "center",
    flexDirection: "row",
    gap: 28
  },
  visualPanel: { width: "100%" },
  visualPanelWide: { flex: 1.25 },
  bannerFrame: {
    width: "100%",
    aspectRatio: 1.42,
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
    paddingBottom: 18
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
  formCard: {
    backgroundColor: "transparent",
    width: "100%"
  },
  formCardWide: {
    backgroundColor: "#ffffff",
    borderColor: "#d8ded6",
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
    width: 420
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
  verificationBox: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8
  },
  verificationText: {
    color: "#1e3a8a",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  verificationNote: {
    color: "#1f2937",
    fontSize: 13,
    lineHeight: 18
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#166534"
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: "800", color: "#ffffff" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#93c5fd",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  secondaryButtonText: { fontWeight: "800", color: "#166534" },
  linkBtn: { marginTop: 14, alignItems: "center" },
  linkBtnTight: { marginTop: 8, alignItems: "center" },
  linkText: { fontWeight: "800", color: "#166534" }
});
