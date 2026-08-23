import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
  Platform,
  Share,
  Switch
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { requestEmailVerification, updateContentControls } from "@/api/auth";
import { getVideoQuota, type VideoQuota } from "@/api/videos";
import {
  deleteAccount,
  exportPrivacyData,
  updateNotificationPreferences,
  updateProfile
} from "@/api/users";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_OPTIONS,
  NotificationPreferenceState
} from "@/notifications/notificationPreferences";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import BackButton from "@/components/nav/BackButton";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export function createPersonalProfileStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 42 },
    title: { color: palette.text, fontSize: 24, fontWeight: "800", marginBottom: 6 },
    subtitle: { color: palette.textMuted, fontSize: 14, marginBottom: 18 },

    card: {
      padding: 16,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.card,
      marginBottom: 12
    },
    rowLabel: { fontSize: 12, color: palette.textMuted },
    rowValue: {
      color: palette.text,
      marginTop: 4,
      fontSize: 15,
      fontWeight: "700"
    },
    statusRow: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    statusLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    statusValue: { color: palette.text, fontSize: 12, fontWeight: "900" },
    statusVerified: { color: palette.success },
    statusUnverified: { color: palette.warning },
    input: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      backgroundColor: palette.surface,
      color: palette.text
    },
    feedback: {
      marginTop: 8,
      fontSize: 12,
      color: palette.success,
      fontWeight: "700"
    },
    error: {
      marginTop: 8,
      fontSize: 12,
      color: palette.danger,
      fontWeight: "700"
    },

    button: {
      marginTop: 14,
      paddingVertical: 12,
      borderRadius: radius.card,
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border
    },
    buttonPrimary: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    buttonPrimaryText: { color: palette.accentText, fontWeight: "800" },

    buttonDanger: { backgroundColor: palette.surface, borderColor: palette.danger },
    buttonDangerText: { color: palette.danger, fontWeight: "800" },
    buttonSecondaryText: { color: palette.text, fontWeight: "800" },
    notificationRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingVertical: 8
    },
    notificationCopy: { flex: 1, minWidth: 0 },
    notificationTitle: { color: palette.text, fontSize: 14, fontWeight: "800" },
    notificationDescription: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2
    },

    accountAction: {
      marginTop: 10,
      paddingVertical: 10,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: "center",
      backgroundColor: palette.surface
    },
    accountActionText: { fontWeight: "800", color: palette.text },
    actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    planAction: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.accent,
      backgroundColor: palette.surface
    },
    planActionPrimary: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    planActionText: { color: palette.accent, fontWeight: "800" },
    planActionPrimaryText: { color: palette.accentText, fontWeight: "800" },
    mutedText: {
      marginTop: 8,
      fontSize: 12,
      color: palette.textMuted,
      lineHeight: 18
    },
    logoutConfirmation: {
      marginTop: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: radius.card,
      backgroundColor: palette.surface
    },
    logoutConfirmationTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "800"
    },
    logoutConfirmationCopy: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4
    },
    logoutActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12
    },
    logoutAction: {
      flex: 1,
      marginTop: 0
    }
  });
}

type PlanAction = readonly [label: string, href: string, primary: boolean];

export function getPersonalProfilePlanActions(plan: string): PlanAction[] {
  const planRank: Record<string, number> = {
    free: 0,
    pro: 1,
    commercial: 2,
    facility: 3
  };
  const currentRank = planRank[String(plan || "free").toLowerCase()] ?? 0;
  const actions: PlanAction[] = [];

  if (currentRank < planRank.facility) {
    actions.push(["Upgrade Plans", "/home/personal/upgrade", currentRank < planRank.pro]);
  }
  actions.push([
    "Manage Billing",
    "/home/personal/profile/billing",
    currentRank >= planRank.pro
  ]);

  return actions;
}

