import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { requestEmailVerification } from "@/api/auth";
import { deleteAccount, exportPrivacyData, updateProfile } from "@/api/users";
import { useAuth } from "@/auth/AuthContext";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import LegalLinks from "@/components/LegalLinks";
import { useEntitlements } from "@/entitlements";

function normalizeStatus(value: unknown) {
  const status = String(value || "inactive").toLowerCase();
  if (["active", "trial", "trialing"].includes(status)) return status;
  return status || "inactive";
}

function hasActivePaidStatus(value: unknown) {
  return ["active", "trial", "trialing"].includes(String(value || "").toLowerCase());
}

export default function Profile() {
  const router = useRouter();
  const auth = useAuth();
  const ent = useEntitlements();

  const email = auth.user?.email || "";
  const [emailDraft, setEmailDraft] = useState(email);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState("");
  const [emailError, setEmailError] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [privacyFeedback, setPrivacyFeedback] = useState("");
  const [privacyError, setPrivacyError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setEmailDraft(email);
  }, [email]);

  const subscriptionStatus = normalizeStatus(auth.user?.subscriptionStatus);
  const requestedPlan = auth.user?.plan || "free";
  const activePlan = ent.plan || "free";
  const mode = ent.mode || "personal";
  const isCommercial = mode === "commercial";
  const emailChanged = emailDraft.trim().toLowerCase() !== email.toLowerCase();
  const canSaveEmail = emailDraft.trim().length > 3 && emailChanged && !savingEmail;
  const emailVerified = Boolean(auth.user?.emailVerified);

  const planNote = useMemo(() => {
    if (
      requestedPlan !== "free" &&
      requestedPlan === activePlan &&
      hasActivePaidStatus(subscriptionStatus)
    ) {
      return "Your subscription is active for this account.";
    }
    if (requestedPlan !== "free" && activePlan === "free") {
      return "Checkout has not completed, so this account currently uses free access.";
    }
    if (requestedPlan === "free" && activePlan === "free") {
      return "This account is using free access.";
    }
    return "Use Manage Plan to start or change checkout.";
  }, [activePlan, requestedPlan, subscriptionStatus]);

  async function handleSaveEmail() {
    if (!canSaveEmail) return;
    const nextEmail = emailDraft.trim().toLowerCase();
    setSavingEmail(true);
    setEmailFeedback("");
    setEmailError("");
    try {
      const result = await updateProfile({ email: nextEmail });
      await auth.retryMe();
      setEmailFeedback(
        result?.emailVerificationRequired
          ? "Email updated. Check the new inbox for a verification link."
          : "Email updated."
      );
    } catch (e: any) {
      setEmailError(
        e?.data?.error?.message ||
          e?.data?.message ||
          e?.message ||
          "Failed to update email."
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleResendVerification() {
    if (!email || resendingVerification) return;
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
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await auth.logout();
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleExportData() {
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
        await Share.share({ title: "GrowPathAI data export", message: payload });
        setPrivacyFeedback("Data export opened in the share sheet.");
      }
    } catch (e: any) {
      setPrivacyError(e?.message || "Unable to export account data.");
    } finally {
      setExporting(false);
    }
  }

  async function executeDeleteAccount() {
    setDeleting(true);
    setPrivacyFeedback("");
    setPrivacyError("");
    try {
      await deleteAccount("user_requested_from_profile");
      await auth.logout();
      router.replace("/login");
    } catch (e: any) {
      setPrivacyError(e?.message || "Unable to delete account.");
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteAccount() {
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
      if (window.confirm(`Delete account?\n\n${message}`)) executeDeleteAccount();
      return;
    }

    Alert.alert("Delete account?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete account", style: "destructive", onPress: executeDeleteAccount }
    ]);
  }

  return (
    <AppPage
      routeKey="profile"
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Account</Text>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>
            Manage sign-in, plan status, and account access.
          </Text>
        </View>
      }
    >
      <View style={styles.grid}>
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Sign-in email</Text>
          <Text style={styles.cardText}>
            This is the email used for login and account recovery.
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Email status</Text>
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
            accessibilityLabel="Profile email"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="email@example.com"
            placeholderTextColor="#64748b"
            value={emailDraft}
            onChangeText={(value) => {
              setEmailDraft(value);
              setEmailFeedback("");
              setEmailError("");
            }}
          />
          {emailFeedback ? (
            <Text style={styles.feedbackText}>{emailFeedback}</Text>
          ) : null}
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          <Pressable
            onPress={handleSaveEmail}
            disabled={!canSaveEmail}
            accessibilityRole="button"
            accessibilityLabel="Update email"
            style={[styles.primaryButton, !canSaveEmail && styles.disabledButton]}
          >
            {savingEmail ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Update email</Text>
            )}
          </Pressable>
          {!emailVerified ? (
            <Pressable
              onPress={handleResendVerification}
              disabled={resendingVerification || !email}
              accessibilityRole="button"
              accessibilityLabel="Resend verification email"
              style={[
                styles.secondaryButton,
                (resendingVerification || !email) && styles.disabledButton
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {resendingVerification ? "Sending..." : "Resend verification email"}
              </Text>
            </Pressable>
          ) : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Plan status</Text>
          <View style={styles.factGrid}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Mode</Text>
              <Text style={styles.factValue}>{mode}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Access plan</Text>
              <Text style={styles.factValue}>{activePlan}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Requested plan</Text>
              <Text style={styles.factValue}>{requestedPlan}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Subscription</Text>
              <Text style={styles.factValue}>{subscriptionStatus}</Text>
            </View>
          </View>
          <Text style={styles.cardText}>{planNote}</Text>
          <Pressable
            onPress={() => router.push("/offers")}
            accessibilityRole="button"
            accessibilityLabel="Manage plan"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Manage plan</Text>
          </Pressable>
        </AppCard>

        {isCommercial ? (
          <AppCard style={styles.card}>
            <Text style={styles.cardTitle}>Commercial brand identity</Text>
            <Text style={styles.cardText}>
              Manage the public brand details users see from storefronts, Feed/Campaigns,
              Forum/Q&A replies, courses, and product pages.
            </Text>
            <View style={styles.factGrid}>
              <View style={styles.fact}>
                <Text style={styles.factLabel}>Public profile</Text>
                <Text style={styles.factValue}>Brand page</Text>
              </View>
              <View style={styles.fact}>
                <Text style={styles.factLabel}>Storefront</Text>
                <Text style={styles.factValue}>Product cards</Text>
              </View>
              <View style={styles.fact}>
                <Text style={styles.factLabel}>Forum / Q&A</Text>
                <Text style={styles.factValue}>Brand replies</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => router.push("/home/commercial/profile")}
                accessibilityRole="button"
                accessibilityLabel="Manage commercial brand profile"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Brand settings</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/home/commercial/storefront")}
                accessibilityRole="button"
                accessibilityLabel="Manage commercial storefront"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Storefront settings</Text>
              </Pressable>
            </View>
          </AppCard>
        ) : null}

        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Account type</Text>
          <Text style={styles.cardText}>
            Free, Pro, Commercial, and Facility accounts keep separate workflows so each
            account only sees the grow interests and workspace tools it needs.
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => router.push("/account/mode")}
              accessibilityRole="button"
              accessibilityLabel="Switch workspace mode"
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Switch workspace</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/register")}
              accessibilityRole="button"
              accessibilityLabel="Create another account type"
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Create another account</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/onboarding/guilds")}
              accessibilityRole="button"
              accessibilityLabel="Edit grow interests"
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Grow interests</Text>
            </Pressable>
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Session</Text>
          <Text style={styles.cardText}>
            Sign out before switching to a different account type or business.
          </Text>
          <Pressable
            onPress={handleLogout}
            disabled={loggingOut}
            accessibilityRole="button"
            accessibilityLabel="Log out"
            style={[styles.dangerButton, loggingOut && styles.disabledButton]}
          >
            <Text style={styles.dangerButtonText}>
              {loggingOut ? "Logging out..." : "Log out"}
            </Text>
          </Pressable>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Privacy and account data</Text>
          <Text style={styles.cardText}>
            Export your account data or delete your account from inside the app. Deletion
            anonymizes the account and archives active personal records instead of blindly
            removing grow history.
          </Text>
          <LegalLinks />
          {privacyFeedback ? (
            <Text style={styles.feedbackText}>{privacyFeedback}</Text>
          ) : null}
          {privacyError ? <Text style={styles.errorText}>{privacyError}</Text> : null}
          <Pressable
            onPress={handleExportData}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Export account data"
            style={[styles.secondaryButton, exporting && styles.disabledButton]}
          >
            <Text style={styles.secondaryButtonText}>
              {exporting ? "Exporting..." : "Export account data"}
            </Text>
          </Pressable>
          <TextInput
            accessibilityLabel="Delete account confirmation"
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Type DELETE to confirm"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={deleteConfirm}
            onChangeText={(value) => {
              setDeleteConfirm(value);
              setPrivacyError("");
            }}
          />
          <Pressable
            onPress={handleDeleteAccount}
            disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            style={[
              styles.dangerButton,
              (deleting || deleteConfirm.trim().toUpperCase() !== "DELETE") &&
                styles.disabledButton
            ]}
          >
            <Text style={styles.dangerButtonText}>
              {deleting ? "Deleting..." : "Delete account"}
            </Text>
          </Pressable>
        </AppCard>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  headerTitle: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900"
  },
  headerSubtitle: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700"
  },
  grid: { gap: 12 },
  card: { gap: 12 },
  cardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900"
  },
  cardText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  statusRow: {
    alignItems: "center",
    borderColor: "#dbe3ea",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  statusLabel: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700"
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "900"
  },
  statusVerified: { color: "#166534" },
  statusUnverified: { color: "#b45309" },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 11
  },
  feedbackText: { color: "#047857", fontSize: 13, fontWeight: "800" },
  errorText: { color: "#b91c1c", fontSize: 13, fontWeight: "800" },
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  fact: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 150,
    padding: 10
  },
  factLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  factValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
    textTransform: "capitalize"
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingVertical: 12
  },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: "#ffffff", fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  secondaryButtonText: { color: "#111827", fontWeight: "900" },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12
  },
  dangerButtonText: { color: "#b91c1c", fontWeight: "900" }
});
