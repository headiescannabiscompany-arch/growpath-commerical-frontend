import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { getPayoutHistory, getPayoutSummary, requestPayout } from "../api/creator.js";
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
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const available = Number(summary?.availableForPayout ?? summary?.available ?? 0);

  async function load() {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const [nextSummary, nextHistory] = await Promise.all([
        getPayoutSummary(),
        getPayoutHistory()
      ]);
      setSummary(nextSummary || {});
      setHistory(rows(nextHistory));
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
    if (!canRequest || available <= 0) return;
    setRequesting(true);
    setFeedback("");
    try {
      await requestPayout("stripe");
      setFeedback("Payout request submitted. Status updates after admin/payment processing.");
      await load();
    } catch (error) {
      setFeedback(error?.message || "Failed to request payout.");
    } finally {
      setRequesting(false);
    }
  }

  const pending = useMemo(
    () => history.filter((item) => !item.paidOut && item.status !== "paid"),
    [history]
  );

  if (!canView) {
    return (
      <ScreenContainer>
        <View style={styles.card}>
          <Text style={styles.header}>Payouts unavailable</Text>
          <Text style={styles.meta}>This account does not have `CREATOR_EARNINGS_VIEW`.</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading payouts...</Text>
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
            <Text style={styles.label}>Total Earned</Text>
            <Text style={styles.value}>{money(summary?.totalEarned ?? summary?.total)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Paid Out</Text>
            <Text style={styles.value}>{money(summary?.totalPaid ?? summary?.paidOut)}</Text>
          </View>
        </View>
        <Text style={styles.label}>Available for Payout</Text>
        <Text style={styles.available}>{money(available)}</Text>
        <TouchableOpacity
          style={[styles.requestBtn, (!canRequest || available <= 0) && styles.disabled]}
          onPress={submitRequest}
          disabled={!canRequest || available <= 0 || requesting}
        >
          {requesting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.requestBtnText}>Request Payout</Text>
          )}
        </TouchableOpacity>
        {!canRequest ? (
          <Text style={styles.meta}>Payout requests require `CREATOR_PAYOUT_REQUEST`.</Text>
        ) : null}
      </View>

      <Text style={styles.subheader}>Pending Requests</Text>
      {pending.length ? (
        pending.map((item) => (
          <View key={String(item._id || item.id || item.createdAt)} style={styles.row}>
            <Text style={styles.amount}>{money(item.amount)}</Text>
            <Text style={styles.meta}>Status: {item.status || "pending"}</Text>
            <Text style={styles.meta}>
              Requested {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No pending payout requests.</Text>
      )}

      <Text style={styles.subheader}>Payout History</Text>
      <FlatList
        scrollEnabled={false}
        data={history}
        keyExtractor={(item) => String(item._id || item.id || item.createdAt)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.amount}>{money(item.amount)}</Text>
            <Text style={item.paidOut || item.status === "paid" ? styles.paid : styles.unpaid}>
              {item.status || (item.paidOut ? "paid" : "pending")}
            </Text>
            {item.platformFee ? (
              <Text style={styles.meta}>Platform fee: {money(item.platformFee)}</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No payout history yet.</Text>}
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
