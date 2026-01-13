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
import { listAuditLogs, createAuditLog, reconcileAudit } from "../../api/audit";

export default function AuditLogScreen() {
  const { selectedFacilityId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [details, setDetails] = useState("");
  const [reconDetails, setReconDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [selectedFacilityId]);

  const loadLogs = async () => {
    setLoading(true);
    const res = await listAuditLogs(selectedFacilityId);
    if (res.success) setLogs(res.data);
    setLoading(false);
  };

  const handleAddLog = async () => {
    if (!action) {
      Alert.alert("Missing info", "Action is required.");
      return;
    }
    setSubmitting(true);
    const res = await createAuditLog(selectedFacilityId, { action, details });
    setSubmitting(false);
    if (res.success) {
      setAction("");
      setDetails("");
      loadLogs();
    } else {
      Alert.alert("Error", res.message || "Failed to add log");
    }
  };

  const handleReconcile = async () => {
    if (!reconDetails) {
      Alert.alert("Missing info", "Reconciliation details required.");
      return;
    }
    setSubmitting(true);
    const res = await reconcileAudit(selectedFacilityId, { details: reconDetails });
    setSubmitting(false);
    if (res.success) {
      setReconDetails("");
      loadLogs();
      Alert.alert("Success", "Reconciliation submitted.");
    } else {
      Alert.alert("Error", res.message || "Failed to reconcile");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Audit Logs & Reconciliation</Text>
      <Text style={styles.info}>
        View audit logs and perform reconciliations for compliance.
      </Text>

      <View style={styles.form}>
        <Text style={styles.formLabel}>Action</Text>
        <TextInput
          style={styles.input}
          value={action}
          onChangeText={setAction}
          placeholder="Action (e.g. inventory check)"
        />
        <Text style={styles.formLabel}>Details</Text>
        <TextInput
          style={styles.input}
          value={details}
          onChangeText={setDetails}
          placeholder="Details (optional)"
          multiline
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddLog}
          disabled={submitting}
        >
          <Text style={styles.addBtnText}>{submitting ? "Saving..." : "Add Log"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.formLabel}>Reconciliation</Text>
        <TextInput
          style={styles.input}
          value={reconDetails}
          onChangeText={setReconDetails}
          placeholder="Describe reconciliation action"
          multiline
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleReconcile}
          disabled={submitting}
        >
          <Text style={styles.addBtnText}>
            {submitting ? "Submitting..." : "Submit Reconciliation"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Audit Log History</Text>
      {loading ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.logRow}>
              <Text style={styles.logMain}>{item.action}</Text>
              {item.details ? (
                <Text style={styles.logDetails}>{item.details}</Text>
              ) : null}
              <Text style={styles.logDate}>
                {item.date ? new Date(item.date).toLocaleString() : ""}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No audit logs yet</Text>}
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
    backgroundColor: "#0ea5e9",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center"
  },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  sectionHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  logRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1
  },
  logMain: { fontSize: 16, fontWeight: "600" },
  logDetails: { fontSize: 14, color: "#374151", marginTop: 2 },
  logDate: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  emptyText: { color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: 16 }
});
