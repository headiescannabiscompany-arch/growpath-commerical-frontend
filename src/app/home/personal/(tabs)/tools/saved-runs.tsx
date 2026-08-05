import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  archiveToolRun,
  createTaskFromToolRun,
  getToolRun,
  listToolRuns,
  saveToolRunToLog,
  updateToolRun,
  type ToolRun
} from "@/api/toolRuns";
import {
  createFieldObservation,
  getFieldStudy,
  updateFieldObservation,
  type FieldObservation,
  type FieldStudy
} from "@/api/fieldStudies";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import ToolResultSurface, {
  type ToolResultAction,
  type ToolResultMetric,
  type ToolResultNotice
} from "@/features/personal/tools/ToolResultSurface";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { savedRunBackTarget } from "@/features/personal/tools/savedRunRoutes";
import {
  coordinatesFromToolRun,
  privateFieldObservationFromToolRun
} from "@/features/personal/tools/fieldObservationDraft";
import {
  requestCurrentCoordinates,
  type PublicCoordinates
} from "@/utils/locationSearch";

const TOOL_FILTERS = [
  { label: "All", value: "" },
  { label: "Plant ID", value: "species_crop_id" },
  { label: "IPM", value: "ipm_scout" },
  { label: "Harvest", value: "harvest_readiness" },
  { label: "Pheno", value: "pheno_hunt" },
  { label: "Steering", value: "crop_steering_project" },
  { label: "NPK", value: "npk_recipe" },
  { label: "Dry/Cure", value: "dry_cure_guard" }
];

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function idFor(run: ToolRun) {
  return String(run?._id || run?.id || "");
}

function formatDate(value?: string) {
  return value ? String(value).slice(0, 10) : "unsaved";
}

function labelize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

function formatValue(value: unknown) {
  if (value == null || value === "") return "-";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return "{...}";
  return String(value);
}

function runOutputs(run: ToolRun | null): Record<string, any> {
  return (run?.outputs || run?.result || {}) as Record<string, any>;
}

function runInputs(run: ToolRun | null): Record<string, any> {
  return (run?.inputs || run?.input || run?.params || {}) as Record<string, any>;
}

