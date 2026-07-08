import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { SignupBody } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import LegalLinks from "@/components/LegalLinks";

type AccountChoice = {
  key: "free" | "pro" | "commercial" | "facility";
  mode: "personal" | "commercial" | "facility";
  title: string;
  label: string;
  description: string;
  afterSignup: string;
};

const ACCOUNT_CHOICES: AccountChoice[] = [
  {
    key: "free",
    mode: "personal",
    title: "Free grower",
    label: "Free",
    description: "Start with personal grow tracking, community, and basic tools.",
    afterSignup: "/home/personal"
  },
  {
    key: "pro",
    mode: "personal",
    title: "Pro grower",
    label: "Pro",
    description: "Use advanced personal tools, AI workflows, and export paths.",
    afterSignup: "/onboarding/walkthroughs"
  },
  {
    key: "commercial",
    mode: "commercial",
    title: "Commercial brand",
    label: "Commercial",
    description:
      "Manage storefront, products, courses, lives, Feed campaigns, and orders.",
    afterSignup: "/onboarding/walkthroughs"
  },
  {
    key: "facility",
    mode: "facility",
    title: "Facility operator",
    label: "Facility",
    description:
      "Run rooms, batches, tasks, team training, sensor imports, and audit logs.",
    afterSignup: "/onboarding/walkthroughs"
  }
];

export default function RegisterScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;

  const [choice, setChoice] = useState<AccountChoice>(ACCOUNT_CHOICES[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      email.trim().length > 3 &&
      password.length >= 1 &&
      !submitting
    );
  }, [name, email, password, submitting]);

  async function onSubmit() {
    setErrMsg(null);
    setInfoMsg(null);
    setSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const payload: SignupBody = {
        name: name.trim(),
        displayName: name.trim(),
        email: normalizedEmail,
        password,
        plan: choice.key,
        mode: choice.mode
      };
      const signupResult = await auth.signup(payload);
      if (signupResult.emailVerificationRequired && !signupResult.token) {
        setPassword("");
        setInfoMsg(
          signupResult.emailSent
            ? "Account created. Check your email to verify the account before signing in."
            : "Account created. Email verification is required before signing in. Use Resend verification on the login screen, or contact support."
        );
        return;
      }
      router.replace({
        pathname: "/onboarding/guilds",
        params: { next: choice.afterSignup, mode: choice.mode, plan: choice.key }
      } as any);
    } catch (e: any) {
      if (e instanceof ApiError) {
        const backendMessage =
          e.data?.error?.message || e.data?.message || "Registration failed";
        setErrMsg(backendMessage);
      } else {
        setErrMsg(e?.message || "Registration failed");
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
      <View style={[styles.shell, isWide ? styles.shellWide : null]}>
        <View style={styles.planPanel}>
          <Text style={styles.kicker}>Choose account</Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Pick the workflow you need now. You can still change plans as the account
            grows.
          </Text>

          <View style={styles.choiceGrid}>
            {ACCOUNT_CHOICES.map((item) => {
              const active = choice.key === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setChoice(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.label} account`}
                  style={({ pressed }) => [
                    styles.choice,
                    active && styles.choiceActive,
                    pressed && styles.pressed
                  ]}
                >
                  <View style={styles.choiceHeader}>
                    <Text style={styles.choiceLabel}>{item.label}</Text>
                    <View style={[styles.radio, active && styles.radioActive]} />
                  </View>
                  <Text style={styles.choiceTitle}>{item.title}</Text>
                  <Text style={styles.choiceDesc}>{item.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.formCard, isWide ? styles.formCardWide : null]}>
          <Text style={styles.formTitle}>{choice.title}</Text>
          <Text style={styles.formSub}>{choice.description}</Text>

          <TextInput
            accessibilityLabel="Register name"
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            accessibilityLabel="Register email"
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
            accessibilityLabel="Register password"
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
          {infoMsg ? <Text style={styles.success}>{infoMsg}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={`Create ${choice.label} account`}
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Create {choice.label} account</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.replace("/login")}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Back to login</Text>
          </Pressable>

          <LegalLinks />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#f4f6f3", flex: 1 },
  content: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    padding: 16
  },
  shell: { gap: 14, maxWidth: 1120, width: "100%" },
  shellWide: { alignItems: "flex-start", flexDirection: "row", gap: 24 },
  planPanel: { flex: 1, minWidth: 0 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase"
  },
  title: { color: "#111827", fontSize: 34, fontWeight: "900", marginBottom: 8 },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 16,
    maxWidth: 640
  },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  choice: {
    backgroundColor: "#ffffff",
    borderColor: "#d7ddd2",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 142,
    padding: 14,
    width: "100%"
  },
  choiceActive: { borderColor: "#166534", borderWidth: 2 },
  choiceHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  choiceLabel: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  radio: {
    borderColor: "#94a3b8",
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    width: 16
  },
  radioActive: { backgroundColor: "#166534", borderColor: "#166534" },
  choiceTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6
  },
  choiceDesc: { color: "#475569", fontWeight: "700", lineHeight: 20 },
  formCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d7ddd2",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    width: "100%"
  },
  formCardWide: { padding: 22, width: 390 },
  formTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6
  },
  formSub: { color: "#64748b", fontWeight: "700", lineHeight: 20, marginBottom: 16 },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  error: { color: "#b91c1c", fontWeight: "700", marginBottom: 12 },
  success: { color: "#166534", fontWeight: "700", marginBottom: 12 },
  button: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingVertical: 12
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#ffffff", fontWeight: "900" },
  linkBtn: { alignItems: "center", marginTop: 14 },
  linkText: { color: "#166534", fontWeight: "900" },
  pressed: { opacity: 0.84 }
});
