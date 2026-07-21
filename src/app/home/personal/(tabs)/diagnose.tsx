import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  analyzeDiagnosis,
  diagnoseEvidence,
  getDiagnosisProviderStatus,
  submitDiagnosisFeedback
} from "@/api/diagnose";
import { createPersonalLog } from "@/api/logs";
import { listPersonalPlants, type PersonalPlant } from "@/api/plants";
import { listPersonalGrows, type PersonalGrow } from "@/api/grows";
import { createPersonalTask } from "@/api/tasks";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import SavedGrowPhotoEvidencePicker from "@/components/media/SavedGrowPhotoEvidencePicker";
import ContextualWorkflowLinks from "@/components/personal/ContextualWorkflowLinks";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import { diagnosisCropContextState } from "@/features/personal/diagnosis/diagnosisCropContext";
import {
  normalizeDiagnosisResponse,
  type NormalizedDiagnosis
} from "@/features/personal/diagnosis/normalizeDiagnosis";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import type { EvidenceAsset } from "@/types/evidence";
import { providerEvidencePayload } from "@/api/evidence";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";

function param(value?: string | string[]) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function rejectedDiagnosisTags(result: NormalizedDiagnosis, acceptedTags: string[]) {
  const accepted = new Set(acceptedTags);
  return result.tags.filter((tag) => !accepted.has(tag));
}

function diagnosisFollowUpDays(result: NormalizedDiagnosis) {
  if (result.severity === "high" || result.urgency.toLowerCase().includes("urgent")) {
    return 1;
  }
  if (result.severity === "medium") return 3;
  return 7;
}

function diagnosisTaskMetadata(result: NormalizedDiagnosis) {
  const urgent =
    result.severity === "high" || result.urgency.toLowerCase().includes("urgent");
  return {
    allDay: true,
    calendarType: "ai_diagnosis_followup",
    sourceStage: urgent ? "urgent_diagnosis_recheck" : "diagnosis_recheck",
    reminderPlan: { label: "12 hours before", channels: ["in_app"] }
  };
}

