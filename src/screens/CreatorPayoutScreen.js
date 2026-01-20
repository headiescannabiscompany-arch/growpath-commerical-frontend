import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import FeatureGate from "../components/FeatureGate.js";
import { getPayoutSummary, getPayoutHistory, requestPayout } from "../api/creator.js";

export default function CreatorPayoutScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [requesting, setRequesting] = useState(false);

  async function load() {
    try {
      const s = await getPayoutSummary();
      const h = await getPayoutHistory();

      setSummary(s.data || s);
      setHistory(h.data || h);
    } catch (err) {
      console.log("Error loading payouts:", err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleRequestPayout = async () => {
    if (!summary || summary.availableForPayout <= 0) return;
    Alert.alert(
      "Request Payout",
      `Request payout of $${summary.availableForPayout.toFixed(2)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            setRequesting(true);
            try {
              const res = await requestPayout();
              if (res.success) {
                Alert.alert("Requested!", "Your payout request has been submitted.");
                load();
              } else {
                Alert.alert("Error", res.message || "Failed to request payout");
              }
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to request payout");
            } finally {
              setRequesting(false);
            }
          }
        }
      ]
    );
  };

  if (!summary) {
    return (
      <ScreenContainer>
        <Text>Loading…</Text>
      </ScreenContainer>
    );
  }

  <FeatureGate plan="creator" navigation={navigation} fallback={null}>
    <ScreenContainer scroll>
      <Text style={styles.header}>Payouts</Text>

      {/* Summary Card */}
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Total Earned</Text>
            <Text style={styles.value}>${summary.totalEarned.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Total Paid Out</Text>
            <Text style={[styles.value, { color: "#27ae60" }]}>
              ${summary.totalPaid.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.availableSection}>
          <Text style={styles.label}>Available for Payout</Text>
          <Text style={[styles.value, { color: "#e67e22", fontSize: 22 }]}>
            ${summary.availableForPayout.toFixed(2)}
          </Text>
        </View>
        {summary.availableForPayout > 0 && (
          <TouchableOpacity
            style={styles.requestBtn}
            onPress={handleRequestPayout}
            disabled={requesting}
          >
            {requesting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.requestBtnText}>Request Payout</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* History */}
      <Text style={styles.subheader}>Earnings History</Text>

      {history.length === 0 ? (
        <Text style={styles.emptyText}>No earnings yet</Text>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={history}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const date = new Date(item.createdAt).toLocaleDateString();

            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
                  <Text style={styles.date}>{date}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={item.paidOut ? styles.paid : styles.unpaid}>
                    {item.paidOut ? "✓ Paid" : "⏳ Pending"}
                  </Text>
                  {item.platformFee > 0 && (
                    <Text style={styles.fee}>Fee: ${item.platformFee.toFixed(2)}</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  </FeatureGate>;
}

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 15,
    color: "#2c3e50"
  },
  card: {
    backgroundColor: "#d5f4e6",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60"
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  summaryItem: {
    flex: 1
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: "#27ae60",
    opacity: 0.3
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#27ae60",
    opacity: 0.3,
    marginVertical: 14
  },
  availableSection: {
    alignItems: "center"
  },
  label: {
    color: "#27ae60",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50"
  },
  subheader: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#34495e"
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    marginBottom: 6,
    borderRadius: 6
  },
  amount: {
    fontWeight: "700",
    fontSize: 16,
    color: "#2c3e50"
  },
  date: {
    color: "#999",
    fontSize: 12,
    marginTop: 4
  },
  paid: {
    color: "#27ae60",
    fontWeight: "700",
    fontSize: 13
  },
  unpaid: {
    color: "#e67e22",
    fontWeight: "700",
    fontSize: 13
  },
  fee: {
    color: "#999",
    fontSize: 11,
    marginTop: 2
  },
  requestBtn: {
    backgroundColor: "#e67e22",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16
  },
  requestBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  }
});
