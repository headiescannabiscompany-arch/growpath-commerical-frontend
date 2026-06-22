import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";

import { createPersonalLog } from "@/api/logs";
import { createToolRun } from "@/api/toolRuns";
import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  estimateHarvestWindow,
  type HarvestEstimatorInput
} from "@/features/personal/tools/advancedPlanning";
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

export default function HarvestEstimatorScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_HARVEST_ESTIMATOR);
  const [floweringDay, setFloweringDay] = useState("49");
  const [breederFlowerDays, setBreederFlowerDays] = useState("63");
  const [cloudyPct, setCloudyPct] = useState("60");
  const [amberPct, setAmberPct] = useState("8");
  const [pistilDarkPct, setPistilDarkPct] = useState("70");
  const [cultivarSpeed, setCultivarSpeed] =
    useState<HarvestEstimatorInput["cultivarSpeed"]>("average");
  const [feedback, setFeedback] = useState("");

  const input = useMemo<HarvestEstimatorInput>(
    () => ({
      floweringDay: numberValue(floweringDay, 0),
      breederFlowerDays: numberValue(breederFlowerDays, 63),
      cloudyPct: numberValue(cloudyPct, 0),
      amberPct: numberValue(amberPct, 0),
      pistilDarkPct: numberValue(pistilDarkPct, 0),
      cultivarSpeed
    }),
    [amberPct, breederFlowerDays, cloudyPct, cultivarSpeed, floweringDay, pistilDarkPct]
  );
  const result = useMemo(() => estimateHarvestWindow(input), [input]);

  async function saveEstimate() {
    if (!growId) throw new Error("Select a grow before saving.");
    const toolRun = await createToolRun({
      toolType: "harvest-estimator",
      growId,
      input,
      output: result,
      calculatorVersion: "advanced-planning-v1"
    });
    const created = await createPersonalLog({
      growId,
      toolRunId: toolRun?._id || toolRun?.id,
      type: "harvest",
      date: new Date().toISOString().slice(0, 10),
      title: "Harvest window estimate",
      notes: `${result.summary}\nTarget flowering day: ${result.targetDay}\nWindow: day ${result.earliestDay}-${result.latestDay}`,
      tags: ["harvest", "estimator"]
    });
    if (!created) throw new Error("Unable to save harvest estimate.");
    setFeedback("Saved harvest estimate to grow journal.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>Harvest Estimator</Text>
      <Text style={styles.subtitle}>
        Estimate a harvest window from flowering day, breeder timing, trichomes,
        pistils, and cultivar speed.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      {!enabled ? (
        <LockedToolCard
          title="Harvest Estimator"
          capability={CAPABILITY_KEYS.TOOL_HARVEST_ESTIMATOR}
          description="Enable this capability to calculate and save harvest readiness estimates."
        />
      ) : (
        <>
          <Text style={styles.label}>Flowering day</Text>
          <TextInput
            style={styles.input}
            value={floweringDay}
            onChangeText={setFloweringDay}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Breeder flower days</Text>
          <TextInput
            style={styles.input}
            value={breederFlowerDays}
            onChangeText={setBreederFlowerDays}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Cloudy trichomes (%)</Text>
          <TextInput
            style={styles.input}
            value={cloudyPct}
            onChangeText={setCloudyPct}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Amber trichomes (%)</Text>
          <TextInput
            style={styles.input}
            value={amberPct}
            onChangeText={setAmberPct}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Dark pistils (%)</Text>
          <TextInput
            style={styles.input}
            value={pistilDarkPct}
            onChangeText={setPistilDarkPct}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Cultivar speed</Text>
          <ScrollView horizontal contentContainerStyle={styles.pills}>
            {(["fast", "average", "slow"] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.pill, cultivarSpeed === value && styles.pillOn]}
                onPress={() => setCultivarSpeed(value)}
              >
                <Text
                  style={[styles.pillText, cultivarSpeed === value && styles.pillTextOn]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ToolResultSurface
            title="Harvest estimate"
            status={result.readiness.toUpperCase()}
            summary={result.summary}
            metrics={[
              { key: "remaining", label: "Days remaining", value: String(result.daysRemaining) },
              { key: "target", label: "Target day", value: String(result.targetDay) },
              {
                key: "window",
                label: "Window",
                value: `Day ${result.earliestDay}-${result.latestDay}`
              }
            ]}
            recommendations={[
              "Check trichomes on multiple bud sites before acting.",
              "Prepare drying space before the estimated target day.",
              "Use cultivar notes and plant health to override the estimate when needed."
            ]}
            actions={[
              {
                key: "save",
                label: "Save Estimate",
                pendingLabel: "Saving...",
                disabled: !growId,
                onPress: saveEstimate
              }
            ]}
            feedback={feedback}
            contextMessage={!growId ? "Select a grow to save this estimate." : undefined}
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
  pills: { gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  pillOn: { borderColor: "#166534", backgroundColor: "#DCFCE7" },
  pillText: { color: "#334155", fontWeight: "700", textTransform: "capitalize" },
  pillTextOn: { color: "#166534" }
});