function diagnosisTaskDescription(result: NormalizedDiagnosis, acceptedTags: string[]) {
  const action =
    result.actions[0] || result.followUp || "Recheck plant symptoms and measurements.";
  return [
    action,
    result.followUp ? `Provider follow-up: ${result.followUp}` : "",
    result.missingData.length ? `Next checks: ${result.missingData.join("; ")}` : "",
    result.evidence.length ? `Evidence to compare: ${result.evidence.join("; ")}` : "",
    acceptedTags.length ? `Accepted tags: ${acceptedTags.join(", ")}` : "",
    rejectedDiagnosisTags(result, acceptedTags).length
      ? `Rejected tags: ${rejectedDiagnosisTags(result, acceptedTags).join(", ")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function providerResultSummary(providerResult: unknown): string[] {
  if (!providerResult || typeof providerResult !== "object") return [];
  const data = providerResult as Record<string, any>;
  const lines: string[] = [];
  if (data.overallHealth) lines.push(`Overall health: ${data.overallHealth}`);
  if (data.diagnosisClass) lines.push(`Diagnosis class: ${data.diagnosisClass}`);
  if (data.urgency) lines.push(`Urgency: ${data.urgency}`);
  if (data.cropIdentity?.commonName) {
    lines.push(
      `Draft crop identity: ${data.cropIdentity.commonName}${
        data.cropIdentity.scientificName ? ` (${data.cropIdentity.scientificName})` : ""
      }${data.cropIdentity.confidence ? `, ${data.cropIdentity.confidence} confidence` : ""}`
    );
  }
  if (data.imageAnalysis?.performed) {
    lines.push(
      data.imageAnalysis.usableForTriage === false
        ? "Photo review: inspected, but not usable for triage"
        : `Photo review: ${data.imageAnalysis.photoCount || 1} inspected and usable for cautious triage`
    );
  }
  if (Array.isArray(data.likelyIssues)) {
    data.likelyIssues.slice(0, 3).forEach((issue: any, index: number) => {
      const confidence =
        issue?.confidence != null
          ? ` (${Math.round(Number(issue.confidence) * 100)}%)`
          : "";
      lines.push(
        `Issue ${index + 1}: ${[issue?.issue, issue?.category, issue?.nutrient]
          .filter(Boolean)
          .join(" / ")}${confidence}`
      );
    });
  }
  const recommendations = Array.isArray(data.recommendations)
    ? data.recommendations
    : Array.isArray(data.actions)
      ? data.actions
      : [];
  recommendations.slice(0, 3).forEach((item: any, index: number) => {
    lines.push(`Provider recommendation ${index + 1}: ${String(item)}`);
  });
  if (!lines.length) {
    Object.entries(data)
      .slice(0, 5)
      .forEach(([key, value]) => {
        if (value == null || typeof value === "object") return;
        lines.push(`${key}: ${String(value)}`);
      });
  }
  return lines;
}

type DiagnosisProviderStatus = {
  providerName?: string;
  providerModel?: string;
  configured?: boolean;
  imageSupport?: boolean;
  credentialsSource?: string;
  mode?: string;
};

export default function DiagnoseRoute({
  workspaceType = "personal",
  facilityId = ""
}: {
  workspaceType?: "personal" | "commercial" | "facility";
  facilityId?: string;
} = {}) {
  const params = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const routeGrowId = param(params.growId);
  const initialPlantId = param(params.plantId);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.DIAGNOSE_AI);

  const [grows, setGrows] = useState<PersonalGrow[]>([]);
  const [growId, setGrowId] = useState(routeGrowId);
  const [plants, setPlants] = useState<PersonalPlant[]>([]);
  const [plantId, setPlantId] = useState(initialPlantId);
  const [cropCommonName, setCropCommonName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [cultivarOrStrain, setCultivarOrStrain] = useState("");
  const [stage, setStage] = useState("unknown");
  const [patternLocation, setPatternLocation] = useState("unknown");
  const [progression, setProgression] = useState("unknown");
  const [rootMoisture, setRootMoisture] = useState("unknown");
  const [rootConcern, setRootConcern] = useState("");
  const [temp, setTemp] = useState("");
  const [tempUnit, setTempUnit] = useState<"F" | "C">("F");
  const [rh, setRh] = useState("");
  const [vpd, setVpd] = useState("");
  const [feedEC, setFeedEC] = useState("");
  const [runoffEC, setRunoffEC] = useState("");
  const [feedPH, setFeedPH] = useState("");
  const [runoffPH, setRunoffPH] = useState("");
  const [notes, setNotes] = useState("");
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  const [result, setResult] = useState<NormalizedDiagnosis | null>(null);
  const [acceptedTags, setAcceptedTags] = useState<string[]>([]);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [providerStatus, setProviderStatus] = useState<DiagnosisProviderStatus | null>(
    null
  );
  const [providerStatusError, setProviderStatusError] = useState("");

  useEffect(() => {
    if (workspaceType !== "personal") return;
    let mounted = true;
    listPersonalGrows()
      .then((rows) => {
        if (!mounted) return;
        setGrows(rows);
        if (!routeGrowId && rows.length) {
          const active = [...rows]
            .filter((grow) => grow.status !== "harvested")
            .sort(
              (a, b) =>
                new Date(b.updatedAt || 0).getTime() -
                new Date(a.updatedAt || 0).getTime()
            )[0];
          const fallback = active || rows[0];
          setGrowId(
            (current) => current || String(fallback.id || (fallback as any)._id || "")
          );
        }
      })
      .catch(() => {
        if (mounted) setGrows([]);
      });
    return () => {
      mounted = false;
    };
  }, [routeGrowId, workspaceType]);

  useEffect(() => {
    if (!growId) {
      setPlants([]);
      return;
    }
    const request =
      workspaceType === "facility" && facilityId
        ? apiRequest(
            `${endpoints.plants(facilityId)}?growId=${encodeURIComponent(growId)}`
          ).then((response: any) => {
            const rows =
              response?.plants || response?.items || response?.data || response;
            return Array.isArray(rows) ? rows : [];
          })
        : listPersonalPlants({ growId });
    request
      .then(async (rows) => {
        if (rows.length || workspaceType !== "personal") return rows;
        const allPlants = await listPersonalPlants();
        return allPlants.filter((plant) => String(plant.growId || "") === growId);
      })
      .then(setPlants)
      .catch(() => setPlants([]));
  }, [facilityId, growId, workspaceType]);

  useEffect(() => {
    if (!enabled) {
      setProviderStatus(null);
      setProviderStatusError("");
      return;
    }
    let mounted = true;
    getDiagnosisProviderStatus()
      .then((response: any) => {
        if (!mounted) return;
        setProviderStatus(response?.provider || response || null);
        setProviderStatusError("");
      })
      .catch(() => {
        if (!mounted) return;
        setProviderStatus(null);
        setProviderStatusError("Unable to verify diagnosis provider readiness.");
      });
    return () => {
      mounted = false;
    };
  }, [enabled]);

  const selectedPlant = useMemo(
    () => plants.find((plant) => String(plant.id || (plant as any)._id) === plantId),
    [plantId, plants]
  );

  const selectedGrow = useMemo(
    () => grows.find((grow) => String(grow.id || (grow as any)._id) === growId),
    [growId, grows]
  );

  useEffect(() => {
    if (!selectedGrow || selectedPlant) return;
    setCropCommonName(selectedGrow.cropCommonName || selectedGrow.cropTypes?.[0] || "");
    setScientificName(selectedGrow.scientificName || "");
    setCultivarOrStrain(selectedGrow.cultivar || selectedGrow.strain || "");
  }, [selectedGrow, selectedPlant]);

  useEffect(() => {
    if (!selectedPlant) return;
    if (selectedPlant.cropCommonName) setCropCommonName(selectedPlant.cropCommonName);
    if (selectedPlant.scientificName) setScientificName(selectedPlant.scientificName);
    setCultivarOrStrain(selectedPlant.cultivar || selectedPlant.strain || "");
  }, [selectedPlant]);

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

  function currentDiagnosisContext() {
    return {
      notes: notes.trim(),
      stage,
      cropCommonName: cropCommonName.trim(),
      scientificName: scientificName.trim(),
      cultivarOrStrain: cultivarOrStrain.trim(),
      plantName: selectedPlant?.name,
      selectedPlantContext: selectedPlantContext(),
      cropProfileId: selectedPlant?.cropProfileId || undefined,
      plantGrowthProfile: selectedPlant?.growthProfile || undefined,
      cultivar:
        cultivarOrStrain.trim() || selectedPlant?.cultivar || selectedPlant?.strain,
      pattern: {
        location: patternLocation,
        progression,
        notes: notes.trim()
      },
      rootZone: {
        moisture: rootMoisture,
        concern: rootConcern.trim()
      },
      environment: {
        temp: temp.trim(),
        tempUnit,
        rh: rh.trim(),
        vpd: vpd.trim()
      },
      numbers: {
        feedEC: feedEC.trim(),
        runoffEC: runoffEC.trim(),
        feedPH: feedPH.trim(),
        runoffPH: runoffPH.trim()
      },
      workspaceType,
      facilityId: facilityId || undefined
    };
  }

  async function runDiagnosis() {
    const evidence = providerEvidencePayload(evidenceAssets);
    const canAnalyzeAttachedPhotos =
      providerStatus?.configured === true && providerStatus?.imageSupport === true;
    if (
      !enabled ||
      running ||
      (!notes.trim() && (!evidence.images.length || !canAnalyzeAttachedPhotos))
    )
      return;
    setRunning(true);
    setFeedback("");
    try {
      const context = currentDiagnosisContext();
      const response = evidence.images.length
        ? await diagnoseEvidence({
            growId,
            plantId,
            context,
            photoUrls: evidence.images,
            evidenceAssetIds: evidence.evidenceAssetIds
          })
        : await analyzeDiagnosis({ growId, plantId, ...context });
      const normalized = normalizeDiagnosisResponse(response);
      setResult(normalized);
      setAcceptedTags(normalized.tags);
    } catch (error: any) {
      setFeedback(error?.message || "Unable to run diagnosis.");
    } finally {
      setRunning(false);
    }
  }

  async function saveLog() {
    if (!growId || !result) throw new Error("Select a grow before saving a diagnosis.");
    const rejectedTags = rejectedDiagnosisTags(result, acceptedTags);
    const payload = {
      growId,
      plantId: plantId || undefined,
      diagnosisId: result.id || undefined,
      type: "diagnosis",
      date: new Date().toISOString(),
      title: result.issueSummary,
      notes: [
        result.explanation,
        result.patternSummary ? `Pattern: ${result.patternSummary}` : "",
        result.rootZoneSummary ? `Root zone: ${result.rootZoneSummary}` : "",
        result.environmentSummary ? `Environment: ${result.environmentSummary}` : "",
        result.numberSummary ? `Numbers: ${result.numberSummary}` : "",
        result.evidence.length ? `Evidence: ${result.evidence.join("; ")}` : "",
        result.counterEvidence.length
          ? `Counter-evidence: ${result.counterEvidence.join("; ")}`
          : "",
        result.missingData.length ? `Missing data: ${result.missingData.join("; ")}` : ""
      ]
        .filter(Boolean)
        .join("\n"),
      tags: acceptedTags,
      rejectedTags,
      aiInsight: {
        summary: result.issueSummary,
        source: "ai_diagnosis",
        missingData: result.missingData,
        suggestedTask:
          result.actions[0] ||
          result.followUp ||
          "Recheck plant symptoms and measurements.",
        acceptedTags,
        rejectedTags
      }
    };
    const created =
      workspaceType === "facility" && facilityId
        ? await apiRequest(endpoints.growlogs(facilityId), {
            method: "POST",
            body: payload
          })
        : await createPersonalLog(payload);
    if (!created) throw new Error("Unable to save diagnosis to the grow journal.");
    setFeedback("Diagnosis saved to grow journal.");
  }

  async function createTask() {
    if (!growId || !result) throw new Error("Select a grow before creating a task.");
    const followUpDays = diagnosisFollowUpDays(result);
    const priority: "high" | "medium" = result.severity === "high" ? "high" : "medium";
    const payload = {
      growId,
      plantId: plantId || undefined,
      linkedGrowId: growId,
      title: `Follow up: ${result.issueSummary}`,
      description: diagnosisTaskDescription(result, acceptedTags),
      dueDate: addDaysIso(followUpDays),
      priority,
      sourceType: "ai_diagnosis",
      sourceObjectId: result.id || undefined,
      sourceDiagnosisId: result.id || undefined,
      ...diagnosisTaskMetadata(result)
    };
    const created =
      workspaceType === "facility" && facilityId
        ? await apiRequest(endpoints.tasks(facilityId), {
            method: "POST",
            body: payload
          })
        : await createPersonalTask(payload);
    if (!created) throw new Error("Unable to create follow-up task.");
    setFeedback("Follow-up task created.");
  }

  async function submitFollowUp() {
    if (!result || !followUpAnswer.trim() || running) return;
    setRunning(true);
    setFeedback("");
    try {
      const evidence = providerEvidencePayload(evidenceAssets);
      const followUpContext = {
        ...currentDiagnosisContext(),
        priorDiagnosisId: result.id || undefined,
        priorCropIdentity: result.cropIdentity || undefined,
        followUpQuestion: result.followUp,
        followUpAnswer: followUpAnswer.trim()
      };
      const response = evidence.images.length
        ? await diagnoseEvidence({
            growId,
            plantId,
            context: followUpContext,
            photoUrls: evidence.images,
            evidenceAssetIds: evidence.evidenceAssetIds
          })
        : await analyzeDiagnosis({ growId, plantId, ...followUpContext });
      const normalized = normalizeDiagnosisResponse(response);
      setResult(normalized);
      setAcceptedTags(normalized.tags);
      setFollowUpAnswer("");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to submit follow-up context.");
    } finally {
      setRunning(false);
    }
  }

  async function submitOutcomeFeedback(verdict: "helpful" | "not_accurate" | "unsure") {
    if (!result?.id || outcomeSaving) return;
    setOutcomeSaving(true);
    setFeedback("");
    try {
      await submitDiagnosisFeedback(result.id, {
        verdict,
        notes: outcomeNotes.trim(),
        symptomChange: "unknown",
        consentForModelTraining: false
      });
      setOutcomeNotes("");
      setFeedback("Diagnosis feedback saved.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to save diagnosis feedback.");
    } finally {
      setOutcomeSaving(false);
    }
  }

  const cropProfileNotice = result
    ? result.cropIdentity?.ambiguous
      ? {
          key: "crop-identity-ambiguous",
          severity: "high" as const,
          message:
            result.cropIdentity.clarificationPrompt || "Crop identity is ambiguous.",
          remediation:
            "Confirm the crop species before applying crop-specific diagnosis, nutrient, or IPM recommendations."
        }
      : result.cropIdentity?.requiresUserConfirmation
        ? {
            key: "crop-identity-confirmation",
            severity: "medium" as const,
            message: `Draft crop identity: ${
              result.cropIdentity.commonName || "not identified"
            }${
              result.cropIdentity.confidence
                ? ` (${result.cropIdentity.confidence} confidence)`
                : ""
            }. This has not been confirmed by the user.`,
            remediation:
              result.cropIdentity.clarificationPrompt ||
              "Confirm or correct the crop species before applying crop-specific guidance."
          }
        : result.cropIdentity?.cropProfileMatched
          ? {
              key: "crop-profile-match",
              severity:
                result.cropIdentity.cropProfileCurationStatus === "reviewed"
                  ? ("info" as const)
                  : ("medium" as const),
              message: `Matched crop profile: ${
                result.cropProfileSnapshot?.displayName ||
                result.cropIdentity.commonName ||
                "crop profile"
              }`,
              remediation:
                result.cropIdentity.cropProfileCurationStatus === "reviewed"
                  ? "Crop-specific defaults are linked to reviewed profile data."
                  : "Profile is stored but still needs license/review confirmation before being treated as verified guidance."
            }
          : {
              key: "crop-profile-missing",
              severity: "info" as const,
              message: "No reviewed crop profile matched this diagnosis.",
              remediation:
                "Use the diagnosis as cautious triage; crop-specific defaults may need confirmation or curation."
            }
    : null;

  const diagnosisCropContext = diagnosisCropContextState(
    selectedPlantContext(),
    cropCommonName
  );
  const diagnosisEvidence = providerEvidencePayload(evidenceAssets);
  const photoAnalysisReady =
    providerStatus?.configured === true && providerStatus?.imageSupport === true;
  const measuredValueCount = [temp, rh, vpd, feedEC, runoffEC, feedPH, runoffPH].filter(
    (value) => value.trim()
  ).length;
  const photoOnlyBlocked =
    Boolean(diagnosisEvidence.images.length) && !notes.trim() && !photoAnalysisReady;
  const runDisabled =
    !enabled ||
    running ||
    (!notes.trim() && (!diagnosisEvidence.images.length || !photoAnalysisReady));
  const diagnosisReady = enabled && !running && !runDisabled;
  const missingStructuredContext = [
    stage === "unknown" ? "stage" : "",
    patternLocation === "unknown" ? "pattern location" : ""
  ].filter(Boolean);
  const readinessMessage = !enabled
    ? "This account cannot run AI diagnosis."
    : running
      ? "Diagnosis is analyzing the submitted evidence."
      : !notes.trim() && !diagnosisEvidence.images.length
        ? "Add written symptom notes or at least one uploaded photo to run diagnosis."
        : photoOnlyBlocked
          ? "The current provider cannot inspect attached photos. Add written symptom notes to run cautious text triage."
          : `Ready with ${notes.trim() ? "written symptoms" : "photo evidence"}${
              diagnosisEvidence.images.length
                ? `, ${diagnosisEvidence.images.length} uploaded photo${diagnosisEvidence.images.length === 1 ? "" : "s"}`
                : ""
            }. ${
              missingStructuredContext.length
                ? `${missingStructuredContext.join(" and ")} ${
                    missingStructuredContext.length === 1 ? "is" : "are"
                  } still unknown; select ${
                    missingStructuredContext.length === 1 ? "it" : "them"
                  } when possible.`
                : `Stage is ${stage.replace("_", " ")} and pattern location is ${patternLocation}.`
            } ${
              progression === "unknown"
                ? "Progression is still unknown; select it when possible."
                : `Progression is ${progression}.`
            }${
              measuredValueCount
                ? ` ${measuredValueCount} measured value${measuredValueCount === 1 ? " is" : "s are"} included.`
                : " Add environment or pH/EC measurements when available to improve discrimination."
            }`;

  function toggleAcceptedTag(tag: string) {
    setAcceptedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : Array.from(new Set([...current, tag]))
    );
  }

  return (
    <ScreenBoundary
      title="Plant Issue Diagnosis"
      showBack
      backFallbackHref="/home/personal"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>
          Plant Issue Diagnosis
        </Text>
        <Text style={styles.subtitle}>
          Cautious triage based on the context you provide. Results are possibilities, not
          certainty.
        </Text>
        <PersonalFeedPlacement placement="top" routeKey="personal_diagnose" longContent />
        {grows.length ? (
          <View style={styles.section}>
            <Text style={styles.label}>Grow</Text>
            <View style={styles.row}>
              {grows.map((grow, index) => {
                const id = String(grow.id || (grow as any)._id || "");
                if (!id) return null;
                const selected = growId === id;
                return (
                  <Pressable
                    key={id}
                    style={[styles.pill, selected && styles.pillOn]}
                    onPress={() => {
                      setGrowId(id);
                      setPlantId("");
                      setResult(null);
                      setFeedback("");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select diagnosis grow ${grow.name || index + 1}`}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextOn]}>
                      {grow.name || `Grow ${index + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : !growId && workspaceType === "personal" ? (
          <Text style={styles.feedback}>
            Create a grow first to connect diagnosis results, logs, plants, and follow-up
            tasks.
          </Text>
        ) : null}
        {growId ? (
          <Text style={styles.context}>Grow context: {selectedGrow?.name || growId}</Text>
        ) : null}
        {String(cropCommonName).toLowerCase().includes("cannabis") ? (
          <ContextualWorkflowLinks
            title="Harvest / maturity mode"
            helper="Open the existing Harvest Readiness workflow with this grow and plant selected."
            source="plant_diagnosis"
            growId={growId}
            plantId={plantId}
            workflows={["harvest-readiness"]}
          />
        ) : null}

        {plants.length ? (
          <View style={styles.section}>
            <Text style={styles.label}>Plant</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.pill, !plantId && styles.pillOn]}
                onPress={() => setPlantId("")}
                accessibilityRole="button"
                accessibilityLabel="Diagnose whole grow"
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
                    accessibilityLabel={`Diagnose plant ${plant.name || `Plant ${index + 1}`}`}
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
        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_diagnose"
          longContent
        />

        <View style={styles.section}>
          <Text style={styles.label}>Crop identity</Text>
          <Text style={styles.subtitle}>
            Species/crop and cultivar are separate. Example: blueberry bush is not the
            same as Blueberry Muffin HSC.
          </Text>
          <View style={styles.grid}>
            <TextInput
              style={styles.gridInput}
              value={cropCommonName}
              onChangeText={setCropCommonName}
              placeholder="Crop: Cannabis, blueberry, olive..."
              accessibilityLabel="Diagnosis crop common name"
            />
            <TextInput
              style={styles.gridInput}
              value={scientificName}
              onChangeText={setScientificName}
              placeholder="Scientific name optional"
              accessibilityLabel="Diagnosis scientific name"
            />
            <TextInput
              style={styles.gridInput}
              value={cultivarOrStrain}
              onChangeText={setCultivarOrStrain}
              placeholder="Cultivar / strain"
              accessibilityLabel="Diagnosis cultivar or strain"
            />
          </View>
          <View
            style={[
              styles.cropContextPanel,
              diagnosisCropContext.status === "confirmed"
                ? styles.cropContextReady
                : styles.cropContextNeedsReview
            ]}
          >
            <Text style={styles.cropContextTitle}>{diagnosisCropContext.title}</Text>
            <Text style={styles.cropContextText}>{diagnosisCropContext.message}</Text>
            {diagnosisCropContext.details.map((detail) => (
              <Text key={detail} style={styles.cropContextText}>
                - {detail}
              </Text>
            ))}
          </View>
        </View>

        <Text style={styles.label}>Stage</Text>
        <View style={styles.row}>
          {["unknown", "seedling", "veg", "flower", "late_flower"].map((value) => (
            <Pressable
              key={value}
              style={[styles.pill, stage === value && styles.pillOn]}
              onPress={() => setStage(value)}
              accessibilityRole="button"
              accessibilityLabel={`Diagnosis stage ${value.replace("_", " ")}`}
              accessibilityState={{ selected: stage === value }}
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
          accessibilityLabel="Diagnosis notes"
        />

        <View style={styles.section}>
          <Text style={styles.label}>Pattern location</Text>
          <View style={styles.row}>
            {[
              "unknown",
              "lower old leaves",
              "upper new growth",
              "middle",
              "whole plant",
              "random damage"
            ].map((value) => (
              <Pressable
                key={value}
                style={[styles.pill, patternLocation === value && styles.pillOn]}
                onPress={() => setPatternLocation(value)}
                accessibilityRole="button"
                accessibilityLabel={`Diagnosis pattern ${value}`}
                accessibilityState={{ selected: patternLocation === value }}
              >
                <Text
                  style={[
                    styles.pillText,
                    patternLocation === value && styles.pillTextOn
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Progression</Text>
          <Text style={styles.subtitle}>
            How has the symptom changed since you first noticed it?
          </Text>
          <View style={styles.row}>
            {[
              "unknown",
              "new today",
              "stable",
              "spreading slowly",
              "spreading quickly"
            ].map((value) => (
              <Pressable
                key={value}
                style={[styles.pill, progression === value && styles.pillOn]}
                onPress={() => setProgression(value)}
                accessibilityRole="button"
                accessibilityLabel={`Diagnosis progression ${value}`}
              >
                <Text
                  style={[styles.pillText, progression === value && styles.pillTextOn]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Root zone</Text>
          <View style={styles.row}>
            {["unknown", "too wet", "too dry", "compacted", "cold roots"].map((value) => (
              <Pressable
                key={value}
                style={[styles.pill, rootMoisture === value && styles.pillOn]}
                onPress={() => setRootMoisture(value)}
                accessibilityRole="button"
                accessibilityLabel={`Diagnosis root zone ${value}`}
              >
                <Text
                  style={[styles.pillText, rootMoisture === value && styles.pillTextOn]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={rootConcern}
            onChangeText={setRootConcern}
            placeholder="Root-zone notes: drainage, crust, smell, root temp, dryback."
            accessibilityLabel="Diagnosis root-zone notes"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Environment</Text>
          <View style={styles.row}>
            <Text style={styles.measurementLabel}>Temperature unit</Text>
            {(["F", "C"] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.pill, tempUnit === value && styles.pillOn]}
                onPress={() => setTempUnit(value)}
                accessibilityRole="button"
                accessibilityLabel={`Diagnosis temperature unit degrees ${value}`}
              >
                <Text style={[styles.pillText, tempUnit === value && styles.pillTextOn]}>
                  °{value}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.grid}>
            <TextInput
              style={styles.gridInput}
              value={temp}
              onChangeText={setTemp}
              keyboardType="numeric"
              placeholder={`Air temperature (°${tempUnit})`}
              accessibilityLabel="Diagnosis temperature"
            />
            <TextInput
              style={styles.gridInput}
              value={rh}
              onChangeText={setRh}
              keyboardType="numeric"
              placeholder="Relative humidity (%)"
              accessibilityLabel="Diagnosis RH"
            />
            <TextInput
              style={styles.gridInput}
              value={vpd}
              onChangeText={setVpd}
              keyboardType="numeric"
              placeholder="VPD (kPa)"
              accessibilityLabel="Diagnosis VPD"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Measured numbers</Text>
          <View style={styles.grid}>
            <TextInput
              style={styles.gridInput}
              value={feedEC}
              onChangeText={setFeedEC}
              keyboardType="numeric"
              placeholder="Feed EC (mS/cm)"
              accessibilityLabel="Diagnosis feed EC"
            />
            <TextInput
              style={styles.gridInput}
              value={runoffEC}
              onChangeText={setRunoffEC}
              keyboardType="numeric"
              placeholder="Runoff EC (mS/cm)"
              accessibilityLabel="Diagnosis runoff EC"
            />
            <TextInput
              style={styles.gridInput}
              value={feedPH}
              onChangeText={setFeedPH}
              keyboardType="numeric"
              placeholder="Feed pH (0–14)"
              accessibilityLabel="Diagnosis feed pH"
            />
            <TextInput
              style={styles.gridInput}
              value={runoffPH}
              onChangeText={setRunoffPH}
              keyboardType="numeric"
              placeholder="Runoff pH (0–14)"
              accessibilityLabel="Diagnosis runoff pH"
            />
          </View>
        </View>

        {workspaceType === "personal" && growId ? (
          <SavedGrowPhotoEvidencePicker
            growId={growId}
            plantId={plantId}
            purpose="diagnosis"
            value={evidenceAssets}
            onChange={setEvidenceAssets}
            maxPhotos={10}
          />
        ) : null}

        <MediaEvidencePicker
          aiUsable
          maxPhotos={10}
          allowVideo
          maxVideoSeconds={30}
          purpose="diagnosis"
          sourceContext={{ growId, plantId, facilityId: facilityId || undefined }}
          value={evidenceAssets}
          onChange={setEvidenceAssets}
        />
        <Text style={styles.photoPolicy}>
          Photos are used for this diagnosis request. They are not used to train GrowPath
          AI models unless you explicitly opt in.
        </Text>
        {photoAnalysisReady ? (
          <Text style={styles.photoReady}>
            Photo analysis is connected. Include the whole plant, the symptom pattern, and
            sharp close-ups of both leaf surfaces.
          </Text>
        ) : (
          <Text style={styles.photoWarning}>
            Photo analysis is not connected yet. Attached photos remain evidence, but the
            current engine uses your written observations and measurements. Describe what
            is visible in Diagnosis notes to run useful triage.
          </Text>
        )}
        {photoOnlyBlocked ? (
          <Text style={styles.photoWarning}>
            Add written symptom notes before running. A photo-only request would otherwise
            produce a generic result because this provider cannot inspect the image.
          </Text>
        ) : null}

        {!enabled ? (
          <Text style={styles.locked}>
            Diagnosis is unavailable for the current plan or capability set.
          </Text>
        ) : null}
        {enabled ? (
          <View
            style={[
              styles.readinessPanel,
              providerStatus?.configured ? styles.readinessReady : styles.readinessMissing
            ]}
          >
            <Text style={styles.readinessTitle}>
              {providerStatus?.configured
                ? providerStatus.imageSupport
                  ? "Diagnosis and photo analysis ready"
                  : "Text diagnosis engine ready"
                : "Diagnosis provider needs verification"}
            </Text>
            <Text style={styles.readinessText}>
              {providerStatus
                ? `${providerStatus.providerName || "provider"} / ${
                    providerStatus.providerModel || "model unknown"
                  } / ${providerStatus.imageSupport ? "image input supported" : "text only"}`
                : providerStatusError || "Checking backend provider configuration..."}
            </Text>
            {!providerStatus?.configured ? (
              <Text style={styles.readinessText}>
                Server credentials are not exposed here. Release still needs a live
                backend check with configured AI image credentials.
              </Text>
            ) : null}
          </View>
        ) : null}
        <View
          style={[
            styles.readinessPanel,
            diagnosisReady ? styles.readinessReady : styles.readinessMissing
          ]}
        >
          <Text style={styles.readinessTitle}>Diagnosis readiness</Text>
          <Text style={styles.readinessText}>{readinessMessage}</Text>
        </View>
        <Pressable
          disabled={runDisabled}
          style={[styles.primaryButton, runDisabled && styles.disabled]}
          onPress={runDiagnosis}
          accessibilityRole="button"
          accessibilityLabel="Run diagnosis"
          accessibilityHint={readinessMessage}
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
                result.confidence !== "unknown"
                  ? {
                      key: "overall-confidence",
                      label: "Overall confidence",
                      value: result.confidence.toUpperCase()
                    }
                  : result.topCandidateConfidence != null
                    ? {
                        key: "top-candidate-confidence",
                        label: "Top candidate confidence",
                        value: `${Math.round(result.topCandidateConfidence * 100)}%`
                      }
                    : {
                        key: "overall-confidence",
                        label: "Overall confidence",
                        value: "NOT PROVIDED"
                      },
                {
                  key: "health-status",
                  label: "Health status",
                  value: (result.overallHealth || result.severity).toUpperCase()
                },
                ...(result.urgency
                  ? [
                      {
                        key: "action-urgency",
                        label: "Action urgency",
                        value: result.urgency.toUpperCase()
                      }
                    ]
                  : []),
                { key: "source", label: "Source", value: result.source },
                ...(result.providerModel
                  ? [
                      {
                        key: "provider-model",
                        label: "Model",
                        value: result.providerModel
                      }
                    ]
                  : []),
                ...(result.imageAnalysis?.requested
                  ? [
                      {
                        key: "photo-analysis",
                        label: "Photos analyzed",
                        value: result.imageAnalysis.performed
                          ? String(result.imageAnalysis.photoCount || 1)
                          : "Not analyzed"
                      }
                    ]
                  : [])
              ]}
              inputs={{
                stage,
                patternLocation,
                progression,
                rootMoisture,
                temp,
                tempUnit,
                rh,
                vpd,
                feedEC,
                runoffEC,
                feedPH,
                runoffPH,
                cropCommonName,
                scientificName,
                cultivarOrStrain
              }}
              outputs={{
                diagnosisClass: result.diagnosisClass,
                urgency: result.urgency,
                cropIdentity: result.cropIdentity,
                cropProfile: result.cropProfileSnapshot
                  ? {
                      name: result.cropProfileSnapshot.displayName,
                      scientificName: result.cropProfileSnapshot.scientificName,
                      category: result.cropProfileSnapshot.cropCategory,
                      review: result.cropProfileSnapshot.curationStatus
                    }
                  : "not matched",
                pattern: result.patternSummary,
                rootZone: result.rootZoneSummary,
                environment: result.environmentSummary,
                numbers: result.numberSummary,
                provider: result.providerName || result.source,
                providerResult: result.providerResult ? "stored" : "not supplied"
              }}
              notices={[
                ...(cropProfileNotice ? [cropProfileNotice] : []),
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
                ...(result.imageAnalysis?.requested && !result.imageAnalysis.performed
                  ? [
                      {
                        key: "image-analysis-not-performed",
                        severity: "high" as const,
                        message:
                          result.imageAnalysis.reason ||
                          "Attached photos were not visually analyzed.",
                        remediation:
                          "Use the written findings as preliminary triage only. Add detailed symptom notes or rerun when photo analysis is available."
                      }
                    ]
                  : []),
                ...(result.imageAnalysis?.performed &&
                result.imageAnalysis.usableForTriage === false
                  ? [
                      {
                        key: "image-analysis-unusable",
                        severity: "high" as const,
                        message:
                          result.imageAnalysis.qualityIssues?.join(" ") ||
                          "The provider inspected the photos but could not use them for meaningful triage.",
                        remediation:
                          "Replace the photo using the listed quality and coverage guidance before relying on the result."
                      }
                    ]
                  : []),
                ...(result.imageAnalysis?.performed &&
                result.imageAnalysis.usableForTriage !== false
                  ? [
                      {
                        key: "image-analysis-performed",
                        severity: "info" as const,
                        message: `${result.imageAnalysis.photoCount || 1} submitted photo${
                          Number(result.imageAnalysis.photoCount || 1) === 1
                            ? " was"
                            : "s were"
                        } inspected by the image-capable diagnosis provider.`,
                        remediation:
                          "Compare the listed visible evidence and counter-evidence with the plant in person; a photo result remains cautious triage, not a lab confirmation."
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
              assumptions={[
                ...result.evidence.map((item) => `Observed evidence: ${item}`),
                ...result.counterEvidence.map((item) => `Counter-evidence: ${item}`)
              ]}
              details={
                <View style={styles.providerPanel}>
                  <Text style={styles.providerTitle}>ETGU and GPT verification</Text>
                  <Text style={styles.providerMeta}>
                    {result.verification?.status || "Comparison unavailable"}
                  </Text>
                  <Text style={styles.providerLine}>
                    {result.verification?.note ||
                      "This result did not include a separate rule-versus-provider comparison."}
                  </Text>
                  <Text style={styles.providerTitle}>Provider output</Text>
                  <Text style={styles.providerMeta}>
                    {result.providerName || result.source || "unverified provider"}
                    {result.providerModel ? ` | ${result.providerModel}` : ""}
                  </Text>
                  {providerResultSummary(result.providerResult).length ? (
                    providerResultSummary(result.providerResult).map((line) => (
                      <Text key={line} style={styles.providerLine}>
                        - {line}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.providerLine}>
                      Provider output was not supplied as a separate structured payload.
                    </Text>
                  )}
                  <Text style={styles.providerTitle}>Draft crop identity</Text>
                  <Text style={styles.providerMeta}>
                    {result.cropIdentity?.commonName || "Not identified"}
                    {result.cropIdentity?.scientificName
                      ? ` | ${result.cropIdentity.scientificName}`
                      : ""}
                    {result.cropIdentity?.confidence
                      ? ` | ${result.cropIdentity.confidence} confidence`
                      : ""}
                  </Text>
                  <Text style={styles.providerLine}>
                    {result.cropIdentity?.source === "visual_suggestion"
                      ? "Suggested from the submitted photo evidence. Confirm or correct the crop before treating it as saved crop context."
                      : result.cropIdentity?.source === "user_context"
                        ? "Taken from the crop context supplied with this diagnosis."
                        : result.cropIdentity?.commonName &&
                            result.cropIdentity.commonName !== "unspecified"
                          ? "Returned with the supplied or saved diagnosis context; review the confirmation notice before applying crop-specific guidance."
                          : "The submitted evidence did not support a useful crop suggestion."}
                  </Text>
                  {result.cropIdentity?.visibleEvidence?.map((line, index) => (
                    <Text key={`crop-evidence-${index}`} style={styles.providerLine}>
                      - Visible identity evidence: {line}
                    </Text>
                  ))}
                  {result.cropIdentity?.alternatives?.map((line, index) => (
                    <Text key={`crop-alternative-${index}`} style={styles.providerLine}>
                      - Alternative to confirm: {line}
                    </Text>
                  ))}
                  <Text style={styles.providerTitle}>Photo evidence quality</Text>
                  <Text style={styles.providerMeta}>
                    {result.imageAnalysis?.performed
                      ? `${result.imageAnalysis.photoCount || 1} photo${
                          Number(result.imageAnalysis.photoCount || 1) === 1 ? "" : "s"
                        } inspected | ${
                          result.imageAnalysis.usableForTriage === false
                            ? "replacement needed"
                            : "usable for cautious triage"
                        }`
                      : "No image inspection was recorded"}
                  </Text>
                  {result.imageAnalysis?.observedFeatures?.map((line, index) => (
                    <Text key={`photo-feature-${index}`} style={styles.providerLine}>
                      - Visible feature: {line}
                    </Text>
                  ))}
                  {result.imageAnalysis?.qualityIssues?.map((line, index) => (
                    <Text key={`photo-quality-${index}`} style={styles.providerLine}>
                      - Replace or improve: {line}
                    </Text>
                  ))}
                  {result.imageAnalysis?.limitations?.map((line, index) => (
                    <Text key={`photo-limit-${index}`} style={styles.providerLine}>
                      - Limitation: {line}
                    </Text>
                  ))}
                  <Text style={styles.providerTitle}>GrowPath AI reasoning</Text>
                  {result.growPathReasoning.length ? (
                    result.growPathReasoning.map((line) => (
                      <Text key={line} style={styles.providerLine}>
                        - {line}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.providerLine}>
                      No additional GrowPath AI reasoning was returned with this result.
                    </Text>
                  )}
                  <Text style={styles.providerMeta}>
                    GrowPath AI improves diagnosis quality from reviewed provider output,
                    crop/profile context, and user-confirmed outcomes. Training use
                    remains opt-in.
                  </Text>
                </View>
              }
              formulas={[
                ...result.growPathReasoning,
                "ETGU checks symptom pattern, root-zone context, environment, and measured numbers before suggesting follow-up actions."
              ]}
              uncertainty={[
                "Plant-health triage is not a guaranteed lab diagnosis. Confirm with environment, medium, water, and testing when possible.",
                result.improvementNotice
              ]
                .filter(Boolean)
                .join("\n")}
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
            {result.tags.length ? (
              <View style={styles.followUpCard}>
                <Text style={styles.label}>Accepted tags</Text>
                <Text style={styles.subtitle}>
                  Choose which diagnosis tags should be saved to the grow journal.
                </Text>
                <View style={styles.row}>
                  {result.tags.map((tag) => {
                    const accepted = acceptedTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        style={[styles.pill, accepted && styles.pillOn]}
                        onPress={() => toggleAcceptedTag(tag)}
                        accessibilityRole="button"
                        accessibilityLabel={`Diagnosis tag ${tag}`}
                      >
                        <Text style={[styles.pillText, accepted && styles.pillTextOn]}>
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            <View style={styles.followUpCard}>
              <Text style={styles.label}>Improve this diagnosis</Text>
              <Text style={styles.subtitle}>
                Tell GrowPath whether this result matched what you saw. Feedback is linked
                to this diagnosis and is not used for model training unless you explicitly
                consent.
              </Text>
              <TextInput
                style={styles.input}
                value={outcomeNotes}
                onChangeText={setOutcomeNotes}
                placeholder="Optional outcome notes, checks, or what changed later."
                accessibilityLabel="Diagnosis outcome feedback notes"
              />
              <View style={styles.row}>
                <Pressable
                  disabled={outcomeSaving}
                  style={[styles.secondaryButton, outcomeSaving && styles.disabled]}
                  onPress={() => submitOutcomeFeedback("helpful")}
                  accessibilityRole="button"
                  accessibilityLabel="Mark diagnosis helpful"
                >
                  <Text style={styles.secondaryButtonText}>Helpful</Text>
                </Pressable>
                <Pressable
                  disabled={outcomeSaving}
                  style={[styles.secondaryButton, outcomeSaving && styles.disabled]}
                  onPress={() => submitOutcomeFeedback("not_accurate")}
                  accessibilityRole="button"
                  accessibilityLabel="Mark diagnosis not accurate"
                >
                  <Text style={styles.secondaryButtonText}>Not Accurate</Text>
                </Pressable>
                <Pressable
                  disabled={outcomeSaving}
                  style={[styles.secondaryButton, outcomeSaving && styles.disabled]}
                  onPress={() => submitOutcomeFeedback("unsure")}
                  accessibilityRole="button"
                  accessibilityLabel="Mark diagnosis unsure"
                >
                  <Text style={styles.secondaryButtonText}>Unsure</Text>
                </Pressable>
              </View>
            </View>
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
                  accessibilityLabel="Diagnosis follow-up answer"
                />
                <Pressable
                  disabled={!followUpAnswer.trim() || running}
                  style={[
                    styles.primaryButton,
                    (!followUpAnswer.trim() || running) && styles.disabled
                  ]}
                  onPress={submitFollowUp}
                  accessibilityRole="button"
                  accessibilityLabel="Refine diagnosis"
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
        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_diagnose"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 120, backgroundColor: "#FFFFFF", gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  context: { color: "#166534", fontWeight: "700" },
  section: { gap: 7 },
  label: { color: "#334155", fontWeight: "800" },
  measurementLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    alignSelf: "center"
  },
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
    borderRadius: radius.card,
    padding: 12,
    textAlignVertical: "top"
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 12
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridInput: {
    minWidth: 140,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 12
  },
  photo: {
    width: "100%",
    height: 240,
    borderRadius: radius.card,
    backgroundColor: "#E2E8F0"
  },
  photoPolicy: { color: "#475569", fontSize: 12, lineHeight: 18 },
  photoReady: {
    color: "#166534",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    padding: 10,
    lineHeight: 19
  },
  photoWarning: {
    color: "#9A3412",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: radius.card,
    padding: 10,
    lineHeight: 19
  },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  locked: {
    color: "#9A3412",
    backgroundColor: "#FFF7ED",
    padding: 10,
    borderRadius: radius.card
  },
  feedback: { color: "#334155", fontWeight: "700" },
  readinessPanel: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 10,
    gap: 4
  },
  readinessReady: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  readinessMissing: { borderColor: "#FDBA74", backgroundColor: "#FFF7ED" },
  readinessTitle: { color: "#0F172A", fontWeight: "800" },
  readinessText: { color: "#475569", fontSize: 12, lineHeight: 18 },
  providerPanel: {
    borderWidth: 1,
    borderColor: "#D9E2EC",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 5
  },
  providerTitle: { color: "#0F172A", fontWeight: "800", marginTop: 4 },
  providerMeta: { color: "#64748B", fontSize: 12, lineHeight: 18 },
  providerLine: { color: "#334155", fontSize: 12, lineHeight: 18 },
  cropContextPanel: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 10,
    gap: 4
  },
  cropContextReady: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  cropContextNeedsReview: { borderColor: "#FDBA74", backgroundColor: "#FFF7ED" },
  cropContextTitle: { color: "#0F172A", fontWeight: "800" },
  cropContextText: { color: "#475569", fontSize: 12, lineHeight: 18 },
  followUpCard: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 12,
    gap: 8,
    backgroundColor: "#F8FAFC"
  }
});
