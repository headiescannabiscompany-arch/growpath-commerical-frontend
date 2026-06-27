import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { updateProfile } from "@/api/users";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 18 },

  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 12
  },
  rowLabel: { fontSize: 12, color: "#64748B" },
  rowValue: { marginTop: 4, fontSize: 15, fontWeight: "700" },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#FFFFFF"
  },
  feedback: { marginTop: 8, fontSize: 12, color: "#047857", fontWeight: "700" },
  error: { marginTop: 8, fontSize: 12, color: "#DC2626", fontWeight: "700" },

  button: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  buttonPrimary: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  buttonPrimaryText: { color: "#fff", fontWeight: "800" },

  buttonDanger: { backgroundColor: "#fff", borderColor: "#FCA5A5" },
  buttonDangerText: { color: "#DC2626", fontWeight: "800" },

  accountAction: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    backgroundColor: "#FFFFFF"
  },
  accountActionText: { fontWeight: "800", color: "#0F172A" },
  mutedText: { marginTop: 8, fontSize: 12, color: "#64748B" }
});

export default function ProfileScreen() {
  const router = useRouter();
  const auth = useAuth();
  const ent = useEntitlements();

  const email = auth.user?.email || "unknown";
  const [emailDraft, setEmailDraft] = useState(email === "unknown" ? "" : email);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState("");
  const [emailError, setEmailError] = useState("");
  const mode = ent.mode || "personal";
  const plan = ent.plan || "free";

  useEffect(() => {
    setEmailDraft(email === "unknown" ? "" : email);
  }, [email]);

  const handleSaveEmail = async () => {
    const nextEmail = emailDraft.trim().toLowerCase();
    if (!nextEmail || nextEmail === email) return;
    setSavingEmail(true);
    setEmailFeedback("");
    setEmailError("");
    try {
      await updateProfile({ email: nextEmail });
      await auth.retryMe();
      setEmailFeedback("Email updated.");
    } catch (e: any) {
      const message =
        e?.data?.error?.message ||
        e?.data?.message ||
        e?.message ||
        "Failed to update email";
      setEmailError(message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out?", "You'll be returned to the login screen.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            if (typeof (auth as any).logout === "function") {
              await (auth as any).logout();
            } else if (typeof (auth as any).setToken === "function") {
              (auth as any).setToken(null);
            }

            router.replace("/login" as any);
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to log out");
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Account and plan details</Text>

      <View style={styles.card}>
        <Text style={styles.rowLabel}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="email@example.com"
          value={emailDraft}
          onChangeText={(value) => {
            setEmailDraft(value);
            setEmailFeedback("");
            setEmailError("");
          }}
        />
        {emailFeedback ? <Text style={styles.feedback}>{emailFeedback}</Text> : null}
        {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
        <Pressable
          style={[
            styles.button,
            styles.buttonPrimary,
            (savingEmail || emailDraft.trim().toLowerCase() === email) && {
              opacity: 0.55
            }
          ]}
          disabled={savingEmail || emailDraft.trim().toLowerCase() === email}
          onPress={handleSaveEmail}
        >
          <Text style={styles.buttonPrimaryText}>
            {savingEmail ? "Saving..." : "Update Email"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.rowLabel}>Mode</Text>
        <Text style={styles.rowValue}>{mode}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.rowLabel}>Plan</Text>
        <Text style={styles.rowValue}>{plan}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.rowLabel}>Other account types</Text>
        <Pressable
          style={styles.accountAction}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={styles.accountActionText}>Sign in to Commercial account</Text>
        </Pressable>
        <Pressable
          style={styles.accountAction}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={styles.accountActionText}>Sign in to Facility account</Text>
        </Pressable>
        <Text style={styles.mutedText}>
          Personal, Commercial, and Facility are separate account types.
        </Text>
      </View>

      <Pressable
        style={[styles.button, styles.buttonPrimary]}
        onPress={() =>
          Alert.alert(
            "Manage Plan",
            "Plan details and upgrades are available from your account settings."
          )
        }
      >
        <Text style={styles.buttonPrimaryText}>Manage Plan</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.buttonDanger]} onPress={handleLogout}>
        <Text style={styles.buttonDangerText}>Log out</Text>
      </Pressable>
    </View>
  );
}
