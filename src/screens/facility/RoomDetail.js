import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl
} from "react-native";
import { getRoom } from "../../api/facility";

const RoomDetail = ({ route }) => {
  const { roomId } = route.params;
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  const loadRoom = async () => {
    setLoading(true);
    try {
      const result = await getRoom(roomId);
      if (result.success) {
        setRoom(result.data);
      }
    } catch (error) {
      console.log("Error loading room:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoom();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Room not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{room.name}</Text>
        <Text style={styles.subtitle}>{room.roomType}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Room Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Room Type:</Text>
          <Text style={styles.value}>{room.roomType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Current Stage:</Text>
          <Text style={styles.value}>{room.stage || "N/A"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, { color: room.isActive ? "#10b981" : "#ef4444" }]}>
            {room.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Environmental Baselines</Text>
        {room.baselines ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Temperature (°F):</Text>
              <Text style={styles.value}>{room.baselines.temperature || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Humidity (%):</Text>
              <Text style={styles.value}>{room.baselines.humidity || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>pH:</Text>
              <Text style={styles.value}>{room.baselines.ph || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>EC:</Text>
              <Text style={styles.value}>{room.baselines.ec || "—"}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.placeholder}>No baseline data recorded</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Activity</Text>
        {room.lastActivityAt && (
          <Text style={styles.infoText}>
            Last activity: {new Date(room.lastActivityAt).toLocaleString()}
          </Text>
        )}
        {room.createdBy && (
          <Text style={styles.infoText}>Created by: {room.createdBy}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coming in Phase 2</Text>
        <Text style={styles.placeholder}>• Environmental Controls</Text>
        <Text style={styles.placeholder}>• Activity Logs</Text>
        <Text style={styles.placeholder}>• Advanced Monitoring</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "500"
  },
  tabBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280"
  },
  indicator: {
    backgroundColor: "#0ea5e9",
    height: 3
  },
  tabContent: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  label: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500"
  },
  value: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600"
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8
  },
  placeholder: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic"
  },
  error: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 40
  }
});

export default RoomDetail;
