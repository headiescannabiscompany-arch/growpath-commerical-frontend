import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { getPayoutHistory } from "../api/creator.js";
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
  if (value === null || value === undefined || value === "") return "Unavailable";
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "Unavailable";
}

function isLegacyPaidMarker(item) {
  const status = String(item?.earningStatus || item?.status || "").toLowerCase();
  return Boolean(
    item?.legacyLocalPaidMarker ||
    item?.paidOut === true ||
    status === "paid" ||
    status === "paid_out" ||
    status === "legacy_paid_marker"
  );
}

function statusLabel(item) {
  if (isLegacyPaidMarker(item)) return "Legacy local paid marker — unverified";
  return item?.earningStatus || item?.status || "Recorded seller earning";
}

export default function AdminPayoutsScreen() {
  const entitlements = useEntitlements();
  const canAdmin = entitlements.can(CAPABILITY_KEYS.CREATOR_PAYOUT_ADMIN);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!canAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const next = await getPayoutHistory();
      setHistory(rows(next));
    } catch (error) {
      setFeedback(error?.message || "Failed to load payouts.");
    } finally {
      setLoading(false);
    }
  }, [canAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.locked}>
          <Text style={styles.header}>Admin payouts unavailable</Text>
          <Text style={styles.meta}>
            This account does not have `CREATOR_PAYOUT_ADMIN`.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Admin: Payout Ledger Review</Text>
      <Text style={styles.meta}>
        Read-only view. GrowPathAI cannot mark a Stripe bank payout paid. Verify balances,
        transfers, and bank-payout status in Stripe.
      </Text>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          scrollEnabled={false}
          data={history}
          keyExtractor={(item) => String(item._id || item.id || item.createdAt)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amount}>{money(item.amount)}</Text>
                <Text style={styles.date}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                </Text>
                <Text style={styles.creator}>
                  Creator:{" "}
                  {item.creatorName || item.creatorId || item.creator?.name || "Unknown"}
                </Text>
                <Text style={isLegacyPaidMarker(item) ? styles.warning : styles.meta}>
                  Status: {statusLabel(item)}
                </Text>
                <Text style={styles.meta}>Bank payout: verify in Stripe</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No seller earnings returned.</Text>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: "bold", marginVertical: 16, textAlign: "center" },
  locked: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "#f8fafc"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  amount: { fontWeight: "700", fontSize: 16, color: "#2c3e50" },
  date: { color: "#999", fontSize: 12, marginTop: 4 },
  creator: { color: "#34495e", fontSize: 13, marginTop: 2 },
  meta: { color: "#64748B", fontSize: 13, marginTop: 4 },
  warning: { color: "#b45309", fontSize: 13, fontWeight: "800", marginTop: 4 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    padding: 8,
    marginBottom: 10
  }
});
