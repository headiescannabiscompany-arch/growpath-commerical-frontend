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
import { useAuth } from "../../context/AuthContext";
import { listAuditLogs, createAuditLog, reconcileAudit } from "../../api/audit";

const ACTION_TYPES = [
  "Inventory Check",
  "Reconciliation",
  "Access Change",
  "Data Modification",
  "Report",
  "Other"
];

export default function AuditLogScreen() {
  const { selectedFacilityId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [selectedFacilityId]);

  const loadLogs = async () => {
    setLoading(true);
    const res = await listAuditLogs(selectedFacilityId);
    if (res.success) setLogs(res.data || []);
    setLoading(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs().then(() => setRefreshing(false));
  };

  const resetForm = () => {
    setAction("");
    setDetails("");
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleAddLog = async () => {
    if (!action) {
      Alert.alert("Missing Info", "Action is required.");
      return;
    }
    setSubmitting(true);
    const res = await createAuditLog(selectedFacilityId, { action, details });
    setSubmitting(false);
    if (res.success) {
      closeModal();
      loadLogs();
      Alert.alert("Success", "Audit log entry added");
    } else {
      Alert.alert("Error", res.message || "Failed to add log");
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
        <Text style={styles.addButtonText}>+ Add Audit Log</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logAction}>{item.action}</Text>
              </View>
              {item.details && <Text style={styles.logDetails}>{item.details}</Text>}
              {item.user && <Text style={styles.logUser}>By: {item.user}</Text>}
              {item.createdAt && (
                <Text style={styles.logDate}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No audit logs yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add entry</Text>
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
            <Text style={styles.modalTitle}>Add Audit Log Entry</Text>

            <Text style={styles.formLabel}>Action Type *</Text>
            <View style={styles.actionSelector}>
              {ACTION_TYPES.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.actionButton, action === a && styles.actionButtonActive]}
                  onPress={() => setAction(a)}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      action === a && styles.actionButtonTextActive
                    ]}
                  >
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Details</Text>
            <TextInput
              style={[styles.input, styles.detailsInput]}
              placeholder="Describe the action taken (optional)"
              value={details}
              onChangeText={setDetails}
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
                  styles.saveButton,
                  submitting && styles.disabledButton
                ]}
                onPress={handleAddLog}
                disabled={submitting}
              >
                <Text style={styles.saveButtonText}>
                  {submitting ? "Saving..." : "Add Entry"}
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
    backgroundColor: "#8b5cf6",
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
  logCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#8b5cf6",
    // Web: use boxShadow instead of shadow*
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 2
  },
  logHeader: {
    marginBottom: 8
  },
  logAction: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937"
  },
  logDetails: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    lineHeight: 20
  },
  logUser: {
    fontSize: 13,
    color: "#8b5cf6",
    fontWeight: "500",
    marginTop: 8
  },
  logDate: {
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
  actionSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8
  },
  actionButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  actionButtonActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6"
  },
  actionButtonText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500"
  },
  actionButtonTextActive: {
    color: "#fff"
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
  detailsInput: {
    height: 80,
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
  saveButton: {
    backgroundColor: "#8b5cf6"
  },
  disabledButton: {
    opacity: 0.6
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 16
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16
  }
});
