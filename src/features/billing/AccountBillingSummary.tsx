import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { AccountBillingReadModel, AccountBillingSource } from "@/api/auth";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const SOURCE_LABELS: Record<AccountBillingSource, string> = {
  stripe: "Stripe",
  gift: "Prepaid gift",
  app_store: "App Store",
  complimentary: "Complimentary access",
  platform: "Platform-provided access",
  test: "Test access",
  local_trial: "Local / promotional trial",
  unknown: "Unknown / unresolved",
  free: "Free"
};

function readable(value: string) {
  const normalized = String(value || "unknown").replaceAll("_", " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function displayDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString();
}

export default function AccountBillingSummary({
  billing
}: {
  billing: AccountBillingReadModel;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createAccountBillingSummaryStyles(palette), [palette]);
  const needsReview =
    billing.consistency === "review_needed" || billing.source === "unknown";
  const payment = needsReview
    ? "Nonpaid / unconfirmed"
    : billing.paymentState === "paid"
      ? "Paid"
      : "Nonpaid";
  const renewal = billing.cancelAtPeriodEnd
    ? "Scheduled to stop at period end"
    : billing.renews
      ? "Renews automatically"
      : "Does not renew";
  const accessDate =
    billing.endsAt ||
    billing.complimentaryExpiresAt ||
    billing.trialExpiry ||
    billing.paidThrough ||
    null;
  const accessDateLabel =
    billing.renews && !billing.cancelAtPeriodEnd
      ? "Current billing period through"
      : "Access ends";

  return (
    <View accessibilityLabel="Account billing summary" style={styles.container}>
      <Text style={styles.title}>Billing summary</Text>
      <Text style={styles.line}>
        Source: {SOURCE_LABELS[billing.source] || SOURCE_LABELS.unknown}
      </Text>
      <Text style={styles.line}>Status: {readable(billing.status)}</Text>
      <Text style={styles.line}>Payment: {payment}</Text>
      <Text style={styles.line}>Renewal: {renewal}</Text>
      <Text style={styles.line}>
        {accessDateLabel}: {displayDate(accessDate)}
      </Text>
      <Text style={styles.line}>
        Stripe-linked record: {billing.stripeLinked ? "Yes" : "No"}
      </Text>
      {needsReview ? (
        <Text accessibilityRole="alert" style={styles.warning}>
          Billing authority needs review. This account is not treated as paid from its
          displayed plan or status.
        </Text>
      ) : null}
    </View>
  );
}

export function createAccountBillingSummaryStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      padding: 10
    },
    title: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "900"
    },
    line: {
      color: palette.textSoft,
      fontSize: 13,
      lineHeight: 18
    },
    warning: {
      color: palette.warning,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 18,
      marginTop: 2
    }
  });
}
