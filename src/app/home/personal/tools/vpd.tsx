import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import BackButton from "@/components/nav/BackButton";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 16 },

  row: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" },

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

function toCelsius(temp: number, unit: "C" | "F") {
  return unit === "C" ? temp : (temp - 32) * (5 / 9);
}

// Tetens SVP (kPa), VPD = SVP * (1 - RH)
function calcVpdKpa(tempC: number, rh: number) {
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return svp * (1 - rh / 100);
}

export default function VpdToolScreen() {
  const [unit, setUnit] = useState<"C" | "F">("F"); // defaulting to F
  const [tempText, setTempText] = useState("77");
  const [rhText, setRhText] = useState("60");

  const { vpd, valid, tempC } = useMemo(() => {
    const t = Number(tempText);
    const rh = Number(rhText);

    if (!Number.isFinite(t) || !Number.isFinite(rh))
      return { vpd: null, valid: false, tempC: null as any };
    if (rh < 0 || rh > 100) return { vpd: null, valid: false, tempC: null as any };

    const c = toCelsius(t, unit);
    const v = calcVpdKpa(c, rh);
    if (!Number.isFinite(v)) return { vpd: null, valid: false, tempC: null as any };

    return { vpd: v, valid: true, tempC: c };
  }, [tempText, rhText, unit]);

  return (
    <View style={styles.container}>
      <BackButton />
      <Text style={styles.title}>VPD Calculator</Text>
      <Text style={styles.subtitle}>
        Enter temperature ({unit === "F" ? "°F" : "°C"}) and RH (%).
      </Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.pill, unit === "F" && styles.pillOn]}
          onPress={() => setUnit("F")}
        >
          <Text style={[styles.pillTxt, unit === "F" && styles.pillTxtOn]}>°F</Text>
        </Pressable>

        <Pressable
          style={[styles.pill, unit === "C" && styles.pillOn]}
          onPress={() => setUnit("C")}
        >
          <Text style={[styles.pillTxt, unit === "C" && styles.pillTxtOn]}>°C</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Temperature ({unit === "F" ? "°F" : "°C"})</Text>
      <TextInput
        style={styles.input}
        value={tempText}
        onChangeText={setTempText}
        keyboardType="numeric"
        placeholder={unit === "F" ? "e.g. 77" : "e.g. 25"}
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
              Internal temp: {tempC.toFixed(1)}°C (converted)
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
