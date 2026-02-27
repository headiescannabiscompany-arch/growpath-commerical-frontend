import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";
import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function toNum(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export default function BudRotRiskToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(rawGrowId);

  const [tempF, setTempF] = useState("75");
  const [rh, setRh] = useState("55");
  const [airflowScore, setAirflowScore] = useState("7");
  const [wetEventsPerWeek, setWetEventsPerWeek] = useState("0");
  const [savingAndOpening, setSavingAndOpening] = useState(false);
  const [feedback, setFeedback] = useState("");

  const computed = useMemo(() => {
    const t = toNum(tempF);
    const r = toNum(rh);
    const a = toNum(airflowScore);
    const w = toNum(wetEventsPerWeek);

    if (![t, r, a, w].every(Number.isFinite)) return null;

    const base = Math.max(0, Math.min(100, (r - 40) * 1.4));
    const airflowPenalty = Math.max(0, (10 - a) * 6);
    const wetPenalty = Math.max(0, w * 10);
    const tempBonus = t < 68 ? 8 : t > 82 ? 6 : 0;
    const score = Math.max(
      0,
      Math.min(100, Math.round(base + airflowPenalty + wetPenalty + tempBonus))
    );
    const band = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
    return { score, band };
  }, [tempF, rh, airflowScore, wetEventsPerWeek]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>Bud Rot Risk</Text>
      <Text style={styles.subtitle}>
        Quick risk snapshot based on RH, airflow, and moisture events.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      <Text style={styles.label}>Temperature (degF)</Text>
      <TextInput
        style={styles.input}
        value={tempF}
        onChangeText={setTempF}
        keyboardType="numeric"
        placeholder="75"
      />

      <Text style={styles.label}>Relative Humidity (%)</Text>
      <TextInput
        style={styles.input}
        value={rh}
        onChangeText={setRh}
        keyboardType="numeric"
        placeholder="55"
      />

      <Text style={styles.label}>Airflow score (1-10)</Text>
      <TextInput
        style={styles.input}
        value={airflowScore}
        onChangeText={setAirflowScore}
        keyboardType="numeric"
        placeholder="7"
      />

      <Text style={styles.label}>Wet events per week</Text>
      <TextInput
        style={styles.input}
        value={wetEventsPerWeek}
        onChangeText={setWetEventsPerWeek}
        keyboardType="numeric"
        placeholder="0"
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estimated Output</Text>
        <Text style={styles.cardLine}>
          Risk:{" "}
          <Text style={styles.cardValue}>
            {computed ? `${computed.band} (${computed.score}/100)` : "-"}
          </Text>
        </Text>
      </View>

      {growId ? (
        <Pressable
          style={[styles.button, savingAndOpening ? { opacity: 0.7 } : null]}
          disabled={savingAndOpening}
          onPress={async () => {
            if (savingAndOpening) return;
            setSavingAndOpening(true);
            setFeedback("");
            const result = await saveToolRunAndOpenJournal({
              router,
              growId,
              toolKey: "bud-rot-risk",
              input: {
                tempF: Number(tempF),
                rh: Number(rh),
                airflowScore: Number(airflowScore),
                wetEventsPerWeek: Number(wetEventsPerWeek)
              },
              output: computed ?? {}
            });
            if (!result.ok) setFeedback(result.error);
            setSavingAndOpening(false);
          }}
        >
          <Text style={styles.buttonText}>
            {savingAndOpening ? "Saving..." : "Save and Open Journal"}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.hint}>Select a grow context to save this run to journal.</Text>
      )}

      {feedback ? <Text style={styles.hint}>{feedback}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 30, backgroundColor: "#FFFFFF", gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#64748B", marginBottom: 6 },
  context: { color: "#166534", fontWeight: "700", marginBottom: 4 },
  label: { fontWeight: "700", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF"
  },
  card: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    padding: 12
  },
  cardTitle: { fontWeight: "700", marginBottom: 4 },
  cardLine: { color: "#334155" },
  cardValue: { fontWeight: "800", color: "#0F172A" },
  button: {
    marginTop: 8,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  hint: { fontSize: 12, color: "#64748B", marginTop: 6 }
});
