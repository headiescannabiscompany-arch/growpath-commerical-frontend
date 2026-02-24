import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";

function num(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function NpkToolScreen() {
  const [nText, setNText] = useState("10");
  const [pText, setPText] = useState("5");
  const [kText, setKText] = useState("5");
  const [doseText, setDoseText] = useState("5");
  const [unit, setUnit] = useState<"ml/L" | "ml/gal">("ml/L");

  const result = useMemo(() => {
    const n = num(nText);
    const p = num(pText);
    const k = num(kText);
    const dose = num(doseText);
    const sum = n + p + k;
    const safeSum = sum <= 0 ? 1 : sum;
    return {
      ratio: `${n}:${p}:${k}`,
      nShare: ((n / safeSum) * 100).toFixed(1),
      pShare: ((p / safeSum) * 100).toFixed(1),
      kShare: ((k / safeSum) * 100).toFixed(1),
      concentration: (dose * (n / 100)).toFixed(2)
    };
  }, [nText, pText, kText, doseText]);

  return (
    <View style={styles.container}>
      <BackButton />
      <Text style={styles.title}>NPK Helper</Text>
      <Text style={styles.subtitle}>Enter label N-P-K and your dose target.</Text>

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={nText}
          onChangeText={setNText}
          placeholder="N"
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          value={pText}
          onChangeText={setPText}
          placeholder="P"
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          value={kText}
          onChangeText={setKText}
          placeholder="K"
          keyboardType="numeric"
        />
      </View>

      <Text style={styles.label}>Dose</Text>
      <TextInput
        style={styles.fullInput}
        value={doseText}
        onChangeText={setDoseText}
        placeholder="e.g. 5"
        keyboardType="numeric"
      />

      <View style={styles.row}>
        <Pressable
          style={[styles.pill, unit === "ml/L" && styles.pillOn]}
          onPress={() => setUnit("ml/L")}
        >
          <Text style={[styles.pillTxt, unit === "ml/L" && styles.pillTxtOn]}>ml/L</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, unit === "ml/gal" && styles.pillOn]}
          onPress={() => setUnit("ml/gal")}
        >
          <Text style={[styles.pillTxt, unit === "ml/gal" && styles.pillTxtOn]}>
            ml/gal
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.result}>Ratio: {result.ratio}</Text>
        <Text style={styles.line}>N share: {result.nShare}%</Text>
        <Text style={styles.line}>P share: {result.pShare}%</Text>
        <Text style={styles.line}>K share: {result.kShare}%</Text>
        <Text style={styles.line}>
          Approx N concentration: {result.concentration} ({unit})
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", gap: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff"
  },
  label: { fontWeight: "700", marginTop: 4 },
  fullInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff"
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  pillOn: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  pillTxt: { fontWeight: "800" },
  pillTxtOn: { color: "#fff" },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F8FAFC",
    marginTop: 4,
    gap: 4
  },
  result: { fontSize: 18, fontWeight: "800" },
  line: { color: "#334155" }
});
