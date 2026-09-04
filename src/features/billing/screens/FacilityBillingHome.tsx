import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useEntitlements } from "@/entitlements";
import { useFacilityBilling } from "@/hooks/useFacilityBilling";
import { useRecurringPriceQuotes } from "@/hooks/useRecurringPriceQuotes";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { openExternalUrl } from "@/utils/openExternalUrl";
import {
  formatVerifiedRecurringBillingNote,
  formatVerifiedRecurringPrice,
  verifiedRecurringPriceQuote
} from "../recurringPriceQuotes";
import { resolveSubscriptionSafety } from "../subscriptionSafety";

const FACILITY_BILLING_ROLES = new Set(["OWNER", "FACILITY_ADMIN", "SUPER_ADMIN"]);

function displayDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

export default function FacilityBillingHome() {
  const { facilityId: entitlementFacilityId, facilityRole } = useEntitlements();
  const facility = useFacility();
  const facilityId = facility.selectedId || entitlementFacilityId || null;
  const facilityName = facility.selected?.name || "Selected Facility";
  const normalizedRole = String(facilityRole || "").toUpperCase();
  const roleCanManageBilling = FACILITY_BILLING_ROLES.has(normalizedRole);
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [cancelRequestPending, setCancelRequestPending] = useState(false);
  const [billingFeedback, setBillingFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const { quotes: catalogQuotes } = useRecurringPriceQuotes();
  const {
    billing,
    isLoading,
    error,
    refetch,
    startCheckout,
    cancelPlan,
    isStartingCheckout,
    isCanceling
  } = useFacilityBilling(facilityId);

  const loaded = Boolean(facilityId) && !isLoading && !error && billing != null;
  const canManageBilling = roleCanManageBilling && billing?.canManageBilling === true;
  const access = resolveSubscriptionSafety(billing, { loaded });
  const status = String(billing?.status || "none").toLowerCase();
  const periodEnd = displayDate(billing?.currentPeriodEnd);
  const graceUntil = displayDate(billing?.graceUntil);
  const busy = isStartingCheckout || isCanceling || cancelRequestPending;
  const priceQuote = verifiedRecurringPriceQuote(catalogQuotes, "facility", interval);

  async function handleCheckout() {
    if (
      !canManageBilling ||
      !facilityId ||
      busy ||
      !access.canOpenCheckout ||
      !priceQuote
    ) {
      return;
    }
    setBillingFeedback(null);
    try {
      const result = await startCheckout(interval);
      const url = result?.checkoutUrl || result?.url;
      if (!url) throw new Error("The billing provider did not return a checkout link.");
      await openExternalUrl(url);
      setBillingFeedback({
        kind: "success",
        text: "Secure Facility plan checkout opened. No plan changes until Stripe confirms payment."
      });
    } catch (checkoutError: any) {
      setBillingFeedback({
        kind: "error",
        text:
          checkoutError?.message ||
          "Facility checkout is unavailable. No billing action was completed."
      });
    }
  }

  function handleCancel() {
    if (!canManageBilling || !facilityId || busy || !access.canCancel) return;
    setBillingFeedback(null);
    setCancelConfirmationOpen(true);
  }

  async function performCancel() {
    if (!canManageBilling || !facilityId || busy || !access.canCancel) return;
    setCancelRequestPending(true);
    setBillingFeedback(null);
    try {
      await cancelPlan();
      setCancelConfirmationOpen(false);
      setBillingFeedback({
        kind: "success",
        text: "Facility renewal was canceled. Access remains active through the current billing period."
      });
      try {
        await refetch();
      } catch {
        setBillingFeedback({
          kind: "success",
          text: "Facility renewal was canceled. Refresh status to confirm the updated period details."
        });
      }
    } catch (cancelError: any) {
      setBillingFeedback({
        kind: "error",
        text:
          cancelError?.message ||
          "Facility renewal could not be canceled. No confirmed billing change was made."
      });
    } finally {
      setCancelRequestPending(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        Facility billing
      </Text>
      <Text style={styles.subtitle}>
        This page manages only {facilityName}. Personal Pro and gift access stay in
        Account billing.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Facility plan</Text>
        {!facilityId ? (
          <Text style={styles.note}>Select a Facility before reviewing its billing.</Text>
        ) : isLoading ? (
          <Text accessibilityLiveRegion="polite" style={styles.note}>
            Loading Facility billing status…
          </Text>
        ) : error ? (
          <>
            <Text accessibilityRole="alert" style={styles.error}>
              Facility billing status could not be loaded. No billing action was taken.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => void refetch()}
            >
              <Text style={styles.secondaryButtonText}>Retry status</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Facility</Text>
              <Text style={styles.value}>{facilityName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{status}</Text>
            </View>
            {periodEnd ? (
              <View style={styles.row}>
                <Text style={styles.label}>
                  {billing?.cancelAtPeriodEnd
                    ? "Access ends"
                    : "Current billing period through"}
                </Text>
                <Text style={styles.value}>{periodEnd}</Text>
              </View>
            ) : null}
            {graceUntil ? (
              <View style={styles.row}>
                <Text style={styles.label}>Grace period ends</Text>
                <Text style={styles.value}>{graceUntil}</Text>
              </View>
            ) : null}
            <Text style={styles.note}>{access.message}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => void refetch()}
            >
              <Text style={styles.secondaryButtonText}>Refresh status</Text>
            </Pressable>
          </>
        )}
      </View>

      {facilityId && !isLoading && !error ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Facility billing actions</Text>
          {!canManageBilling ? (
            <Text style={styles.note}>
              Only the Facility owner or authorized Facility billing administrator can
              start checkout or cancel renewal. Your {normalizedRole || "member"} access
              is read-only here.
            </Text>
          ) : access.canOpenCheckout ? (
            <>
              <Text style={styles.note}>
                {formatVerifiedRecurringBillingNote(priceQuote)}
              </Text>
              <View style={styles.intervalRow}>
                {(["monthly", "yearly"] as const).map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: interval === option }}
                    accessibilityLabel={`Choose Facility ${option} billing`}
                    style={[
                      styles.intervalButton,
                      interval === option && styles.intervalButtonSelected
                    ]}
                    onPress={() => setInterval(option)}
                  >
                    <Text style={styles.intervalButtonText}>
                      {option === "monthly" ? "Monthly" : "Yearly"}:{" "}
                      {formatVerifiedRecurringPrice(
                        verifiedRecurringPriceQuote(catalogQuotes, "facility", option)
                      )}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start Facility plan checkout"
                accessibilityState={{ disabled: busy || !priceQuote }}
                disabled={busy || !priceQuote}
                style={[styles.primaryButton, (busy || !priceQuote) && styles.disabled]}
                onPress={() => void handleCheckout()}
              >
                <Text style={styles.primaryButtonText}>
                  {isStartingCheckout
                    ? "Opening secure checkout…"
                    : "Continue to secure checkout"}
                </Text>
              </Pressable>
            </>
          ) : access.canCancel ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel Facility renewal"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={[styles.dangerButton, busy && styles.disabled]}
                onPress={handleCancel}
              >
                <Text style={styles.dangerButtonText}>
                  {isCanceling || cancelRequestPending
                    ? "Canceling renewal…"
                    : "Cancel renewal at period end"}
                </Text>
              </Pressable>
              {cancelConfirmationOpen ? (
                <View
                  accessibilityLabel="Confirm Facility cancellation"
                  style={styles.confirmationPanel}
                >
                  <Text style={styles.confirmationTitle}>Cancel Facility renewal?</Text>
                  <Text style={styles.note}>
                    Cancellation is scheduled for the end of the current billing period.
                    Facility access remains active through the paid-through date.
                  </Text>
                  <View style={styles.confirmationActions}>
                    <Pressable
                      accessibilityLabel="Keep Facility renewal"
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={() => setCancelConfirmationOpen(false)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Keep renewal</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Confirm cancel Facility renewal"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: busy }}
                      disabled={busy}
                      onPress={() => void performCancel()}
                      style={[styles.dangerButton, busy && styles.disabled]}
                    >
                      <Text style={styles.dangerButtonText}>
                        {isCanceling || cancelRequestPending
                          ? "Canceling renewal…"
                          : "Cancel renewal"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.note}>
              No checkout or cancellation action is available for this Facility status.
            </Text>
          )}
          {billingFeedback ? (
            <View
              accessibilityRole={billingFeedback.kind === "error" ? "alert" : undefined}
              accessibilityLiveRegion="polite"
              style={[
                styles.feedbackPanel,
                billingFeedback.kind === "error"
                  ? styles.feedbackError
                  : styles.feedbackSuccess
              ]}
            >
              <Text
                style={billingFeedback.kind === "error" ? styles.error : styles.success}
              >
                {billingFeedback.text}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: palette.page },
    content: { gap: 16, padding: 16, paddingBottom: 40 },
    title: { color: palette.text, fontSize: 28, fontWeight: "800" },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 21 },
    card: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      padding: 16
    },
    cardTitle: { color: palette.text, fontSize: 19, fontWeight: "700" },
    row: { gap: 4 },
    label: { color: palette.textMuted, fontSize: 13, fontWeight: "600" },
    value: { color: palette.text, fontSize: 16, fontWeight: "700" },
    note: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
    error: { color: palette.danger, fontSize: 14, lineHeight: 20 },
    success: { color: palette.success, fontSize: 14, lineHeight: 20 },
    intervalRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    intervalButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    intervalButtonSelected: { borderColor: palette.accent, borderWidth: 2 },
    intervalButtonText: { color: palette.text, fontSize: 14, fontWeight: "600" },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      padding: 13
    },
    primaryButtonText: { color: palette.accentText, fontSize: 15, fontWeight: "700" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    secondaryButtonText: { color: palette.link, fontSize: 15, fontWeight: "700" },
    dangerButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 13
    },
    dangerButtonText: { color: palette.danger, fontSize: 15, fontWeight: "700" },
    confirmationPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    confirmationTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
    confirmationActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    feedbackPanel: {
      backgroundColor: palette.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    feedbackError: { borderColor: palette.danger },
    feedbackSuccess: { borderColor: palette.success },
    disabled: { opacity: 0.55 }
  });
}
