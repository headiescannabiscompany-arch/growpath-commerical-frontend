import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert
} from "react-native";
import { getReports, resolveReport } from "../api/adminReports";
import ScreenContainer from "../components/ScreenContainer";

export default function AdminReportsScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await getReports(global.token);
      setReports(res.data);
    } catch (err) {
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleResolve(id) {
    setResolving(id);
    try {
      await resolveReport(id, global.token);
      setReports(reports.map((r) => (r._id === id ? { ...r, status: "resolved" } : r)));
    } catch (err) {
      Alert.alert("Error", "Failed to resolve report");
    } finally {
      setResolving(null);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator size="large" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>User Reports</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.label}>
              Type: <Text style={styles.value}>{item.contentType}</Text>
            </Text>
            <Text style={styles.label}>
              Reason: <Text style={styles.value}>{item.reason}</Text>
            </Text>
            <Text style={styles.label}>
              Status: <Text style={styles.value}>{item.status}</Text>
            </Text>
            <Text style={styles.label}>
              Reported By:{" "}
              <Text style={styles.value}>
                {item.reportedBy?.username || item.reportedBy?._id}
              </Text>
            </Text>
            <Text style={styles.label}>
              Date:{" "}
              <Text style={styles.value}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </Text>
            {item.status === "open" && (
              <Button
                title={resolving === item._id ? "Resolving..." : "Resolve"}
                onPress={() => handleResolve(item._id)}
                disabled={!!resolving}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>No reports found.</Text>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 16,
    textAlign: "center"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  label: {
    fontWeight: "bold",
    marginBottom: 2
  },
  value: {
    fontWeight: "normal"
  }
});
