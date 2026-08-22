import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useEntitlements } from "@/entitlements";
import { useFacilityBilling } from "@/hooks/useFacilityBilling";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { formatPlanBillingNote, formatPlanPrice } from "@/constants/pricing";
import { openExternalUrl } from "@/utils/openExternalUrl";
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
  const busy = isStartingCheckout || isCanceling;

  async function handleCheckout() {
    if (!canManageBilling || !facilityId || busy) return;
    try {
      const result = await startCheckout(interval);
      const url = result?.checkoutUrl || result?.url;
      if (!url) throw new Error("The billing provider did not return a checkout link.");
      await openExternalUrl(url);
    } catch (checkoutError: any) {
      Alert.alert(
        "Facility checkout unavailable",
        checkoutError?.message || "No billing action was completed."
      );
    }
  }

  function handleCancel() {
    if (!canManageBilling || !facilityId || busy) return;
    Alert.alert(
      "Cancel Facility renewal?",
      "Cancellation is scheduled for the end of the current billing period. Facility access remains active through the paid-through date.",
      [
        { text: "Keep renewal", style: "cancel" },
        {
          text: "Cancel renewal",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelPlan();
              await refetch();
              Alert.alert(
                "Renewal canceled",
                "Facility access remains active through the current billing period."
              );
            } catch (cancelError: any) {
              Alert.alert(
                "Cancellation failed",
                cancelError?.message || "No billing change was completed."
              );
            }
          }
        }
      ]
    );
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
                  {billing?.cancelAtPeriodEnd ? "Access through" : "Current period ends"}
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
                {formatPlanBillingNote("facility", interval)}
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
                      {formatPlanPrice("facility", option)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start Facility plan checkout"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                style={[styles.primaryButton, busy && styles.disabled]}
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel Facility renewal"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              style={[styles.dangerButton, busy && styles.disabled]}
              onPress={handleCancel}
            >
              <Text style={styles.dangerButtonText}>
                {isCanceling ? "Canceling renewal…" : "Cancel renewal at period end"}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.note}>
              No checkout or cancellation action is available for this Facility status.
            </Text>
          )}
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
    disabled: { opacity: 0.55 }
  });
}
