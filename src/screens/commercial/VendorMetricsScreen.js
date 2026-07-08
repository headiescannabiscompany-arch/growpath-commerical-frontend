import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from "react-native";
import {
  createVendorSoilMix,
  getVendorMetrics,
  listVendorEquipment,
  listVendorSoilMixes
} from "../../api/vendorMetrics";
import { radius } from "@/theme/theme";

const normalizeList = (value) => {
  const list =
    value?.items ||
    value?.results ||
    value?.soilMixes ||
    value?.equipment ||
    value?.data ||
    value ||
    [];
  return Array.isArray(list) ? list : [];
};

const normalizeMetrics = (value) => value?.metrics || value?.data || value || {};

function BarChart({ data, label }) {
  const rows = Array.isArray(data) ? data : [];
  const max = Math.max(...rows.map((d) => Number(d.value || 0)), 1);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartLabel}>{label}</Text>
      {rows.length ? (
        rows.map((d, i) => (
          <View key={d.id || d.label || i} style={styles.barRow}>
            <Text style={styles.barLabel}>{d.label}</Text>
            <Text style={styles.barBlock}>
              {"#".repeat(Math.max(1, Math.round((Number(d.value || 0) / max) * 20)))}
            </Text>
            <Text style={styles.barValue}>{d.value}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No metric history available yet.</Text>
      )}
    </View>
  );
}

export default function VendorMetricsScreen() {
  const vendorId = "me";
  const [metrics, setMetrics] = useState({});
  const [soilMixes, setSoilMixes] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mixName, setMixName] = useState("");
  const [mixNotes, setMixNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [vendorId]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [metricRes, mixesRes, equipmentRes] = await Promise.all([
        getVendorMetrics(vendorId),
        listVendorSoilMixes(vendorId),
        listVendorEquipment(vendorId)
      ]);
      if (!metricRes.success)
        throw new Error(metricRes.message || "Failed to load metrics");
      if (!mixesRes.success)
        throw new Error(mixesRes.message || "Failed to load soil mixes");
      if (!equipmentRes.success)
        throw new Error(equipmentRes.message || "Failed to load equipment");
      setMetrics(normalizeMetrics(metricRes.data));
      setSoilMixes(normalizeList(mixesRes.data));
      setEquipment(normalizeList(equipmentRes.data));
    } catch (err) {
      setMetrics({});
      setSoilMixes([]);
      setEquipment([]);
      setError(err?.message || "Failed to load vendor metrics.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMix = async () => {
    if (!mixName.trim()) {
      Alert.alert("Missing info", "Mix name required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createVendorSoilMix(vendorId, {
        name: mixName.trim(),
        notes: mixNotes.trim()
      });
      if (!res.success) throw new Error(res.message || "Failed to add mix");
      setMixName("");
      setMixNotes("");
      await loadData();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to add mix");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Vendor Metrics & Tracking</Text>
      <Text style={styles.info}>
        Track metrics, soil and nutrient mixes, and equipment for your vendor account.
      </Text>

      {loading ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : error ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : (
        <>
          <BarChart data={metrics?.yieldByMonth || []} label="Yield by Month (kg)" />
          <View style={styles.metricsRow}>
            <Text style={styles.metricBox}>
              Avg. Soil pH: {metrics?.avgSoilPH ?? "-"}
            </Text>
            <Text style={styles.metricBox}>Avg. EC: {metrics?.avgNutrientEC ?? "-"}</Text>
            <Text style={styles.metricBox}>Open Mixes: {soilMixes.length}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Soil/Nutrient Mixes</Text>
            <View style={styles.formRow}>
              <TextInput
                style={styles.input}
                value={mixName}
                onChangeText={setMixName}
                placeholder="Mix Name"
              />
              <TextInput
                style={styles.input}
                value={mixNotes}
                onChangeText={setMixNotes}
                placeholder="Notes"
              />
              <TouchableOpacity
                style={[styles.addBtn, submitting && styles.disabled]}
                onPress={handleAddMix}
                disabled={submitting}
              >
                <Text style={styles.addBtnText}>
                  {submitting ? "Adding..." : "Add Mix"}
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={soilMixes}
              keyExtractor={(item, index) => String(item?._id || item?.id || index)}
              renderItem={({ item }) => (
                <View style={styles.mixRow}>
                  <Text style={styles.mixName}>{item.name || "Untitled mix"}</Text>
                  <Text style={styles.mixNotes}>
                    {item.notes || item.description || "-"}
                  </Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No mixes yet</Text>}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Equipment</Text>
            <FlatList
              data={equipment}
              keyExtractor={(item, index) => String(item?._id || item?.id || index)}
              renderItem={({ item }) => (
                <View style={styles.eqRow}>
                  <Text style={styles.eqName}>{item.name || "Equipment"}</Text>
                  <Text style={styles.eqNotes}>{item.notes || item.type || "-"}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No equipment yet</Text>}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, color: "#374151", marginBottom: 16 },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 24,
    boxShadow: "0px 1px 4px rgba(0,0,0,0.08)",
    elevation: 2
  },
  chartLabel: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  barLabel: { width: 80, fontSize: 14 },
  barBlock: { fontFamily: "monospace", color: "#0ea5e9", marginHorizontal: 4 },
  barValue: { width: 48, textAlign: "right", fontSize: 14 },
  metricsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  metricBox: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: 12,
    fontSize: 15,
    fontWeight: "bold",
    color: "#0ea5e9",
    marginRight: 8,
    flex: 1,
    textAlign: "center",
    boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
    elevation: 2
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 24,
    boxShadow: "0px 1px 6px rgba(0,0,0,0.1)",
    elevation: 2
  },
  sectionHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    padding: 10,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 140,
    minWidth: 0
  },
  addBtn: {
    backgroundColor: "#0ea5e9",
    padding: 10,
    borderRadius: radius.card,
    alignItems: "center",
    minWidth: 96
  },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  mixRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  mixName: { fontWeight: "bold", fontSize: 15 },
  mixNotes: { fontSize: 14, color: "#374151" },
  eqRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  eqName: { fontWeight: "bold", fontSize: 15 },
  eqNotes: { fontSize: 14, color: "#374151" },
  emptyText: {
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 16
  },
  disabled: { opacity: 0.6 }
});
