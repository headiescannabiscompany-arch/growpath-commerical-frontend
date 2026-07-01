import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
  Platform,
  Share
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { requestEmailVerification } from "@/api/auth";
import { deleteAccount, exportPrivacyData, updateProfile } from "@/api/users";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 42 },
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
  statusRow: {
    alignItems: "center",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  statusLabel: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  statusValue: { fontSize: 12, fontWeight: "900" },
  statusVerified: { color: "#166534" },
  statusUnverified: { color: "#B45309" },
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
  buttonSecondaryText: { color: "#0F172A", fontWeight: "800" },

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
  mutedText: { marginTop: 8, fontSize: 12, color: "#64748B", lineHeight: 18 }
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
  const [resendingVerification, setResendingVerification] = useState(false);
  const [privacyFeedback, setPrivacyFeedback] = useState("");
  const [privacyError, setPrivacyError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const mode = ent.mode || "personal";
  const plan = ent.plan || "free";
  const emailVerified = Boolean(auth.user?.emailVerified);

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

  const handleResendVerification = async () => {
    if (!email || email === "unknown" || resendingVerification) return;
    setResendingVerification(true);
    setEmailFeedback("");
    setEmailError("");
    try {
      await requestEmailVerification(email);
      setEmailFeedback("If this account needs verification, a new email has been sent.");
    } catch (e: any) {
      setEmailError(e?.message || "Unable to request verification email.");
    } finally {
      setResendingVerification(false);
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

  const handleExportData = async () => {
    setExporting(true);
    setPrivacyFeedback("");
    setPrivacyError("");
    try {
      const data = await exportPrivacyData();
      const payload = JSON.stringify(data, null, 2);
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `growpathai-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setPrivacyFeedback("Data export downloaded.");
      } else {
        await Share.share({
          title: "GrowPathAI data export",
          message: payload
        });
        setPrivacyFeedback("Data export opened in the share sheet.");
      }
    } catch (e: any) {
      setPrivacyError(e?.message || "Unable to export account data.");
    } finally {
      setExporting(false);
    }
  };

  const executeDeleteAccount = async () => {
    setDeleting(true);
    setPrivacyFeedback("");
    setPrivacyError("");
    try {
      await deleteAccount("user_requested_from_profile");
      if (typeof (auth as any).logout === "function") {
        await (auth as any).logout();
      } else if (typeof (auth as any).setToken === "function") {
        (auth as any).setToken(null);
      }
      router.replace("/login" as any);
    } catch (e: any) {
      setPrivacyError(e?.message || "Unable to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setPrivacyError("Type DELETE to confirm account deletion.");
      return;
    }

    const message =
      "This anonymizes your account, disables active tasks, archives personal grows, and logs you out. Some records may be retained in anonymized form for security, compliance, billing, dispute, or backup retention.";

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
    ) {
      if (window.confirm(`Delete account?\n\n${message}`)) {
        executeDeleteAccount();
      }
      return;
    }

    Alert.alert("Delete account?", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete account",
        style: "destructive",
        onPress: executeDeleteAccount
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Account and plan details</Text>

      <View style={styles.card}>
        <Text style={styles.rowLabel}>Email</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text
            style={[
              styles.statusValue,
              emailVerified ? styles.statusVerified : styles.statusUnverified
            ]}
          >
            {emailVerified ? "Verified" : "Not verified"}
          </Text>
        </View>
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
        {!emailVerified ? (
          <Pressable
            style={[
              styles.button,
              (resendingVerification || !email || email === "unknown") && {
                opacity: 0.55
              }
            ]}
            disabled={resendingVerification || !email || email === "unknown"}
            onPress={handleResendVerification}
          >
            <Text style={styles.buttonSecondaryText}>
              {resendingVerification ? "Sending..." : "Resend verification email"}
            </Text>
          </Pressable>
        ) : null}
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

      <View style={styles.card}>
        <Text style={styles.rowLabel}>Privacy and account data</Text>
        <Text style={styles.mutedText}>
          Export your account data as JSON, or request account deletion. Deletion
          anonymizes the account and archives active personal records instead of blindly
          removing grow history.
        </Text>
        {privacyFeedback ? <Text style={styles.feedback}>{privacyFeedback}</Text> : null}
        {privacyError ? <Text style={styles.error}>{privacyError}</Text> : null}
        <Pressable
          style={[styles.button, exporting && { opacity: 0.55 }]}
          disabled={exporting}
          onPress={handleExportData}
          accessibilityRole="button"
          accessibilityLabel="Export account data"
        >
          <Text style={styles.buttonSecondaryText}>
            {exporting ? "Exporting..." : "Export Account Data"}
          </Text>
        </Pressable>
        <TextInput
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Type DELETE to confirm"
          value={deleteConfirm}
          onChangeText={(value) => {
            setDeleteConfirm(value);
            setPrivacyError("");
          }}
          accessibilityLabel="Delete account confirmation"
        />
        <Pressable
          style={[
            styles.button,
            styles.buttonDanger,
            (deleting || deleteConfirm.trim().toUpperCase() !== "DELETE") && {
              opacity: 0.55
            }
          ]}
          disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
          onPress={handleDeleteAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          <Text style={styles.buttonDangerText}>
            {deleting ? "Deleting..." : "Delete Account"}
          </Text>
        </Pressable>
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
    </ScrollView>
  );
}
