import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { createToolRun } from "@/api/toolRuns";
import BackButton from "@/components/nav/BackButton";
import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function num(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function NpkToolScreen() {
  const router = useRouter();
  const { growId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growContext = typeof growId === "string" ? growId : Array.isArray(growId) ? growId[0] : "";
  const [nText, setNText] = useState("10");
  const [pText, setPText] = useState("5");
  const [kText, setKText] = useState("5");
  const [doseText, setDoseText] = useState("5");
  const [unit, setUnit] = useState<"ml/L" | "ml/gal">("ml/L");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [savingAndOpening, setSavingAndOpening] = useState(false);

  const result = useMemo(() => {
    const n = num(nText);
    const p = num(pText);
    const k = num(kText);
    const dose = num(doseText);
    const sum = Math.max(n + p + k, 1);
    return {
      ratio: `${n}:${p}:${k}`,
      nShare: ((n / sum) * 100).toFixed(1),
      pShare: ((p / sum) * 100).toFixed(1),
      kShare: ((k / sum) * 100).toFixed(1),
      dose
    };
  }, [doseText, kText, nText, pText]);

  return (
    <View style={styles.container}>
      <BackButton />
      <Text style={styles.title}>NPK Label Ratio (Preview)</Text>
      <Text style={styles.subtitle}>
        Label share preview only. This does not calculate nutrient ppm targets.
      </Text>
      {growContext ? <Text style={styles.context}>Grow context: {growContext}</Text> : null}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Important</Text>
        <Text style={styles.noticeText}>
          Use this page for quick ratio orientation only. Full recipe and ppm math belongs
          to the upcoming NPK Calculator.
        </Text>
      </View>

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

      <Text style={styles.label}>Dose (for reference)</Text>
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
        <Text style={styles.result}>Label ratio: {result.ratio}</Text>
        <Text style={styles.line}>N share: {result.nShare}%</Text>
        <Text style={styles.line}>P share: {result.pShare}%</Text>
        <Text style={styles.line}>K share: {result.kShare}%</Text>
        <Text style={styles.line}>
          Reference dose: {result.dose} {unit}
        </Text>
      </View>
      <Pressable
        style={styles.saveButton}
        onPress={async () => {
          const created = await createToolRun({
            toolType: "npk",
            growId: growContext || undefined,
            input: {
              n: Number(nText),
              p: Number(pText),
              k: Number(kText),
              dose: Number(doseText),
              unit
            },
            output: result
          });
          if (created) {
            setSaveFeedback("Saved preview run.");
          } else {
            setSaveFeedback("Unable to save preview run.");
          }
        }}
      >
        <Text style={styles.saveButtonText}>Save preview run {growContext ? "to grow" : ""}</Text>
      </Pressable>
      {saveFeedback ? <Text style={styles.feedback}>{saveFeedback}</Text> : null}
      {growContext ? (
        <Pressable
          style={[styles.saveButton, savingAndOpening ? { opacity: 0.7 } : null]}
          disabled={savingAndOpening}
          onPress={async () => {
            if (savingAndOpening) return;
            setSavingAndOpening(true);
            const saveResult = await saveToolRunAndOpenJournal({
              router,
              growId: growContext,
              toolKey: "npk",
              input: {
                n: Number(nText),
                p: Number(pText),
                k: Number(kText),
                dose: Number(doseText),
                unit
              },
              output: result
            });
            if (!saveResult.ok) setSaveFeedback(saveResult.error);
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF", gap: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B" },
  context: { color: "#166534", fontWeight: "700" },
  notice: {
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    backgroundColor: "#FEFCE8",
    padding: 12
  },
  noticeTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  noticeText: { fontSize: 13, color: "#854D0E" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF"
  },
  label: { fontWeight: "700", marginTop: 4 },
  fullInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF"
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  pillOn: { backgroundColor: "#166534", borderColor: "#166534" },
  pillTxt: { fontWeight: "800" },
  pillTxtOn: { color: "#FFFFFF" },
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
  line: { color: "#334155" },
  saveButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#166534",
    backgroundColor: "#166534"
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "700" },
  feedback: { fontSize: 12, color: "#64748B" }
});
