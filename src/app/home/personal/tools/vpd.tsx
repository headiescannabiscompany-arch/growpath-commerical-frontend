import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 16 },

  label: { fontSize: 14, fontWeight: "600", marginTop: 12 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12
  },

  card: {
    marginTop: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC"
  },
  result: { fontSize: 18, fontWeight: "800" },
  hint: { marginTop: 6, fontSize: 12, color: "#64748B" }
});

// Simple approximation-based VPD calculator.
// Uses Tetens formula for saturation vapor pressure, then VPD = SVP * (1 - RH).
function calcVpdKpa(tempC: number, rh: number) {
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3)); // kPa
  const vpd = svp * (1 - rh / 100);
  return vpd;
}

export default function VpdToolScreen() {
  const [tempCText, setTempCText] = useState("25");
  const [rhText, setRhText] = useState("60");

  const { vpd, valid } = useMemo(() => {
    const t = Number(tempCText);
    const rh = Number(rhText);
    if (!Number.isFinite(t) || !Number.isFinite(rh)) {
      return { vpd: null as number | null, valid: false };
    }
    if (rh < 0 || rh > 100) return { vpd: null, valid: false };
    const v = calcVpdKpa(t, rh);
    if (!Number.isFinite(v)) return { vpd: null, valid: false };
    return { vpd: v, valid: true };
  }, [tempCText, rhText]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VPD Calculator</Text>
      <Text style={styles.subtitle}>Enter temp (°C) and relative humidity (%).</Text>

      <Text style={styles.label}>Temperature (°C)</Text>
      <TextInput
        style={styles.input}
        value={tempCText}
        onChangeText={setTempCText}
        keyboardType="numeric"
        placeholder="e.g. 25"
      />

      <Text style={styles.label}>Relative Humidity (%)</Text>
      <TextInput
        style={styles.input}
        value={rhText}
        onChangeText={setRhText}
        keyboardType="numeric"
        placeholder="e.g. 60"
      />

      <View style={styles.card}>
        {valid ? (
          <>
            <Text style={styles.result}>VPD: {vpd!.toFixed(2)} kPa</Text>
            <Text style={styles.hint}>
              This is a simple estimate (good enough for v1 UI wiring).
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.result}>VPD: —</Text>
            <Text style={styles.hint}>Enter valid numbers (RH must be 0–100).</Text>
          </>
        )}
      </View>
    </View>
  );
}
