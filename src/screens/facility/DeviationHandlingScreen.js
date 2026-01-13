import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { listDeviations, createDeviation } from "../../api/deviation";

export default function DeviationHandlingScreen() {
  const { selectedFacilityId } = useAuth();
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDeviations();
  }, [selectedFacilityId]);

  const loadDeviations = async () => {
    setLoading(true);
    const res = await listDeviations(selectedFacilityId);
    if (res.success) setDeviations(res.data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!description) {
      Alert.alert("Missing info", "Description is required.");
      return;
    }
    setSubmitting(true);
    const res = await createDeviation(selectedFacilityId, { description });
    setSubmitting(false);
    if (res.success) {
      setDescription("");
      loadDeviations();
    } else {
      Alert.alert("Error", res.message || "Failed to report deviation");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Deviation Handling</Text>
      <Text style={styles.info}>
        Report and manage deviations from SOPs and compliance requirements.
      </Text>

      <View style={styles.form}>
        <Text style={styles.formLabel}>Deviation Description</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the deviation"
          multiline
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.addBtnText}>
            {submitting ? "Reporting..." : "Report Deviation"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Deviation Reports</Text>
      {loading ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : (
        <FlatList
          data={deviations}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.devRow}>
              <Text style={styles.devDesc}>{item.description}</Text>
              <Text style={styles.devDate}>
                {item.date ? new Date(item.date).toLocaleString() : ""}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No deviations reported</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, color: "#374151", marginBottom: 16 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
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
    backgroundColor: "#f59e42",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center"
  },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  sectionHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  devRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1
  },
  devDesc: { fontSize: 16, fontWeight: "600" },
  devDate: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  emptyText: { color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: 16 }
});
