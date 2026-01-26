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
import { listDeviations, createDeviation } from "../../api/deviation";

const DEVIATION_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

export default function DeviationHandlingScreen() {
  const { selectedFacilityId } = useAuth();
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDeviations();
  }, [selectedFacilityId]);

  const loadDeviations = async () => {
    setLoading(true);
    const res = await listDeviations(selectedFacilityId);
    if (res.success) setDeviations(res.data || []);
    setLoading(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeviations().then(() => setRefreshing(false));
  };

  const resetForm = () => {
    setDescription("");
    setAssignedTo("");
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!description) {
      Alert.alert("Missing Info", "Description is required.");
      return;
    }
    setSubmitting(true);
    const res = await createDeviation(selectedFacilityId, {
      description,
      assignedTo: assignedTo || undefined
    });
    setSubmitting(false);
    if (res.success) {
      closeModal();
      loadDeviations();
      Alert.alert("Success", "Deviation reported");
    } else {
      Alert.alert("Error", res.message || "Failed to report deviation");
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "closed":
        return "#10b981";
      case "resolved":
        return "#06b6d4";
      case "in progress":
        return "#f59e0b";
      default:
        return "#ef4444";
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
        <Text style={styles.addButtonText}>+ Report Deviation</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <FlatList
          data={deviations}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.deviationCard}>
              <View style={styles.deviationHeader}>
                <View style={styles.deviationInfo}>
                  <Text style={styles.deviationDesc}>{item.description}</Text>
                  {item.status && (
                    <Text
                      style={[
                        styles.deviationStatus,
                        { color: getStatusColor(item.status) }
                      ]}
                    >
                      {item.status}
                    </Text>
                  )}
                </View>
              </View>
              {item.assignedTo && (
                <Text style={styles.assignedTo}>Assigned to: {item.assignedTo}</Text>
              )}
              {item.createdAt && (
                <Text style={styles.deviationDate}>
                  Reported: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              )}
              {item.resolvedAt && (
                <Text style={styles.deviationDate}>
                  Resolved: {new Date(item.resolvedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No deviations reported</Text>
              <Text style={styles.emptySubtext}>Tap + to report a deviation</Text>
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
            <Text style={styles.modalTitle}>Report Deviation</Text>

            <Text style={styles.formLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Describe the deviation from SOP..."
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.formLabel}>Assigned To</Text>
            <TextInput
              style={styles.input}
              placeholder="Person responsible for resolution (optional)"
              value={assignedTo}
              onChangeText={setAssignedTo}
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
                  styles.reportButton,
                  submitting && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.reportButtonText}>
                  {submitting ? "Reporting..." : "Report"}
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
    backgroundColor: "#ef4444",
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
  deviationCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.10)",
    elevation: 2
  },
  deviationHeader: {
    marginBottom: 8
  },
  deviationInfo: {
    gap: 4
  },
  deviationDesc: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    lineHeight: 20
  },
  deviationStatus: {
    fontSize: 12,
    fontWeight: "600",
    alignSelf: "flex-start"
  },
  assignedTo: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8
  },
  deviationDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4
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
  descriptionInput: {
    height: 100,
    textAlignVertical: "top"
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
  reportButton: {
    backgroundColor: "#ef4444"
  },
  disabledButton: {
    opacity: 0.6
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 16
  },
  reportButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16
  }
});
