import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";
import { createToolRun } from "@/api/toolRuns";
import { calcVpdFromTemp, type TempUnit } from "@/tools/vpd";
import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";

type VpdModel =
  | { valid: false; vpd: null; tempC: null }
  | { valid: true; vpd: number; tempC: number };

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 12 },
  context: { marginBottom: 8, color: "#166534", fontWeight: "700" },
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
  pillTxtOn: { color: "#FFFFFF" },
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
  hint: { marginTop: 6, fontSize: 12, color: "#64748B" },
  saveButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#166534",
    backgroundColor: "#166534"
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "700" }
});

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

export default function VpdToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(rawGrowId);

  const [unit, setUnit] = useState<TempUnit>("F");
  const [tempText, setTempText] = useState("77");
  const [rhText, setRhText] = useState("60");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [savingAndOpening, setSavingAndOpening] = useState(false);

  const model = useMemo<VpdModel>(() => {
    const t = Number(tempText);
    const rh = Number(rhText);
    if (!Number.isFinite(t) || !Number.isFinite(rh)) {
      return { valid: false, vpd: null, tempC: null };
    }
    if (rh < 0 || rh > 100) return { valid: false, vpd: null, tempC: null };
    const result = calcVpdFromTemp(t, unit, rh);
    return { valid: true, vpd: result.vpdKpa, tempC: result.tempC };
  }, [tempText, rhText, unit]);

  return (
    <View style={styles.container}>
      <BackButton />
      <Text style={styles.title}>VPD Calculator</Text>
      <Text style={styles.subtitle}>
        Enter temperature ({unit === "F" ? "degF" : "degC"}) and RH (%).
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      <View style={styles.row}>
        <Pressable
          style={[styles.pill, unit === "F" && styles.pillOn]}
          onPress={() => setUnit("F")}
        >
          <Text style={[styles.pillTxt, unit === "F" && styles.pillTxtOn]}>degF</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, unit === "C" && styles.pillOn]}
          onPress={() => setUnit("C")}
        >
          <Text style={[styles.pillTxt, unit === "C" && styles.pillTxtOn]}>degC</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Temperature ({unit === "F" ? "degF" : "degC"})</Text>
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
        {model.valid ? (
          <>
            <Text style={styles.result}>VPD: {model.vpd.toFixed(2)} kPa</Text>
            <Text style={styles.hint}>
              Internal temp: {model.tempC.toFixed(1)} degC (converted)
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.result}>VPD: -</Text>
            <Text style={styles.hint}>Enter valid numbers (RH must be 0-100).</Text>
          </>
        )}
      </View>

      {model.valid ? (
        <Pressable
          style={styles.saveButton}
          onPress={async () => {
            const created = await createToolRun({
              toolType: "vpd",
              growId: growId || undefined,
              input: { temp: Number(tempText), unit, rh: Number(rhText) },
              output: { vpdKpa: model.vpd, tempC: model.tempC }
            });
            if (created) {
              setSaveFeedback("Saved tool run.");
            } else {
              setSaveFeedback("Unable to save tool run.");
            }
          }}
        >
          <Text style={styles.saveButtonText}>Save run {growId ? "to grow" : ""}</Text>
        </Pressable>
      ) : null}
      {saveFeedback ? <Text style={styles.hint}>{saveFeedback}</Text> : null}
      {model.valid && growId ? (
        <Pressable
          style={[styles.saveButton, savingAndOpening ? { opacity: 0.7 } : null]}
          disabled={savingAndOpening}
          onPress={async () => {
            if (savingAndOpening) return;
            setSavingAndOpening(true);
            const result = await saveToolRunAndOpenJournal({
              router,
              growId,
              toolKey: "vpd",
              input: { temp: Number(tempText), unit, rh: Number(rhText) },
              output: { vpdKpa: model.vpd, tempC: model.tempC }
            });
            if (!result.ok) setSaveFeedback(result.error);
            setSavingAndOpening(false);
          }}
        >
          <Text style={styles.saveButtonText}>
            {savingAndOpening ? "Saving..." : "Save and Open Journal"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
