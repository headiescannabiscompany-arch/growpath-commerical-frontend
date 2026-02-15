/* eslint-disable no-unused-expressions */
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
import { getPayoutHistory, markPayoutPaid } from "../api/creator.js";

export default function AdminPayoutsScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const h = await getPayoutHistory();
      setHistory(h.data || h);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleMarkPaid = async (payoutId) => {
    setMarking(payoutId);
    try {
      const res = await markPayoutPaid(payoutId);
      if (res.success) {
        Alert.alert("Marked as Paid", "Payout marked as paid.");
        load();
      } else {
        Alert.alert("Error", res.message || "Failed to mark as paid");
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to mark as paid");
    } finally {
      setMarking(null);
    }
  };

  <FeatureGate plan="commercial" navigation={navigation} fallback={null}>
    <ScreenContainer scroll>
      <Text style={styles.header}>Admin: Payout Requests</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={history.filter((p) => !p.paidOut)}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.creator}>
                  Creator: {item.creatorName || item.creatorId}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.markBtn}
                onPress={() => handleMarkPaid(item._id)}
                disabled={marking === item._id}
              >
                {marking === item._id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.markBtnText}>Mark as Paid</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No pending payout requests.</Text>
          }
        />
      )}
    </ScreenContainer>
  </FeatureGate>;
}

const styles = StyleSheet.create({
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 16,
    textAlign: "center"
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
  creator: {
    color: "#34495e",
    fontSize: 13,
    marginTop: 2
  },
  markBtn: {
    backgroundColor: "#27ae60",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12
  },
  markBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15
  },
  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 40
  }
});

