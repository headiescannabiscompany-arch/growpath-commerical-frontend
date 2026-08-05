import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";
import type { ToolResultAction } from "@/features/personal/tools/ToolResultSurface";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import { savePersonalGrowCropIdentity } from "@/api/grows";
import { savePersonalPlantCropIdentity } from "@/api/plants";
import {
  createFieldStudy,
  createFieldObservation,
  FieldStudy,
  listFieldStudies,
  ObservationLocationPrivacy,
  updateFieldObservation,
  updateFieldStudy
} from "@/api/fieldStudies";
import {
  requestCurrentCoordinates,
  type PublicCoordinates
} from "@/utils/locationSearch";
import {
  updateGrowpathModuleRecord,
  type GrowpathModuleRecord,
  type GrowpathModuleUserDecision
} from "@/api/growpathModules";
import { updateToolRun, type ToolRun } from "@/api/toolRuns";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import type { EvidenceAsset } from "@/types/evidence";

const PLANT_ID_AI_PROMPT = `You are GrowPathAI's plant identification assistant. Act like a cautious field botanist, not a one-photo image-matching toy.

Inspect the attached image pixels first. Use user-entered context and selected private grow/plant context only when supplied. Narrow in this order: broad plant group, morphology, likely family, possible genera, then species only when diagnostic evidence supports it. Consider growth habit, leaf arrangement/type/margin/venation, stems, flower symmetry and parts, inflorescence, fruit/seed, special structures, habitat, geography, season, and whether the plant is wild or cultivated.

Only populate growing setting, habitat, visible surface substrate, or nearby associated plants when the photos directly support them or the user supplied them. Do not populate cultivar, wild-versus-cultivated provenance, location or region, observation date or season, sensory traits, or plant-size measurements from image analysis. Leave unsupported and user-only fields blank instead of inventing them.

Return useful broader candidates when exact species is unresolved. Cannabis is an allowed crop candidate from deliberately submitted evidence. A clear cannabis flower or harvested bud may support a crop-level Cannabis draft from visible bracts/calyxes, pistils, resinous sugar leaves, trichome coverage, and inflorescence structure. Never infer cultivar or strain from appearance.

Do not claim that GBIF, USDA PLANTS, Kew POWO, iNaturalist, a flora, herbarium, or extension source was checked; this image step has no botanical-database lookup. Do not invent source records, range matches, or expert confirmation. If the evidence supports a genus but not an exact species, use a genus-level scientific draft such as "Mandevilla spp." and keep nursery or common synonyms such as "Dipladenia" in commonNames. Never put an English common-name phrase such as "rose plant" in scientificName. If names conflict, a proposed name is unusable, or the current views cannot separate lookalikes, set visualConfidence and candidate confidence to low and request a new whole-plant view, full leaf and underside with stem node, open flower, and any fruit or seed structure present. If pixels are unavailable, set imageAnalysisPerformed to "false". Every result remains a draft until the user confirms it.

Return JSON only with exactly these keys:
{
  "userEnteredName": "string",
  "scientificName": "string",
  "cultivar": "",
  "commonNames": "comma-separated string",
  "setting": "outdoor, indoor, greenhouse, unknown, or blank when unsupported",
  "habitat": "visible or user-provided habitat, otherwise blank",
  "substrate": "visible surface substrate or user-provided substrate, otherwise blank",
  "associatedPlants": "comma-separated visible or user-provided nearby plants, otherwise blank",
  "plantSize": "",
  "broadGroup": "flowering_plant, conifer, fern, moss_or_ally, fungus_or_lichen, or unknown",
  "likelyFamily": "string",
  "possibleGenera": ["string"],
  "growthHabit": "tree, shrub, vine, herb, grasslike, succulent, fernlike, or unknown",
  "leafArrangement": "opposite, alternate, whorled, basal, rosette, or unknown",
  "leafType": "simple, compound, pinnate, palmate, scale_like, needle_like, or unknown",
  "leafMargin": "entire, serrated, lobed, spiny, wavy, or unknown",
  "venation": "parallel, pinnate, palmate, or unknown",
  "flowerPresent": "yes, no, or unknown",
  "flowerSymmetry": "radial, bilateral, or unknown",
  "fruitPresent": "yes, no, or unknown",
  "stemTraits": "comma-separated visible traits",
  "flowerPartsVisible": "comma-separated visible parts",
  "inflorescenceType": "string",
  "fruitType": "string",
  "specialStructures": "comma-separated visible structures",
  "identificationNotes": "visible observations and uncertainty",
  "imageAnalysisPerformed": "true or false",
  "imageQuality": "usable, limited, or unusable",
  "visualConfidence": "high, medium, or low",
  "identifyingVisualTraits": "string",
  "candidates": [
    {
      "scientificName": "string",
      "commonNames": ["string"],
      "rank": "family, genus, species, or working_candidate",
      "confidence": "high, medium, or low",
      "evidence": ["visible or user-provided evidence"],
      "counterEvidence": ["conflicts or unresolved lookalikes"],
      "missingEvidence": ["evidence needed to narrow further"]
    }
  ],
  "evidence": ["observations that support the draft"],
  "counterEvidence": ["observations that conflict or preserve lookalikes"],
  "missingEvidence": ["missing information"],
  "requiredNextPhotos": ["specific photo requests"],
  "requiredNextQuestions": ["specific context questions"]
}`;

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(value || "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactValues(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      const text = String(value || "").trim();
      return text && text !== "unknown";
    })
  );
}

function normalizeScientificName(value: unknown) {
  const name = String(value || "").trim();
  if (
    !name ||
    /^(not confirmed|not identified|unidentified|unknown(?: crop)?|unsure|uncertain|n\/a|none)$/i.test(
      name
    ) ||
    /\b(?:plant|tree|shrub|bush|flower|crop|weed|grass|vine)\b/i.test(name)
  ) {
    return "";
  }
  return name;
}

function buildIdentificationDraft(parsed: Record<string, any>) {
  const candidates = Array.isArray(parsed.candidates)
    ? parsed.candidates.slice(0, 5).map((candidate: any) => {
        const suppliedScientificName = String(candidate?.scientificName || "").trim();
        const scientificName = normalizeScientificName(suppliedScientificName);
        const scientificNameWithheld = Boolean(suppliedScientificName) && !scientificName;
        const suppliedRank = String(candidate?.rank || "working_candidate").trim();
        return {
          scientificName,
          commonNames: stringList(candidate?.commonNames),
          rank:
            suppliedRank === "species" && !scientificName
              ? "working_candidate"
              : suppliedRank,
          confidence: scientificNameWithheld
            ? "low"
            : String(candidate?.confidence || "low").trim(),
          evidence: stringList(candidate?.evidence),
          counterEvidence: [
            ...stringList(candidate?.counterEvidence),
            ...(scientificNameWithheld
              ? ["The supplied scientific-name output was not a usable botanical name."]
              : [])
          ],
          missingEvidence: stringList(candidate?.missingEvidence)
        };
      })
    : [];
  return {
    broadGroup: String(parsed.broadGroup || "unknown").trim(),
    likelyFamily: String(parsed.likelyFamily || "").trim(),
    possibleGenera: stringList(parsed.possibleGenera),
    candidates,
    evidence: stringList(parsed.evidence),
    counterEvidence: stringList(parsed.counterEvidence),
    missingEvidence: stringList(parsed.missingEvidence),
    requiredNextPhotos: stringList(parsed.requiredNextPhotos),
    requiredNextQuestions: stringList(parsed.requiredNextQuestions),
    sourceVerificationPerformed: false
  };
}

