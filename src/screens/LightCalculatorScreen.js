import React, { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";

export default function LightCalculatorScreen() {
  // Simple but legit: DLI ≈ PPFD * photoperiod(hours) * 0.0036
  const [ppfd, setPpfd] = useState("700");
  const [hours, setHours] = useState("12");

  const dli = useMemo(() => {
    const p = Number(ppfd);
    const h = Number(hours);
    if (!Number.isFinite(p) || !Number.isFinite(h) || p <= 0 || h <= 0) return null;
    return p * h * 0.0036;
  }, [ppfd, hours]);

  const guidance = useMemo(() => {
    if (dli == null) return "Enter PPFD and hours.";
    if (dli < 20) return "Low DLI. Likely veg/low intensity.";
    if (dli < 35)
      return "Moderate DLI. Solid for veg / early flower depending on cultivar.";
    if (dli < 45) return "High DLI. Common for strong flower rooms.";
    return "Very high DLI. Watch CO₂, heat, VPD, and stress signals.";
  }, [dli]);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Light Calculator</Text>

      <View style={styles.card}>
        <Text style={styles.label}>PPFD (µmol/m²/s)</Text>
        <TextInput
          value={ppfd}
          onChangeText={setPpfd}
          style={styles.input}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Photoperiod (hours/day)</Text>
        <TextInput
          value={hours}
          onChangeText={setHours}
          style={styles.input}
          keyboardType="numeric"
        />

        <View style={styles.result}>
          <Text style={styles.resultTitle}>Estimated DLI</Text>
          <Text style={styles.resultValue}>
            {dli == null ? "—" : dli.toFixed(1)} mol/m²/day
          </Text>
          <Text style={styles.muted}>{guidance}</Text>
        </View>

        <Text style={styles.muted}>Formula: DLI ≈ PPFD × hours × 0.0036</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 14 },
  title: { fontSize: 22, fontWeight: "900" },
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff"
  },
  label: { marginTop: 12, fontSize: 12, color: "#6B7280", fontWeight: "900" },
  input: {
    marginTop: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12
  },
  result: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#111827"
  },
  resultTitle: { fontWeight: "900" },
  resultValue: { marginTop: 6, fontSize: 22, fontWeight: "900" },
  muted: { marginTop: 8, color: "#6B7280", lineHeight: 18 }
});
