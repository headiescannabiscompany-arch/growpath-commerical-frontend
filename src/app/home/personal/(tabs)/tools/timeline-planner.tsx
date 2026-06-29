import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { createPersonalTask } from "@/api/tasks";
import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { buildTimelinePlan } from "@/features/personal/tools/advancedPlanning";
import LockedToolCard from "@/features/personal/tools/LockedToolCard";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function TimelinePlannerScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_TIMELINE_PLANNER);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [vegWeeks, setVegWeeks] = useState("4");
  const [flowerWeeks, setFlowerWeeks] = useState("9");
  const [dryDays, setDryDays] = useState("10");
  const [cureWeeks, setCureWeeks] = useState("4");
  const [feedback, setFeedback] = useState("");

  const milestones = useMemo(
    () =>
      buildTimelinePlan({
        startDate,
        vegWeeks: numberValue(vegWeeks, 4),
        flowerWeeks: numberValue(flowerWeeks, 9),
        dryDays: numberValue(dryDays, 10),
        cureWeeks: numberValue(cureWeeks, 4)
      }),
    [cureWeeks, dryDays, flowerWeeks, startDate, vegWeeks]
  );

  async function createTasks() {
    if (!growId) throw new Error("Select a grow before creating tasks.");
    for (const milestone of milestones.slice(1)) {
      await createPersonalTask({
        growId,
        title: milestone.label,
        description: milestone.detail,
        dueDate: milestone.date
      });
    }
    setFeedback("Timeline tasks created.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>Timeline Planner</Text>
      <Text style={styles.subtitle}>
        Build a date-based grow plan across veg, flower, dry, and cure milestones.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      {!enabled ? (
        <LockedToolCard
          title="Timeline Planner"
          capability={CAPABILITY_KEYS.TOOL_TIMELINE_PLANNER}
          description="Enable this capability to plan grow milestones and create follow-up tasks."
        />
      ) : (
        <>
          <Text style={styles.label}>Start date</Text>
          <TextInput
            accessibilityLabel="Timeline start date"
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
          />
          <Text style={styles.label}>Veg weeks</Text>
          <TextInput
            accessibilityLabel="Timeline veg weeks"
            style={styles.input}
            value={vegWeeks}
            onChangeText={setVegWeeks}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Flower weeks</Text>
          <TextInput
            accessibilityLabel="Timeline flower weeks"
            style={styles.input}
            value={flowerWeeks}
            onChangeText={setFlowerWeeks}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Dry days</Text>
          <TextInput
            accessibilityLabel="Timeline dry days"
            style={styles.input}
            value={dryDays}
            onChangeText={setDryDays}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Cure weeks</Text>
          <TextInput
            accessibilityLabel="Timeline cure weeks"
            style={styles.input}
            value={cureWeeks}
            onChangeText={setCureWeeks}
            keyboardType="numeric"
          />

          <ToolResultSurface
            title="Planned timeline"
            status="LOCAL PLAN"
            summary="Milestones are deterministic from the date and duration inputs."
            metrics={[
              { key: "start", label: "Start", value: milestones[0]?.date || startDate },
              {
                key: "harvest",
                label: "Harvest window",
                value:
                  milestones.find((item) => item.key === "harvest-window")?.date || ""
              },
              { key: "count", label: "Milestones", value: String(milestones.length) }
            ]}
            details={
              <View style={styles.milestones}>
                {milestones.map((milestone) => (
                  <View key={milestone.key} style={styles.milestone}>
                    <Text style={styles.milestoneDate}>{milestone.date}</Text>
                    <Text style={styles.milestoneTitle}>{milestone.label}</Text>
                    <Text style={styles.milestoneDetail}>{milestone.detail}</Text>
                  </View>
                ))}
              </View>
            }
            actions={[
              {
                key: "tasks",
                label: "Create Tasks",
                pendingLabel: "Creating...",
                disabled: !growId,
                onPress: createTasks
              }
            ]}
            feedback={feedback}
            contextMessage={
              !growId ? "Select a grow to create timeline tasks." : undefined
            }
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: "#FFFFFF", gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  context: { color: "#166534", fontWeight: "800" },
  label: { color: "#334155", fontWeight: "800", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 10 },
  milestones: { gap: 8 },
  milestone: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#FFFFFF"
  },
  milestoneDate: { color: "#166534", fontWeight: "800" },
  milestoneTitle: { color: "#0F172A", fontWeight: "800", marginTop: 3 },
  milestoneDetail: { color: "#64748B", marginTop: 2, lineHeight: 18 }
});