function normalizePriority(
  value: unknown,
  fallback: "low" | "medium" | "high" = "medium"
) {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function unresolvedCropName(value: unknown) {
  return /^(not confirmed|not identified|unidentified|unknown(?: crop)?|unsure|uncertain|n\/a|none)$/i.test(
    String(value || "").trim()
  );
}

export function isCannabisGenusIdentification(outputs: Record<string, any>) {
  const draft = outputs.identificationDraft || {};
  const scientificNames = [
    outputs.scientificName,
    draft.scientificName,
    ...stringList(outputs.possibleSpecies),
    ...stringList(draft.possibleSpecies),
    ...(Array.isArray(draft.candidates)
      ? draft.candidates.map((candidate: any) => candidate?.scientificName)
      : [])
  ];
  if (
    scientificNames.some((name) => /^\s*Cannabis(?:\s|\.|$)/i.test(String(name || "")))
  ) {
    return true;
  }
  const genera = [
    ...stringList(outputs.possibleGenera),
    ...stringList(draft.possibleGenera)
  ];
  if (genera.some((name) => /^\s*Cannabis\s*$/i.test(name))) return true;
  const commonCandidate = String(outputs.likelyCrop || draft.commonName || "").trim();
  return /^(?:cannabis|cannabis plant|marijuana|hemp)$/i.test(commonCandidate);
}

function normalizeCropIdentityPrefillField({
  fieldKey,
  value,
  parsed
}: {
  fieldKey: string;
  value: unknown;
  parsed: Record<string, any>;
}) {
  if (
    [
      "cultivar",
      "cultivationStatus",
      "region",
      "observationDate",
      "season",
      "plantSize",
      "sensoryTraits"
    ].includes(fieldKey)
  ) {
    // These values require a label, device/user action, direct sensory observation,
    // date selection, or measurement. A model reply cannot establish them from pixels.
    return "";
  }
  if (fieldKey === "scientificName") return normalizeScientificName(value);
  if (
    [
      "commonNames",
      "associatedPlants",
      "stemTraits",
      "flowerPartsVisible",
      "specialStructures"
    ].includes(fieldKey)
  ) {
    return stringList(value).join(", ");
  }
  if (fieldKey !== "userEnteredName") return undefined;
  const suppliedName = String(value || "").trim();
  if (suppliedName && !unresolvedCropName(suppliedName)) return suppliedName;
  return String(parsed.commonNames || "")
    .split(/[,;\n]/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate && !unresolvedCropName(candidate));
}

async function recordCropIdentificationDecision({
  decision,
  outputs,
  toolRun,
  moduleRecord
}: {
  decision: GrowpathModuleUserDecision;
  outputs: Record<string, any>;
  toolRun: ToolRun | null;
  moduleRecord: GrowpathModuleRecord | null;
}) {
  const recordedAt = new Date().toISOString();
  const decisionRecord = {
    value: decision,
    recordedAt,
    meaning:
      decision === "accepted"
        ? "The user confirmed this saved identity draft. This is not external botanical-source or expert verification."
        : decision === "rejected"
          ? "The user marked this candidate as not matching the observed plant."
          : "The user needs more evidence before confirming an identity."
  };
  const nextOutputs = {
    ...outputs,
    userDecision: decisionRecord,
    ...(decision === "accepted"
      ? { confidence: "user_confirmed", userConfirmationRequired: false }
      : {})
  };
  const toolRunId = String(toolRun?.id || toolRun?._id || "");
  const moduleRecordId = String(moduleRecord?.id || moduleRecord?._id || "");
  let saved = false;

  if (toolRunId) {
    saved = Boolean(
      await updateToolRun(toolRunId, {
        outputs: nextOutputs,
        output: nextOutputs,
        result: nextOutputs
      })
    );
  }
  if (moduleRecordId) {
    const updatedRecord = await updateGrowpathModuleRecord(moduleRecordId, {
      title: moduleRecord?.title || "Species / Crop Identification",
      status: moduleRecord?.status || "active",
      userDecision: decision,
      outcome: {
        ...(moduleRecord?.outcome || {}),
        lastDecision: decision,
        decisionRecordedAt: recordedAt
      },
      warnings: moduleRecord?.warnings || [],
      recommendations: moduleRecord?.recommendations || [],
      limitations: moduleRecord?.limitations || [],
      tags: moduleRecord?.tags || [],
      linkedTaskIds: moduleRecord?.linkedTaskIds || [],
      tasksToCreate: moduleRecord?.tasksToCreate || []
    });
    saved = Boolean(updatedRecord) || saved;
  }
  if (!saved) throw new Error("Unable to save this identification decision.");
}

function cropIdentityCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "crop_identity_followup",
    sourceStage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
}

function speciesCropTaskPlan(outputs: Record<string, any>) {
  const planned = Array.isArray(outputs.tasksToCreate) ? outputs.tasksToCreate : [];
  if (planned.length) {
    return planned.slice(0, 8).map((task: any, index: number) => ({
      title: String(task?.title || `Crop identity follow-up ${index + 1}`),
      priority: normalizePriority(task?.priority),
      dueDate: tomorrow(Number(task?.dueInDays || index + 1)),
      ...cropIdentityCalendarMetadata(
        String(task?.sourceStage || `crop_identity_followup_${index + 1}`)
      ),
      description:
        task?.description ||
        "Follow up on crop identity before applying crop-specific diagnosis, nutrition, IPM, or environment guidance."
    }));
  }

  const needsConfirm = Boolean(outputs.userConfirmationRequired);
  const crop = outputs.likelyCrop || outputs.scientificName || "crop";

  return [
    {
      title: needsConfirm ? "Confirm crop identity" : "Save crop identity to profile",
      priority: needsConfirm ? ("high" as const) : ("medium" as const),
      dueDate: tomorrow(1),
      ...cropIdentityCalendarMetadata("crop_identity_confirmation"),
      description:
        outputs.recommendationContext ||
        `Confirm ${crop} identity and save the crop profile before using crop-specific guidance.`
    },
    {
      title: "Review crop-specific tool targets",
      priority: "medium" as const,
      dueDate: tomorrow(2),
      ...cropIdentityCalendarMetadata("crop_tool_target_review"),
      description:
        "Check whether diagnosis prompts, pH/EC ranges, VPD targets, nutrient assumptions, and IPM context should change for this crop identity."
    },
    {
      title: "Update grow or plant tags",
      priority: "medium" as const,
      dueDate: tomorrow(3),
      ...cropIdentityCalendarMetadata("crop_profile_tag_update"),
      description:
        "Attach confirmed common names, scientific name, cultivar, grow interests, and privacy-safe notes to the grow or plant record."
    }
  ];
}

