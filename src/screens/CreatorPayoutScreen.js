import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  createConnectPayoutDashboardLink,
  getConnectPayoutStatus,
  getPayoutHistory,
  getPayoutSummary
} from "../api/creator.js";
import ScreenContainer from "../components/ScreenContainer.js";
import { radius } from "../theme/theme.js";

function rows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.payouts)) return payload.payouts;
  if (Array.isArray(payload?.history)) return payload.history;
  return [];
}

function money(value) {
  const n = Number(value || 0);
  return `$${n.toFixed(2)}`;
}

export default function CreatorPayoutScreen() {
  const entitlements = useEntitlements();
  const canView = entitlements.can(CAPABILITY_KEYS.CREATOR_EARNINGS_VIEW);
  const canRequest = entitlements.can(CAPABILITY_KEYS.CREATOR_PAYOUT_REQUEST);
  const [summary, setSummary] = useState(null);
  const [connectStatus, setConnectStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const estimatedSellerNet = Number(
    summary?.estimatedSellerNet ?? summary?.totalEarned ?? 0
  );
  const heldOrAdjustmentPending = Number(summary?.heldOrAdjustmentPending ?? 0);

  async function load() {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const [nextSummary, nextHistory, nextConnectStatus] = await Promise.all([
        getPayoutSummary(),
        getPayoutHistory(),
        getConnectPayoutStatus()
      ]);
      setSummary(nextSummary || {});
      setHistory(rows(nextHistory));
      setConnectStatus(nextConnectStatus?.status || nextConnectStatus || {});
    } catch (error) {
      setFeedback(error?.message || "Unable to load payout data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [canView]);

  async function submitRequest() {
    if (!canRequest || !connectStatus?.connected) return;
    setRequesting(true);
    setFeedback("");
    try {
      const result = await createConnectPayoutDashboardLink();
      const url = result?.url;
      if (!url) throw new Error("Stripe payout dashboard link was unavailable.");
      await Linking.openURL(url);
      setFeedback("Stripe opened for authoritative balance and bank payout status.");
    } catch (error) {
      setFeedback(error?.message || "Failed to open Stripe payout management.");
    } finally {
      setRequesting(false);
    }
  }

  const pending = useMemo(
    () =>
      history.filter((item) =>
        ["held", "adjustment_pending"].includes(item.earningStatus)
      ),
    [history]
  );

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
          <Text style={styles.meta}>Loading Stripe payout status...</Text>
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
            <Text style={styles.label}>Seller Net Recorded</Text>
            <Text style={styles.value}>{money(estimatedSellerNet)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Bank Payout Status</Text>
            <Text style={styles.value}>View in Stripe</Text>
          </View>
        </View>
        <Text style={styles.label}>Held or Under Adjustment</Text>
        <Text style={styles.available}>{money(heldOrAdjustmentPending)}</Text>
        <Text style={styles.meta}>
          GrowPath uses destination charges. Stripe receives seller proceeds and is the
          source of truth for bank payout timing and status.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open Stripe Payouts"
          testID="creator-open-stripe-payouts"
          style={[
            styles.requestBtn,
            (!canRequest || !connectStatus?.connected) && styles.disabled
          ]}
          onPress={submitRequest}
          disabled={!canRequest || !connectStatus?.connected || requesting}
        >
          {requesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.requestBtnText}>Open Stripe Payouts</Text>
          )}
        </TouchableOpacity>
        {!canRequest ? (
          <Text style={styles.meta}>
            Payout access requires `CREATOR_PAYOUT_REQUEST`.
          </Text>
        ) : !connectStatus?.connected ? (
          <Text style={styles.meta}>Connect Stripe in Profile &amp; Billing first.</Text>
        ) : null}
      </View>

      <Text style={styles.subheader}>Held or Adjustment Review</Text>
      {pending.length ? (
        pending.map((item) => (
          <View key={String(item._id || item.id || item.createdAt)} style={styles.row}>
            <Text style={styles.amount}>{money(item.amount)}</Text>
            <Text style={styles.meta}>Status: {item.earningStatus}</Text>
            <Text style={styles.meta}>
              Recorded{" "}
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No held earnings or pending adjustments.</Text>
      )}

      <Text style={styles.subheader}>Payout History</Text>
      <FlatList
        scrollEnabled={false}
        data={history}
        keyExtractor={(item) => String(item._id || item.id || item.createdAt)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.amount}>{money(item.amount)}</Text>
            <Text style={styles.unpaid}>{item.earningStatus || "recorded"}</Text>
            <Text style={styles.meta}>Bank payout: verify in Stripe</Text>
            {item.legacyLocalPaidMarker ? (
              <Text style={styles.meta}>Legacy local marker is not payout proof.</Text>
            ) : null}
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
  paid: { color: "#27ae60", fontWeight: "800", marginTop: 4 },
  unpaid: { color: "#e67e22", fontWeight: "800", marginTop: 4 },
  requestBtn: {
    backgroundColor: "#e67e22",
    paddingVertical: 12,
    borderRadius: radius.card,
    alignItems: "center",
    marginTop: 16
  },
  requestBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.55 },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    padding: 8,
    marginBottom: 10
  },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", paddingVertical: 20 }
});
