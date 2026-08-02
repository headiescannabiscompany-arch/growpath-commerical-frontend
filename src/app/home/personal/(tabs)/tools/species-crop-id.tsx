import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import PlantIdentificationResultDetails from "@/features/personal/tools/PlantIdentificationResultDetails";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import { savePersonalGrowCropIdentity } from "@/api/grows";
import { savePersonalPlantCropIdentity } from "@/api/plants";
import {
  createFieldObservation,
  FieldStudy,
  listFieldStudies,
  ObservationLocationPrivacy
} from "@/api/fieldStudies";
import { requestCurrentCoordinates } from "@/utils/locationSearch";
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

Return useful broader candidates when exact species is unresolved. Cannabis is an allowed crop candidate from deliberately submitted evidence. A clear cannabis flower or harvested bud may support a crop-level Cannabis draft from visible bracts/calyxes, pistils, resinous sugar leaves, trichome coverage, and inflorescence structure. Never infer cultivar or strain from appearance.

Do not claim that GBIF, USDA PLANTS, Kew POWO, iNaturalist, a flora, herbarium, or extension source was checked; this image step has no botanical-database lookup. Do not invent source records, range matches, or expert confirmation. If the evidence supports a genus but not an exact species, use a genus-level scientific draft such as "Mandevilla spp." and keep nursery or common synonyms such as "Dipladenia" in commonNames. Never put an English common-name phrase such as "rose plant" in scientificName. If names conflict, a proposed name is unusable, or the current views cannot separate lookalikes, set visualConfidence and candidate confidence to low and request a new whole-plant view, full leaf and underside with stem node, open flower, and any fruit or seed structure present. If pixels are unavailable, set imageAnalysisPerformed to "false". Every result remains a draft until the user confirms it.