export default function SpeciesCropIdToolRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createSpeciesCropIdStyles(palette), [palette]);
  const params = useLocalSearchParams<{ fieldStudyId?: string }>();
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  const [fieldStudies, setFieldStudies] = useState<FieldStudy[]>([]);
  const [selectedFieldStudyId, setSelectedFieldStudyId] = useState(
    String(params.fieldStudyId || "")
  );
  const [observationLocation, setObservationLocation] =
    useState<PublicCoordinates | null>(null);
  const [locationPrivacy, setLocationPrivacy] =
    useState<ObservationLocationPrivacy>("private");
  const [publishObservation, setPublishObservation] = useState(false);
  const [sensitiveSpecies, setSensitiveSpecies] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [newStudyTitle, setNewStudyTitle] = useState("");
  const [creatingStudy, setCreatingStudy] = useState(false);
  const [publishingStudy, setPublishingStudy] = useState(false);
  const [confirmPublicStudy, setConfirmPublicStudy] = useState(false);
  const [cannabisMapConsent, setCannabisMapConsent] = useState(false);
  const [showLocationAndSharing, setShowLocationAndSharing] = useState(
    Boolean(params.fieldStudyId)
  );
  const [savedFieldObservationId, setSavedFieldObservationId] = useState("");
  const [savedFieldObservationPublished, setSavedFieldObservationPublished] =
    useState(false);
  const [activeToolRun, setActiveToolRun] = useState<ToolRun | null>(null);
  const [fieldStudyNotice, setFieldStudyNotice] = useState("");
  const [fieldStudyError, setFieldStudyError] = useState("");
  const evidenceInputKey = useMemo(
    () =>
      evidenceAssets
        .map((asset) =>
          [
            asset.id || asset._id || "",
            asset.uploadStatus,
            asset.durableUrl || "",
            asset.updatedAt || ""
          ].join(":")
        )
        .join("|"),
    [evidenceAssets]
  );
  const uploadedEvidence = useMemo(
    () => providerEvidencePayload(evidenceAssets),
    [evidenceAssets]
  );

  const selectedFieldStudy = useMemo(
    () =>
      fieldStudies.find(
        (study) => String(study.id || study._id || "") === selectedFieldStudyId
      ) || null,
    [fieldStudies, selectedFieldStudyId]
  );
  const wantsNatureMap = publishObservation && locationPrivacy === "public_approximate";
  const natureMapChecks = [
    { ready: Boolean(selectedFieldStudy), label: "Field Study selected" },
    {
      ready: selectedFieldStudy?.visibility === "public",
      label: "Field Study is public"
    },
    { ready: Boolean(observationLocation), label: "Device location captured" },
    {
      ready: uploadedEvidence.images.length > 0,
      label: "Uploaded photo evidence added"
    }
  ];
  const natureMapReady = natureMapChecks.every((check) => check.ready);

  useEffect(() => {
    setSavedFieldObservationId("");
    setSavedFieldObservationPublished(false);
    setFieldStudyNotice("");
  }, [selectedFieldStudyId]);

  useEffect(() => {
    setSavedFieldObservationId("");
    setSavedFieldObservationPublished(false);
    setFieldStudyNotice("");
  }, [evidenceInputKey]);

  useEffect(() => {
    let active = true;
    listFieldStudies()
      .then((studies) => {
        if (!active) return;
        const editable = studies.filter(
          (study) => study.accessRole === "owner" || study.accessRole === "editor"
        );
        setFieldStudies(editable);
        const requested = String(params.fieldStudyId || "");
        if (
          requested &&
          editable.some((study) => String(study.id || study._id) === requested)
        ) {
          setSelectedFieldStudyId(requested);
        }
      })
      .catch(() => {
        if (active) {
          setFieldStudyError(
            "Field Studies could not be loaded. Plant ID still works normally."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [params.fieldStudyId]);

  async function syncSavedRunLocation(nextLocation: PublicCoordinates | null) {
    const toolRunId = String(activeToolRun?.id || activeToolRun?._id || "");
    if (!toolRunId) {
      setObservationLocation(nextLocation);
      return;
    }
    const existingInput =
      activeToolRun?.inputs || activeToolRun?.input || activeToolRun?.params || {};
    const capturedLocation = nextLocation
      ? {
          ...nextLocation,
          privacy: "private",
          userAuthorized: true
        }
      : null;
    const nextInput = { ...existingInput, capturedLocation };
    const updated = await updateToolRun(toolRunId, {
      inputs: nextInput,
      input: nextInput,
      params: nextInput
    });
    if (!updated) {
      throw new Error(
        nextLocation
          ? "The location could not be added to the Saved Run. It was not retained."
          : "The location could not be removed from the Saved Run. Nothing changed."
      );
    }
    setActiveToolRun(updated);
    setObservationLocation(nextLocation);
  }

  async function captureCurrentLocation() {
    setLocationBusy(true);
    setFieldStudyError("");
    try {
      await syncSavedRunLocation(await requestCurrentCoordinates());
    } catch (locationError: any) {
      setFieldStudyError(
        locationError?.message ||
          "Current location is unavailable. You can still enter a general region."
      );
    } finally {
      setLocationBusy(false);
    }
  }

  async function removeCurrentLocation() {
    if (locationBusy) return;
    setLocationBusy(true);
    setFieldStudyError("");
    let publicObservationWithdrawn = false;
    try {
      if (
        savedFieldObservationPublished &&
        savedFieldObservationId &&
        selectedFieldStudyId
      ) {
        try {
          await updateFieldObservation(selectedFieldStudyId, savedFieldObservationId, {
            location: {
              ...(observationLocation || {}),
              privacy: "private",
              exactLocationPublicConfirmed: false
            },
            publication: {
              status: "withdrawn",
              sensitiveSpecies,
              cannabisContextConfirmed: false,
              publicNotes: ""
            }
          });
        } catch (_withdrawError) {
          throw new Error(
            "The public Nature pin could not be withdrawn, so the captured location was not removed. The pin may still be public."
          );
        }
        publicObservationWithdrawn = true;
        setSavedFieldObservationPublished(false);
        setPublishObservation(false);
        setLocationPrivacy("private");
        setCannabisMapConsent(false);
        setFieldStudyNotice(
          "The public Nature pin was withdrawn. Removing its private Saved Run location next."
        );
      }
      await syncSavedRunLocation(null);
      setPublishObservation(false);
      setLocationPrivacy("private");
      setCannabisMapConsent(false);
      setFieldStudyNotice(
        publicObservationWithdrawn
          ? "The public Nature pin was withdrawn and the captured location was removed from its Saved Run."
          : "The captured location was removed from its Saved Run."
      );
    } catch (locationError: any) {
      setFieldStudyError(
        publicObservationWithdrawn
          ? `The public Nature pin was withdrawn, but the private Saved Run location could not be removed. ${
              locationError?.message || "Try removing it again."
            }`
          : locationError?.message || "The captured location could not be removed."
      );
    } finally {
      setLocationBusy(false);
    }
  }

  function selectFieldStudy(study: FieldStudy) {
    const id = String(study.id || study._id || "");
    if (selectedFieldStudyId === id) {
      setSelectedFieldStudyId("");
      setPublishObservation(false);
      setLocationPrivacy("private");
      setConfirmPublicStudy(false);
      setCannabisMapConsent(false);
      return;
    }
    setSelectedFieldStudyId(id);
    setConfirmPublicStudy(false);
    setCannabisMapConsent(false);
    if (!wantsNatureMap) {
      const defaultPrivacy = study.defaultLocationPrivacy;
      setLocationPrivacy(
        defaultPrivacy === "collaborators" ? "collaborators" : "private"
      );
    }
  }

  async function createFieldStudyHere() {
    const title = newStudyTitle.trim();
    if (!title || creatingStudy) {
      setFieldStudyError("Enter a Field Study name first.");
      return;
    }
    setCreatingStudy(true);
    setFieldStudyError("");
    try {
      const study = await createFieldStudy({
        title,
        visibility: "private",
        defaultLocationPrivacy: "private"
      });
      setFieldStudies((current) => [study, ...current]);
      setSelectedFieldStudyId(String(study.id || study._id || ""));
      setNewStudyTitle("");
    } catch (studyError: any) {
      setFieldStudyError(studyError?.message || "The Field Study could not be created.");
    } finally {
      setCreatingStudy(false);
    }
  }

  async function makeSelectedStudyPublic() {
    if (
      !selectedFieldStudy ||
      selectedFieldStudy.accessRole !== "owner" ||
      publishingStudy
    ) {
      return;
    }
    setPublishingStudy(true);
    setFieldStudyError("");
    try {
      const updated = await updateFieldStudy(selectedFieldStudyId, {
        visibility: "public"
      });
      setFieldStudies((current) =>
        current.map((study) =>
          String(study.id || study._id || "") === selectedFieldStudyId
            ? { ...study, ...updated, visibility: "public" }
            : study
        )
      );
      setConfirmPublicStudy(false);
    } catch (studyError: any) {
      setFieldStudyError(
        studyError?.message || "The Field Study could not be made public."
      );
    } finally {
      setPublishingStudy(false);
    }
  }

  return (
    <BackendCalculatorToolScreen
      tool="species-crop-id"
      toolKey="species-crop-id"
      externalInputKey={evidenceInputKey}
      onToolRunChange={setActiveToolRun}
      title="Species / Crop Identification"
      subtitle="Narrow an unknown plant by combining photos, morphology, habitat, geography, and season. A grow is optional."
      growOptional
      noGrowContextMessage="This identification and your confirmation decision remain in Saved Runs. Attach a grow only to add the confirmed identity to grow or plant history."
      formHeader={({ growId }) => (
        <View style={styles.evidenceSection}>
          <Text style={styles.evidenceTitle}>Step 1 — Add identification evidence</Text>
          <Text style={styles.evidenceGuidance}>
            Start with the whole plant and its habitat, then add sharp leaf-top,
            leaf-underside, stem/node, flower, and fruit or seed views when available. You
            can use up to 12 photos or extract still frames from one short video. Location
            is optional and can remain private.
          </Text>
          <MediaEvidencePicker
            aiUsable
            maxPhotos={12}
            allowVideo
            extractFramesFromVideo
            maxExtractedVideoFrames={12}
            maxVideoSeconds={599}
            purpose="other"
            sourceContext={{ growId: growId || undefined }}
            value={evidenceAssets}
            onChange={setEvidenceAssets}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showLocationAndSharing }}
            onPress={() => setShowLocationAndSharing((value) => !value)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              {showLocationAndSharing
                ? "Hide location & Nature sharing"
                : "Optional: add location or share to Nature"}
            </Text>
          </Pressable>
          {showLocationAndSharing ? (
            <View style={styles.fieldStudySection}>
              <Text style={styles.evidenceTitle}>
                Step 2 — Choose location and map sharing
              </Text>
              <Text style={styles.evidenceGuidance}>
                Every identification stays in Saved Runs. To place an approximate pin on
                the Nature map, select or create a Field Study, capture its observation
                location, make the study public, and choose Nature map below. Nothing is
                published by default.
              </Text>

              <Text style={styles.fieldLabel}>Observation location (optional)</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use current location for this plant observation"
                disabled={locationBusy}
                onPress={captureCurrentLocation}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {locationBusy
                    ? "Reading location..."
                    : observationLocation
                      ? "Location captured — update"
                      : "Use Current Location"}
                </Text>
              </Pressable>
              {observationLocation ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove location from this plant observation"
                  disabled={locationBusy}
                  onPress={() => void removeCurrentLocation()}
                  style={styles.inlineLink}
                >
                  <Text style={styles.secondaryButtonText}>Remove captured location</Text>
                </Pressable>
              ) : null}
              <Text
                accessibilityLiveRegion="polite"
                style={observationLocation ? styles.statusGood : styles.evidenceGuidance}
              >
                {observationLocation
                  ? `Location captured${
                      Number.isFinite(observationLocation.accuracyMeters)
                        ? ` (about ${Math.round(
                            Number(observationLocation.accuracyMeters)
                          )} m accuracy)`
                        : ""
                    }. Exact coordinates stay private. If an identification result already exists, this location is synchronized to its Saved Run before it is retained; a Nature pin uses only a protected public location.`
                  : "You can identify the plant without location. Add a general region below if device location is unavailable."}
              </Text>

              <Text style={styles.fieldLabel}>
                Field Study (required only for map pins)
              </Text>
              {fieldStudies.length ? (
                <View style={styles.choiceRow}>
                  {fieldStudies.map((study) => {
                    const id = String(study.id || study._id || "");
                    const selected = selectedFieldStudyId === id;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={id}
                        onPress={() => selectFieldStudy(study)}
                        style={[
                          styles.choiceButton,
                          selected && styles.choiceButtonSelected
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            selected && styles.choiceTextSelected
                          ]}
                        >
                          {study.title} · {study.visibility}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.evidenceGuidance}>
                  You do not have an editable Field Study yet. Create one here without
                  leaving your uploaded photos.
                </Text>
              )}
              <View style={styles.createStudyRow}>
                <TextInput
                  accessibilityLabel="New Field Study name"
                  onChangeText={setNewStudyTitle}
                  placeholder="New Field Study name"
                  placeholderTextColor={palette.textMuted}
                  style={styles.studyInput}
                  value={newStudyTitle}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={creatingStudy}
                  onPress={createFieldStudyHere}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {creatingStudy ? "Creating..." : "Create & select"}
                  </Text>
                </Pressable>
              </View>
              <Link href="/home/personal/field-studies" asChild>
                <Pressable accessibilityRole="link" style={styles.inlineLink}>
                  <Text style={styles.secondaryButtonText}>Manage Field Studies</Text>
                </Pressable>
              </Link>

              {selectedFieldStudy ? (
                <>
                  <Text style={styles.fieldLabel}>
                    Save this Field Study observation as
                  </Text>
                  <View style={styles.choiceRow}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: !publishObservation && locationPrivacy === "private"
                      }}
                      onPress={() => {
                        setPublishObservation(false);
                        setLocationPrivacy("private");
                        setConfirmPublicStudy(false);
                        setCannabisMapConsent(false);
                      }}
                      style={[
                        styles.choiceButton,
                        !publishObservation &&
                          locationPrivacy === "private" &&
                          styles.choiceButtonSelected
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          !publishObservation &&
                            locationPrivacy === "private" &&
                            styles.choiceTextSelected
                        ]}
                      >
                        Private draft
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked:
                          !publishObservation && locationPrivacy === "collaborators"
                      }}
                      onPress={() => {
                        setPublishObservation(false);
                        setLocationPrivacy("collaborators");
                        setConfirmPublicStudy(false);
                        setCannabisMapConsent(false);
                      }}
                      style={[
                        styles.choiceButton,
                        !publishObservation &&
                          locationPrivacy === "collaborators" &&
                          styles.choiceButtonSelected
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          !publishObservation &&
                            locationPrivacy === "collaborators" &&
                            styles.choiceTextSelected
                        ]}
                      >
                        Study-team draft
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: wantsNatureMap }}
                      onPress={() => {
                        setPublishObservation(true);
                        setLocationPrivacy("public_approximate");
                      }}
                      style={[
                        styles.choiceButton,
                        wantsNatureMap && styles.choiceButtonSelected
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          wantsNatureMap && styles.choiceTextSelected
                        ]}
                      >
                        Nature map — approximate pin
                      </Text>
                    </Pressable>
                  </View>
                  {wantsNatureMap ? (
                    <View style={styles.readinessPanel}>
                      <Text style={styles.fieldLabel}>Nature map readiness</Text>
                      {natureMapChecks.map((check) => (
                        <Text
                          key={check.label}
                          style={check.ready ? styles.statusGood : styles.statusWarning}
                        >
                          {check.ready ? "Ready" : "Needed"}: {check.label}
                        </Text>
                      ))}
                      {selectedFieldStudy.visibility !== "public" ? (
                        selectedFieldStudy.accessRole === "owner" ? (
                          <Pressable
                            accessibilityRole="button"
                            disabled={publishingStudy}
                            onPress={() => setConfirmPublicStudy(true)}
                            style={styles.secondaryButton}
                          >
                            <Text style={styles.secondaryButtonText}>
                              Review public Field Study sharing
                            </Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.statusWarning}>
                            The Field Study owner must make this study public before its
                            published observations can appear on the Nature map.
                          </Text>
                        )
                      ) : null}
                      {confirmPublicStudy &&
                      selectedFieldStudy.visibility !== "public" ? (
                        <View style={styles.confirmationPanel}>
                          <Text style={styles.statusWarning}>
                            Making this Field Study public affects the whole study. Any
                            published observations already in it may become discoverable;
                            drafts remain private. Confirm only if that matches the
                            study&apos;s intended audience.
                          </Text>
                          <View style={styles.choiceRow}>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => setConfirmPublicStudy(false)}
                              style={styles.secondaryButton}
                            >
                              <Text style={styles.secondaryButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              disabled={publishingStudy}
                              onPress={makeSelectedStudyPublic}
                              style={styles.secondaryButton}
                            >
                              <Text style={styles.secondaryButtonText}>
                                {publishingStudy
                                  ? "Making study public..."
                                  : "Confirm public Field Study"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: sensitiveSpecies }}
                        onPress={() => setSensitiveSpecies((value) => !value)}
                        style={[
                          styles.choiceButton,
                          sensitiveSpecies && styles.sensitiveButtonSelected
                        ]}
                      >
                        <Text style={styles.choiceText}>
                          {sensitiveSpecies
                            ? "Sensitive species protection: on"
                            : "Sensitive species protection: off"}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: cannabisMapConsent }}
                        onPress={() => setCannabisMapConsent((value) => !value)}
                        style={[
                          styles.choiceButton,
                          cannabisMapConsent && styles.choiceButtonSelected
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            cannabisMapConsent && styles.choiceTextSelected
                          ]}
                        >
                          {cannabisMapConsent
                            ? "Cannabis/hemp public-context confirmation: on"
                            : "This is Cannabis/hemp — review public-context sharing"}
                        </Text>
                      </Pressable>
                      {cannabisMapConsent ? (
                        <Text style={styles.evidenceGuidance}>
                          You confirm this is a Cannabis-genus observation and want an
                          eligible public pin shown only to viewers whose grow interests
                          and content controls allow Cannabis/hemp findings.
                        </Text>
                      ) : null}
                      <Text
                        style={natureMapReady ? styles.statusGood : styles.statusWarning}
                      >
                        {natureMapReady
                          ? "Ready to create an approximate map pin after AI review."
                          : "Complete the needed items above, then identify the plant and publish the pin from the result."}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
              {fieldStudyError ? (
                <Text style={styles.fieldStudyError}>{fieldStudyError}</Text>
              ) : null}
              {fieldStudyNotice ? (
                <Text accessibilityLiveRegion="polite" style={styles.statusGood}>
                  {fieldStudyNotice}
                </Text>
              ) : null}
              <View style={styles.fieldMapLink}>
                <Text style={styles.evidenceGuidance}>
                  See public, opt-in observations on the shared Nature map. Personal
                  account details are not placed on pins. Cannabis/hemp findings follow
                  deliberate publication and viewer grow-interest controls.
                </Text>
                <Link href="/field-observations" asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Explore the public field observation map"
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Explore public field map
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          ) : null}
        </View>
      )}
      aiPrefill={{
        buttonLabel: "Identify Plant from Photos",
        clearUnfilled: false,
        preserveAllExistingFields: true,
        evidenceAssetIds: () => uploadedEvidence.evidenceAssetIds,
        isReady: () => uploadedEvidence.images.length > 0,
        notReadyMessage: "Upload at least one photo before starting AI identification.",
        runAfterPrefill: true,
        buildMessage: ({ values }) =>
          `${PLANT_ID_AI_PROMPT}\n\nUser-entered context:\n${JSON.stringify(
            compactValues(values),
            null,
            2
          )}`,
        normalizeFieldValue: normalizeCropIdentityPrefillField,
        buildPayloadMetadata: ({ response, parsed, evidenceAssetIds }) => {
          const evidenceUsed = Array.isArray(response.evidenceUsed)
            ? response.evidenceUsed
            : [];
          const limitations = Array.isArray(response.limitations)
            ? response.limitations
            : [];
          const reportsNoVision = limitations.some((item) =>
            /text[- ]only|cannot (inspect|analyze|view)|image pixels? (were )?not|visual analysis (was )?not/i.test(
              String(item)
            )
          );
          const photosAnalyzed = Number(response.mediaAnalysis?.photosAnalyzed || 0);
          return {
            identificationDraft: buildIdentificationDraft(parsed),
            imageAnalysis: {
              requested: evidenceAssetIds.length > 0,
              performed:
                evidenceAssetIds.length > 0 &&
                evidenceUsed.length > 0 &&
                photosAnalyzed > 0 &&
                !reportsNoVision &&
                String(parsed.imageAnalysisPerformed || "").toLowerCase() === "true",
              photoCount: evidenceAssetIds.length,
              photosAnalyzed,
              provider: response.provider || "assistant",
              providerModel: response.mediaAnalysis?.providerModel || null,
              providerLabel: response.providerLabel || "AI crop identity review",
              confidence: String(parsed.visualConfidence || "low").toLowerCase(),
              quality: String(parsed.imageQuality || "limited").toLowerCase(),
              identifyingVisualTraits: String(
                parsed.identifyingVisualTraits || ""
              ).trim(),
              evidenceUsed,
              limitations
            }
          };
        }
      }}
      fields={[
        {
          key: "userEnteredName",
          label: "Plant or crop name",
          defaultValue: "",
          section: "Step 2 — Proposed identity",
          placeholder: "Leave blank if unknown"
        },
        {
          key: "scientificName",
          label: "Scientific name, if known",
          defaultValue: "",
          section: "Step 2 — Proposed identity"
        },
        {
          key: "cultivar",
          label: "Cultivar / variety from a label or source",
          defaultValue: "",
          section: "Step 2 — Proposed identity",
          helpText: "Do not enter a cultivar inferred from appearance."
        },
        {
          key: "commonNames",
          label: "Other common names",
          defaultValue: "",
          section: "Step 2 — Proposed identity"
        },
        {
          key: "cultivationStatus",
          label: "Wild or cultivated?",
          defaultValue: "",
          section: "Step 3 — Place and context",
          options: [
            { value: "wild", label: "Wild" },
            { value: "cultivated", label: "Cultivated" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "setting",
          label: "Growing setting",
          defaultValue: "",
          section: "Step 3 — Place and context",
          options: [
            { value: "outdoor", label: "Outdoor" },
            { value: "indoor", label: "Indoor" },
            { value: "greenhouse", label: "Greenhouse" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "region",
          label: "Location or region",
          defaultValue: "",
          section: "Step 3 — Place and context",
          placeholder: "City/state, county, or general region",
          helpText: "Optional. Use only the precision you are comfortable saving."
        },
        {
          key: "observationDate",
          label: "Observation date",
          defaultValue: "",
          inputType: "date",
          section: "Step 3 — Place and context"
        },
        {
          key: "habitat",
          label: "Habitat",
          defaultValue: "",
          section: "Step 3 — Place and context",
          placeholder: "Roadside, wetland, woodland shade, garden bed…"
        },
        {
          key: "substrate",
          label: "Soil, substrate, or geology",
          defaultValue: "",
          section: "Step 3 — Place and context",
          placeholder: "Sand, clay, limestone, potting mix…"
        },
        {
          key: "associatedPlants",
          label: "Nearby associated plants",
          defaultValue: "",
          section: "Step 3 — Place and context"
        },
        {
          key: "plantSize",
          label: "Approximate plant size",
          defaultValue: "",
          section: "Step 3 — Place and context",
          placeholder: "Height, spread, trunk or stem size"
        },
        {
          key: "growthHabit",
          label: "Growth habit",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "tree", label: "Tree" },
            { value: "shrub", label: "Shrub" },
            { value: "vine", label: "Vine" },
            { value: "herb", label: "Herb" },
            { value: "grasslike", label: "Grass-like" },
            { value: "succulent", label: "Succulent" },
            { value: "fernlike", label: "Fern-like" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "leafArrangement",
          label: "Leaf arrangement",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "opposite", label: "Opposite" },
            { value: "alternate", label: "Alternate" },
            { value: "whorled", label: "Whorled" },
            { value: "basal", label: "Basal" },
            { value: "rosette", label: "Rosette" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "leafType",
          label: "Leaf type",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "simple", label: "Simple" },
            { value: "compound", label: "Compound" },
            { value: "pinnate", label: "Pinnate" },
            { value: "palmate", label: "Palmate" },
            { value: "scale_like", label: "Scale-like" },
            { value: "needle_like", label: "Needle-like" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "leafMargin",
          label: "Leaf edge / margin",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "entire", label: "Smooth" },
            { value: "serrated", label: "Serrated" },
            { value: "lobed", label: "Lobed" },
            { value: "spiny", label: "Spiny" },
            { value: "wavy", label: "Wavy" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "venation",
          label: "Leaf veins",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "parallel", label: "Parallel" },
            { value: "pinnate", label: "Pinnate" },
            { value: "palmate", label: "Palmate" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "flowerPresent",
          label: "Flowers visible?",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "flowerSymmetry",
          label: "Flower symmetry",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "radial", label: "Radial" },
            { value: "bilateral", label: "Bilateral" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "fruitPresent",
          label: "Fruit or seed visible?",
          defaultValue: "",
          section: "Step 4 — Morphology",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unknown", label: "Not sure" }
          ]
        },
        {
          key: "stemTraits",
          label: "Stem, bark, or node traits",
          defaultValue: "",
          section: "Step 4 — Morphology",
          multiline: true,
          placeholder: "Square stem, woody bark, hairs, latex, colored nodes…"
        },
        {
          key: "flowerPartsVisible",
          label: "Visible flower parts",
          defaultValue: "",
          section: "Step 4 — Morphology",
          placeholder: "Petals/tepals, sepals, stamens, pistil, spathe/spadix…"
        },
        {
          key: "inflorescenceType",
          label: "Flower-cluster / inflorescence shape",
          defaultValue: "",
          section: "Step 4 — Morphology"
        },
        {
          key: "fruitType",
          label: "Fruit or seed type",
          defaultValue: "",
          section: "Step 4 — Morphology"
        },
        {
          key: "specialStructures",
          label: "Special structures",
          defaultValue: "",
          section: "Step 4 — Morphology",
          multiline: true,
          placeholder:
            "Spines, tendrils, stipules, bulb, corm, rhizome, latex, hairs, succulent stem…"
        },
        {
          key: "sensoryTraits",
          label: "Smell, sap, texture, or other direct observations",
          defaultValue: "",
          section: "Step 4 — Morphology",
          multiline: true,
          helpText: "Do not taste an unknown plant."
        },
        {
          key: "identificationNotes",
          label: "Additional identification evidence",
          defaultValue: "",
          section: "Step 4 — Morphology",
          multiline: true
        }
      ]}
      validateValues={(values) => {
        const useful = compactValues(values);
        return Object.keys(useful).length
          ? null
          : "Enter at least one observed trait or proposed name, or use AI photo identification.";
      }}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        userEnteredName: values.userEnteredName,
        scientificName: values.scientificName,
        cultivar: values.cultivar,
        userConfirmed: false,
        commonNames: values.commonNames,
        identificationNotes: values.identificationNotes || undefined,
        observationContext: {
          cultivationStatus: values.cultivationStatus || "unknown",
          setting: values.setting || "unknown",
          region: values.region || "",
          observationDate: values.observationDate || "",
          habitat: values.habitat || "",
          substrate: values.substrate || "",
          associatedPlants: stringList(values.associatedPlants),
          plantSize: values.plantSize || ""
        },
        capturedLocation: observationLocation
          ? {
              ...observationLocation,
              privacy: "private",
              userAuthorized: true
            }
          : undefined,
        morphology: {
          growthHabit: values.growthHabit || "unknown",
          leafArrangement: values.leafArrangement || "unknown",
          leafType: values.leafType || "unknown",
          leafMargin: values.leafMargin || "unknown",
          venation: values.venation || "unknown",
          flowerPresent: values.flowerPresent || "unknown",
          flowerSymmetry: values.flowerSymmetry || "unknown",
          fruitPresent: values.fruitPresent || "unknown",
          stemTraits: stringList(values.stemTraits),
          flowerPartsVisible: stringList(values.flowerPartsVisible),
          inflorescenceType: values.inflorescenceType || "",
          fruitType: values.fruitType || "",
          specialStructures: stringList(values.specialStructures),
          sensoryTraits: stringList(values.sensoryTraits)
        },
        evidenceAssetIds: uploadedEvidence.evidenceAssetIds,
        mediaEvidence: uploadedEvidence.media
      })}
      buildMetrics={(outputs) => [
        { key: "crop", label: "Working identity", value: outputs.likelyCrop },
        { key: "family", label: "Likely family", value: outputs.likelyFamily || "-" },
        {
          key: "scientific",
          label: "Scientific name",
          value: outputs.scientificName || "-"
        },
        { key: "confidence", label: "Confidence", value: outputs.confidence },
        {
          key: "vision",
          label: "Photos inspected",
          value: outputs.imageAnalysis?.performed
            ? String(
                outputs.imageAnalysis.photosAnalyzed ||
                  outputs.imageAnalysis.photoCount ||
                  1
              )
            : "0"
        },
        {
          key: "verification",
          label: "External verification",
          value:
            outputs.sourceVerification?.status === "verified"
              ? "Recorded"
              : "Not performed"
        },
        {
          key: "confirm",
          label: "Needs confirmation",
          value: outputs.userConfirmationRequired ? "Yes" : "No"
        }
      ]}
      buildNotices={(outputs) => {
        const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
        return [
          ...(outputs.identityConflictDetected || outputs.confidence === "low"
            ? [
                {
                  key: "identity-confidence",
                  severity: "high" as const,
                  message: outputs.identityConflictDetected
                    ? "Identity not verified: the proposed names conflicted or included an unusable scientific name. Treat this result as low confidence and provide clearer leaf, flower, fruit, stem, and whole-plant evidence before confirming it."
                    : "Low-confidence identity: do not rely on this plant name yet. Review the missing evidence and upload the requested views before confirming it."
                }
              ]
            : []),
          {
            key: "image-analysis-status",
            severity: outputs.imageAnalysis?.performed
              ? ("info" as const)
              : ("medium" as const),
            message: outputs.imageAnalysis?.performed
              ? `${outputs.imageAnalysis.providerLabel || "AI vision"} inspected ${
                  outputs.imageAnalysis.photosAnalyzed ||
                  outputs.imageAnalysis.photoCount ||
                  1
                } uploaded photo${
                  Number(
                    outputs.imageAnalysis.photosAnalyzed ||
                      outputs.imageAnalysis.photoCount ||
                      1
                  ) === 1
                    ? ""
                    : "s"
                }. The result is still a draft until you confirm it.`
              : outputs.imageAnalysis?.requested
                ? "The uploaded photo pixels were not analyzed. Try again with image-capable AI, or enter visible traits manually."
                : "No photo was analyzed. This result uses only the information entered in the form."
          },
          ...warnings.map((message: unknown, index: number) => ({
            key: `warning-${index}`,
            severity: "medium" as const,
            message: String(message)
          }))
        ];
      }}
      buildDetails={(outputs) => <PlantIdentificationResultDetails outputs={outputs} />}
      defaultLogTitle={(outputs) =>
        `Crop identity: ${outputs.likelyCrop || "unconfirmed crop"}`
      }
      defaultTask={(outputs) => ({
        title: outputs.userConfirmationRequired
          ? "Confirm crop identity"
          : "Review crop profile context",
        description:
          outputs.recommendationContext ||
          "Confirm species/crop profile before applying crop-specific guidance.",
        priority: outputs.userConfirmationRequired ? "high" : "medium",
        ...cropIdentityCalendarMetadata("crop_identity_confirmation")
      })}
      buildActions={({
        outputs,
        payload,
        toolRun,
        moduleRecord,
        growId,
        plantContext
      }) => {
        const cropCommonName = String(
          outputs.likelyCrop || payload.userEnteredName || ""
        ).trim();
        const invalidIdentity =
          !cropCommonName || /^(unknown crop|not confirmed)$/i.test(cropCommonName);
        const target = plantContext.plantId ? "Plant" : "Grow";
        const identity = {
          growId,
          cropCommonName,
          scientificName: String(
            outputs.scientificName || payload.scientificName || ""
          ).trim(),
          commonNames: stringList(outputs.commonNames || payload.commonNames),
          cultivar: String(
            outputs.cultivarOrStrain || outputs.cultivar || payload.cultivar || ""
          ).trim(),
          cropProfileId: outputs.cropProfileSuggestion?.cropProfileId || null,
          confidence: "user_confirmed",
          sourceToolRunId: String(toolRun?.id || toolRun?._id || "") || null,
          userConfirmed: true as const
        };

        const actions: ToolResultAction[] = [
          {
            key: "confirm-crop-identity",
            label: growId ? `Confirm & Save to ${target}` : "Confirm in Saved Run",
            pendingLabel: "Saving...",
            disabled: invalidIdentity,
            successMessage: growId
              ? `Confirmed crop identity saved to ${target.toLowerCase()}.`
              : "Confirmed identity saved to this run.",
            onPress: async () => {
              if (growId && plantContext.plantId) {
                await savePersonalPlantCropIdentity(plantContext.plantId, identity);
              } else if (growId) {
                await savePersonalGrowCropIdentity(growId, identity);
              }
              await recordCropIdentificationDecision({
                decision: "accepted",
                outputs,
                toolRun,
                moduleRecord
              });
            }
          },
          {
            key: "crop-identity-uncertain",
            label: "Mark as Not Sure",
            variant: "secondary" as const,
            pendingLabel: "Saving...",
            successMessage:
              "Saved as uncertain. Add the requested evidence before confirming.",
            onPress: () =>
              recordCropIdentificationDecision({
                decision: "uncertain",
                outputs,
                toolRun,
                moduleRecord
              })
          },
          {
            key: "crop-identity-rejected",
            label: "Mark as Doesn't Match",
            variant: "secondary" as const,
            pendingLabel: "Saving...",
            successMessage: "Saved as rejected for future outcome review.",
            onPress: () =>
              recordCropIdentificationDecision({
                decision: "rejected",
                outputs,
                toolRun,
                moduleRecord
              })
          }
        ];

        if (growId) {
          actions.push({
            key: "create-crop-identity-tasks",
            label: "Create Crop Identity Tasks",
            variant: "secondary" as const,
            pendingLabel: "Creating...",
            successMessage: "Created crop identity tasks.",
            onPress: async () => {
              const result = await saveToolRunAndCreateTasks({
                growId,
                ...plantContext.toolRunContext,
                toolKey: "species-crop-id",
                toolRunId: toolRun?.id || toolRun?._id,
                input: payload,
                output: outputs,
                tasks: speciesCropTaskPlan(outputs)
              });
              if (!result.ok) throw new Error(result.error);
            }
          });
        }
        if (selectedFieldStudyId) {
          actions.push({
            key: "save-field-observation",
            label: savedFieldObservationId
              ? wantsNatureMap
                ? "Update Approximate Nature Pin"
                : savedFieldObservationPublished
                  ? "Withdraw Nature Pin & Save Privately"
                  : "Update Field Study Draft"
              : wantsNatureMap
                ? "Publish Approximate Pin to Nature"
                : "Save Draft to Field Study",
            variant: "secondary" as const,
            pendingLabel: savedFieldObservationId
              ? "Updating observation..."
              : wantsNatureMap
                ? "Publishing pin..."
                : "Saving...",
            successMessage: wantsNatureMap
              ? "Observation published. Open Nature to verify its viewer-eligible public pin and photos."
              : savedFieldObservationPublished
                ? "The public pin was withdrawn and the observation was saved privately."
                : "Observation saved as a Field Study draft.",
            onPress: async () => {
              if (publishObservation && uploadedEvidence.images.length === 0) {
                throw new Error(
                  "Add at least one fully uploaded photo before publishing an observation."
                );
              }
              if (wantsNatureMap && !observationLocation) {
                throw new Error(
                  "Use Current Location before publishing an approximate Nature map pin."
                );
              }
              if (wantsNatureMap && selectedFieldStudy?.visibility !== "public") {
                throw new Error(
                  "Make the selected Field Study public before publishing its Nature map pin."
                );
              }
              const draft = outputs.identificationDraft || {};
              const media = uploadedEvidence.media;
              const confidence = ["low", "medium", "high"].includes(
                String(outputs.confidence || draft.confidence || "").toLowerCase()
              )
                ? String(outputs.confidence || draft.confidence).toLowerCase()
                : "low";
              const cannabisObservation = isCannabisGenusIdentification(outputs);
              if (wantsNatureMap && cannabisObservation && !cannabisMapConsent) {
                throw new Error(
                  "Confirm the Cannabis/hemp public-context choice before publishing this pin."
                );
              }
              if (wantsNatureMap && cannabisMapConsent && !cannabisObservation) {
                throw new Error(
                  "The AI candidate does not support Cannabis genus. Turn off the Cannabis/hemp confirmation or review the identity first."
                );
              }
              const cannabisContextConfirmed =
                wantsNatureMap && cannabisObservation && cannabisMapConsent;
              const observationInput = {
                sourceToolRunId: String(toolRun?.id || toolRun?._id || "") || null,
                growId: growId || null,
                title:
                  String(outputs.likelyCrop || payload.userEnteredName || "").trim() ||
                  "Unconfirmed plant observation",
                observationDate:
                  payload.observationContext?.observationDate || new Date().toISOString(),
                identity: {
                  commonName: String(
                    outputs.likelyCrop || payload.userEnteredName || ""
                  ).trim(),
                  scientificName: String(outputs.scientificName || "").trim(),
                  family: String(outputs.likelyFamily || draft.likelyFamily || "").trim(),
                  confidence: confidence as "low" | "medium" | "high",
                  verificationStatus: "ai_candidate" as const,
                  evidence: stringList(draft.evidence),
                  counterEvidence: stringList(draft.counterEvidence),
                  missingEvidence: [
                    ...stringList(draft.missingEvidence),
                    ...stringList(draft.requiredNextPhotos),
                    ...stringList(draft.requiredNextQuestions)
                  ],
                  candidates: (Array.isArray(draft.candidates)
                    ? draft.candidates
                    : []
                  ).map((candidate: any) => ({
                    commonName: stringList(candidate.commonNames)[0] || "",
                    scientificName: String(candidate.scientificName || ""),
                    confidence: candidate.confidence || "low",
                    evidence: stringList(candidate.evidence),
                    counterEvidence: stringList(candidate.counterEvidence)
                  }))
                },
                observationContext: payload.observationContext || {},
                evidenceAssets: media.map((item) => ({
                  assetId: item.id,
                  url: item.url,
                  kind: item.type === "video" ? ("video" as const) : ("photo" as const),
                  label: item.purpose
                })),
                photoUrls: media
                  .filter((item) => item.type === "photo")
                  .map((item) => item.url),
                location: {
                  ...(observationLocation || {}),
                  label: wantsNatureMap
                    ? ""
                    : String(payload.observationContext?.region || ""),
                  privacy: locationPrivacy,
                  exactLocationPublicConfirmed: false
                },
                publication: {
                  status: publishObservation
                    ? ("published" as const)
                    : savedFieldObservationPublished
                      ? ("withdrawn" as const)
                      : ("draft" as const),
                  sensitiveSpecies,
                  cannabisContextConfirmed,
                  publicNotes: ""
                }
              };
              let observationId = savedFieldObservationId;
              let locationNotice = "";
              if (observationId) {
                const updated = await updateFieldObservation(
                  selectedFieldStudyId,
                  observationId,
                  observationInput
                );
                observationId = String(updated.id || updated._id || observationId);
              } else {
                const created = await createFieldObservation(
                  selectedFieldStudyId,
                  observationInput
                );
                observationId = String(
                  created.observation?.id || created.observation?._id || "saved"
                );
                locationNotice = created.locationNotice || "";
              }
              setSavedFieldObservationId(observationId);
              setSavedFieldObservationPublished(publishObservation);
              setFieldStudyNotice(
                locationNotice ||
                  (wantsNatureMap
                    ? "The observation was published. Open Nature to verify its public, viewer-eligible map card and photos."
                    : savedFieldObservationPublished
                      ? "The public Nature pin was withdrawn. The Field Study observation is no longer public."
                      : "The observation was saved to the selected Field Study.")
              );
            }
          });
        }
        return actions;
      }}
    />
  );
}

