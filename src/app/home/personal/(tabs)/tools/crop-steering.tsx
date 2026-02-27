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

export default function CropSteeringToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(rawGrowId);

  const [phase, setPhase] = useState("generative");
  const [substrate, setSubstrate] = useState("coco");
  const [targetRunoffPct, setTargetRunoffPct] = useState("10");
  const [shotsPerDay, setShotsPerDay] = useState("12");
  const [shotMl, setShotMl] = useState("250");
  const [savingAndOpening, setSavingAndOpening] = useState(false);
  const [feedback, setFeedback] = useState("");

  const computed = useMemo(() => {
    const runoff = toNum(targetRunoffPct);
    const shots = toNum(shotsPerDay);
    const ml = toNum(shotMl);
    if (![runoff, shots, ml].every(Number.isFinite)) return null;
    const totalMl = Math.max(0, shots * ml);
    const targetRunoffMl = Math.round((totalMl * runoff) / 100);
    return { totalMl, targetRunoffMl };
  }, [targetRunoffPct, shotsPerDay, shotMl]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>Crop Steering</Text>
      <Text style={styles.subtitle}>
        Steering scaffold for phase, substrate, and irrigation volume planning.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      <Text style={styles.label}>Phase (generative or vegetative)</Text>
      <TextInput style={styles.input} value={phase} onChangeText={setPhase} placeholder="generative" />

      <Text style={styles.label}>Substrate</Text>
      <TextInput style={styles.input} value={substrate} onChangeText={setSubstrate} placeholder="coco" />

      <Text style={styles.label}>Target runoff (%)</Text>
      <TextInput
        style={styles.input}
        value={targetRunoffPct}
        onChangeText={setTargetRunoffPct}
        keyboardType="numeric"
        placeholder="10"
      />

      <Text style={styles.label}>Shots per day</Text>
      <TextInput
        style={styles.input}
        value={shotsPerDay}
        onChangeText={setShotsPerDay}
        keyboardType="numeric"
        placeholder="12"
      />

      <Text style={styles.label}>Shot size (mL)</Text>
      <TextInput
        style={styles.input}
        value={shotMl}
        onChangeText={setShotMl}
        keyboardType="numeric"
        placeholder="250"
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estimated Output</Text>
        <Text style={styles.cardLine}>
          Total irrigation:{" "}
          <Text style={styles.cardValue}>{computed ? `${computed.totalMl} mL/day` : "-"}</Text>
        </Text>
        <Text style={styles.cardLine}>
          Target runoff:{" "}
          <Text style={styles.cardValue}>
            {computed ? `${computed.targetRunoffMl} mL/day` : "-"}
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
              toolKey: "crop-steering",
              input: {
                phase,
                substrate,
                targetRunoffPct: Number(targetRunoffPct),
                shotsPerDay: Number(shotsPerDay),
                shotMl: Number(shotMl)
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