function isSpeciesCropRun(run: ToolRun | null) {
  const type = String(run?.toolType || run?.toolName || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
  return type === "species_crop_id" || type === "species_crop_identification";
}

function isDryCureRun(run: ToolRun | null) {
  const type = String(run?.toolType || run?.toolName || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
  return type === "dry_cure_guard";
}

function isCloneRootingRun(run: ToolRun | null) {
  const type = String(run?.toolType || run?.toolName || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
  return type === "clone_rooting";
}

function isTissueCultureRun(run: ToolRun | null) {
  const type = String(run?.toolType || run?.toolName || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
  return type === "tissue_culture";
}

function unresolvedSavedCropName(value: unknown) {
  return /^(not confirmed|not identified|unidentified|unknown(?: crop)?|unsure|uncertain|n\/a|none)$/i.test(
    String(value || "").trim()
  );
}

function savedUserCorrection(outputs: Record<string, any>) {
  const correction =
    outputs.userCorrection && typeof outputs.userCorrection === "object"
      ? outputs.userCorrection
      : null;
  const commonName = String(correction?.commonName || "").trim();
  return commonName ? { ...correction, commonName } : null;
}

function savedCropCandidate(outputs: Record<string, any>) {
  const correction = savedUserCorrection(outputs);
  if (correction) return correction.commonName;
  const suppliedName = String(outputs.likelyCrop || "").trim();
  if (suppliedName && !unresolvedSavedCropName(suppliedName)) return suppliedName;
  const commonNames = Array.isArray(outputs.commonNames)
    ? outputs.commonNames
    : String(outputs.commonNames || "").split(/[,;\n]/);
  return (
    commonNames
      .map((candidate: unknown) => String(candidate || "").trim())
      .find((candidate: string) => candidate && !unresolvedSavedCropName(candidate)) ||
    suppliedName ||
    "-"
  );
}

function displayOutputsFor(run: ToolRun | null) {
  const outputs = runOutputs(run);
  if (!isSpeciesCropRun(run)) return outputs;
  const correction = savedUserCorrection(outputs);
  return {
    ...outputs,
    likelyCrop: savedCropCandidate(outputs),
    scientificName: correction
      ? correction.scientificName || null
      : outputs.scientificName,
    confidence: correction ? "user_corrected" : outputs.confidence,
    userConfirmationRequired: correction ? false : outputs.userConfirmationRequired
  };
}

function metricsFor(run: ToolRun | null): ToolResultMetric[] {
  const outputs = runOutputs(run);
  if (isSpeciesCropRun(run)) {
    const correction = savedUserCorrection(outputs);
    const imageAnalysis =
      outputs.imageAnalysis && typeof outputs.imageAnalysis === "object"
        ? outputs.imageAnalysis
        : {};
    const suppliedPhotoCount = Number(
      imageAnalysis.photosAnalyzed || imageAnalysis.photoCount || 0
    );
    const photoCount =
      Number.isFinite(suppliedPhotoCount) && suppliedPhotoCount > 0
        ? Math.floor(suppliedPhotoCount)
        : 0;
    return [
      { key: "crop", label: "Likely crop", value: savedCropCandidate(outputs) },
      {
        key: "scientific",
        label: "Scientific name",
        value: correction
          ? correction.scientificName || "-"
          : outputs.scientificName || "-"
      },
      {
        key: "confidence",
        label: "Confidence",
        value: correction ? "user corrected" : outputs.confidence || "-"
      },
      {
        key: "photos",
        label: "Photos inspected",
        value: imageAnalysis.performed ? String(photoCount || 1) : "0"
      },
      {
        key: "quality",
        label: "Image quality",
        value: imageAnalysis.performed
          ? imageAnalysis.quality || "not provided"
          : "not analyzed"
      },
      {
        key: "confirm",
        label: "Needs confirmation",
        value: correction ? "No" : outputs.userConfirmationRequired ? "Yes" : "No"
      }
    ];
  }
  if (isDryCureRun(run)) {
    const inputs = runInputs(run);
    const stageTiming =
      outputs.stageTiming && typeof outputs.stageTiming === "object"
        ? outputs.stageTiming
        : {};
    const mode = String(outputs.mode || inputs.mode || "").toLowerCase();
    return [
      {
        key: "assessment",
        label: "Assessment",
        value: outputs.assessmentStatus || "Not assessed"
      },
      {
        key: "mold",
        label: "Mold concern",
        value: outputs.moldRisk || "Not assessed"
      },
      {
        key: "overdry",
        label: "Overdry concern",
        value: outputs.overdryRisk || "Not assessed"
      },
      {
        key: "light",
        label: "Light protection",
        value: outputs.lightStatus || inputs.lightExposure || "Not recorded"
      },
      {
        key: "stage-day",
        label: "Day in stage",
        value: formatValue(outputs.daysInStage ?? inputs.daysInStage)
      },
      {
        key: "timing",
        label: "Stage timing",
        value:
          mode === "drying"
            ? "Plan 10-14 days; 24h is a recheck"
            : "Measurement-based; 24h is a recheck"
      },
      {
        key: "completion",
        label: "Completion basis",
        value:
          stageTiming.completionStatus === "not_determined_by_clock"
            ? "Measurements, not elapsed time"
            : formatValue(stageTiming.completionStatus)
      }
    ];
  }
  if (isCloneRootingRun(run)) {
    const counts =
      outputs.batchCounts && typeof outputs.batchCounts === "object"
        ? outputs.batchCounts
        : {};
    const performance =
      outputs.clonePerformanceSummary &&
      typeof outputs.clonePerformanceSummary === "object"
        ? outputs.clonePerformanceSummary
        : {};
    const observations =
      outputs.observations && typeof outputs.observations === "object"
        ? outputs.observations
        : {};
    return [
      {
        key: "assessment",
        label: "Evidence status",
        value: outputs.assessmentStatus || "Not assessed"
      },
      {
        key: "risk",
        label: "Batch concern",
        value: outputs.riskLevel || "Not assessed"
      },
      {
        key: "progress",
        label: "Visible progress",
        value: outputs.rootingProgress || "Not assessed"
      },
      {
        key: "rooted",
        label: "Visibly rooted",
        value:
          counts.rooted != null && counts.total != null
            ? `${counts.rooted}/${counts.total} (${performance.rootingPercent ?? 0}%)`
            : "Not assessed"
      },
      {
        key: "failed",
        label: "Failed / culled",
        value:
          counts.failed != null && counts.total != null
            ? `${counts.failed}/${counts.total} (${performance.failurePercent ?? 0}%)`
            : "Not assessed"
      },
      {
        key: "pending",
        label: "Still pending",
        value:
          counts.pending != null && counts.total != null
            ? `${counts.pending}/${counts.total}`
            : "Not assessed"
      },
      {
        key: "root-evidence",
        label: "Direct root evidence",
        value: observations.rootEvidence || "Not checked"
      }
    ];
  }
  if (isTissueCultureRun(run)) {
    const vesselStatus =
      outputs.vesselStatus && typeof outputs.vesselStatus === "object"
        ? outputs.vesselStatus
        : {};
    const releaseReview =
      outputs.releaseReview && typeof outputs.releaseReview === "object"
        ? outputs.releaseReview
        : {};
    return [
      {
        key: "assessment",
        label: "Evidence status",
        value: outputs.assessmentStatus || "Not assessed"
      },
      {
        key: "release",
        label: "Release review",
        value: releaseReview.status || "Not assessed"
      },
      {
        key: "lane-stage",
        label: "Lane / stage",
        value:
          [outputs.workflowLane, outputs.stage].filter(Boolean).join(" / ") ||
          "Not recorded"
      },
      {
        key: "contamination",
        label: "Contaminated vessels",
        value:
          vesselStatus.contaminated != null && vesselStatus.total != null
            ? `${vesselStatus.contaminated}/${vesselStatus.total} (${vesselStatus.contaminationPercent ?? 0}%)`
            : "Not assessed"
      },
      {
        key: "fungal-like",
        label: "Fungal-like appearance",
        value:
          vesselStatus.fungalLikeAppearance != null && vesselStatus.total != null
            ? `${vesselStatus.fungalLikeAppearance}/${vesselStatus.total} (${vesselStatus.fungalLikeAppearancePercent ?? 0}%)`
            : "Not assessed"
      },
      {
        key: "rooted",
        label: "Rooted vessels",
        value:
          vesselStatus.rooted != null && vesselStatus.total != null
            ? `${vesselStatus.rooted}/${vesselStatus.total} (${vesselStatus.rootedPercent ?? 0}%)`
            : "Not assessed"
      },
      {
        key: "missing",
        label: "Missing evidence items",
        value: Array.isArray(outputs.missingInformation)
          ? outputs.missingInformation.length
          : "Not assessed"
      },
      {
        key: "protocol-survival",
        label: "Protocol survival",
        value:
          outputs.protocolSurvivalRate == null
            ? "Not recorded"
            : `${outputs.protocolSurvivalRate}%`
      },
      {
        key: "acclimation-survival",
        label: "Acclimation survival",
        value:
          outputs.acclimationRate == null ? "Not recorded" : `${outputs.acclimationRate}%`
      }
    ];
  }
  const entries = Object.entries(outputs)
    .filter(([, value]) => value != null && typeof value !== "object")
    .slice(0, 6);
  return entries.length
    ? entries.map(([key, value]) => ({
        key,
        label: labelize(key),
        value: formatValue(value)
      }))
    : [{ key: "status", label: "Status", value: run?.status || "completed" }];
}

function noticesFor(run: ToolRun | null): ToolResultNotice[] {
  const outputs = runOutputs(run);
  const imageAnalysis =
    outputs.imageAnalysis && typeof outputs.imageAnalysis === "object"
      ? outputs.imageAnalysis
      : null;
  const provenance: ToolResultNotice[] = [];

  if (isSpeciesCropRun(run)) {
    const candidate = savedCropCandidate(outputs);
    const correction = savedUserCorrection(outputs);
    if (correction) {
      provenance.push({
        key: "crop-id-user-correction",
        severity: "high",
        message: `User correction: ${correction.commonName}. The original AI draft was rejected. Exact scientific species remains unverified; add a whole-plant photo, full leaf and underside with stem node, open flower, and any fruit or seed structure for a new AI review.`
      });
    }
    if (unresolvedSavedCropName(outputs.likelyCrop) && candidate !== "-") {
      provenance.push({
        key: "crop-id-working-candidate",
        severity: "info",
        message: `Working identification candidate: ${candidate}. Exact species remains unconfirmed; confirm the identity before applying crop-specific guidance.`
      });
    }
  }

  if (isDryCureRun(run)) {
    const inputs = runInputs(run);
    const realisticNotes = String(outputs.realisticNotes || "").trim();
    if (realisticNotes) {
      provenance.push({
        key: "dry-cure-stage-timing",
        severity: "info",
        message: realisticNotes
      });
    }

    const lightExposure = String(
      outputs.lightExposure || inputs.lightExposure || ""
    ).trim();
    const lightStatus = String(outputs.lightStatus || "").trim();
    if (lightExposure || lightStatus) {
      provenance.push({
        key: "dry-cure-light-evidence",
        severity: lightStatus === "quality_concern" ? "medium" : "info",
        message: `Saved light condition: ${lightExposure || "not recorded"}. Light protection assessment: ${lightStatus || "not assessed"}.`
      });
    }
  }

  if (isCloneRootingRun(run)) {
    const bottlenecks = Array.isArray(outputs.likelyBottlenecks)
      ? outputs.likelyBottlenecks
      : [];
    bottlenecks.slice(0, 6).forEach((item: any, index: number) => {
      provenance.push({
        key: `clone-bottleneck-${item?.key || index}`,
        severity: ["high", "medium", "low"].includes(item?.severity)
          ? item.severity
          : "medium",
        message: [item?.issue || String(item), item?.evidence].filter(Boolean).join(" "),
        remediation: Array.isArray(item?.recommendations)
          ? item.recommendations.join(" ")
          : undefined
      });
    });
    provenance.push({
      key: "clone-hidden-root-limit",
      severity: "info",
      message:
        "Elapsed time and top growth do not prove hidden roots or automatic failure. This saved result keeps visible roots, callus, failed cuts, and pending cuts separate."
    });
    const missing = Array.isArray(outputs.missingInformation)
      ? outputs.missingInformation.filter(Boolean)
      : [];
    if (missing.length) {
      provenance.push({
        key: "clone-missing-evidence",
        severity: "medium",
        message: `Still needed for a complete measured review: ${missing.join(", ")}.`
      });
    }
    const media =
      outputs.mediaAnalysis && typeof outputs.mediaAnalysis === "object"
        ? outputs.mediaAnalysis
        : null;
    if (media?.requested) {
      provenance.push({
        key: "clone-photo-provenance",
        severity: media.performed ? "info" : "medium",
        message: media.performed
          ? `${media.providerLabel || "AI clone photo review"} inspected ${media.photosAnalyzed || 0} photo(s). Quality: ${media.quality || "not provided"}.`
          : "Clone photos were attached, but this saved result does not claim that their pixels were analyzed."
      });
    }
  }

  if (isTissueCultureRun(run)) {
    const failureModes = Array.isArray(outputs.diagnosisRecord?.likelyFailureModes)
      ? outputs.diagnosisRecord.likelyFailureModes
      : [];
    failureModes.forEach((item: any, index: number) => {
      provenance.push({
        key: `tc-failure-${item?.key || index}`,
        severity: item?.severity === "high" ? "high" : "medium",
        message: [item?.issue || String(item), item?.evidence].filter(Boolean).join(" "),
        remediation: Array.isArray(item?.nextChecks)
          ? item.nextChecks.join(" ")
          : undefined
      });
    });
    const releaseBlockers = Array.isArray(outputs.releaseReview?.blockers)
      ? outputs.releaseReview.blockers
      : [];
    releaseBlockers.forEach((message: string, index: number) => {
      provenance.push({
        key: `tc-release-blocker-${index}`,
        severity: "high",
        message: `Release blocker: ${message}.`
      });
    });
    const missing = Array.isArray(outputs.missingInformation)
      ? outputs.missingInformation.filter(Boolean)
      : [];
    if (missing.length) {
      provenance.push({
        key: "tc-missing-evidence",
        severity: "medium",
        message: `Still needed for a complete traceable review: ${missing.join(", ")}.`
      });
    }
    const media =
      outputs.mediaAnalysis && typeof outputs.mediaAnalysis === "object"
        ? outputs.mediaAnalysis
        : null;
    if (media?.requested) {
      provenance.push({
        key: "tc-photo-provenance",
        severity: media.performed ? "info" : "medium",
        message: media.performed
          ? `${media.providerLabel || "AI tissue culture photo review"} inspected ${media.photosAnalyzed || 0} photo(s). Quality: ${media.quality || "not provided"}.`
          : "Tissue-culture media was attached, but this saved result does not claim that photo pixels were analyzed."
      });
    }
    const limitations = [
      ...(Array.isArray(outputs.diagnosisRecord?.limitations)
        ? outputs.diagnosisRecord.limitations
        : []),
      ...(Array.isArray(media?.limitations) ? media.limitations : []),
      ...(Array.isArray(outputs.limitations) ? outputs.limitations : [])
    ]
      .map(String)
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index);
    limitations.slice(0, 5).forEach((message, index) => {
      provenance.push({
        key: `tc-limitation-${index}`,
        severity: "info",
        message
      });
    });
    if (Array.isArray(outputs.storageReminders)) {
      outputs.storageReminders.forEach((message: string, index: number) => {
        provenance.push({
          key: `tc-storage-${index}`,
          severity: "info",
          message
        });
      });
    }
  }

  if (isSpeciesCropRun(run) && imageAnalysis?.performed) {
    const suppliedPhotoCount = Number(
      imageAnalysis.photosAnalyzed || imageAnalysis.photoCount || 1
    );
    const photoCount =
      Number.isFinite(suppliedPhotoCount) && suppliedPhotoCount > 0
        ? Math.floor(suppliedPhotoCount)
        : 1;
    const provider =
      imageAnalysis.providerLabel || imageAnalysis.provider || "AI image review";
    const model = imageAnalysis.providerModel
      ? ` Model: ${imageAnalysis.providerModel}.`
      : "";
    const evidence = Array.isArray(imageAnalysis.evidenceUsed)
      ? imageAnalysis.evidenceUsed.map(String).filter(Boolean)
      : [];
    provenance.push({
      key: "crop-id-image-provenance",
      severity: "info",
      message: `${provider} inspected ${photoCount} uploaded photo${
        photoCount === 1 ? "" : "s"
      }. Image quality: ${imageAnalysis.quality || "not provided"}.${model}${
        evidence.length ? ` Evidence: ${evidence.join(", ")}.` : ""
      }`
    });

    const visibleTraits = String(
      outputs.identifyingVisualTraits || imageAnalysis.identifyingVisualTraits || ""
    ).trim();
    if (visibleTraits) {
      provenance.push({
        key: "crop-id-visible-traits",
        severity: "info",
        message: `Visible identification traits: ${visibleTraits}`
      });
    }

    const limitations = [
      ...(Array.isArray(outputs.limitations) ? outputs.limitations : []),
      ...(Array.isArray(imageAnalysis.limitations) ? imageAnalysis.limitations : [])
    ]
      .map(String)
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index);
    if (limitations.length) {
      provenance.push({
        key: "crop-id-limitations",
        severity: "medium",
        message: `Limitations: ${limitations.join(" ")}`
      });
    }
  } else if (isSpeciesCropRun(run) && imageAnalysis?.requested) {
    provenance.push({
      key: "crop-id-image-not-analyzed",
      severity: "medium",
      message:
        "Photos were attached to this run, but the saved result does not attest that their pixels were analyzed."
    });
  }

  const hasStructuredCloneBottlenecks =
    isCloneRootingRun(run) &&
    Array.isArray(outputs.likelyBottlenecks) &&
    outputs.likelyBottlenecks.length > 0;
  const hasStructuredTissueCultureNotices =
    isTissueCultureRun(run) &&
    (Boolean(outputs.diagnosisRecord?.likelyFailureModes?.length) ||
      Boolean(outputs.releaseReview?.blockers?.length));
  const warnings =
    hasStructuredCloneBottlenecks || hasStructuredTissueCultureNotices
      ? []
      : run?.warnings || [];

  return [
    ...provenance,
    ...warnings.map((message, index) => ({
      key: `warning-${index}`,
      severity: "medium" as const,
      message
    }))
  ];
}

function runTitle(run: ToolRun | null) {
  const type = run?.toolType || run?.toolName || "tool";
  return labelize(type);
}

export default function SavedToolRunsScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createSavedToolRunsStyles(palette), [palette]);
  const params = useLocalSearchParams<{
    growId?: string | string[];
    runId?: string | string[];
    toolType?: string | string[];
    toolRunId?: string | string[];
    sourceContext?: string | string[];
    sourceTaskId?: string | string[];
    fieldStudyId?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(params.growId), [params.growId]);
  const initialToolType = useMemo(() => coerceParam(params.toolType), [params.toolType]);
  const targetToolRunId = useMemo(
    () => coerceParam(params.toolRunId) || coerceParam(params.runId),
    [params.runId, params.toolRunId]
  );
  const sourceContext = useMemo(
    () => coerceParam(params.sourceContext),
    [params.sourceContext]
  );
  const sourceTaskId = useMemo(
    () => coerceParam(params.sourceTaskId),
    [params.sourceTaskId]
  );
  const fieldStudyId = useMemo(
    () => coerceParam(params.fieldStudyId),
    [params.fieldStudyId]
  );
  const sourceBackTarget = useMemo(
    () => savedRunBackTarget({ growId, sourceContext, sourceTaskId }),
    [growId, sourceContext, sourceTaskId]
  );
  const backTarget = fieldStudyId
    ? `/home/personal/field-studies/${fieldStudyId}`
    : sourceBackTarget;
  const [toolType, setToolType] = useState(initialToolType);
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ToolRun | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [correctionDraft, setCorrectionDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [fieldStudy, setFieldStudy] = useState<FieldStudy | null>(null);
  const [fieldObservations, setFieldObservations] = useState<FieldObservation[]>([]);
  const [fieldStudyLoading, setFieldStudyLoading] = useState(false);
  const [fieldStudyFeedback, setFieldStudyFeedback] = useState("");
  const [fieldCoordinates, setFieldCoordinates] = useState<PublicCoordinates | null>(
    null
  );
  const [capturingFieldLocation, setCapturingFieldLocation] = useState(false);
  const [savingFieldObservation, setSavingFieldObservation] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pendingFocusRunIdRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    const rows = await listToolRuns({
      growId: growId || undefined,
      toolType: toolType || undefined
    });
    setRuns(rows);
    setLoading(false);
  }, [growId, toolType]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    let active = true;
    if (!fieldStudyId) {
      setFieldStudy(null);
      setFieldObservations([]);
      setFieldStudyFeedback("");
      return () => {
        active = false;
      };
    }

    setFieldStudyLoading(true);
    setFieldStudy(null);
    setFieldObservations([]);
    setFieldStudyFeedback("");
    void getFieldStudy(fieldStudyId)
      .then((response) => {
        if (!active) return;
        setFieldStudy(response.study);
        setFieldObservations(response.observations);
      })
      .catch((fieldStudyError: any) => {
        if (!active) return;
        setFieldStudy(null);
        setFieldObservations([]);
        setFieldStudyFeedback(
          fieldStudyError?.message || "This Field Study could not be loaded."
        );
      })
      .finally(() => {
        if (active) setFieldStudyLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fieldStudyId]);

  useEffect(() => {
    setFieldCoordinates(selectedRun ? coordinatesFromToolRun(selectedRun) : null);
  }, [selectedRun]);

  const selectRun = useCallback(async (run: ToolRun) => {
    const id = idFor(run);
    if (!id) return;
    pendingFocusRunIdRef.current = id;
    setFeedback("");
    const full = await getToolRun(id);
    const nextRun = full || run;
    setSelectedRun(nextRun);
    setSummaryDraft(nextRun.summary || "");
    const nextOutputs = runOutputs(nextRun);
    const correction = savedUserCorrection(nextOutputs);
    setCorrectionDraft(
      isSpeciesCropRun(nextRun)
        ? correction?.commonName || savedCropCandidate(nextOutputs)
        : ""
    );
    if (!full) setFeedback("Unable to reload this run; showing cached list data.");
  }, []);

  useEffect(() => {
    if (!targetToolRunId || loading) return;
    if (selectedRun && idFor(selectedRun) === targetToolRunId) return;
    const matchingRun = runs.find((run) => idFor(run) === targetToolRunId);
    if (matchingRun) {
      void selectRun(matchingRun);
      return;
    }
    void (async () => {
      pendingFocusRunIdRef.current = targetToolRunId;
      setFeedback("");
      const full = await getToolRun(targetToolRunId);
      if (!full) {
        setFeedback("Unable to find the requested saved run.");
        return;
      }
      setSelectedRun(full);
      setSummaryDraft(full.summary || "");
      const fullOutputs = runOutputs(full);
      const correction = savedUserCorrection(fullOutputs);
      setCorrectionDraft(
        isSpeciesCropRun(full)
          ? correction?.commonName || savedCropCandidate(fullOutputs)
          : ""
      );
    })();
  }, [loading, runs, selectedRun, selectRun, targetToolRunId]);

  async function saveSummary() {
    const id = selectedRun ? idFor(selectedRun) : "";
    if (!id) return;
    const updated = await updateToolRun(id, { summary: summaryDraft });
    if (!updated) {
      setFeedback("Unable to update this saved run.");
      return;
    }
    setSelectedRun(updated);
    setSummaryDraft(updated.summary || "");
    await load();
    setFeedback("Saved run updated.");
  }

  async function saveIdentificationCorrection() {
    const id = selectedRun ? idFor(selectedRun) : "";
    const commonName = correctionDraft.trim();
    if (!id || !selectedRun || !isSpeciesCropRun(selectedRun)) return;
    if (!commonName || commonName === "-") {
      setFeedback("Enter the corrected common plant name first.");
      return;
    }

    const currentOutputs = runOutputs(selectedRun);
    const correctedAt = new Date().toISOString();
    const requiredPhotoRequests = [
      "A new whole-plant photo showing overall growth habit and scale",
      "A sharp full-leaf photo plus the leaf underside and stem node",
      "A sharp open-flower close-up and any fruit or seed structure on the same plant"
    ];
    const requiredNextPhotos = Array.from(
      new Set([
        ...requiredPhotoRequests,
        ...(Array.isArray(currentOutputs.requiredNextPhotos)
          ? currentOutputs.requiredNextPhotos
          : [])
      ])
    );
    const nextOutputs = {
      ...currentOutputs,
      userCorrection: {
        status: "user_corrected",
        commonName,
        scientificName: null,
        correctedAt,
        previousLikelyCrop: currentOutputs.likelyCrop || null,
        previousScientificName: currentOutputs.scientificName || null
      },
      confidence: "user_corrected",
      userConfirmationRequired: false,
      confirmationRequired: false,
      requiredNextPhotos,
      missingInformation: Array.from(
        new Set([
          ...requiredNextPhotos,
          ...(Array.isArray(currentOutputs.missingInformation)
            ? currentOutputs.missingInformation
            : [])
        ])
      )
    };
    const summary = `User-corrected identity: ${commonName}. The original AI draft was rejected. Exact scientific species remains unverified; new whole-plant, leaf, flower, and fruit/seed photos are requested.`;
    const updated = await updateToolRun(id, {
      outputs: nextOutputs,
      confidence: "user_corrected",
      summary
    });
    if (!updated) {
      setFeedback("Unable to save this identification correction.");
      return;
    }
    setSelectedRun(updated);
    setSummaryDraft(updated.summary || summary);
    setCorrectionDraft(commonName);
    await load();
    setFeedback(
      "Identification correction saved. Add the requested photos for a new AI review."
    );
  }

  async function archiveSelectedRun() {
    const id = selectedRun ? idFor(selectedRun) : "";
    if (!id) return;
    const ok = await archiveToolRun(id);
    if (!ok) {
      setFeedback("Unable to archive this saved run.");
      return;
    }
    setSelectedRun(null);
    setSummaryDraft("");
    setFeedback("Saved run archived.");
    await load();
  }

  async function capturePrivateFieldLocation() {
    const id = selectedRun ? idFor(selectedRun) : "";
    if (!id || !selectedRun || !isSpeciesCropRun(selectedRun)) return;
    setCapturingFieldLocation(true);
    setFieldStudyFeedback("");
    try {
      const coordinates = await requestCurrentCoordinates();
      let currentObservations = fieldObservations;
      if (fieldStudyId) {
        try {
          const refreshedStudy = await getFieldStudy(fieldStudyId);
          setFieldStudy(refreshedStudy.study);
          setFieldObservations(refreshedStudy.observations);
          currentObservations = refreshedStudy.observations;
        } catch {
          // Keep the already loaded study state; the update call below remains authoritative.
        }
      }
      const linkedObservation = currentObservations.find(
        (observation) => String(observation.sourceToolRunId || "") === id
      );
      let linkedPrivacy = "";
      if (linkedObservation && fieldStudyId) {
        const observationId = String(linkedObservation.id || linkedObservation._id || "");
        if (observationId) {
          const currentPrivacy = linkedObservation.location?.privacy || "private";
          const nextPrivacy =
            currentPrivacy === "public_exact" ? "private" : currentPrivacy;
          try {
            const updatedObservation = await updateFieldObservation(
              fieldStudyId,
              observationId,
              {
                location: {
                  ...linkedObservation.location,
                  ...coordinates,
                  precision: "exact",
                  privacy: nextPrivacy,
                  exactLocationPublicConfirmed: false
                }
              }
            );
            setFieldObservations((current) =>
              current.map((observation) =>
                String(observation.id || observation._id || "") === observationId
                  ? updatedObservation
                  : observation
              )
            );
            linkedPrivacy = nextPrivacy;
          } catch (observationLocationError: any) {
            setFieldStudyFeedback(
              observationLocationError?.message ||
                "Location was received but could not be saved to the linked Field Study observation. No Plant ID history was changed."
            );
            return;
          }
        }
      }
      const nextInputs = {
        ...runInputs(selectedRun),
        capturedLocation: {
          ...coordinates,
          privacy: "private",
          userAuthorized: true,
          capturedAt: new Date().toISOString()
        }
      };
      const updated = await updateToolRun(id, {
        inputs: nextInputs,
        input: nextInputs,
        params: nextInputs
      });
      if (!updated) {
        setFieldStudyFeedback(
          linkedObservation
            ? `Location was saved to ${fieldStudy?.title || "the linked Field Study"}, but the Plant ID history could not be updated.`
            : "Location was not saved, so it will not be attached to this observation."
        );
        return;
      }
      setSelectedRun(updated);
      setRuns((current) => current.map((run) => (idFor(run) === id ? updated : run)));
      setFieldCoordinates(coordinates);
      if (linkedObservation) {
        const studyTitle = fieldStudy?.title || "the linked Field Study";
        setFieldStudyFeedback(
          linkedPrivacy === "public_approximate"
            ? `Exact location updated for this Plant ID and ${studyTitle}; Nature still receives only an approximate point.`
            : linkedPrivacy === "collaborators"
              ? `Current location saved to this Plant ID and shared only with the ${studyTitle} team. It is not on Nature.`
              : `Current location saved privately to this Plant ID and ${studyTitle}. It is not on Nature.`
        );
        return;
      }
      setFieldStudyFeedback(
        "Current location saved privately to this Plant ID. It is not on Nature."
      );
    } catch (locationError: any) {
      setFieldStudyFeedback(
        locationError?.message || "Current location could not be captured."
      );
    } finally {
      setCapturingFieldLocation(false);
    }
  }

  async function savePrivateFieldObservation() {
    const id = selectedRun ? idFor(selectedRun) : "";
    const canEditStudy =
      fieldStudy?.accessRole === "owner" || fieldStudy?.accessRole === "editor";
    if (!id || !selectedRun || !fieldStudyId || !fieldStudy || !canEditStudy) return;
    const alreadyLinked = fieldObservations.some(
      (observation) => String(observation.sourceToolRunId || "") === id
    );
    if (alreadyLinked) {
      setFieldStudyFeedback(
        `This identification is already saved privately to ${fieldStudy.title}.`
      );
      return;
    }

    setSavingFieldObservation(true);
    setFieldStudyFeedback("");
    try {
      const created = await createFieldObservation(
        fieldStudyId,
        privateFieldObservationFromToolRun(selectedRun, fieldCoordinates)
      );
      setFieldObservations((current) => [created.observation, ...current]);
      setFieldStudyFeedback(`Saved privately to ${fieldStudy.title} — not on Nature.`);
    } catch (saveError: any) {
      setFieldStudyFeedback(
        saveError?.message || "This identification could not be added to the Field Study."
      );
    } finally {
      setSavingFieldObservation(false);
    }
  }

  const selectedRunId = selectedRun ? idFor(selectedRun) : "";
  const selectedRunAlreadyLinked = Boolean(
    selectedRunId &&
    fieldObservations.some(
      (observation) => String(observation.sourceToolRunId || "") === selectedRunId
    )
  );
  const actions: ToolResultAction[] = selectedRunId
    ? [
        {
          key: "save-log",
          label: "Save to Grow Log",
          variant: "secondary",
          pendingLabel: "Saving...",
          successMessage: "Saved to grow log.",
          onPress: () => saveToolRunToLog(selectedRunId)
        },
        {
          key: "create-task",
          label: "Create Task",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Task created.",
          onPress: () => createTaskFromToolRun(selectedRunId)
        },
        {
          key: "archive",
          label: "Archive Run",
          variant: "secondary",
          pendingLabel: "Archiving...",
          successMessage: "Archived.",
          onPress: archiveSelectedRun
        }
      ]
    : [];

  return (
    <ScreenBoundary
      title="Saved Tool Runs"
      showBack
      backFallbackHref={backTarget}
      preferBackFallback={backTarget !== "/home/personal/tools"}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Saved Tool Runs
          </Text>
          <Text style={styles.subtitle}>
            Reopen, annotate, archive, and continue from saved GrowPath results.
          </Text>
          <PersonalFeedPlacement
            placement="top"
            routeKey="personal_tools_saved_runs"
            longContent
          />
          {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
        </View>

        <View style={styles.filters}>
          {TOOL_FILTERS.map((filter) => {
            const active = toolType === filter.value;
            return (
              <Pressable
                key={filter.value || "all"}
                accessibilityRole="button"
                onPress={() => setToolType(filter.value)}
                style={[styles.chip, active && styles.chipOn]}
              >
                <Text style={[styles.chipText, active && styles.chipTextOn]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedRun ? (
          <View
            style={styles.selectedResult}
            onLayout={(event) => {
              if (pendingFocusRunIdRef.current !== selectedRunId) return;
              pendingFocusRunIdRef.current = "";
              scrollRef.current?.scrollTo({
                y: Math.max(0, event.nativeEvent.layout.y - 12),
                animated: false
              });
            }}
          >
            <Text
              style={styles.selectedLabel}
              accessibilityLabel={`Opened exact saved tool result ${selectedRunId}`}
            >
              {targetToolRunId === selectedRunId
                ? "Opened from source link"
                : "Selected result"}
            </Text>
            <ToolResultSurface
              title={`${runTitle(selectedRun)} result`}
              status={selectedRun.status || "completed"}
              summary={selectedRun.summary || ""}
              metrics={metricsFor(selectedRun)}
              inputs={selectedRun.inputs || selectedRun.input || selectedRun.params || {}}
              outputs={displayOutputsFor(selectedRun)}
              notices={noticesFor(selectedRun)}
              recommendations={selectedRun.recommendations || []}
              formulas={selectedRun.formulas || []}
              uncertainty={selectedRun.uncertainty || null}
              confidence={selectedRun.confidence || null}
              actions={actions}
              feedback={feedback}
              copyPayload={selectedRun}
            />
            {isSpeciesCropRun(selectedRun) ? (
              <View style={styles.editor}>
                <Text style={styles.label}>Correct this identification</Text>
                <Text style={styles.subtitle}>
                  Save the common identity you know. GrowPath preserves the rejected AI
                  draft, leaves the exact scientific species unverified, and asks for the
                  photos needed for a fresh review.
                </Text>
                <TextInput
                  accessibilityLabel="Corrected plant or crop name"
                  value={correctionDraft}
                  onChangeText={setCorrectionDraft}
                  style={styles.input}
                  placeholder="Enter corrected common plant name"
                  placeholderTextColor={palette.textMuted}
                  selectionColor={palette.accent}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={saveIdentificationCorrection}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>Save Identification Correction</Text>
                </Pressable>
              </View>
            ) : null}
            {isSpeciesCropRun(selectedRun) && fieldStudyId ? (
              <View style={styles.studyPanel}>
                <Text style={styles.cardTitle}>
                  Add this identification to a Field Study
                </Text>
                {fieldStudyLoading ? (
                  <ActivityIndicator color={palette.accent} />
                ) : fieldStudy ? (
                  <>
                    <Text style={styles.cardText}>
                      Save this historical result to {fieldStudy.title} as a private
                      draft. It will not appear on Nature unless you deliberately publish
                      it later.
                    </Text>
                    <Text style={styles.statusText}>
                      {fieldCoordinates
                        ? "A device location is saved privately with this Plant ID."
                        : "No location is saved. You can still create a private observation."}
                    </Text>
                    {fieldStudy.accessRole === "owner" ||
                    fieldStudy.accessRole === "editor" ? (
                      <View style={styles.buttonRow}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={capturingFieldLocation || savingFieldObservation}
                          onPress={capturePrivateFieldLocation}
                          style={[
                            styles.secondary,
                            (capturingFieldLocation || savingFieldObservation) &&
                              styles.disabled
                          ]}
                        >
                          <Text style={styles.secondaryText}>
                            {capturingFieldLocation
                              ? "Getting Location..."
                              : "Use Current Location"}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={savingFieldObservation || selectedRunAlreadyLinked}
                          onPress={savePrivateFieldObservation}
                          style={[
                            styles.primary,
                            (savingFieldObservation || selectedRunAlreadyLinked) &&
                              styles.disabled
                          ]}
                        >
                          <Text style={styles.primaryText}>
                            {selectedRunAlreadyLinked
                              ? "Already Linked"
                              : savingFieldObservation
                                ? "Saving..."
                                : "Save Private Observation"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.feedback}>
                        Only the study owner or an editor can add observations.
                      </Text>
                    )}
                    <Link href={`/home/personal/field-studies/${fieldStudyId}`} asChild>
                      <Pressable accessibilityRole="link">
                        <Text style={styles.context}>Open {fieldStudy.title}</Text>
                      </Pressable>
                    </Link>
                  </>
                ) : null}
                {fieldStudyFeedback ? (
                  <Text accessibilityRole="alert" style={styles.feedback}>
                    {fieldStudyFeedback}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View style={styles.editor}>
              <Text style={styles.label}>Summary / note</Text>
              <TextInput
                value={summaryDraft}
                onChangeText={setSummaryDraft}
                multiline
                style={styles.input}
                placeholder="Add a short note for this saved run"
                placeholderTextColor={palette.textMuted}
                selectionColor={palette.accent}
              />
              <Pressable
                accessibilityRole="button"
                onPress={saveSummary}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>Save Note</Text>
              </Pressable>
            </View>
          </View>
        ) : feedback ? (
          <Text style={styles.feedback}>{feedback}</Text>
        ) : null}

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_tools_saved_runs"
          longContent
        />

        <Text style={styles.sectionTitle}>Saved run history</Text>

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : runs.length ? (
          <View style={styles.list}>
            {runs.map((run) => {
              const active = selectedRunId && selectedRunId === idFor(run);
              return (
                <Pressable
                  key={idFor(run)}
                  accessibilityLabel={
                    active
                      ? `Selected saved tool run ${idFor(run)}`
                      : `Saved tool run ${idFor(run)}`
                  }
                  accessibilityRole="button"
                  onPress={() => selectRun(run)}
                  style={[styles.card, active && styles.cardOn]}
                >
                  <Text style={styles.cardTitle}>{runTitle(run)}</Text>
                  <Text style={styles.meta}>
                    {formatDate(run.createdAt)} | {run.growId || "No grow"}
                  </Text>
                  <Text style={styles.cardText} numberOfLines={2}>
                    {run.summary ||
                      JSON.stringify(run.outputs || run.result || {}).slice(0, 180)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No saved runs</Text>
            <Text style={styles.cardText}>
              Run a tool and it will appear here as a saved ToolRun record.
            </Text>
          </View>
        )}

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_saved_runs"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

export const createSavedToolRunsStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 48, gap: 14 },
    header: { gap: 6 },
    title: { color: palette.text, fontSize: 24, fontWeight: "800" },
    subtitle: { color: palette.textMuted, lineHeight: 20 },
    context: { color: palette.link, fontWeight: "800" },
    filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    selectedResult: {
      gap: 12,
      borderWidth: 2,
      borderColor: palette.accent,
      borderRadius: radius.card,
      backgroundColor: palette.accentSoft,
      padding: 12
    },
    selectedLabel: { color: palette.link, fontSize: 12, fontWeight: "800" },
    sectionTitle: { color: palette.text, fontSize: 18, fontWeight: "800" },
    chip: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surface
    },
    chipOn: { borderColor: palette.accent, backgroundColor: palette.accent },
    chipText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    chipTextOn: { color: palette.accentText },
    list: { gap: 10 },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted,
      padding: 12,
      gap: 5
    },
    cardOn: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    cardTitle: { color: palette.text, fontWeight: "800" },
    cardText: { color: palette.textMuted, lineHeight: 19 },
    meta: { color: palette.textSoft, fontSize: 12, fontWeight: "700" },
    editor: { gap: 8 },
    studyPanel: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    statusText: { color: palette.textSoft, lineHeight: 20 },
    label: { color: palette.textSoft, fontSize: 12, fontWeight: "800" },
    input: {
      minHeight: 82,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      color: palette.text,
      padding: 10,
      textAlignVertical: "top"
    },
    primary: {
      alignSelf: "flex-start",
      borderRadius: radius.card,
      backgroundColor: palette.accent,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    secondary: {
      alignSelf: "flex-start",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryText: { color: palette.text, fontWeight: "800" },
    disabled: { opacity: 0.55 },
    feedback: { color: palette.textSoft, fontWeight: "700" }
  });
