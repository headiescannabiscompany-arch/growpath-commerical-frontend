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
import { listGreenWasteEvents, createGreenWasteEvent } from "../../api/greenWaste";

export default function GreenWasteScreen() {
  const { selectedFacilityId } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (res.success) setEvents(res.data);
    setLoading(false);
  };

  const handleAddEvent = async () => {
    if (!amount || !method) {
      Alert.alert("Missing info", "Amount and method are required.");
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
      setAmount("");
      setMethod("");
      setNotes("");
      loadEvents();
    } else {
      Alert.alert("Error", res.message || "Failed to add event");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Green Waste Tracking</Text>
      <Text style={styles.info}>
        Track and record green waste disposal for compliance.
      </Text>

      <View style={styles.form}>
        <Text style={styles.formLabel}>Amount (lbs or kg)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          keyboardType="numeric"
        />
        <Text style={styles.formLabel}>Disposal Method</Text>
        <TextInput
          style={styles.input}
          value={method}
          onChangeText={setMethod}
          placeholder="Method (e.g. compost, landfill)"
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
          onPress={handleAddEvent}
          disabled={submitting}
        >
          <Text style={styles.addBtnText}>{submitting ? "Saving..." : "Add Event"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Event History</Text>
      {loading ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.eventRow}>
              <Text style={styles.eventMain}>
                {item.amount} via {item.method}
              </Text>
              {item.notes ? <Text style={styles.eventNotes}>{item.notes}</Text> : null}
              <Text style={styles.eventDate}>
                {item.date ? new Date(item.date).toLocaleString() : ""}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No events yet</Text>}
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
  eventRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1
  },
  eventMain: { fontSize: 16, fontWeight: "600" },
  eventNotes: { fontSize: 14, color: "#374151", marginTop: 2 },
  eventDate: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  emptyText: { color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: 16 }
});
