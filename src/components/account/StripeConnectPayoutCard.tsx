import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  createConnectPayoutDashboardLink,
  getConnectPayoutStatus,
  startConnectPayoutOnboarding,
  type StripeConnectPayoutStatus
} from "@/api/stripeConnect";
import AppCard from "@/components/layout/AppCard";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { openExternalUrl } from "@/utils/openExternalUrl";

type StripeConnectPayoutCardProps = {
  enabled?: boolean;
  title?: string;
  titleLevel?: 1 | 2 | 3;
};

function isPayoutReady(status: StripeConnectPayoutStatus | null) {
  return Boolean(
    status?.connected &&
    status.onboardingStatus === "complete" &&
    status.transfersEnabled &&
    status.payoutsEnabled &&
    status.detailsSubmitted
  );
}

function statusLabel(status: StripeConnectPayoutStatus | null) {
  if (!status?.connected) return "Not connected";
  if (isPayoutReady(status)) return "Ready";
  if (status.onboardingStatus === "restricted") return "Stripe action required";
  if (status.onboardingStatus === "pending") return "Setup in progress";
  return "Verification pending";
}

function statusDetail(status: StripeConnectPayoutStatus | null) {
  if (!status?.connected) {
    return "Connect a Stripe payout account before receiving seller proceeds from eligible GrowPathAI sales.";
  }
  if (isPayoutReady(status)) {
    return "Stripe has verified the connected account for seller transfers and bank payouts.";
  }
  if (status.onboardingStatus === "restricted") {
    return "Stripe needs updated information before seller transfers or bank payouts can continue.";
  }
  return "Finish Stripe setup and wait for any required verification before seller transfers or bank payouts are ready.";
}

function actionLabel(status: StripeConnectPayoutStatus | null) {
  if (isPayoutReady(status)) return "Open Stripe payouts";
  if (status?.connected) return "Resume Stripe setup";
  return "Set up Stripe payouts";
}

function trustedStripeConnectUrl(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["connect.stripe.com", "accounts.stripe.com"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port
    );
  } catch {
    return false;
  }
}

function remainingRequirementCount(status: StripeConnectPayoutStatus | null) {
  if (!status) return 0;
  return (
    status.requirements.currentlyDueCount +
    status.requirements.pastDueCount +
    status.requirements.pendingVerificationCount
  );
}

export default function StripeConnectPayoutCard({
  enabled = true,
  title = "Stripe seller payouts",
  titleLevel = 2
}: StripeConnectPayoutCardProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [status, setStatus] = useState<StripeConnectPayoutStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadStatus = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      setStatus(await getConnectPayoutStatus());
    } catch (nextError: any) {
      setStatus(null);
      setError(
        nextError?.message ||
          "Stripe payout status could not be verified. No payout setting was changed."
      );
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError("");
    void getConnectPayoutStatus()
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch((nextError: any) => {
        if (!active) return;
        setStatus(null);
        setError(
          nextError?.message ||
            "Stripe payout status could not be verified. No payout setting was changed."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  if (!enabled) return null;

  const ready = isPayoutReady(status);
  const remaining = remainingRequirementCount(status);

  async function handleProviderAction() {
    if (busy || loading) return;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const result = ready
        ? await createConnectPayoutDashboardLink()
        : await startConnectPayoutOnboarding();
      if (!trustedStripeConnectUrl(result.url)) {
        throw new Error("Stripe returned an invalid payout-management link.");
      }
      if (!ready) setStatus(result.status);
      await openExternalUrl(result.url!);
      setFeedback(
        ready
          ? "Stripe opened for verified balance and bank-payout management."
          : "Stripe setup opened. Refresh this status after returning to GrowPathAI."
      );
    } catch (nextError: any) {
      setError(
        nextError?.message ||
          (ready
            ? "Stripe payout management could not be opened."
            : "Stripe payout setup could not be opened.")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppCard title={title} titleLevel={titleLevel} accessibilityLabel={title}>
      {loading && !status ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingRow}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.body}>Checking Stripe payout status...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Stripe-verified status</Text>
            <Text
              style={[
                styles.statusValue,
                ready
                  ? styles.ready
                  : status?.onboardingStatus === "restricted"
                    ? styles.warning
                    : null
              ]}
            >
              {statusLabel(status)}
            </Text>
          </View>
          <Text style={styles.body}>{statusDetail(status)}</Text>
          {status?.connected ? (
            <View style={styles.factRow}>
              <Text style={styles.fact}>
                Seller transfers: {status.transfersEnabled ? "Ready" : "Not ready"}
              </Text>
              <Text style={styles.fact}>
                Bank payouts: {status.payoutsEnabled ? "Ready" : "Not ready"}
              </Text>
            </View>
          ) : null}
          {remaining > 0 ? (
            <Text style={styles.requirementText}>
              Stripe requirements awaiting action or verification: {remaining}
            </Text>
          ) : null}
          <Text style={styles.note}>
            GrowPathAI records eligible seller earnings. Stripe is the source of truth for
            connected-account readiness, balances, and bank-payout status.
          </Text>
          {error ? (
            <Text
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.error}
            >
              {error}
            </Text>
          ) : null}
          {feedback ? (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              {feedback}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityLabel={actionLabel(status)}
              accessibilityRole="button"
              accessibilityState={{
                disabled: busy || loading || Boolean(error && !status)
              }}
              disabled={busy || loading || Boolean(error && !status)}
              onPress={() => void handleProviderAction()}
              style={[
                styles.primaryButton,
                (busy || loading || (error && !status)) && styles.disabled
              ]}
              testID="stripe-connect-provider-action"
            >
              <Text style={styles.primaryButtonText}>
                {busy ? "Opening Stripe..." : actionLabel(status)}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Refresh Stripe payout status"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || loading }}
              disabled={busy || loading}
              onPress={() => void loadStatus()}
              style={[styles.secondaryButton, (busy || loading) && styles.disabled]}
            >
              <Text style={styles.secondaryButtonText}>
                {loading ? "Refreshing..." : "Refresh Stripe status"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </AppCard>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    loadingRow: { alignItems: "center", flexDirection: "row", gap: 10 },
    statusRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "space-between"
    },
    statusLabel: { color: palette.textMuted, fontSize: 13, fontWeight: "700" },
    statusValue: { color: palette.text, fontSize: 14, fontWeight: "900" },
    ready: { color: palette.success },
    warning: { color: palette.warning },
    body: { color: palette.text, lineHeight: 20, marginTop: 8 },
    factRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
    fact: { color: palette.textMuted, fontSize: 13, fontWeight: "700" },
    requirementText: { color: palette.warning, fontWeight: "700", marginTop: 10 },
    note: { color: palette.textSoft, fontSize: 13, lineHeight: 19, marginTop: 10 },
    error: { color: palette.danger, fontWeight: "700", lineHeight: 20, marginTop: 10 },
    success: {
      color: palette.success,
      fontWeight: "700",
      lineHeight: 20,
      marginTop: 10
    },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      flexGrow: 1,
      minHeight: 42,
      minWidth: 180,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      flexGrow: 1,
      minHeight: 42,
      minWidth: 180,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryButtonText: { color: palette.link, fontWeight: "900" },
    disabled: { opacity: 0.55 }
  });
}
