import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { getEarnings } from "../api/creator.js";
import StripeConnectPayoutCard from "../components/account/StripeConnectPayoutCard";
import ScreenContainer from "../components/ScreenContainer.js";
import { radius } from "../theme/theme.js";

function normalize(payload) {
  const data = payload?.data ?? payload ?? {};
  return {
    earnings: Array.isArray(data.earnings) ? data.earnings : [],
    stats: data.stats || {},
    payoutManagement: data.payoutManagement || null
  };
}

function money(value) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "Unavailable";
}

function earningStatus(item) {
  if (item.legacyLocalPaidMarker) return "Legacy local paid marker — unverified";
  switch (item.earningStatus) {
    case "available":
      return "Recorded seller earning";
    case "held":
      return "Held during payment review";
    case "adjustment_pending":
      return "Adjustment pending";
    case "refunded":
      return "Refunded";
    default:
      return item.earningStatus || "Recorded seller earning";
  }
}

export default function CreatorPayoutScreen() {
  const entitlements = useEntitlements();
  const canView = entitlements.can(CAPABILITY_KEYS.CREATOR_EARNINGS_VIEW);
  const canRequest = entitlements.can(CAPABILITY_KEYS.CREATOR_PAYOUT_REQUEST);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      setLedger(normalize(await getEarnings()));
    } catch (error) {
      setFeedback(error?.message || "Unable to load the seller earnings ledger.");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canView) {
    return (
      <ScreenContainer>
        <View style={styles.card}>
          <Text style={styles.header}>Payouts unavailable</Text>
          <Text style={styles.meta}>
            This account does not have `CREATOR_EARNINGS_VIEW`.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading seller earnings...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Payouts</Text>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Estimated Seller Net</Text>
            <Text style={styles.value}>{money(ledger?.stats?.estimatedSellerNet)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Bank Payout Status</Text>
            <Text style={styles.value}>View in Stripe</Text>
          </View>
        </View>
        <Text style={styles.label}>Held or Under Adjustment</Text>
        <Text style={styles.available}>
          {money(ledger?.stats?.heldOrAdjustmentPending)}
        </Text>
        <Text style={styles.meta}>
          GrowPathAI records eligible seller earnings. Stripe is the source of truth for
          connected balances and bank-payout timing.
        </Text>
      </View>

      {canRequest ? (
        <StripeConnectPayoutCard title="Stripe payout readiness" titleLevel={2} />
      ) : (
        <Text style={styles.meta}>
          This account does not have permission to manage seller payouts.
        </Text>
      )}

      <Text style={styles.subheader}>Seller Earnings Ledger</Text>
      <FlatList
        scrollEnabled={false}
        data={ledger?.earnings || []}
        keyExtractor={(item) => String(item._id || item.id || item.createdAt)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.amount}>{money(item.amount)}</Text>
            <Text style={styles.unpaid}>{earningStatus(item)}</Text>
            <Text style={styles.meta}>Bank payout: verify in Stripe</Text>
            {item.platformFee ? (
              <Text style={styles.meta}>Platform fee: {money(item.platformFee)}</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No seller earnings yet.</Text>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700", marginBottom: 15, color: "#2c3e50" },
  subheader: { fontSize: 18, fontWeight: "700", marginVertical: 12, color: "#34495e" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  card: {
    backgroundColor: "#d5f4e6",
    padding: 16,
    borderRadius: radius.card,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60"
  },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  summaryItem: { flex: 1 },
  label: { color: "#166534", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  value: { fontSize: 18, fontWeight: "700", color: "#2c3e50" },
  available: { fontSize: 24, fontWeight: "800", color: "#e67e22" },
  row: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    marginBottom: 8,
    backgroundColor: "#fff"
  },
  amount: { fontWeight: "800", fontSize: 16, color: "#2c3e50" },
  meta: { color: "#64748B", fontSize: 13, marginTop: 4 },
  unpaid: { color: "#e67e22", fontWeight: "800", marginTop: 4 },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    padding: 8,
    marginBottom: 10
  },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", paddingVertical: 20 }
});
