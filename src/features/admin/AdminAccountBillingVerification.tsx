import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  verifyAdminAccountBilling,
  type AdminStripeBillingVerification,
  type StripeBillingVerificationClassification
} from "@/api/adminBillingVerification";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const CLASSIFICATION_LABELS: Record<StripeBillingVerificationClassification, string> = {
  verified_active: "Stripe confirms active paid access",
  verified_trialing: "Stripe confirms an active trial",
  verified_canceling: "Stripe confirms access will cancel at period end",
  provider_blocking: "Stripe subscription needs attention",
  provider_inactive_local_paid_drift: "Local paid access conflicts with Stripe",
  source_less_paid_flag: "Paid-looking local markers have no verified source",
  verified_no_recurring_stripe: "Valid non-recurring access; no Stripe renewal",
  verified_free: "No recurring Stripe access found",
  ambiguous_multiple_active: "Multiple active Stripe subscriptions need review",
  unavailable: "Stripe verification unavailable"
};

function dateLabel(value: string | null | undefined) {
  if (!value) return "not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "invalid date" : date.toLocaleString();
}

export default function AdminAccountBillingVerification({
  userId,
  email
}: {
  userId: string;
  email: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [verification, setVerification] = useState<AdminStripeBillingVerification | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      setVerification(await verifyAdminAccountBilling(userId));
    } catch (requestError) {
      setVerification(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Stripe billing verification is unavailable."
      );
    } finally {
      setLoading(false);
    }
  }

  const selected = verification?.provider.selected;
  return (
    <View
      accessibilityLabel={`Read-only billing verification for ${email}`}
      style={styles.wrap}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Verify ${email} billing with Stripe`}
        accessibilityState={{ disabled: loading }}
        disabled={loading}
        onPress={() => void verify()}
        style={[styles.button, loading && styles.disabled]}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Verifying with Stripe…"
            : verification
              ? "Refresh Stripe check"
              : "Verify with Stripe"}
        </Text>
      </Pressable>
      <Text style={styles.note}>
        Read-only check. It does not charge, cancel, downgrade, or repair anything.
      </Text>
      {loading ? <ActivityIndicator color={palette.accent} /> : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.warning}>
          {error} No account or payment data was changed.
        </Text>
      ) : null}
      {verification ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Stripe billing result for ${email}`}
          style={styles.result}
        >
          <Text style={verification.requiresReview ? styles.warning : styles.resultTitle}>
            {CLASSIFICATION_LABELS[verification.classification]}
          </Text>
          <Text style={styles.meta}>
            Local: requested {verification.local.requestedPlan} · effective{" "}
            {verification.local.effectivePlan} · {verification.local.source} ·{" "}
            {verification.local.status} · AI {verification.local.aiTokens}/
            {verification.local.maxTokens}
          </Text>
          <Text style={styles.meta}>
            Stripe: {verification.provider.customerCount} matching customer(s) ·{" "}
            {verification.provider.relevantSubscriptionCount} GrowPath subscription(s) ·{" "}
            stored customer link{" "}
            {verification.provider.storedCustomerBinding.replaceAll("_", " ")}
          </Text>
          {selected ? (
            <Text style={styles.meta}>
              Provider: {selected.plan || "unmapped"} {selected.interval || ""} ·{" "}
              {selected.status} · through {dateLabel(selected.currentPeriodEnd)} ·{" "}
              {selected.cancelAtPeriodEnd ? "will not renew" : "renewal state current"} ·{" "}
              {selected.customerReference || "customer hidden"} /{" "}
              {selected.subscriptionReference || "subscription hidden"}
            </Text>
          ) : null}
          <Text style={styles.meta}>
            Checked {dateLabel(verification.inspectedAt)} ·{" "}
            {verification.reason.replaceAll("_", " ")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    wrap: {
      gap: 8,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: palette.borderSoft
    },
    button: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    buttonText: { color: palette.link, fontSize: 14, fontWeight: "700" },
    disabled: { opacity: 0.55 },
    note: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    result: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 10
    },
    resultTitle: { color: palette.success, fontSize: 14, fontWeight: "800" },
    warning: { color: palette.warning, fontSize: 13, fontWeight: "700", lineHeight: 18 },
    meta: { color: palette.textMuted, fontSize: 12, lineHeight: 17 }
  });
}
