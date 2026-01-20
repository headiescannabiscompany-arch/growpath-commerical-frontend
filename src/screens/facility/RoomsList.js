import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  Alert
} from "react-native";
import { useAuth } from "../../context/AuthContext.js";
import { listRooms, createRoom } from "../../api/facility.js";

const RoomsList = ({ navigation }) => {
  const { selectedFacilityId } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("Vegetative");
  const [trackingMode, setTrackingMode] = useState("batch");
  const [creating, setCreating] = useState(false);

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

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      Alert.alert("Error", "Room name is required");
      return;
    }
    setCreating(true);
    try {
      const result = await createRoom(selectedFacilityId, {
        name: newRoomName,
        roomType: newRoomType,
        trackingMode
      });
      if (result.success) {
        setShowCreateModal(false);
        setNewRoomName("");
        setNewRoomType("Vegetative");
        setTrackingMode("batch");
        await loadRooms();
        if (result.data?._id) {
          navigation.navigate("RoomDetail", { roomId: result.data._id });
        }
      } else {
        // Optimistic local fallback to unblock demo when backend is offline
        const localRoom = {
          _id: `local-${Date.now()}`,
          name: newRoomName,
          roomType: newRoomType,
          trackingMode,
          stage: "N/A",
          lastActivityAt: null,
          _localOnly: true
        };
        setRooms((prev) => [localRoom, ...prev]);
        setShowCreateModal(false);
        setNewRoomName("");
        setNewRoomType("Vegetative");
        setTrackingMode("batch");
        Alert.alert(
          "Saved Locally",
          result.message || "Backend unavailable. Room added locally for this session."
        );
      }
    } catch (error) {
      const localRoom = {
        _id: `local-${Date.now()}`,
        name: newRoomName,
        roomType: newRoomType,
        trackingMode,
        stage: "N/A",
        lastActivityAt: null,
        _localOnly: true
      };
      setRooms((prev) => [localRoom, ...prev]);
      setShowCreateModal(false);
      setNewRoomName("");
      setNewRoomType("Vegetative");
      setTrackingMode("batch");
      Alert.alert(
        "Saved Locally",
        "Backend unavailable. Room added locally for this session."
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.addButtonText}>+ Add Room</Text>
      </TouchableOpacity>

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

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalOverlay, { zIndex: 1000, pointerEvents: "auto" }]}>
          <View style={styles.typeSelector}>
            {["Vegetative", "Flowering", "Mother", "Clone", "Dry", "Cure"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  newRoomType === type && styles.typeButtonActive
                ]}
                onPress={() => setNewRoomType(type)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    newRoomType === type && styles.typeButtonTextActive
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionLabel}>Tracking mode</Text>
          <View style={styles.typeSelector}>
            {["batch", "zone", "individual"].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.typeButton,
                  trackingMode === mode && styles.typeButtonActive
                ]}
                onPress={() => setTrackingMode(mode)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    trackingMode === mode && styles.typeButtonTextActive
                  ]}
                >
                  {mode === "batch" ? "Batch" : mode === "zone" ? "Zone" : "Individual"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowCreateModal(false);
                setNewRoomName("");
                setNewRoomType("Vegetative");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.createButton,
                creating && styles.disabledButton
              ]}
              onPress={handleCreateRoom}
              disabled={creating}
            >
              <Text style={styles.createButtonText}>
                {creating ? "Creating..." : "Create"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  addButton: {
    backgroundColor: "#0ea5e9",
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 8,
    alignItems: "center"
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937"
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
    boxShadow: "0px 2px 8px rgba(0,0,0,0.10)",
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#1f2937"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 8
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff"
  },
  typeButtonActive: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9"
  },
  typeButtonText: {
    fontSize: 13,
    color: "#6b7280"
  },
  typeButtonTextActive: {
    color: "#fff",
    fontWeight: "600"
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  cancelButton: {
    backgroundColor: "#f3f4f6"
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600"
  },
  createButton: {
    backgroundColor: "#0ea5e9"
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  disabledButton: {
    opacity: 0.5
  }
});

export default RoomsList;
