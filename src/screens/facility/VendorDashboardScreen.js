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
import { listVendors, createVendor, updateVendor, deleteVendor } from "../../api/vendor";

// Placeholder analytics data for future management
const sampleAnalytics = [
  { label: "Total Vendors", value: 12 },
  { label: "Active Orders", value: 5 },
  { label: "Avg. Order Value", value: "$1,200" },
  { label: "Top Vendor", value: "GrowSupply Inc." }
];

export default function VendorDashboardScreen() {
  const { selectedFacilityId } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVendors();
  }, [selectedFacilityId]);

  const loadVendors = async () => {
    setLoading(true);
    const res = await listVendors(selectedFacilityId);
    if (res.success) setVendors(res.data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert("Missing info", "Vendor name is required.");
      return;
    }
    setSubmitting(true);
    let res;
    if (editingId) {
      res = await updateVendor(selectedFacilityId, editingId, { name, contact });
    } else {
      res = await createVendor(selectedFacilityId, { name, contact });
    }
    setSubmitting(false);
    if (res.success) {
      setName("");
      setContact("");
      setEditingId(null);
      loadVendors();
    } else {
      Alert.alert("Error", res.message || "Failed to save vendor");
    }
  };

  const handleEdit = (vendor) => {
    setName(vendor.name);
    setContact(vendor.contact);
    setEditingId(vendor._id || vendor.id);
  };

  const handleDelete = async (vendor) => {
    Alert.alert("Delete Vendor", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSubmitting(true);
          const res = await deleteVendor(selectedFacilityId, vendor._id || vendor.id);
          setSubmitting(false);
          if (res.success) loadVendors();
          else Alert.alert("Error", res.message || "Failed to delete");
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Vendor Dashboard</Text>
      <Text style={styles.info}>
        View vendor analytics, orders, and performance metrics.
      </Text>

      {/* Analytics Widgets */}
      <View style={styles.analyticsContainer}>
        {sampleAnalytics.map((a, i) => (
          <View key={i} style={styles.analyticsWidget}>
            <Text style={styles.analyticsValue}>{a.value}</Text>
            <Text style={styles.analyticsLabel}>{a.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.form}>
        <Text style={styles.formLabel}>Vendor Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Vendor Name"
        />
        <Text style={styles.formLabel}>Contact Info</Text>
        <TextInput
          style={styles.input}
          value={contact}
          onChangeText={setContact}
          placeholder="Contact Info"
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleSave}
          disabled={submitting}
        >
          <Text style={styles.addBtnText}>
            {submitting ? "Saving..." : editingId ? "Update Vendor" : "Add Vendor"}
          </Text>
        </TouchableOpacity>
        {editingId && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setName("");
              setContact("");
              setEditingId(null);
            }}
          >
            <Text style={styles.cancelBtnText}>Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionHeader}>Vendors</Text>
      {loading ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.vendorRow}>
              <Text style={styles.vendorName}>{item.name}</Text>
              {item.contact ? (
                <Text style={styles.vendorContact}>{item.contact}</Text>
              ) : null}
              <View style={styles.vendorActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={styles.vendorActionBtn}
                >
                  <Text style={styles.vendorActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.vendorActionBtn}
                >
                  <Text style={[styles.vendorActionText, { color: "#ef4444" }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No vendors yet</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  vendorRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.06)"
  },
  vendorName: { fontSize: 16, fontWeight: "600" },
  vendorContact: { fontSize: 14, color: "#374151", marginTop: 2 },
  vendorActions: { flexDirection: "row", marginTop: 8 },
  vendorActionBtn: { marginRight: 16 },
  vendorActionText: { color: "#0ea5e9", fontWeight: "bold" },
  emptyText: { color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: 16 }
});
