import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { listPersonalPlants, type PersonalPlant } from "@/api/plants";
import {
  createTaskFromToolRun,
  runCalculator,
  saveToolRunToLog,
  type ToolRun
} from "@/api/toolRuns";
import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import ToolResultSurface, {
  type ToolResultAction
} from "@/features/personal/tools/ToolResultSurface";
import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { calcVpdFromTemp, type TempUnit } from "@/tools/vpd";

type VpdModel =
  | { valid: false; vpd: null; tempC: null }
  | { valid: true; vpd: number; tempC: number };

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

export default function VpdToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = coerceParam(rawGrowId);
  const initialPlantId = coerceParam(rawPlantId);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOLS_VPD);

  const [plants, setPlants] = useState<PersonalPlant[]>([]);
  const [plantId, setPlantId] = useState(initialPlantId);
  const [unit, setUnit] = useState<TempUnit>("F");
  const [tempText, setTempText] = useState("77");
  const [rhText, setRhText] = useState("60");
  const [leafOffsetText, setLeafOffsetText] = useState("-2");
  const [stage, setStage] = useState("veg");
  const [serverResult, setServerResult] = useState<any>(null);
  const [serverRun, setServerRun] = useState<ToolRun | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!growId) {
      setPlants([]);
      return;
    }
    listPersonalPlants({ growId })
      .then(setPlants)
      .catch(() => setPlants([]));
  }, [growId]);

  const selectedPlant = useMemo(
    () => plants.find((plant) => String(plant.id || (plant as any)._id) === plantId),
    [plantId, plants]
  );

  function selectedPlantContext() {
    if (!selectedPlant) return null;
    return {
      id: String(selectedPlant.id || (selectedPlant as any)._id || ""),
      name: selectedPlant.name || "",
      cropCommonName: selectedPlant.cropCommonName || "",
      scientificName: selectedPlant.scientificName || "",
      cultivarOrStrain: selectedPlant.cultivar || selectedPlant.strain || "",
      cropProfileId: selectedPlant.cropProfileId || null,
      stage: selectedPlant.stage || selectedPlant.status || "",
      medium: selectedPlant.medium || "",
      growthProfile: selectedPlant.growthProfile || null
    };
  }

  const model = useMemo<VpdModel>(() => {
    const temperature = Number(tempText);
    const rh = Number(rhText);
    if (!Number.isFinite(temperature) || !Number.isFinite(rh) || rh < 0 || rh > 100) {
      return { valid: false, vpd: null, tempC: null };
    }
    const result = calcVpdFromTemp(temperature, unit, rh);
    return { valid: true, vpd: result.vpdKpa, tempC: result.tempC };
  }, [tempText, rhText, unit]);

  const actions: ToolResultAction[] = [];
  if (model.valid) {
    actions.push({
      key: "calculate",
      label: "Calculate and Save",
      pendingLabel: "Calculating...",
      onPress: async () => {
        setFeedback("");
        const plantContext = selectedPlantContext();
        const response = await runCalculator<any>("vpd", {
          growId: growId || undefined,
          plantId: plantId || undefined,
          cropProfileId: selectedPlant?.cropProfileId || undefined,
          cropIdentity: plantContext || undefined,
          selectedPlantContext: plantContext || undefined,
          plantGrowthProfile: selectedPlant?.growthProfile || undefined,
          airTemp: Number(tempText),
          tempUnit: unit,
          rh: Number(rhText),
          leafTempOffsetC: Number(leafOffsetText),
          stage
        });
        setServerRun(response.toolRun);
        setServerResult(response.outputs);
        setFeedback("Calculated and saved.");
      }
    });
  }
  if (serverRun?._id && growId) {
    actions.push(
      {
        key: "save-log",
        label: "Save to Grow Log",
        variant: "secondary",
        onPress: async () => {
          await saveToolRunToLog(serverRun._id!);
          setFeedback("Saved to grow journal.");
        }
      },
      {
        key: "create-task",
        label: "Create Task",
        variant: "secondary",
        onPress: async () => {
          await createTaskFromToolRun(serverRun._id!);
          setFeedback("Follow-up task created.");
        }
      }
    );
  }
  if (model.valid && growId) {
    actions.push({
      key: "open-journal",
      label: "Open Journal Entry",
      pendingLabel: "Opening...",
      onPress: async () => {
        const plantContext = selectedPlantContext();
        const result = await saveToolRunAndOpenJournal({
          router,
          growId,
          plantId: plantId || undefined,
          cropProfileId: selectedPlant?.cropProfileId || undefined,
          cropIdentity: plantContext || undefined,
          selectedPlantContext: plantContext || undefined,
          plantGrowthProfile: selectedPlant?.growthProfile || undefined,
          toolKey: "vpd",
          toolRunId: serverRun?._id,
          input: { temp: Number(tempText), unit, rh: Number(rhText) },
          output: serverResult || { vpdKpa: model.vpd, tempC: model.tempC }
        });
        if (!result.ok) throw new Error(result.error);
      }
    });
  }

  if (!enabled) {
    return (
      <View style={styles.container}>
        <BackButton />
        <Text style={styles.title}>VPD Calculator</Text>
        <View style={styles.lockedCard}>
          <Text style={styles.lockedTitle}>Tool unavailable</Text>
          <Text style={styles.subtitle}>This account does not have `TOOLS_VPD`.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>VPD Calculator</Text>
      <Text style={styles.subtitle}>
        Enter temperature ({unit === "F" ? "°F" : "°C"}) and RH (%).
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      {plants.length ? (
        <View style={styles.section}>
          <Text style={styles.label}>Plant context</Text>
          <Text style={styles.subtitle}>
            Tool runs are saved with the selected plant, crop, cultivar, size, pheno, and
            timing context when available.
          </Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.pill, !plantId && styles.pillOn]}
              onPress={() => setPlantId("")}
              accessibilityRole="button"
              accessibilityLabel="Run VPD for whole grow"
            >
              <Text style={[styles.pillText, !plantId && styles.pillTextOn]}>
                Whole grow
              </Text>
            </Pressable>
            {plants.map((plant, index) => {
              const id = String(plant.id || (plant as any)._id || `plant-${index}`);
              return (
                <Pressable
                  key={id}
                  style={[styles.pill, plantId === id && styles.pillOn]}
                  onPress={() => setPlantId(id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Run VPD for ${plant.name || `Plant ${index + 1}`}`}
                >
                  <Text style={[styles.pillText, plantId === id && styles.pillTextOn]}>
                    {plant.name || `Plant ${index + 1}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedPlant ? (
            <Text style={styles.context}>
              {[
                selectedPlant.cropCommonName || selectedPlant.scientificName,
                selectedPlant.cultivar || selectedPlant.strain,
                selectedPlant.growthProfile?.phenoLabel
                  ? `pheno: ${selectedPlant.growthProfile.phenoLabel}`
                  : ""
              ]
                .filter(Boolean)
                .join(" | ")}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.row}>
        {(["F", "C"] as TempUnit[]).map((value) => (
          <Pressable
            key={value}
            style={[styles.pill, unit === value && styles.pillOn]}
            onPress={() => setUnit(value)}
            accessibilityRole="button"
            accessibilityLabel={`Use ${value} temperature unit`}
          >
            <Text style={[styles.pillText, unit === value && styles.pillTextOn]}>
              °{value}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Temperature (°{unit})</Text>
      <TextInput
        accessibilityLabel="VPD temperature"
        style={styles.input}
        value={tempText}
        onChangeText={setTempText}
        keyboardType="numeric"
        placeholder={unit === "F" ? "e.g. 77" : "e.g. 25"}
      />
      <Text style={styles.label}>Relative humidity (%)</Text>
      <TextInput
        accessibilityLabel="VPD relative humidity"
        style={styles.input}
        value={rhText}
        onChangeText={setRhText}
        keyboardType="numeric"
        placeholder="e.g. 60"
      />
      <Text style={styles.label}>Leaf temperature offset (°C)</Text>
      <TextInput
        accessibilityLabel="VPD leaf temperature offset"
        style={styles.input}
        value={leafOffsetText}
        onChangeText={setLeafOffsetText}
        keyboardType="numeric"
        placeholder="e.g. -2"
      />

      <Text style={styles.label}>Growth stage</Text>
      <View style={styles.row}>
        {["seedling", "veg", "flower", "late_flower"].map((value) => (
          <Pressable
            key={value}
            style={[styles.pill, stage === value && styles.pillOn]}
            onPress={() => setStage(value)}
            accessibilityRole="button"
            accessibilityLabel={`Set VPD growth stage to ${value.replace("_", " ")}`}
          >
            <Text style={[styles.pillText, stage === value && styles.pillTextOn]}>
              {value.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      <ToolResultSurface
        title="VPD result"
        status={
          serverResult?.status?.toUpperCase() ||
          (model.valid ? "LOCAL PREVIEW" : "NEEDS INPUT")
        }
        summary={
          model.valid
            ? serverResult
              ? `Target ${serverResult.target.min}-${serverResult.target.max} kPa at leaf temperature ${serverResult.leafTempC} °C.`
              : "Run the server calculation to apply the selected stage target and save an immutable result."
            : "Enter valid temperature and humidity values. RH must be between 0 and 100%."
        }
        metrics={[
          {
            key: "vpd",
            label: "VPD",
            value: model.valid
              ? `${(serverResult?.vpdKpa ?? model.vpd).toFixed(2)} kPa`
              : "—"
          },
          {
            key: "air-temperature",
            label: "Air temperature",
            value: model.valid ? `${model.tempC.toFixed(1)} °C` : "—"
          }
        ]}
        inputs={
          serverRun?.inputs || {
            airTemp: Number(tempText),
            tempUnit: unit,
            rh: Number(rhText),
            leafTempOffsetC: Number(leafOffsetText),
            stage
          }
        }
        outputs={serverRun?.outputs || serverResult || undefined}
        notices={
          serverResult?.status && serverResult.status !== "in_range"
            ? [
                {
                  key: "target-status",
                  severity: "medium",
                  message: `VPD is ${String(serverResult.status).replaceAll("_", " ")} for the selected stage.`,
                  remediation:
                    "Confirm leaf temperature and adjust temperature or RH gradually."
                }
              ]
            : []
        }
        recommendations={serverResult?.recommendations || []}
        formulas={
          serverRun?.formulas?.length
            ? serverRun.formulas
            : [
                "VPD uses saturation vapor pressure, air temperature, relative humidity, and leaf temperature offset."
              ]
        }
        uncertainty={
          serverRun?.uncertainty ||
          "Sensor placement, leaf temperature, and stage target ranges can shift the final recommendation."
        }
        confidence={
          serverRun?.confidence || (serverResult ? "server-calculated" : "local-preview")
        }
        assumptions={[
          "The local preview uses air temperature; the server result applies leaf-temperature offset and stage targets.",
          "Verify sensor placement and calibration before changing environmental controls."
        ]}
        actions={actions}
        feedback={feedback}
        contextMessage={
          !growId
            ? "Select a grow context to enable journal and task actions."
            : undefined
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 120, backgroundColor: "#FFFFFF", gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 4 },
  context: { color: "#166534", fontWeight: "700" },
  section: { gap: 7 },
  row: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  pillOn: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  pillText: { fontWeight: "800" },
  pillTextOn: { color: "#FFFFFF" },
  label: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12
  },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#F8FAFC"
  },
  lockedTitle: { fontWeight: "800", color: "#0F172A" }
});
