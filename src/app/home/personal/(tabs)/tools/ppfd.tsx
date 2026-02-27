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

export default function PpfdToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(rawGrowId);

  const [dliTarget, setDliTarget] = useState("35");
  const [photoperiodHours, setPhotoperiodHours] = useState("12");
  const [ppfdAtCanopy, setPpfdAtCanopy] = useState("");
  const [fixturePercent, setFixturePercent] = useState("100");
  const [savingAndOpening, setSavingAndOpening] = useState(false);
  const [feedback, setFeedback] = useState("");

  const computed = useMemo(() => {
    const dli = toNum(dliTarget);
    const hours = toNum(photoperiodHours);
    if (!Number.isFinite(dli) || !Number.isFinite(hours) || hours <= 0) return null;
    const requiredPpfd = dli / (0.0036 * hours);
    return { requiredPpfd: Math.round(requiredPpfd) };
  }, [dliTarget, photoperiodHours]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>PPFD / DLI Planner</Text>
      <Text style={styles.subtitle}>
        Set DLI and photoperiod to estimate required canopy PPFD.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      <Text style={styles.label}>Target DLI (mol/m2/day)</Text>
      <TextInput
        style={styles.input}
        value={dliTarget}
        onChangeText={setDliTarget}
        keyboardType="numeric"
        placeholder="35"
      />

      <Text style={styles.label}>Photoperiod (hours)</Text>
      <TextInput
        style={styles.input}
        value={photoperiodHours}
        onChangeText={setPhotoperiodHours}
        keyboardType="numeric"
        placeholder="12"
      />

      <Text style={styles.label}>Measured PPFD at canopy (optional)</Text>
      <TextInput
        style={styles.input}
        value={ppfdAtCanopy}
        onChangeText={setPpfdAtCanopy}
        keyboardType="numeric"
        placeholder="850"
      />

      <Text style={styles.label}>Fixture power (%)</Text>
      <TextInput
        style={styles.input}
        value={fixturePercent}
        onChangeText={setFixturePercent}
        keyboardType="numeric"
        placeholder="100"
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estimated Output</Text>
        <Text style={styles.cardLine}>
          Required PPFD:{" "}
          <Text style={styles.cardValue}>
            {computed ? `${computed.requiredPpfd} umol/m2/s` : "-"}
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
              toolKey: "ppfd",
              input: {
                dliTarget: Number(dliTarget),
                photoperiodHours: Number(photoperiodHours),
                ppfdAtCanopy: ppfdAtCanopy ? Number(ppfdAtCanopy) : null,
                fixturePercent: Number(fixturePercent)
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
