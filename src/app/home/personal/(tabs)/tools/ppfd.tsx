import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateTask,
  saveToolRunAndOpenJournal
} from "@/features/personal/tools/saveToolRunAndOpenJournal";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function toNum(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function dueTomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export default function PpfdToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = coerceParam(rawGrowId);
  const plantContext = useToolPlantContext(growId, coerceParam(rawPlantId));

  const [dliTarget, setDliTarget] = useState("35");
  const [photoperiodHours, setPhotoperiodHours] = useState("12");
  const [ppfdAtCanopy, setPpfdAtCanopy] = useState("");
  const [fixturePercent, setFixturePercent] = useState("100");
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
      <ToolPlantContextPicker
        plants={plantContext.plants}
        plantId={plantContext.plantId}
        selectedPlant={plantContext.selectedPlant}
        onSelect={plantContext.setPlantId}
      />

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

      <ToolResultSurface
        title="PPFD / DLI result"
        status={computed ? "CALCULATED" : "NEEDS INPUT"}
        metrics={[
          {
            key: "required-ppfd",
            label: "Required canopy PPFD",
            value: computed ? `${computed.requiredPpfd} µmol/m²/s` : "—",
            detail: `${photoperiodHours || "—"} hour photoperiod`
          }
        ]}
        assumptions={[
          "This calculation converts target DLI and photoperiod; it does not estimate fixture output from wattage.",
          "Use a calibrated PAR meter and canopy sampling for measured PPFD."
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
                      ...plantContext.toolRunContext,
                      toolKey: "ppfd",
                      input: {
                        dliTarget: Number(dliTarget),
                        photoperiodHours: Number(photoperiodHours),
                        ppfdAtCanopy: ppfdAtCanopy ? Number(ppfdAtCanopy) : null,
                        fixturePercent: Number(fixturePercent)
                      },
                      output: computed
                    });
                    if (!result.ok) throw new Error(result.error);
                  }
                },
                {
                  key: "create-task",
                  label: "Create Light Check Task",
                  variant: "secondary",
                  pendingLabel: "Creating...",
                  onPress: async () => {
                    setFeedback("");
                    const result = await saveToolRunAndCreateTask({
                      growId,
                      ...plantContext.toolRunContext,
                      toolKey: "ppfd",
                      input: {
                        dliTarget: Number(dliTarget),
                        photoperiodHours: Number(photoperiodHours),
                        ppfdAtCanopy: ppfdAtCanopy ? Number(ppfdAtCanopy) : null,
                        fixturePercent: Number(fixturePercent)
                      },
                      output: computed,
                      title: "Check canopy PPFD",
                      description: `Target about ${computed.requiredPpfd} umol/m2/s over ${photoperiodHours || "?"} hours. Verify with a meter and adjust fixture height or dimming gradually.`,
                      priority: "medium",
                      dueDate: dueTomorrow()
                    });
                    if (!result.ok) throw new Error(result.error);
                    setFeedback("Created light check task.");
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
  hint: { fontSize: 12, color: "#64748B", marginTop: 6 }
});