export function createSpeciesCropIdStyles(palette: ThemePalette) {
  return StyleSheet.create({
    evidenceSection: { gap: 8 },
    evidenceTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
    evidenceGuidance: { color: palette.textMuted, lineHeight: 19 },
    fieldStudySection: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: 12,
      borderWidth: 1,
      gap: 9,
      marginTop: 8,
      padding: 13
    },
    fieldLabel: { color: palette.text, fontSize: 13, fontWeight: "800" },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    choiceButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 7
    },
    choiceButtonSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    sensitiveButtonSelected: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.warning
    },
    choiceText: { color: palette.text, fontSize: 12, fontWeight: "700" },
    choiceTextSelected: { color: palette.accentText },
    createStudyRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    studyInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      color: palette.text,
      flexGrow: 1,
      minHeight: 42,
      minWidth: 210,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    secondaryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    inlineLink: { alignSelf: "flex-start", paddingVertical: 3 },
    readinessPanel: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      gap: 7,
      padding: 11
    },
    confirmationPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: 10,
      borderWidth: 1,
      gap: 9,
      padding: 11
    },
    statusGood: { color: palette.success, fontWeight: "700", lineHeight: 19 },
    statusWarning: { color: palette.warning, fontWeight: "700", lineHeight: 19 },
    fieldStudyError: { color: palette.danger, lineHeight: 19 },
    fieldMapLink: { gap: 8, marginTop: 4 }
  });
}
