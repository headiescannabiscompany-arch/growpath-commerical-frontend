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
// import { getVendorMetrics, listVendorSoilMixes, createVendorSoilMix, listVendorEquipment } from "../../api/vendorMetrics";

function BarChart({ data, label }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartLabel}>{label}</Text>
      {data.map((d, i) => (
        <View key={d.id || d.label || i} style={styles.barRow}>
          <Text style={styles.barLabel}>{d.label}</Text>
          <Text style={styles.barBlock}>
            {"█".repeat(Math.round((d.value / max) * 20))}
          </Text>
          <Text style={styles.barValue}>{d.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function VendorMetricsScreen() {
  // In a real app, vendorId would come from auth/user context
  const vendorId = "demo-vendor-1";
  const [metrics, setMetrics] = useState(null);
  const [soilMixes, setSoilMixes] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mixName, setMixName] = useState("");
  const [mixNotes, setMixNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cecValue, setCecValue] = useState("15");
  const [phValue, setPhValue] = useState("6.5");
  const [ecValue, setEcValue] = useState("1.8");
  const [soilComposition, setSoilComposition] = useState("");

  useEffect(() => {
    loadData();
  }, [vendorId]);

  const loadData = async () => {
    setLoading(true);
    // Placeholder: use static data for now
    setMetrics({
      yieldByMonth: [
        { label: "Jan", value: 120 },
        { label: "Feb", value: 140 },
        { label: "Mar", value: 110 },
        { label: "Apr", value: 150 }
      ],
      avgSoilPH: 6.5,
      avgNutrientEC: 1.8
    });
    setSoilMixes([
      { id: 1, name: "Mix A", notes: "Coco + Perlite, 70/30" },
      { id: 2, name: "Mix B", notes: "Peat + Vermiculite, 60/40" }
    ]);
    setEquipment([
      { id: 1, name: "LED Grow Light", notes: "500W, 2025 install" },
      { id: 2, name: "Irrigation Pump", notes: "Replaced 2026-01" }
    ]);
    setLoading(false);
  };

  const handleAddMix = async () => {
    if (!mixName) {
      Alert.alert("Missing info", "Mix name required");
      return;
    }
    setSubmitting(true);
    // Placeholder: would call createVendorSoilMix
    setSoilMixes([...soilMixes, { id: Math.random(), name: mixName, notes: mixNotes }]);
    setMixName("");
    setMixNotes("");
    setSubmitting(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Vendor Metrics & Tracking</Text>
      <Text style={styles.info}>
        Track advanced metrics, soil/nutrient mixes, and equipment for your vendor
        account.
      </Text>

      {loading ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : (
        <>
          <BarChart data={metrics.yieldByMonth} label="Yield by Month (kg)" />
          <View style={styles.metricsRow}>
            <Text style={styles.metricBox}>Avg. Soil pH: {metrics.avgSoilPH}</Text>
            <Text style={styles.metricBox}>Avg. EC: {metrics.avgNutrientEC}</Text>
          </View>

          {/* Soil Health Tracking Section */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>🌱 Soil Health Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricInput}>
                <Text style={styles.metricLabel}>pH Level</Text>
                <TextInput
                  style={styles.numberInput}
                  value={phValue}
                  onChangeText={setPhValue}
                  placeholder="6.5"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.metricUnit}>6.0 - 7.0 Optimal</Text>
              </View>
              <View style={styles.metricInput}>
                <Text style={styles.metricLabel}>EC (Conductivity)</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ecValue}
                  onChangeText={setEcValue}
                  placeholder="1.8"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.metricUnit}>1.0 - 2.0 Range</Text>
              </View>
              <View style={styles.metricInput}>
                <Text style={styles.metricLabel}>CEC (meq/100g)</Text>
                <TextInput
                  style={styles.numberInput}
                  value={cecValue}
                  onChangeText={setCecValue}
                  placeholder="15"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.metricUnit}>12 - 20 Ideal</Text>
              </View>
            </View>

            <Text style={styles.compositionLabel}>Soil Composition</Text>
            <TextInput
              style={[styles.input, { marginTop: 8, minHeight: 60 }]}
              value={soilComposition}
              onChangeText={setSoilComposition}
              placeholder="e.g., Coco: 40%, Perlite: 30%, Compost: 30%"
              multiline
            />

            {/* Nutrient Availability Chart */}
            <View style={styles.phCurveContainer}>
              <Text style={styles.curveLabel}>📊 Nutrient Availability by pH</Text>
              <View style={styles.curveVisualization}>
                <View style={styles.nutrientBar}>
                  <Text style={styles.nutrientLabel}>N</Text>
                  <View
                    style={[
                      styles.availabilityBar,
                      { width: "75%", backgroundColor: "#10b981" }
                    ]}
                  />
                </View>
                <View style={styles.nutrientBar}>
                  <Text style={styles.nutrientLabel}>P</Text>
                  <View
                    style={[
                      styles.availabilityBar,
                      { width: "85%", backgroundColor: "#f59e0b" }
                    ]}
                  />
                </View>
                <View style={styles.nutrientBar}>
                  <Text style={styles.nutrientLabel}>K</Text>
                  <View
                    style={[
                      styles.availabilityBar,
                      { width: "80%", backgroundColor: "#3b82f6" }
                    ]}
                  />
                </View>
                <View style={styles.nutrientBar}>
                  <Text style={styles.nutrientLabel}>Ca</Text>
                  <View
                    style={[
                      styles.availabilityBar,
                      { width: "70%", backgroundColor: "#8b5cf6" }
                    ]}
                  />
                </View>
                <View style={styles.nutrientBar}>
                  <Text style={styles.nutrientLabel}>Mg</Text>
                  <View
                    style={[
                      styles.availabilityBar,
                      { width: "65%", backgroundColor: "#ec4899" }
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.curveNote}>
                Availability varies with soil pH - optimal range 6.0-7.0
              </Text>
            </View>
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
                style={styles.addBtn}
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
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.mixRow}>
                  <Text style={styles.mixName}>{item.name}</Text>
                  <Text style={styles.mixNotes}>{item.notes}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No mixes yet</Text>}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Equipment</Text>
            <FlatList
              data={equipment}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.eqRow}>
                  <Text style={styles.eqName}>{item.name}</Text>
                  <Text style={styles.eqNotes}>{item.notes}</Text>
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    // Web: use boxShadow instead of shadow*
    boxShadow: "0px 1px 4px rgba(0,0,0,0.08)",
    elevation: 2
  },
  chartLabel: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  barLabel: { width: 60, fontSize: 14 },
  barBlock: { fontFamily: "monospace", color: "#0ea5e9", marginHorizontal: 4 },
  barValue: { width: 32, textAlign: "right", fontSize: 14 },
  metricsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  metricBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    fontWeight: "bold",
    color: "#0ea5e9",
    marginRight: 8,
    flex: 1,
    textAlign: "center",
    // Web: use boxShadow instead of shadow*
    boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
    elevation: 2
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    // Web: use boxShadow instead of shadow*
    boxShadow: "0px 1px 6px rgba(0,0,0,0.1)",
    elevation: 2
  },
  sectionHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  formRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    flex: 1
  },
  addBtn: {
    backgroundColor: "#0ea5e9",
    padding: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  mixRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  mixName: { fontWeight: "bold", fontSize: 15 },
  mixNotes: { fontSize: 14, color: "#374151" },
  eqRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  eqName: { fontWeight: "bold", fontSize: 15 },
  eqNotes: { fontSize: 14, color: "#374151" },
  emptyText: {
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 16
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8
  },
  metricInput: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 10
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 4
  },
  numberInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: "#fff"
  },
  metricUnit: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4
  },
  compositionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 12,
    marginBottom: 4
  },
  phCurveContainer: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9"
  },
  curveLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0c4a6e",
    marginBottom: 12
  },
  curveVisualization: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8
  },
  nutrientBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  nutrientLabel: {
    width: 30,
    fontWeight: "bold",
    fontSize: 12,
    color: "#374151"
  },
  availabilityBar: {
    height: 20,
    borderRadius: 4,
    marginLeft: 8
  },
  curveNote: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center"
  }
});