Return JSON only with exactly these keys:
{
  "userEnteredName": "string",
  "scientificName": "string",
  "cultivar": "",
  "commonNames": "comma-separated string",
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

function normalizeCropIdentityPrefillField({
  fieldKey,
  value,
  parsed
}: {
  fieldKey: string;
  value: unknown;
  parsed: Record<string, any>;
}) {
  if (fieldKey === "scientificName") return normalizeScientificName(value);
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
  const [observationLocation, setObservationLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationPrivacy, setLocationPrivacy] =
    useState<ObservationLocationPrivacy>("private");
  const [publishObservation, setPublishObservation] = useState(false);
  const [sensitiveSpecies, setSensitiveSpecies] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [fieldStudyError, setFieldStudyError] = useState("");

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

  return (
    <BackendCalculatorToolScreen
      tool="species-crop-id"
      toolKey="species-crop-id"
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
          <View style={styles.fieldStudySection}>
            <Text style={styles.evidenceTitle}>Optional — Add to a Field Study</Text>
            <Text style={styles.evidenceGuidance}>
              A Field Study lets invited botanists edit or verify the same observations.
              Public viewing never grants edit access. This observation starts as a draft
              unless you deliberately select Publish.
            </Text>
            {!fieldStudies.length ? (
              <Link href="/home/personal/field-studies" asChild>
                <Pressable accessibilityRole="link" style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Create a Field Study</Text>
                </Pressable>
              </Link>
            ) : (
              <View style={styles.choiceRow}>
                {fieldStudies.map((study) => {
                  const id = String(study.id || study._id || "");
                  const selected = selectedFieldStudyId === id;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={id}
                      onPress={() => setSelectedFieldStudyId(selected ? "" : id)}
                      style={[
                        styles.choiceButton,
                        selected && styles.choiceButtonSelected
                      ]}
                    >
                      <Text
                        style={[styles.choiceText, selected && styles.choiceTextSelected]}
                      >
                        {study.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {selectedFieldStudyId ? (
              <>
                <Pressable
                  disabled={locationBusy}
                  onPress={async () => {
                    setLocationBusy(true);
                    setFieldStudyError("");
                    try {
                      setObservationLocation(await requestCurrentCoordinates());
                    } catch (locationError: any) {
                      setFieldStudyError(
                        locationError?.message || "Current location is unavailable."
                      );
                    } finally {
                      setLocationBusy(false);
                    }
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {locationBusy
                      ? "Reading location..."
                      : observationLocation
                        ? "Location added"
                        : "Use Current Location"}
                  </Text>
                </Pressable>
                <Text style={styles.fieldLabel}>Who can see these coordinates?</Text>
                <View style={styles.choiceRow}>
                  {(
                    [
                      ["private", "Only me"],
                      ["collaborators", "Study team"],
                      ["public_approximate", "Public approximate"]
                    ] as const
                  ).map(([value, label]) => (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: locationPrivacy === value }}
                      key={value}
                      onPress={() => setLocationPrivacy(value)}
                      style={[
                        styles.choiceButton,
                        locationPrivacy === value && styles.choiceButtonSelected
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          locationPrivacy === value && styles.choiceTextSelected
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.choiceRow}>
                  <Pressable
                    onPress={() => setPublishObservation((value) => !value)}
                    style={[
                      styles.choiceButton,
                      publishObservation && styles.choiceButtonSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        publishObservation && styles.choiceTextSelected
                      ]}
                    >
                      {publishObservation ? "Published observation" : "Draft observation"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSensitiveSpecies((value) => !value)}
                    style={[
                      styles.choiceButton,
                      sensitiveSpecies && styles.sensitiveButtonSelected
                    ]}
                  >
                    <Text style={styles.choiceText}>
                      {sensitiveSpecies
                        ? "Sensitive species: yes"
                        : "Sensitive species: no"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
            {fieldStudyError ? (
              <Text style={styles.fieldStudyError}>{fieldStudyError}</Text>
            ) : null}
            <View style={styles.fieldMapLink}>
              <Text style={styles.evidenceGuidance}>
                See public, opt-in observations on the shared field map. Personal details
                and cannabis observations stay excluded from public map pins.
              </Text>
              <Link href="/field-observations" asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Explore the public field observation map"
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Explore public field map</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      )}
      aiPrefill={{
        buttonLabel: "Identify Plant from Photos",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        isReady: () => providerEvidencePayload(evidenceAssets).images.length > 0,
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
        evidenceAssetIds: providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        mediaEvidence: providerEvidencePayload(evidenceAssets).media
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
          {
            key: "image-analysis-status",
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

        const actions = [
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
            label: publishObservation
              ? "Publish to Field Study"
              : "Save Draft to Field Study",
            variant: "secondary" as const,
            pendingLabel: publishObservation ? "Publishing..." : "Saving...",
            successMessage: publishObservation
              ? "Observation published to the Field Study."
              : "Observation saved as a private Field Study draft.",
            onPress: async () => {
              if (publishObservation && evidenceAssets.length === 0) {
                throw new Error(
                  "Add at least one photo or video before publishing an observation."
                );
              }
              const draft = outputs.identificationDraft || {};
              const media = providerEvidencePayload(evidenceAssets).media;
              const confidence = ["low", "medium", "high"].includes(
                String(outputs.confidence || draft.confidence || "").toLowerCase()
              )
                ? String(outputs.confidence || draft.confidence).toLowerCase()
                : "low";
              await createFieldObservation(selectedFieldStudyId, {
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
                  verificationStatus: "ai_candidate",
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
                  kind: item.type === "video" ? "video" : "photo",
                  label: item.purpose
                })),
                photoUrls: media
                  .filter((item) => item.type === "photo")
                  .map((item) => item.url),
                location: {
                  ...(observationLocation || {}),
                  label: String(payload.observationContext?.region || ""),
                  privacy: locationPrivacy,
                  exactLocationPublicConfirmed: false
                },
                publication: {
                  status: publishObservation ? "published" : "draft",
                  sensitiveSpecies,
                  publicNotes: ""
                }
              });
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
    fieldStudyError: { color: palette.danger, lineHeight: 19 },
    fieldMapLink: { gap: 8, marginTop: 4 }
  });
}
