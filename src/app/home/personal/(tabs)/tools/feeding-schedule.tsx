import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { generateSchedule } from "@/api/feeding";
import { createPersonalLog } from "@/api/logs";
import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import LockedToolCard from "@/features/personal/tools/LockedToolCard";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function rowsFromSchedule(result: any): any[] {
  const schedule =
    result?.data?.schedule?.schedule ??
    result?.schedule?.schedule ??
    result?.data?.schedule ??
    result?.schedule ??
    [];
  return Array.isArray(schedule) ? schedule : [];
}

function notesFromSchedule(result: any) {
  return String(
    result?.data?.notes ||
      result?.notes ||
      result?.data?.schedule?.notes ||
      result?.schedule?.notes ||
      ""
  );
}

export default function FeedingScheduleToolScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.FEEDING_SCHEDULE);

  const [productName, setProductName] = useState("Base nutrient");
  const [medium, setMedium] = useState("Soil");
  const [strainType, setStrainType] = useState("Photoperiod");
  const [experience, setExperience] = useState("Intermediate");
  const [weeks, setWeeks] = useState("12");
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState("");

  const scheduleRows = rowsFromSchedule(result);
  const notes = notesFromSchedule(result);

  async function run() {
    if (!enabled || running) return;
    setRunning(true);
    setFeedback("");
    setResult(null);
    try {
      const response = await generateSchedule({
        growId: growId || undefined,
        nutrientData: { productName: productName.trim() },
        growMedium: medium.trim(),
        strainType: strainType.trim(),
        experience: experience.trim(),
        weeks: Number(weeks)
      });
      setResult(response);
      if (!rowsFromSchedule(response).length) {
        setFeedback("The feeding endpoint returned no schedule rows.");
      }
    } catch (error: any) {
      setFeedback(error?.message || "Unable to generate feeding schedule.");
    } finally {
      setRunning(false);
    }
  }

  async function saveLog() {
    if (!growId || !result) throw new Error("Select a grow before saving.");
    const created = await createPersonalLog({
      growId,
      type: "feed",
      date: new Date().toISOString().slice(0, 10),
      title: `${productName.trim() || "Nutrient"} feeding schedule`,
      notes: [
        `Medium: ${medium}`,
        `Strain type: ${strainType}`,
        notes,
        ...scheduleRows.map(
          (row) =>
            `Week ${row.week ?? "?"}: ${row.stage || "stage"} - ${row.feed?.amountPerGallon || row.amount || "dose not specified"}`
        )
      ]
        .filter(Boolean)
        .join("\n"),
      tags: ["feeding", "ai_schedule"]
    });
    if (!created) throw new Error("Unable to save feeding schedule to journal.");
    setFeedback("Saved feeding schedule to grow journal.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>AI Feeding Schedule</Text>
      <Text style={styles.subtitle}>
        Generate a feeding plan from nutrient, medium, strain, and schedule context.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      <Text style={styles.label}>Product or nutrient line</Text>
      <TextInput
        accessibilityLabel="Feeding product or nutrient line"
        style={styles.input}
        value={productName}
        onChangeText={setProductName}
      />
      <Text style={styles.label}>Grow medium</Text>
      <TextInput
        accessibilityLabel="Feeding grow medium"
        style={styles.input}
        value={medium}
        onChangeText={setMedium}
      />
      <Text style={styles.label}>Strain type</Text>
      <TextInput
        accessibilityLabel="Feeding strain type"
        style={styles.input}
        value={strainType}
        onChangeText={setStrainType}
      />
      <Text style={styles.label}>Experience</Text>
      <TextInput
        accessibilityLabel="Feeding experience"
        style={styles.input}
        value={experience}
        onChangeText={setExperience}
      />
      <Text style={styles.label}>Total weeks</Text>
      <TextInput
        accessibilityLabel="Feeding total weeks"
        style={styles.input}
        value={weeks}
        onChangeText={setWeeks}
        keyboardType="numeric"
      />

      {!enabled ? (
        <LockedToolCard
          title="AI Feeding Schedule"
          capability={CAPABILITY_KEYS.FEEDING_SCHEDULE}
          description="Generate stage-aware feeding plans after this capability is enabled for the account."
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Generate feeding schedule"
        style={[styles.button, (!enabled || running) && styles.disabled]}
        disabled={!enabled || running}
        onPress={run}
      >
        <Text style={styles.buttonText}>
          {running ? "Generating..." : "Generate Schedule"}
        </Text>
      </Pressable>

      <ToolResultSurface
        title="Feeding schedule"
        status={result ? "AI ENDPOINT" : "READY"}
        summary={notes || "Run the endpoint to generate a schedule."}
        metrics={[
          { key: "weeks", label: "Requested weeks", value: weeks || "0" },
          { key: "rows", label: "Schedule rows", value: String(scheduleRows.length) },
          { key: "medium", label: "Medium", value: medium || "Unspecified" }
        ]}
        details={
          scheduleRows.length ? (
            <View style={styles.rows}>
              {scheduleRows.slice(0, 8).map((row, index) => (
                <Text key={`${row.week || index}`} style={styles.rowText}>
                  Week {row.week ?? index + 1}: {row.stage || "stage"} |{" "}
                  {row.feed?.amountPerGallon || row.amount || "dose pending"}
                </Text>
              ))}
            </View>
          ) : undefined
        }
        assumptions={[
          "Backend schedule output is authoritative for entitlement and endpoint behavior.",
          "Confirm product label rates, local regulations, runoff, EC, and plant response before applying."
        ]}
        actions={
          result && growId
            ? [
                {
                  key: "save-log",
                  label: "Save to Grow Log",
                  onPress: saveLog,
                  pendingLabel: "Saving..."
                }
              ]
            : []
        }
        feedback={feedback}
        contextMessage={!growId ? "Select a grow to save this schedule." : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: "#FFFFFF", gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  context: { color: "#166534", fontWeight: "800" },
  label: { color: "#334155", fontWeight: "800", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 9, padding: 10 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  rows: { gap: 5 },
  rowText: { color: "#334155", lineHeight: 19 }
});
