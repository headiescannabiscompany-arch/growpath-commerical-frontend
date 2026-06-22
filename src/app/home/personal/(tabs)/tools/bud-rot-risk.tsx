import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
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
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.DIAGNOSE_ADVANCED);

  const [tempF, setTempF] = useState("75");
  const [rh, setRh] = useState("55");
  const [airflowScore, setAirflowScore] = useState("7");
  const [wetEventsPerWeek, setWetEventsPerWeek] = useState("0");
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

  if (!enabled) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <BackButton />
        <Text style={styles.title}>Bud Rot Risk</Text>
        <View style={styles.lockedCard}>
          <Text style={styles.lockedTitle}>Tool unavailable</Text>
          <Text style={styles.subtitle}>
            This account does not have `DIAGNOSE_ADVANCED`.
          </Text>
        </View>
      </ScrollView>
    );
  }

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

      <ToolResultSurface
        title="Bud-rot risk screen"
        status={computed ? computed.band.toUpperCase() : "NEEDS INPUT"}
        metrics={[
          {
            key: "risk-score",
            label: "Screening score",
            value: computed ? `${computed.score}/100` : "—"
          }
        ]}
        notices={
          computed && computed.band !== "Low"
            ? [
                {
                  key: "risk-band",
                  severity: computed.band === "High" ? "high" : "medium",
                  message: `Current inputs produce a ${computed.band} heuristic risk screen.`,
                  remediation:
                    "Inspect dense flowers and canopy moisture, improve airflow where safe, and verify conditions over time."
                }
              ]
            : []
        }
        assumptions={[
          "This is a heuristic screening result, not a disease diagnosis or validated prediction.",
          "A single reading cannot establish sustained condensation or wet-duration risk."
        ]}
        actions={
          computed && growId
            ? [
                {
                  key: "save-journal",
                  label: "Save and Open Journal",
                  pendingLabel: "Saving...",
                  onPress: async () => {
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
                      output: computed
                    });
                    if (!result.ok) throw new Error(result.error);
                  }
                }
              ]
            : []
        }
        feedback={feedback}
        contextMessage={
          !growId ? "Select a grow context to save this result." : undefined
        }
      />
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
  hint: { fontSize: 12, color: "#64748B", marginTop: 6 },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#F8FAFC"
  },
  lockedTitle: { fontWeight: "800", color: "#0F172A" }
});
