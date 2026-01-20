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
import { useAuth } from "../../context/AuthContext.js";
import { hasGlobalFacilityAccess } from "../../types/facility.js";
import {
  listSOPTemplates,
  createSOPTemplate,
  updateSOPTemplate,
  deleteSOPTemplate
} from "../../api/sop.js";

export default function SOPTemplatesScreen() {
  const { selectedFacilityId, facilitiesAccess } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Entitlement gating: Only allow admin/lead roles to create, edit, or delete SOP templates
  const userAccess = facilitiesAccess?.find((f) => f.facilityId === selectedFacilityId);
  const userRole = userAccess?.role;
  const notEntitled = !userRole || !hasGlobalFacilityAccess(userRole);

  useEffect(() => {
    loadTemplates();
  }, [selectedFacilityId]);

  const loadTemplates = async () => {
    setLoading(true);
    const res = await listSOPTemplates(selectedFacilityId);
    if (res.success) setTemplates(res.data || []);
    setLoading(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTemplates().then(() => setRefreshing(false));
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEditingId(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSave = async () => {
    if (notEntitled) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to create or edit SOP templates in this facility."
      );
      return;
    }
    if (!title) {
      Alert.alert("Missing Info", "Title is required.");
      return;
    }
    setSubmitting(true);
    let res;
    if (editingId) {
      res = await updateSOPTemplate(selectedFacilityId, editingId, { title, content });
    } else {
      res = await createSOPTemplate(selectedFacilityId, { title, content });
    }
    setSubmitting(false);
    if (res.success) {
      closeModal();
      loadTemplates();
      Alert.alert("Success", editingId ? "SOP updated" : "SOP created");
    } else {
      Alert.alert("Error", res.message || "Failed to save SOP");
    }
  };

  const handleEdit = (tpl) => {
    if (notEntitled) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to edit SOP templates in this facility."
      );
      return;
    }
    setTitle(tpl.title || "");
    setContent(tpl.content || "");
    setEditingId(tpl._id || tpl.id);
    setShowModal(true);
  };

  const handleDelete = (tpl) => {
    if (notEntitled) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to delete SOP templates in this facility."
      );
      return;
    }
    Alert.alert("Delete SOP Template", "Are you sure you want to delete this SOP?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSubmitting(true);
          const res = await deleteSOPTemplate(selectedFacilityId, tpl._id || tpl.id);
          setSubmitting(false);
          if (res.success) {
            loadTemplates();
            Alert.alert("Success", "SOP deleted");
          } else {
            Alert.alert("Error", res.message || "Failed to delete SOP");
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.addButton, notEntitled && styles.disabledButton]}
        onPress={() => {
          if (notEntitled) {
            Alert.alert(
              "Access Denied",
              "You do not have permission to create SOP templates in this facility."
            );
            return;
          }
          resetForm();
          setShowModal(true);
        }}
        disabled={notEntitled}
      >
        <Text style={styles.addButtonText}>+ Add SOP</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.sopCard}>
              <View style={styles.sopHeader}>
                <Text style={styles.sopTitle}>{item.title}</Text>
                {item.version && <Text style={styles.sopVersion}>v{item.version}</Text>}
              </View>
              {item.content && (
                <Text style={styles.sopContent} numberOfLines={3}>
                  {item.content}
                </Text>
              )}
              {item.createdAt && (
                <Text style={styles.sopDate}>
                  Created: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              )}
              <View style={styles.sopActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(item)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No SOP templates yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add a template</Text>
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
        <View style={[styles.modalOverlay, { zIndex: 1000, pointerEvents: "auto" }]}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? "Edit SOP" : "Create New SOP"}
            </Text>

            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Planting Procedure"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.formLabel}>Content *</Text>
            <TextInput
              style={[styles.input, styles.contentInput]}
              placeholder="Document your SOP steps here..."
              value={content}
              onChangeText={setContent}
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
                onPress={handleSave}
                disabled={submitting}
              >
                <Text style={styles.saveButtonText}>
                  {submitting ? "Saving..." : editingId ? "Update" : "Create"}
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
  list: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16
  },
  sopCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 2
  },
  sopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  sopTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1
  },
  sopVersion: {
    fontSize: 12,
    backgroundColor: "#d1fae5",
    color: "#065f46",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  sopContent: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    lineHeight: 20
  },
  sopDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8
  },
  sopActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#d1fae5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center"
  },
  deleteButton: {
    backgroundColor: "#fee2e2"
  },
  actionButtonText: {
    color: "#065f46",
    fontWeight: "600",
    fontSize: 14
  },
  deleteButtonText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 14
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
    justifyContent: "flex-end",
    pointerEvents: "auto",
    zIndex: 1000
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
  contentInput: {
    height: 120,
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
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16
  }
});