export function formatProfileStorage(bytes: number) {
  const value = Math.max(0, Number(bytes || 0));
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const auth = useAuth();
  const ent = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createPersonalProfileStyles(palette), [palette]);

  const email = auth.user?.email || "unknown";
  const [emailDraft, setEmailDraft] = useState(email === "unknown" ? "" : email);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState("");
  const [emailError, setEmailError] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);
  const [privacyFeedback, setPrivacyFeedback] = useState("");
  const [privacyError, setPrivacyError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [contentControlBusy, setContentControlBusy] = useState(false);
  const [parentalPin, setParentalPin] = useState("");
  const [contentControlFeedback, setContentControlFeedback] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferenceState>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [logoutConfirming, setLogoutConfirming] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [videoQuota, setVideoQuota] = useState<VideoQuota | null>(null);
  const [videoQuotaLoading, setVideoQuotaLoading] = useState(true);
  const [videoQuotaError, setVideoQuotaError] = useState("");
  const mode = ent.mode || "personal";
  const plan = ent.plan || "free";
  const planActions = getPersonalProfilePlanActions(plan);
  const emailVerified = Boolean(auth.user?.emailVerified);
  const pageStyle = { backgroundColor: palette.page };
  const cardStyle = { backgroundColor: palette.surface, borderColor: palette.border };
  const textStyle = { color: palette.text };
  const mutedTextStyle = { color: palette.textMuted };
  const accentButtonStyle = {
    backgroundColor: palette.accent,
    borderColor: palette.accent
  };
  const accentTextStyle = { color: palette.accentText };

  useEffect(() => {
    setEmailDraft(email === "unknown" ? "" : email);
  }, [email]);

  useEffect(() => {
    const storedPrefs =
      ((auth.user as any)
        ?.notificationPreferences as Partial<NotificationPreferenceState>) || {};
    setNotificationPrefs({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...storedPrefs
    });
  }, [auth.user]);

  const loadVideoQuota = async () => {
    setVideoQuotaLoading(true);
    setVideoQuotaError("");
    try {
      const quota = await getVideoQuota("personal");
      if (!quota || !Number.isFinite(Number(quota.limitBytes))) {
        throw new Error("Storage usage is unavailable.");
      }
      setVideoQuota(quota);
    } catch (error: any) {
      setVideoQuota(null);
      setVideoQuotaError(error?.message || "Unable to load storage usage.");
    } finally {
      setVideoQuotaLoading(false);
    }
  };

  useEffect(() => {
    void loadVideoQuota();
    // Reload only when the signed-in identity changes; quota has its own explicit retry.
  }, [auth.user?.id]);

  const handleSaveEmail = async () => {
    const nextEmail = emailDraft.trim().toLowerCase();
    if (!nextEmail || nextEmail === email) return;
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

  const handleSaveNotificationPreferences = async () => {
    setNotificationSaving(true);
    setNotificationFeedback("");
    setNotificationError("");
    try {
      await updateNotificationPreferences(notificationPrefs as any);
      await auth.retryMe();
      setNotificationFeedback("Notification settings saved.");
    } catch (error: any) {
      setNotificationError(error?.message || "Unable to save notification settings.");
    } finally {
      setNotificationSaving(false);
    }
  };

  const saveContentControls = async (input: {
    cannabisVisibility: "show" | "hide";
    parentalLockEnabled?: boolean;
    enablingLock?: boolean;
  }) => {
    setContentControlBusy(true);
    setContentControlFeedback("");
    try {
      const result = await updateContentControls({
        cannabisVisibility: input.cannabisVisibility,
        parentalLockEnabled: input.parentalLockEnabled,
        ...(input.enablingLock ? { newPin: parentalPin } : { currentPin: parentalPin })
      });
      setParentalPin("");
      setContentControlFeedback(
        result.contentControls.parentalLockEnabled
          ? "Cannabis content controls are protected by the parental PIN."
          : result.contentControls.cannabisVisibility === "show"
            ? "Cannabis content is visible for this account."
            : "Cannabis content is hidden."
      );
      await auth.retryMe();
    } catch (error: any) {
      setContentControlFeedback(
        error?.data?.error?.message ||
          error?.message ||
          "Unable to update content controls."
      );
    } finally {
      setContentControlBusy(false);
    }
  };

  const performLogout = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    setLogoutError("");
    try {
      if (typeof (auth as any).logout === "function") {
        await (auth as any).logout();
      } else if (typeof (auth as any).setToken === "function") {
        (auth as any).setToken(null);
      }

      router.replace("/login" as any);
    } catch (e: any) {
      setLogoutError(e?.message || "Failed to log out. Please try again.");
      setLogoutBusy(false);
    }
  };

  const handleLogout = () => {
    setLogoutError("");
    setLogoutConfirming(true);
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
          title: "GrowPath data export",
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
    <ScrollView
      style={[styles.container, pageStyle]}
      contentContainerStyle={styles.content}
    >
      <BackButton fallbackHref="/home/personal" />
      <Text accessibilityRole="header" style={[styles.title, textStyle]}>
        Profile
      </Text>
      <Text style={[styles.subtitle, mutedTextStyle]}>Account and plan details</Text>
      <PersonalFeedPlacement placement="top" routeKey="personal_profile" longContent />

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>Email</Text>
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, mutedTextStyle]}>Status</Text>
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
          placeholderTextColor={palette.textMuted}
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
            accentButtonStyle,
            (savingEmail || emailDraft.trim().toLowerCase() === email) && {
              opacity: 0.55
            }
          ]}
          disabled={savingEmail || emailDraft.trim().toLowerCase() === email}
          onPress={handleSaveEmail}
        >
          <Text style={[styles.buttonPrimaryText, accentTextStyle]}>
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
            <Text style={[styles.buttonSecondaryText, textStyle]}>
              {resendingVerification ? "Sending..." : "Resend verification email"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>Mode</Text>
        <Text style={[styles.rowValue, textStyle]}>{mode}</Text>
        <Pressable
          style={[styles.accountAction, { backgroundColor: palette.surface }]}
          onPress={() => router.push("/account/mode" as any)}
          accessibilityRole="button"
          accessibilityLabel="Switch workspace mode"
        >
          <Text style={[styles.accountActionText, textStyle]}>Switch workspace</Text>
        </Pressable>
        <Pressable
          style={[styles.accountAction, { backgroundColor: palette.surface }]}
          onPress={() => router.push("/home/personal/more/links" as any)}
          accessibilityRole="button"
          accessibilityLabel="Manage profile links"
        >
          <Text style={[styles.accountActionText, textStyle]}>Profile links</Text>
        </Pressable>
        <Pressable
          style={[styles.accountAction, { backgroundColor: palette.surface }]}
          onPress={() => router.push("/videos?tab=library" as any)}
          accessibilityRole="button"
          accessibilityLabel="Open personal video library"
        >
          <Text style={[styles.accountActionText, textStyle]}>My videos</Text>
        </Pressable>
        <Text style={[styles.mutedText, mutedTextStyle]}>
          Personal is for your grow records and Forum/Q&A. Commercial and Facility
          workspaces keep storefront outreach and operational rooms separate.
        </Text>
      </View>

      <ThemeModeSelector />

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>Plan</Text>
        <Text style={[styles.rowValue, textStyle]}>{plan}</Text>
        <Text style={[styles.mutedText, mutedTextStyle]}>
          Free includes basic grow tracking, logs, tasks, and limited AI credits. Upgrade
          for more grows, storage, advanced tools, exports, integrations, and higher AI
          limits.
        </Text>
        <View style={styles.actionGrid}>
          {planActions.map(([label, href, primary]) => (
            <Pressable
              key={String(label)}
              accessibilityRole="button"
              onPress={() => router.push(href as any)}
              style={[
                styles.planAction,
                primary ? [styles.planActionPrimary, accentButtonStyle] : null
              ]}
            >
              <Text
                style={
                  primary
                    ? [styles.planActionPrimaryText, accentTextStyle]
                    : [styles.planActionText, { color: palette.accent }]
                }
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>AI-credit balance</Text>
        <TokenBalanceWidget
          onPress={() => router.push("/home/personal/profile/billing" as any)}
        />
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>Video storage</Text>
        {videoQuotaLoading ? (
          <Text style={[styles.mutedText, mutedTextStyle]}>Loading storage usage...</Text>
        ) : videoQuota ? (
          <>
            <Text style={[styles.rowValue, textStyle]}>
              {formatProfileStorage(videoQuota.usedBytes)} used of{" "}
              {formatProfileStorage(videoQuota.limitBytes)}
            </Text>
            <Text style={[styles.mutedText, mutedTextStyle]}>
              {formatProfileStorage(videoQuota.remainingBytes)} remains for
              GrowPath-hosted video uploads in this Personal workspace. Externally hosted
              video links do not use this allowance.
            </Text>
          </>
        ) : (
          <Text style={styles.error} accessibilityRole="alert">
            {videoQuotaError || "Unable to load storage usage."}
          </Text>
        )}
        <View style={styles.actionGrid}>
          <Pressable
            style={[styles.accountAction, { backgroundColor: palette.surface }]}
            onPress={() => router.push("/videos?tab=library" as any)}
            accessibilityRole="button"
            accessibilityLabel="Open video storage library"
          >
            <Text style={[styles.accountActionText, textStyle]}>Manage My Videos</Text>
          </Pressable>
          {videoQuotaError ? (
            <Pressable
              style={[styles.accountAction, { backgroundColor: palette.surface }]}
              onPress={() => void loadVideoQuota()}
              accessibilityRole="button"
              accessibilityLabel="Retry video storage usage"
            >
              <Text style={[styles.accountActionText, textStyle]}>
                Retry Storage Usage
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>Notification settings</Text>
        <Text style={[styles.mutedText, mutedTextStyle]}>
          These controls decide which inbox items can also reach your device. In-app
          notifications stay available; push requires a registered device.
        </Text>
        {NOTIFICATION_PREFERENCE_OPTIONS.map((option) => (
          <View key={String(option.key)} style={styles.notificationRow}>
            <View style={styles.notificationCopy}>
              <Text style={[styles.notificationTitle, textStyle]}>{option.title}</Text>
              <Text style={[styles.notificationDescription, mutedTextStyle]}>
                {option.description}
              </Text>
            </View>
            <Switch
              accessibilityLabel={option.title}
              ios_backgroundColor={palette.surfaceStrong}
              thumbColor={palette.accentText}
              trackColor={{ false: palette.surfaceStrong, true: palette.accent }}
              value={Boolean(notificationPrefs[option.key])}
              onValueChange={(value) =>
                setNotificationPrefs((current) => ({
                  ...current,
                  [option.key]: value
                }))
              }
            />
          </View>
        ))}
        <View style={styles.actionGrid}>
          <Pressable
            style={[styles.accountAction, { backgroundColor: palette.surface }]}
            onPress={() => router.push("/home/notifications" as any)}
            accessibilityRole="button"
            accessibilityLabel="Open notification inbox"
          >
            <Text style={[styles.accountActionText, textStyle]}>
              Open Notification Inbox
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.planAction,
              styles.planActionPrimary,
              accentButtonStyle,
              notificationSaving && { opacity: 0.6 }
            ]}
            onPress={() => void handleSaveNotificationPreferences()}
            accessibilityRole="button"
            accessibilityLabel="Save notification settings"
            disabled={notificationSaving}
          >
            <Text style={[styles.planActionPrimaryText, accentTextStyle]}>
              {notificationSaving ? "Saving..." : "Save Notification Settings"}
            </Text>
          </Pressable>
        </View>
        {notificationFeedback ? (
          <Text style={styles.feedback}>{notificationFeedback}</Text>
        ) : null}
        {notificationError ? <Text style={styles.error}>{notificationError}</Text> : null}
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>Grow interests</Text>
        <Text style={[styles.mutedText, mutedTextStyle]}>
          Edit what you grow, your environment, growing method, experience level, and
          commercial goals when relevant.
        </Text>
        <Pressable
          style={[styles.accountAction, { backgroundColor: palette.surface }]}
          onPress={() => router.push("/onboarding/guilds" as any)}
          accessibilityRole="button"
          accessibilityLabel="Edit grow interests"
        >
          <Text style={[styles.accountActionText, textStyle]}>Edit Grow Interests</Text>
        </Pressable>
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>
          Cannabis content and parental lock
        </Text>
        <Text style={[styles.mutedText, mutedTextStyle]}>
          Cannabis posts, courses, feed recommendations, and related tools can be hidden
          without affecting fruit, vegetable, flower, tree, or general gardening content.
        </Text>
        <Text style={[styles.rowValue, textStyle]}>
          Cannabis content:{" "}
          {auth.user?.cannabisVisibility === "show" ? "Shown" : "Hidden"}
        </Text>
        <Text style={[styles.mutedText, mutedTextStyle]}>
          Age eligibility: {auth.user?.ageBand || "verification needed"} - Parental lock:{" "}
          {auth.user?.parentalLockEnabled ? "On" : "Off"}
        </Text>
        <TextInput
          accessibilityLabel="Parental content control PIN"
          style={styles.input}
          value={parentalPin}
          onChangeText={setParentalPin}
          placeholder={
            auth.user?.parentalLockEnabled
              ? "Current parental PIN"
              : "New 4-12 digit parental PIN"
          }
          placeholderTextColor={palette.textMuted}
          keyboardType="number-pad"
          secureTextEntry
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          importantForAutofill="no"
        />
        <View style={styles.actionGrid}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hide cannabis content"
            disabled={contentControlBusy}
            style={[
              styles.planAction,
              { borderColor: palette.accent, backgroundColor: palette.surface }
            ]}
            onPress={() => void saveContentControls({ cannabisVisibility: "hide" })}
          >
            <Text style={[styles.planActionText, { color: palette.accent }]}>
              Hide cannabis
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show cannabis content"
            disabled={contentControlBusy || !auth.user?.cannabisEligible}
            style={[
              styles.planAction,
              { borderColor: palette.accent, backgroundColor: palette.surface },
              (!auth.user?.cannabisEligible || contentControlBusy) && { opacity: 0.5 }
            ]}
            onPress={() => void saveContentControls({ cannabisVisibility: "show" })}
          >
            <Text style={[styles.planActionText, { color: palette.accent }]}>
              Show cannabis
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              auth.user?.parentalLockEnabled
                ? "Disable parental lock"
                : "Enable parental lock"
            }
            disabled={contentControlBusy || parentalPin.length < 4}
            style={[
              styles.planAction,
              { borderColor: palette.accent, backgroundColor: palette.accent },
              (contentControlBusy || parentalPin.length < 4) && { opacity: 0.5 }
            ]}
            onPress={() =>
              void saveContentControls({
                cannabisVisibility: "hide",
                parentalLockEnabled: !auth.user?.parentalLockEnabled,
                enablingLock: !auth.user?.parentalLockEnabled
              })
            }
          >
            <Text style={[styles.planActionPrimaryText, accentTextStyle]}>
              {auth.user?.parentalLockEnabled ? "Disable lock" : "Enable lock + hide"}
            </Text>
          </Pressable>
        </View>
        {contentControlFeedback ? (
          <Text style={styles.feedback}>{contentControlFeedback}</Text>
        ) : null}
      </View>
      <PersonalFeedPlacement placement="middle" routeKey="personal_profile" longContent />

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>Other account types</Text>
        <Pressable
          style={[styles.accountAction, { backgroundColor: palette.surface }]}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={[styles.accountActionText, textStyle]}>
            Sign in to Commercial account
          </Text>
        </Pressable>
        <Pressable
          style={[styles.accountAction, { backgroundColor: palette.surface }]}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={[styles.accountActionText, textStyle]}>
            Sign in to Facility account
          </Text>
        </Pressable>
        <Text style={[styles.mutedText, mutedTextStyle]}>
          Personal, Commercial, and Facility are separate account types.
        </Text>
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>Grow reports and export</Text>
        <Text style={[styles.mutedText, mutedTextStyle]}>
          Export records across your account, or open a specific grow first to create a
          grow-scoped report.
        </Text>
        <Pressable
          style={[styles.accountAction, { backgroundColor: palette.surface }]}
          onPress={() => router.push("/home/personal/tools/pdf-export" as any)}
          accessibilityRole="button"
          accessibilityLabel="Open grow reports and export"
        >
          <Text style={[styles.accountActionText, textStyle]}>
            Open Grow Reports & Export
          </Text>
        </Pressable>
      </View>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.rowLabel, mutedTextStyle]}>Privacy and account data</Text>
        <Text style={[styles.mutedText, mutedTextStyle]}>
          Export your account data as JSON, or request account deletion. Deletion
          anonymizes the account and archives active personal records instead of blindly
          removing grow history.
        </Text>
        {privacyFeedback ? <Text style={styles.feedback}>{privacyFeedback}</Text> : null}
        {privacyError ? <Text style={styles.error}>{privacyError}</Text> : null}
        <Pressable
          style={[
            styles.button,
            { backgroundColor: palette.surface, borderColor: palette.border },
            exporting && { opacity: 0.55 }
          ]}
          disabled={exporting}
          onPress={handleExportData}
          accessibilityRole="button"
          accessibilityLabel="Export account data"
        >
          <Text style={[styles.buttonSecondaryText, textStyle]}>
            {exporting ? "Exporting..." : "Export Account Data"}
          </Text>
        </Pressable>
        <TextInput
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Type DELETE to confirm"
          placeholderTextColor={palette.textMuted}
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
            { backgroundColor: palette.surface, borderColor: palette.danger },
            (deleting || deleteConfirm.trim().toUpperCase() !== "DELETE") && {
              opacity: 0.55
            }
          ]}
          disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
          onPress={handleDeleteAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
        >
          <Text style={[styles.buttonDangerText, { color: palette.danger }]}>
            {deleting ? "Deleting..." : "Delete Account"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.button,
          styles.buttonDanger,
          { backgroundColor: palette.surface, borderColor: palette.danger }
        ]}
        onPress={handleLogout}
        disabled={logoutBusy}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Text style={[styles.buttonDangerText, { color: palette.danger }]}>
          {logoutBusy ? "Logging out..." : "Log out"}
        </Text>
      </Pressable>
      {logoutConfirming ? (
        <View
          style={styles.logoutConfirmation}
          accessibilityRole="alert"
          accessibilityLabel="Log out confirmation"
        >
          <Text style={styles.logoutConfirmationTitle}>Log out of this account?</Text>
          <Text style={styles.logoutConfirmationCopy}>
            You will return to the login screen. Your saved GrowPathAI data will remain in
            this account.
          </Text>
          {logoutError ? <Text style={styles.error}>{logoutError}</Text> : null}
          <View style={styles.logoutActions}>
            <Pressable
              style={[
                styles.button,
                styles.logoutAction,
                { borderColor: palette.border }
              ]}
              onPress={() => {
                setLogoutConfirming(false);
                setLogoutError("");
              }}
              disabled={logoutBusy}
              accessibilityRole="button"
              accessibilityLabel="Cancel logout"
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.buttonDanger,
                styles.logoutAction,
                { backgroundColor: palette.surface, borderColor: palette.danger },
                logoutBusy && { opacity: 0.55 }
              ]}
              onPress={() => void performLogout()}
              disabled={logoutBusy}
              accessibilityRole="button"
              accessibilityLabel="Confirm logout"
            >
              <Text style={[styles.buttonDangerText, { color: palette.danger }]}>
                {logoutBusy ? "Logging out..." : "Log out now"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <PersonalFeedPlacement placement="bottom" routeKey="personal_profile" longContent />
    </ScrollView>
  );
}
