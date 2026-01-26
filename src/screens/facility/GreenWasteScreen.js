import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl
} from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { listGreenWasteEvents, createGreenWasteEvent } from "../../api/greenWaste";

const DISPOSAL_METHODS = ["Compost", "Landfill", "Incinerator", "Donation", "Other"];

export default function GreenWasteScreen() {
  const { selectedFacilityId } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [selectedFacilityId]);

  const loadEvents = async () => {
    setLoading(true);
    const res = await listGreenWasteEvents(selectedFacilityId);
    if (res.success) setEvents(res.data || []);
    setLoading(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents().then(() => setRefreshing(false));
  };

  const resetForm = () => {
    setAmount("");
    setMethod("");
    setNotes("");
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleAddEvent = async () => {
    if (!amount || !method) {
      Alert.alert("Missing Info", "Amount and method are required.");
      return;
    }
    setSubmitting(true);
    const res = await createGreenWasteEvent(selectedFacilityId, {
      amount,
      method,
      notes
    });
    setSubmitting(false);
    if (res.success) {
      closeModal();
      loadEvents();
      Alert.alert("Success", "Waste event logged");
    } else {
      Alert.alert("Error", res.message || "Failed to add event");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
      >
        <Text style={styles.addButtonText}>+ Log Waste Event</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View>
                  <Text style={styles.eventAmount}>{item.amount}</Text>
                  <Text style={styles.eventMethod}>{item.method}</Text>
                </View>
              </View>
              {item.notes && <Text style={styles.eventNotes}>{item.notes}</Text>}
              {item.createdAt && (
                <Text style={styles.eventDate}>
                  Logged: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No waste events logged</Text>
              <Text style={styles.emptySubtext}>Tap + to log first event</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          style={styles.list}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Waste Disposal</Text>

            <Text style={styles.formLabel}>Amount (lbs or kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 150"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.formLabel}>Disposal Method *</Text>
            <View style={styles.methodSelector}>
              {DISPOSAL_METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodButton, method === m && styles.methodButtonActive]}
                  onPress={() => setMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodButtonText,
                      method === m && styles.methodButtonTextActive
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Additional notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.logButton,
                  submitting && styles.disabledButton
                ]}
                onPress={handleAddEvent}
                disabled={submitting}
              >
                <Text style={styles.logButtonText}>
                  {submitting ? "Logging..." : "Log Event"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  addButton: {
    backgroundColor: "#10b981",
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
  list: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.10)",
    elevation: 2
  },
  eventHeader: {
    marginBottom: 8
  },
  eventAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937"
  },
  eventMethod: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "600",
    marginTop: 4
  },
  eventNotes: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8
  },
  eventDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500"
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    maxHeight: "90%"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 20
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 14
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top"
  },
  methodSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8
  },
  methodButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  methodButtonActive: {
    backgroundColor: "#10b981",
    borderColor: "#10b981"
  },
  methodButtonText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500"
  },
  methodButtonTextActive: {
    color: "#fff"
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  cancelButton: {
    backgroundColor: "#f3f4f6"
  },
  logButton: {
    backgroundColor: "#10b981"
  },
  disabledButton: {
    opacity: 0.6
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 16
  },
  logButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16
  }
});
