import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { listRooms } from "../../api/facility";

const RoomsList = ({ navigation }) => {
  const { selectedFacilityId } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRooms();
  }, [selectedFacilityId]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      if (selectedFacilityId) {
        const result = await listRooms(selectedFacilityId);
        if (result.success) {
          setRooms(result.data || []);
        }
      }
    } catch (error) {
      console.log("Error loading rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const handleRoomPress = (roomId) => {
    navigation.navigate("RoomDetail", { roomId });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.roomCard}
          onPress={() => handleRoomPress(item._id)}
        >
          <View style={styles.roomHeader}>
            <Text style={styles.roomName}>{item.name}</Text>
            <Text style={styles.roomType}>{item.roomType}</Text>
          </View>
          <Text style={styles.roomStage}>Stage: {item.stage || "N/A"}</Text>
          {item.lastActivityAt && (
            <Text style={styles.roomActivity}>
              Last activity: {new Date(item.lastActivityAt).toLocaleDateString()}
            </Text>
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No rooms yet</Text>
          <Text style={styles.emptySubtext}>Tap + to add a room</Text>
        </View>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={styles.list}
      contentContainerStyle={{ flexGrow: 1 }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb"
  },
  list: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16
  },
  roomCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  roomName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937"
  },
  roomType: {
    fontSize: 12,
    backgroundColor: "#dbeafe",
    color: "#0ea5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: "500"
  },
  roomStage: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4
  },
  roomActivity: {
    fontSize: 12,
    color: "#9ca3af"
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af"
  }
});

export default RoomsList;
