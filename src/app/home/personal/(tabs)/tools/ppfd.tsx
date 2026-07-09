import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateTask,
  saveToolRunAndOpenJournal
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { radius } from "@/theme/theme";

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

function ppfdTaskMetadata(hasWarnings: boolean) {
  return {
    allDay: true,
    calendarType: "ppfd_dli_followup",
    sourceStage: hasWarnings ? "light_stress_response_check" : "ppfd_dli_measurement",
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
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
  const [stage, setStage] = useState("flower");
  const [leafResponse, setLeafResponse] = useState("");
  const [feedback, setFeedback] = useState("");

  const computed = useMemo(() => {
    const dli = toNum(dliTarget);
    const hours = toNum(photoperiodHours);
    if (!Number.isFinite(dli) || !Number.isFinite(hours) || hours <= 0) return null;
    const requiredPpfd = dli / (0.0036 * hours);
    const measuredPpfd = toNum(ppfdAtCanopy);
    const measuredDli = Number.isFinite(measuredPpfd)
      ? measuredPpfd * hours * 0.0036
      : null;
    const normalizedStage = stage.toLowerCase();
    const response = leafResponse.toLowerCase();
    const warnings: string[] = [];
    if (
      /seed|clone/.test(normalizedStage) &&
      (requiredPpfd > 300 || measuredPpfd > 300)
    ) {
      warnings.push(
        "Seedlings/clones may be under too much light for stable rooting and early growth."
      );
    }
    if (/late|ripen|finish/.test(normalizedStage) && dli > 45) {
      warnings.push(
        "Very high DLI late flower can add heat/light pressure and reduce finish quality if plants are not tolerating it."
      );
    }
    if (/taco|bleach|curl|canoe|light burn/.test(response)) {
      warnings.push(
        "Leaf posture or bleaching symptoms suggest light stress; compare against VPD, temperature, and root-zone status before increasing intensity."
      );
    }
    if (hours > 13 && /flower|late|ripen|finish/.test(normalizedStage)) {
      warnings.push(
        "Flowering photoperiod appears long; verify crop type, genetics, and light schedule."
      );
    }
    return {
      requiredPpfd: Math.round(requiredPpfd),
      measuredDli: measuredDli == null ? null : Number(measuredDli.toFixed(1)),
      warnings
    };
  }, [dliTarget, leafResponse, photoperiodHours, ppfdAtCanopy, stage]);

  const input = {
    dliTarget: Number(dliTarget),
    photoperiodHours: Number(photoperiodHours),
    ppfdAtCanopy: ppfdAtCanopy ? Number(ppfdAtCanopy) : null,
    fixturePercent: Number(fixturePercent),
    stage,
    leafResponse
  };

  return (
    <ScreenBoundary
      title="PPFD / DLI Planner"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>PPFD / DLI Planner</Text>
        <Text style={styles.subtitle}>
          Set DLI and photoperiod to estimate required canopy PPFD.
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_ppfd"
          longContent
        />
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
        <Text style={styles.label}>Stage</Text>
        <TextInput
          style={styles.input}
          value={stage}
          onChangeText={setStage}
          placeholder="clone, veg, flower, late_flower"
        />
        <Text style={styles.label}>Leaf response</Text>
        <TextInput
          style={styles.input}
          value={leafResponse}
          onChangeText={setLeafResponse}
          placeholder="tacoing, bleaching, praying, normal"
        />

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_tools_ppfd"
          longContent
        />

        <ToolResultSurface
          title="PPFD / DLI result"
          status={computed ? "CALCULATED" : "NEEDS INPUT"}
          metrics={[
            {
              key: "required-ppfd",
              label: "Required canopy PPFD",
              value: computed ? `${computed.requiredPpfd} umol/m2/s` : "-",
              detail: `${photoperiodHours || "-"} hour photoperiod`
            },
            {
              key: "measured-dli",
              label: "Measured DLI",
              value:
                computed?.measuredDli == null ? "Not entered" : `${computed.measuredDli}`
            },
            {
              key: "warnings",
              label: "Warnings",
              value: String(computed?.warnings.length || 0),
              detail: computed?.warnings[0] || "No light-stress warning from entered data"
            }
          ]}
          assumptions={[
            "This calculation converts target DLI and photoperiod; it does not estimate fixture output from wattage.",
            ...(computed?.warnings || []),
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
                        input,
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
                        input,
                        output: computed,
                        title: computed.warnings.length
                          ? "Check light stress response"
                          : "Check canopy PPFD",
                        description: [
                          `Target about ${computed.requiredPpfd} umol/m2/s over ${photoperiodHours || "?"} hours.`,
                          ...computed.warnings,
                          "Verify with a meter and adjust fixture height or dimming gradually."
                        ].join("\n"),
                        priority: computed.warnings.length ? "high" : "medium",
                        dueDate: dueTomorrow(),
                        ...ppfdTaskMetadata(computed.warnings.length > 0)
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

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_ppfd"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
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
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#FFFFFF"
  }
});
