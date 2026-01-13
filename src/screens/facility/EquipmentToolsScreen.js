import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  listEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment
} from "../../api/equipment";

// Placeholder analytics data for future management
const sampleEquipmentAnalytics = [
  { label: "Total Equipment", value: 18 },
  { label: "Active Maintenance", value: 3 },
  { label: "Avg. Downtime", value: "2.1 days" },
  { label: "Most Used", value: "LED Grow Light" }
];

export default function EquipmentToolsScreen() {
  const { selectedFacilityId } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (res.success) setEquipment(res.data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!brand || !model) {
      Alert.alert("Missing info", "Brand and model are required.");
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
      res = await createEquipment(selectedFacilityId, { brand, model, type, notes });
    }
    setSubmitting(false);
    if (res.success) {
      setBrand("");
      setModel("");
      setType("");
      setNotes("");
      setEditingId(null);
      loadEquipment();
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
  };

  const handleDelete = async (item) => {
    Alert.alert("Delete Equipment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSubmitting(true);
          const res = await deleteEquipment(selectedFacilityId, item._id || item.id);
          setSubmitting(false);
          if (res.success) loadEquipment();
          else Alert.alert("Error", res.message || "Failed to delete");
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Equipment Tools</Text>
      <Text style={styles.info}>
        Manage equipment, maintenance, and reporting for your facility.
      </Text>

      {/* Analytics Widgets */}
      <View style={styles.analyticsContainer}>
        {sampleEquipmentAnalytics.map((a, i) => (
          <View key={i} style={styles.analyticsWidget}>
            <Text style={styles.analyticsValue}>{a.value}</Text>
            <Text style={styles.analyticsLabel}>{a.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.form}>
        <Text style={styles.formLabel}>Brand</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="e.g., CO2"
        />
        <Text style={styles.formLabel}>Model</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="e.g., Sensor"
        />
        <Text style={styles.formLabel}>Type</Text>
        <TextInput
          style={styles.input}
          value={type}
          onChangeText={setType}
          placeholder="e.g., environmental"
        />
        <Text style={styles.formLabel}>Notes</Text>
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          multiline
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleSave}
          disabled={submitting}
        >
          <Text style={styles.addBtnText}>
            {submitting ? "Saving..." : editingId ? "Update Equipment" : "Add Equipment"}
          </Text>
        </TouchableOpacity>
        {editingId && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setBrand("");
              setModel("");
              setType("");
              setNotes("");
              setEditingId(null);
            }}
          >
            <Text style={styles.cancelBtnText}>Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionHeader}>Equipment List</Text>
      {loading ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : (
        <FlatList
          data={equipment}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.eqRow}>
              <Text style={styles.eqName}>
                {`${item.brand || ""} ${item.model || ""}`.trim()}
              </Text>
              {item.type ? <Text style={styles.eqType}>{item.type}</Text> : null}
              {item.notes ? <Text style={styles.eqNotes}>{item.notes}</Text> : null}
              <View style={styles.eqActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={styles.eqActionBtn}
                >
                  <Text style={styles.eqActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.eqActionBtn}
                >
                  <Text style={[styles.eqActionText, { color: "#ef4444" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No equipment yet</Text>}
        />
      )}
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, color: "#374151", marginBottom: 16 },
  analyticsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
    justifyContent: "space-between"
  },
  analyticsWidget: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    width: "47%",
    alignItems: "center",
    boxShadow: "0px 1px 4px rgba(0,0,0,0.08)"
  },
  analyticsValue: { fontSize: 20, fontWeight: "bold", color: "#0ea5e9" },
  analyticsLabel: { fontSize: 13, color: "#374151", marginTop: 4 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    boxShadow: "0px 1px 6px rgba(0,0,0,0.1)"
  },
  formLabel: { fontSize: 14, color: "#374151", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginTop: 4
  },
  addBtn: {
    backgroundColor: "#0ea5e9",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center"
  },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelBtn: { marginTop: 8, alignItems: "center" },
  cancelBtnText: { color: "#6b7280", fontSize: 15 },
  sectionHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  eqRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.06)"
  },
  eqName: { fontSize: 16, fontWeight: "600" },
  eqType: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  eqNotes: { fontSize: 14, color: "#374151", marginTop: 2 },
  eqActions: { flexDirection: "row", marginTop: 8 },
  eqActionBtn: { marginRight: 16 },
  eqActionText: { color: "#0ea5e9", fontWeight: "bold" },
  emptyText: { color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: 16 }
};
