import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  RefreshControl
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  listEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment
} from "../../api/equipment";

const EQUIPMENT_TYPES = [
  "Lighting",
  "HVAC",
  "CO2",
  "Watering",
  "Monitoring",
  "Safety",
  "Other"
];

export default function EquipmentToolsScreen() {
  const { selectedFacilityId } = useAuth();
  const { token } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEquipment();
  }, [selectedFacilityId]);

  const loadEquipment = async () => {
    setLoading(true);
    const res = await listEquipment(selectedFacilityId);
    if (res.success) setEquipment(res.data || []);
    setLoading(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEquipment().then(() => setRefreshing(false));
  };

  const resetForm = () => {
    setBrand("");
    setModel("");
    setType("");
    setNotes("");
    setEditingId(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!brand || !model) {
      Alert.alert("Missing Info", "Brand and model are required.");
      return;
    }
    setSubmitting(true);
    let res;
    if (editingId) {
      res = await updateEquipment(selectedFacilityId, editingId, {
        brand,
        model,
        type,
        notes
      });
    } else {
      res = await createEquipment(selectedFacilityId, {
        brand,
        model,
        type,
        notes
      });
    }
    setSubmitting(false);
    if (res.success) {
      closeModal();
      loadEquipment();
      Alert.alert("Success", editingId ? "Equipment updated" : "Equipment added");
    } else {
      Alert.alert("Error", res.message || "Failed to save equipment");
    }
  };

  const handleEdit = (item) => {
    setBrand(item.brand || "");
    setModel(item.model || "");
    setType(item.type || "");
    setNotes(item.notes || "");
    setEditingId(item._id || item.id);
    setShowModal(true);
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Equipment", "Are you sure you want to delete this equipment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSubmitting(true);
          const res = await deleteEquipment(selectedFacilityId, item._id || item.id);
          setSubmitting(false);
          if (res.success) {
            loadEquipment();
            Alert.alert("Success", "Equipment deleted");
          } else {
            Alert.alert("Error", res.message || "Failed to delete equipment");
          }
        }
      }
    ]);
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
        <Text style={styles.addButtonText}>+ Add Equipment</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={equipment}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.equipmentCard}>
              <View style={styles.equipmentHeader}>
                <View style={styles.equipmentInfo}>
                  <Text style={styles.equipmentName}>
                    {`${item.brand || ""} ${item.model || ""}`.trim()}
                  </Text>
                  {item.type && <Text style={styles.equipmentType}>{item.type}</Text>}
                </View>
              </View>
              {item.notes && <Text style={styles.equipmentNotes}>{item.notes}</Text>}
              {item.createdAt && (
                <Text style={styles.equipmentDate}>
                  Added: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              )}
              <View style={styles.equipmentActions}>
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
              <Text style={styles.emptyText}>No equipment yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add equipment</Text>
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
            <Text style={styles.modalTitle}>
              {editingId ? "Edit Equipment" : "Add Equipment"}
            </Text>

            <Text style={styles.formLabel}>Brand *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Philips, Lumatek"
              value={brand}
              onChangeText={setBrand}
            />

            <Text style={styles.formLabel}>Model *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., HPS 1000W, LED Panel"
              value={model}
              onChangeText={setModel}
            />

            <Text style={styles.formLabel}>Type</Text>
            <View style={styles.typeSelector}>
              {EQUIPMENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeButton, type === t && styles.typeButtonActive]}
                  onPress={() => setType(t)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === t && styles.typeButtonTextActive
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Add notes about this equipment (optional)"
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
                  styles.saveButton,
                  submitting && styles.disabledButton
                ]}
                onPress={handleSave}
                disabled={submitting}
              >
                <Text style={styles.saveButtonText}>
                  {submitting ? "Saving..." : editingId ? "Update" : "Add"}
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
  equipmentCard: {
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
  equipmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  equipmentInfo: {
    flex: 1
  },
  equipmentName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937"
  },
  equipmentType: {
    fontSize: 12,
    backgroundColor: "#dbeafe",
    color: "#0ea5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: "flex-start",
    overflow: "hidden"
  },
  equipmentNotes: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8
  },
  equipmentDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8
  },
  equipmentActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#e0f2fe",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center"
  },
  deleteButton: {
    backgroundColor: "#fee2e2"
  },
  actionButtonText: {
    color: "#0ea5e9",
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
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8
  },
  typeButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  typeButtonActive: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9"
  },
  typeButtonText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500"
  },
  typeButtonTextActive: {
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
  saveButton: {
    backgroundColor: "#0ea5e9"
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
