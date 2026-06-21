import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { analyzeDiagnosis, diagnoseImage } from "@/api/diagnose";
import { createPersonalLog } from "@/api/logs";
import { listPersonalPlants, type PersonalPlant } from "@/api/plants";
import { createPersonalTask } from "@/api/tasks";
import BackButton from "@/components/nav/BackButton";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import {
  normalizeDiagnosisResponse,
  type NormalizedDiagnosis
} from "@/features/personal/diagnosis/normalizeDiagnosis";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";

function param(value?: string | string[]) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";
}

export default function DiagnoseRoute() {
  const params = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = param(params.growId);
  const initialPlantId = param(params.plantId);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.DIAGNOSE_AI);

  const [plants, setPlants] = useState<PersonalPlant[]>([]);
  const [plantId, setPlantId] = useState(initialPlantId);
  const [stage, setStage] = useState("veg");
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState("");
  const [result, setResult] = useState<NormalizedDiagnosis | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [running, setRunning] = useState(false);
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

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback("Photo-library permission is required to select an image.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8
    });
    if (!picked.canceled && picked.assets[0]?.uri) setPhotoUri(picked.assets[0].uri);
  }

  async function runDiagnosis() {
    if (!enabled || running || (!notes.trim() && !photoUri)) return;
    setRunning(true);
    setFeedback("");
    try {
      const context = {
        notes: notes.trim(),
        stage,
        plantName: selectedPlant?.name,
        cultivar: selectedPlant?.cultivar || selectedPlant?.strain
      };
      const response = photoUri
        ? await diagnoseImage(photoUri, { growId, plantId, context })
        : await analyzeDiagnosis({ growId, plantId, ...context });
      setResult(normalizeDiagnosisResponse(response));
    } catch (error: any) {
      setFeedback(error?.message || "Unable to run diagnosis.");
    } finally {
      setRunning(false);
    }
  }

  async function saveLog() {
    if (!growId || !result) throw new Error("Select a grow before saving a diagnosis.");
    const created = await createPersonalLog({
      growId,
      plantId: plantId || undefined,
      diagnosisId: result.id || undefined,
      type: "diagnosis",
      date: new Date().toISOString(),
      title: result.issueSummary,
      notes: [
        result.explanation,
        result.evidence.length ? `Evidence: ${result.evidence.join("; ")}` : "",
        result.missingData.length ? `Missing data: ${result.missingData.join("; ")}` : ""
      ]
        .filter(Boolean)
        .join("\n"),
      tags: result.tags
    });
    if (!created) throw new Error("Unable to save diagnosis to the grow journal.");
    setFeedback("Diagnosis saved to grow journal.");
  }

  async function createTask() {
    if (!growId || !result) throw new Error("Select a grow before creating a task.");
    const action =
      result.actions[0] || result.followUp || "Recheck plant symptoms and measurements.";
    const created = await createPersonalTask({
      growId,
      title: `Follow up: ${result.issueSummary}`,
      description: action
    });
    if (!created) throw new Error("Unable to create follow-up task.");
    setFeedback("Follow-up task created.");
  }

  async function submitFollowUp() {
    if (!result || !followUpAnswer.trim() || running) return;
    setRunning(true);
    setFeedback("");
    try {
      const response = await analyzeDiagnosis({
        growId,
        plantId,
        notes,
        stage,
        priorDiagnosisId: result.id || undefined,
        followUpQuestion: result.followUp,
        followUpAnswer: followUpAnswer.trim()
      });
      setResult(normalizeDiagnosisResponse(response));
      setFollowUpAnswer("");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to submit follow-up context.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>Plant Issue Diagnosis</Text>
      <Text style={styles.subtitle}>
        Cautious triage based on the context you provide. Results are possibilities, not
        certainty.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      {plants.length ? (
        <View style={styles.section}>
          <Text style={styles.label}>Plant</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.pill, !plantId && styles.pillOn]}
              onPress={() => setPlantId("")}
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
                >
                  <Text style={[styles.pillText, plantId === id && styles.pillTextOn]}>
                    {plant.name || `Plant ${index + 1}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Text style={styles.label}>Stage</Text>
      <View style={styles.row}>
        {["seedling", "veg", "flower", "late_flower"].map((value) => (
          <Pressable
            key={value}
            style={[styles.pill, stage === value && styles.pillOn]}
            onPress={() => setStage(value)}
          >
            <Text style={[styles.pillText, stage === value && styles.pillTextOn]}>
              {value.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>What are you observing?</Text>
      <TextInput
        style={styles.notes}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Describe location, spread, recent watering/feed, pH/EC, and environmental changes."
      />

      <View style={styles.row}>
        <Pressable style={styles.secondaryButton} onPress={choosePhoto}>
          <Text style={styles.secondaryButtonText}>
            {photoUri ? "Change Photo" : "Add Photo"}
          </Text>
        </Pressable>
        {photoUri ? (
          <Pressable style={styles.secondaryButton} onPress={() => setPhotoUri("")}>
            <Text style={styles.secondaryButtonText}>Remove Photo</Text>
          </Pressable>
        ) : null}
      </View>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}

      {!enabled ? (
        <Text style={styles.locked}>
          Diagnosis is unavailable for the current plan or capability set.
        </Text>
      ) : null}
      <Pressable
        disabled={!enabled || running || (!notes.trim() && !photoUri)}
        style={[
          styles.primaryButton,
          (!enabled || running || (!notes.trim() && !photoUri)) && styles.disabled
        ]}
        onPress={runDiagnosis}
      >
        <Text style={styles.primaryButtonText}>
          {running ? "Analyzing..." : "Run Diagnosis"}
        </Text>
      </Pressable>

      {result ? (
        <>
          <ToolResultSurface
            title={result.issueSummary}
            status={result.source === "unverified" ? "UNVERIFIED SOURCE" : "ANALYSIS"}
            summary={result.explanation}
            metrics={[
              {
                key: "confidence",
                label: "Confidence",
                value: result.confidence.toUpperCase()
              },
              {
                key: "severity",
                label: "Severity",
                value: result.severity.toUpperCase()
              },
              { key: "source", label: "Source", value: result.source }
            ]}
            notices={[
              ...(result.source === "unverified"
                ? [
                    {
                      key: "source",
                      severity: "high" as const,
                      message:
                        "The response did not include analysis-provider provenance.",
                      remediation:
                        "Do not treat this result as confirmed; verify inputs and provider configuration."
                    }
                  ]
                : []),
              ...result.missingData.map((item, index) => ({
                key: `missing-${index}`,
                severity: "info" as const,
                message: `Missing context: ${item}`
              }))
            ]}
            recommendations={result.actions}
            assumptions={result.evidence.map((item) => `Observed evidence: ${item}`)}
            actions={
              growId
                ? [
                    { key: "save-log", label: "Save to Grow Log", onPress: saveLog },
                    {
                      key: "create-task",
                      label: "Create Follow-up Task",
                      variant: "secondary",
                      onPress: createTask
                    }
                  ]
                : []
            }
            feedback={feedback}
            contextMessage={
              !growId ? "Select a grow to enable log and task actions." : undefined
            }
          />
          {result.followUp ? (
            <View style={styles.followUpCard}>
              <Text style={styles.label}>Provider follow-up</Text>
              <Text style={styles.subtitle}>{result.followUp}</Text>
              <TextInput
                style={styles.notes}
                value={followUpAnswer}
                onChangeText={setFollowUpAnswer}
                multiline
                placeholder="Add the requested observation or measurement."
              />
              <Pressable
                disabled={!followUpAnswer.trim() || running}
                style={[
                  styles.primaryButton,
                  (!followUpAnswer.trim() || running) && styles.disabled
                ]}
                onPress={submitFollowUp}
              >
                <Text style={styles.primaryButtonText}>
                  {running ? "Submitting..." : "Refine Diagnosis"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : feedback ? (
        <Text style={styles.feedback}>{feedback}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: "#FFFFFF", gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  context: { color: "#166534", fontWeight: "700" },
  section: { gap: 7 },
  label: { color: "#334155", fontWeight: "800" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  pillOn: { backgroundColor: "#166534", borderColor: "#166534" },
  pillText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  pillTextOn: { color: "#FFFFFF" },
  notes: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    textAlignVertical: "top"
  },
  photo: { width: "100%", height: 240, borderRadius: 12, backgroundColor: "#E2E8F0" },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  locked: { color: "#9A3412", backgroundColor: "#FFF7ED", padding: 10, borderRadius: 9 },
  feedback: { color: "#334155", fontWeight: "700" },
  followUpCard: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: "#F8FAFC"
  }
});
