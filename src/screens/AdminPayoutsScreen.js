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
import { getPayoutHistory, markPayoutPaid } from "../api/creator.js";
import ScreenContainer from "../components/ScreenContainer.js";

function rows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.payouts)) return payload.payouts;
  if (Array.isArray(payload?.history)) return payload.history;
  return [];
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function AdminPayoutsScreen() {
  const entitlements = useEntitlements();
  const canAdmin = entitlements.can(CAPABILITY_KEYS.CREATOR_PAYOUT_ADMIN);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);
  const [feedback, setFeedback] = useState("");

  const pending = useMemo(
    () => history.filter((item) => !item.paidOut && item.status !== "paid"),
    [history]
  );

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, [canAdmin]);

  async function handleMarkPaid(payoutId) {
    setMarking(payoutId);
    setFeedback("");
    try {
      await markPayoutPaid(payoutId);
      setFeedback("Payout marked paid. Backend payout history refreshed.");
      await load();
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to mark as paid");
    } finally {
      setMarking(null);
    }
  }

  if (!canAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.locked}>
          <Text style={styles.header}>Admin payouts unavailable</Text>
          <Text style={styles.meta}>This account does not have `CREATOR_PAYOUT_ADMIN`.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Admin: Payout Requests</Text>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          scrollEnabled={false}
          data={pending}
          keyExtractor={(item) => String(item._id || item.id || item.createdAt)}
          renderItem={({ item }) => {
            const id = String(item._id || item.id || "");
            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.amount}>{money(item.amount)}</Text>
                  <Text style={styles.date}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                  </Text>
                  <Text style={styles.creator}>
                    Creator: {item.creatorName || item.creatorId || item.creator?.name || "Unknown"}
                  </Text>
                  <Text style={styles.meta}>Status: {item.status || "pending"}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.markBtn, marking === id && styles.disabled]}
                  onPress={() => handleMarkPaid(id)}
                  disabled={!id || marking === id}
                >
                  {marking === id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.markBtnText}>Mark as Paid</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No pending payout requests.</Text>}
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
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f8fafc"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    padding: 16,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  amount: { fontWeight: "700", fontSize: 16, color: "#2c3e50" },
  date: { color: "#999", fontSize: 12, marginTop: 4 },
  creator: { color: "#34495e", fontSize: 13, marginTop: 2 },
  meta: { color: "#64748B", fontSize: 13, marginTop: 4 },
  markBtn: {
    backgroundColor: "#27ae60",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12
  },
  markBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10
  },
  disabled: { opacity: 0.6 }
});
