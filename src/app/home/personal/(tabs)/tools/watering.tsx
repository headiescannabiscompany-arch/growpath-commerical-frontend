import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";

function toNum(v: string, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function nextDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function WateringToolScreen() {
  const [potLiters, setPotLiters] = useState("11");
  const [runoffPct, setRunoffPct] = useState("10");
  const [intervalDays, setIntervalDays] = useState("2");

  const model = useMemo(() => {
    const liters = Math.max(0, toNum(potLiters, 0));
    const runoff = Math.max(0, toNum(runoffPct, 0));
    const interval = Math.max(1, Math.round(toNum(intervalDays, 1)));
    const base = liters * 0.22;
    const target = base * (1 + runoff / 100);
    return {
      targetLiters: target.toFixed(2),
      perWeekLiters: (target * (7 / interval)).toFixed(2),
      nextWaterDate: nextDate(interval)
    };
  }, [potLiters, runoffPct, intervalDays]);

  return (
    <View style={styles.container}>
      <BackButton />
      <Text style={styles.title}>Watering Planner</Text>
      <Text style={styles.subtitle}>Estimate watering volume and schedule.</Text>

      <Text style={styles.label}>Pot size (L)</Text>
      <TextInput
        style={styles.input}
        value={potLiters}
        onChangeText={setPotLiters}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Runoff target (%)</Text>
      <TextInput
        style={styles.input}
        value={runoffPct}
        onChangeText={setRunoffPct}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Water every (days)</Text>
      <TextInput
        style={styles.input}
        value={intervalDays}
        onChangeText={setIntervalDays}
        keyboardType="numeric"
      />

      <View style={styles.card}>
        <Text style={styles.result}>
          Target volume: {model.targetLiters} L per watering
        </Text>
        <Text style={styles.line}>Estimated weekly total: {model.perWeekLiters} L</Text>
        <Text style={styles.line}>Next watering date: {model.nextWaterDate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 8 },
  label: { fontWeight: "700", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff"
  },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F8FAFC",
    marginTop: 10,
    gap: 4
  },
  result: { fontSize: 18, fontWeight: "800" },
  line: { color: "#334155" }
});
