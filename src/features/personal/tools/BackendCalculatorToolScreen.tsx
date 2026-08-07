import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import CalendarDateField from "@/components/forms/CalendarDateField";
import FeedBanner from "@/components/feed/FeedBanner";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import {
  createGrowpathModuleRecord,
  getGrowpathModuleRecord,
  type GrowpathModuleRecord
} from "@/api/growpathModules";
import { listGrows, listPersonalGrows } from "@/api/grows";
import { fetchCommercialGrows } from "@/api/commercialWorkflows";
import {
  askPersonalAssistant,
  type PersonalAssistantResponse
} from "@/api/personalAssistant";
import { runCalculator, type CalculatorTool, type ToolRun } from "@/api/toolRuns";
import { useEntitlements } from "@/entitlements";
import { LockedScreen } from "@/entitlements/LockedScreen";
import { personalToolFeatures, type FeatureDefinition } from "@/config/featureStatus";
import { getFeedBannerPolicy } from "@/utils/feedPolicy";
import { hasLocalPaidPreviewOverride } from "@/utils/localPaidPreview";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import { TOOL_FEATURE_KEY_BY_TOOL_KEY } from "@/features/personal/tools/toolFeatureKeys";
import ToolResultSurface, {
  type ToolResultAction,
  type ToolResultMetric,
  type ToolResultNotice
} from "@/features/personal/tools/ToolResultSurface";
import ResultQuestionCard from "@/features/personal/tools/ResultQuestionCard";
import {
  saveToolRunAndCreateLog,
  saveToolRunAndCreateTask
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { buildModuleRecordInput } from "@/features/personal/tools/moduleRecordPersistence";
import { inferEvidenceReview } from "@/features/personal/evidence/evidenceReview";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import {
  resolveToolWorkspaceType,
  toolWorkspaceIdentity
} from "@/features/personal/tools/toolWorkspaceScope";

type ToolField = {
  key: string;
  label: string;
  defaultValue: string;
  keyboardType?: "default" | "numeric";
  inputType?: "text" | "date" | "datetime";
  multiline?: boolean;
  placeholder?: string;
  helpText?: string;
  section?: string;
  required?: boolean;
  options?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
};

type SelectableGrow = {
  id?: string;
  _id?: string;
  name?: string;
  growName?: string;
};

export type ExternalAiDraft = {
  /**
   * Identifies the evidence/workspace/grow snapshot used to produce this draft.
   * The draft is ignored when it does not match externalAiDraftScopeKey.
   */
  scopeKey: string;
  /** Identifies the specific analysis/receipt within the matching scope. */
  revisionKey: string;
  /** Optional extra guard for tools whose active grow can change in-place. */
  growId?: string;
  values: Record<string, unknown>;
  metadata?: Record<string, any>;
};

type BackendCalculatorToolScreenProps = {
  tool: CalculatorTool;
  toolKey: string;
  title: string;
  subtitle: string;
  pageHeadingLevel?: 1 | 2;
  growOptional?: boolean;
  noGrowContextMessage?: string;
  backFallbackHref?: string;
  feedRouteKey?: string;
  externalInputKey?: string;
  externalAiDraftScopeKey?: string;
  externalAiDraft?: ExternalAiDraft | null;
  onToolRunChange?: (toolRun: ToolRun | null) => void;
  executionBlocked?: boolean;
  executionBlockedMessage?: string;
  onExecutionBusyChange?: (busy: boolean) => void;
  formHeader?:
    | React.ReactNode
    | ((context: {
        growId: string;
        plantId: string;
        facilityId: string;
        commercialAccountId: string;
        workspaceType: "personal" | "commercial" | "facility";
      }) => React.ReactNode);
  status?: string;
  runLabel?: string;
  runAccessibilityLabel?: string;
  experienceMessage?: string;
  aiCreditMessage?: string;
  fields: ToolField[];
  validateValues?: (
    values: Record<string, string>,
    context?: {
      metadata: Record<string, any>;
      source: "manual" | "prefill";
    }
  ) => string | null;
  buildPayload: (
    values: Record<string, string>,
    context: {
      growId: string;
      facilityId: string;
      commercialAccountId: string;
      workspaceType: "personal" | "commercial" | "facility";
      plantContext: ReturnType<typeof useToolPlantContext>;
      userValues: Record<string, string>;
    }
  ) => Record<string, any>;
  buildMetrics?: (outputs: Record<string, any>) => ToolResultMetric[];
  buildNotices?: (
    outputs: Record<string, any>,
    context: { payload: Record<string, any> }
  ) => ToolResultNotice[];
  buildDetails?: (outputs: Record<string, any>) => React.ReactNode;
  prepareOutputsForDisplay?: (outputs: Record<string, any>) => Record<string, any>;
  defaultLogTitle: (outputs: Record<string, any>) => string;
  defaultTask?: (outputs: Record<string, any>) =>
    | {
        title: string;
        description?: string;
        priority?: "low" | "medium" | "high";
        dueDate?: string;
        endAt?: string;
        allDay?: boolean;
        calendarType?: string;
        sourceStage?: string;
        reminderPlan?: Record<string, any>;
        recurrence?: Record<string, any> | string;
      }
    | undefined;
  buildActions?: (context: {
    outputs: Record<string, any>;
    payload: Record<string, any>;
    toolRun: ToolRun | null;
    moduleRecord: GrowpathModuleRecord | null;
    growId: string;
    facilityId: string;
    commercialAccountId: string;
    workspaceType: "personal" | "commercial" | "facility";
    plantContext: ReturnType<typeof useToolPlantContext>;
  }) => ToolResultAction[];
  assistantBrief?: {
    title: string;
    description: string;
    buttonLabel: string;
    accessibilityLabel: string;
    briefTitle: string;
    buildBrief: (context: {
      values: Record<string, string>;
      payload: Record<string, any>;
      growId: string;
      plantContext: ReturnType<typeof useToolPlantContext>;
    }) => string;
  };
  aiPrefill?: {
    buttonLabel?: string;
    clearUnfilled?: boolean;
    preserveAllExistingFields?: boolean;
    preserveExistingFields?: string[];
    evidenceAssetIds?: () => string[];
    isReady?: () => boolean;
    notReadyMessage?: string;
    prepare?: () => void | Promise<void>;
    buildMessage: (context: {
      growId: string;
      plantId: string;
      values: Record<string, string>;
    }) => string;
    normalizeFieldValue?: (context: {
      fieldKey: string;
      value: unknown;
      parsed: Record<string, any>;
      response: PersonalAssistantResponse;
      evidenceAssetIds: string[];
    }) => string | undefined;
    runAfterPrefill?: boolean;
    buildPayloadMetadata?: (context: {
      response: PersonalAssistantResponse;
      parsed: Record<string, any>;
      evidenceAssetIds: string[];
    }) => Record<string, any>;
    buildImmediateResult?: (outputs: Record<string, any>) => {
      tone: "success" | "warning" | "error";
      title: string;
      description: string;
      details?: string[];
    } | null;
  };
  resultFollowUp?: {
    workflow: "plant-id-follow-up" | "ipm-result-follow-up";
    evidenceAssetIds?: () => string[];
    suggestions: (context: {
      outputs: Record<string, any>;
      payload: Record<string, any>;
      toolRun: ToolRun;
      growId: string;
      plantId: string;
      workspaceType: "personal" | "commercial" | "facility";
    }) => string[];
  };
};

const RUN_LABELS: Record<string, string> = {
  "auto-grow-calendar": "Build Calendar",
  "clone-rooting": "Review Rooting",
  "crop-steering-project": "Review Steering Plan",
  "dry-amendment-mix": "Calculate Blend",
  "dry-cure-guard": "Check Dry / Cure Risk",
  "genetics-inventory": "Review Genetics",
  "harvest-readiness": "Estimate Readiness",
  "ipm-scout": "Analyze Scout",
  "nutrient-source-comparison": "Compare Sources",
  "ph-ec-check": "Check pH / EC",
  "pheno-hunt": "Compare Phenotypes",
  "run-comparison": "Compare Runs",
  "soil-builder": "Build Soil Mix",
  "soil-nutrient-batch": "Build Production Batch",
  "species-crop-id": "Review Entered Identity",
  "stress-test": "Score Recovery",
  "tissue-culture": "Review TC Batch",
  "topdress-plan": "Build Topdress Plan"
};

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function tomorrow(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "-";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(", ") : "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function defaultMetrics(outputs: Record<string, any>): ToolResultMetric[] {
  return Object.entries(outputs)
    .filter(
      ([, value]) => value == null || typeof value !== "object" || Array.isArray(value)
    )
    .slice(0, 6)
    .map(([key, value]) => ({
      key,
      label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "),
      value: formatValue(value)
    }));
}

function defaultNotices(outputs: Record<string, any>): ToolResultNotice[] {
  const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
  return warnings.map((message, index) => ({
    key: `warning-${index}`,
    severity: "medium",
    message: String(message)
  }));
}

function outputSummary(outputs: Record<string, any>) {
  return JSON.stringify(outputs, null, 2).slice(0, 3000);
}

function normalizedPrefillText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.length ? JSON.stringify(value, null, 2) : "";
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function parseAssistantObject(reply: unknown) {
  const raw = String(reply || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced || raw;
  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try {
    const parsed = JSON.parse(source.slice(firstBrace, lastBrace + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : null;
  } catch {
    return null;
  }
}

export { tomorrow };

export default function BackendCalculatorToolScreen({
  tool,
  toolKey,
  title,
  subtitle,
  pageHeadingLevel = 2,
  growOptional = false,
  noGrowContextMessage,
  backFallbackHref = "/home/personal/tools",
  feedRouteKey,
  externalInputKey = "",
  externalAiDraftScopeKey = "",
  externalAiDraft = null,
  onToolRunChange,
  executionBlocked = false,
  executionBlockedMessage = "Finish the current action before running this tool.",
  onExecutionBusyChange,
  formHeader,
  status = "CALCULATED",
  runLabel: runLabelOverride,
  runAccessibilityLabel,
  experienceMessage,
  aiCreditMessage: aiCreditMessageOverride,
  fields,
  validateValues,
  buildPayload,
  buildMetrics = defaultMetrics,
  buildNotices = defaultNotices,
  buildDetails,
  prepareOutputsForDisplay,
  defaultLogTitle,
  defaultTask,
  buildActions,
  assistantBrief,
  aiPrefill,
  resultFollowUp
}: BackendCalculatorToolScreenProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createBackendCalculatorStyles(palette), [palette]);
  const routeParams = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
    facilityId?: string | string[];
    commercialAccountId?: string | string[];
    workspace?: string | string[];
    workspaceType?: string | string[];
  }>();
  const params = routeParams as typeof routeParams &
    Record<string, string | string[] | undefined>;
  const entitlements = useEntitlements();
  const requestedGrowId = coerceParam(params.growId);
  const routeFacilityId = coerceParam(params.facilityId);
  const commercialAccountId = coerceParam(params.commercialAccountId);
  const requestedWorkspaceType = (
    coerceParam(params.workspaceType) || coerceParam(params.workspace)
  )
    .trim()
    .toLowerCase();
  const workspaceType = resolveToolWorkspaceType({
    entitlementMode: entitlements.mode,
    requestedWorkspaceType,
    facilityId: routeFacilityId,
    commercialAccountId
  });
  const facilityId =
    workspaceType === "facility"
      ? entitlements.mode === "facility" && entitlements.facilityId
        ? String(entitlements.facilityId)
        : routeFacilityId
      : "";
  const workspaceIdentityKey = toolWorkspaceIdentity({
    workspaceType,
    facilityId,
    commercialAccountId
  });
  const routeGrowId = requestedGrowId;
  const routePlantId = workspaceType === "personal" ? coerceParam(params.plantId) : "";
  const [availableGrows, setAvailableGrows] = useState<SelectableGrow[]>([]);
  const [growId, setGrowId] = useState(workspaceType === "personal" ? routeGrowId : "");
  const plantContext = useToolPlantContext(
    growId,
    routePlantId,
    workspaceType === "personal"
  );
  const paidPreviewOverride = hasLocalPaidPreviewOverride();
  const plan = paidPreviewOverride ? "pro" : entitlements.plan || "free";
  const isFreePlan = !paidPreviewOverride && String(plan).toLowerCase() === "free";
  const feature = personalToolFeatures.find(
    (item) => item.key === TOOL_FEATURE_KEY_BY_TOOL_KEY[toolKey]
  ) as FeatureDefinition | undefined;
  const requiredCapability = feature?.capabilityKey || null;
  const betaLockedForFree = feature?.status === "beta" && isFreePlan;
  const capabilityLocked =
    !paidPreviewOverride &&
    Boolean(requiredCapability) &&
    !entitlements.can(String(requiredCapability));
  const locked = betaLockedForFree || capabilityLocked;
  const bannerPolicy = getFeedBannerPolicy({
    routeKey: feedRouteKey || `personal_tool_${toolKey}`,
    plan,
    mode: entitlements.mode,
    longContent: true
  });
  const aiPrefillReady = aiPrefill?.isReady?.() ?? true;
  const isCropIdentification = tool === "species-crop-id";
  const experience = feature?.experience;
  const runLabel = runLabelOverride || RUN_LABELS[toolKey] || "Calculate Result";
  const experienceMode =
    experienceMessage ||
    (experience
      ? {
          ai: "AI analyzes the supplied evidence.",
          ai_assisted:
            "AI can help fill evidence, but the final result is calculated from the values you review.",
          calculated:
            "The result is calculated from the measurements and records you enter.",
          guided: "The tool turns the information you enter into a reviewable workflow.",
          library: "The tool creates reusable records for other GrowPath workflows."
        }[experience.mode]
      : aiPrefill
        ? "AI prefill is optional; the final result is calculated from the values you review."
        : "The result is calculated from the measurements and records you enter.");
  const aiCreditMessage =
    aiCreditMessageOverride ||
    (experience
      ? experience.aiCredits === "required"
        ? "This workflow uses AI credits."
        : experience.aiCredits === "optional"
          ? "AI credits are used only when you run the AI step. The calculator itself does not use an AI credit."
          : "This workflow does not use AI credits."
      : aiPrefill
        ? "AI credits are used only when you choose the AI prefill step."
        : "The calculator does not use AI credits.");

  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          coerceParam(params[field.key]) || field.defaultValue
        ])
      ),
    [fields, params]
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [outputs, setOutputs] = useState<Record<string, any> | null>(null);
  const [toolRun, setToolRun] = useState<ToolRun | null>(null);
  const [moduleRecord, setModuleRecord] = useState<GrowpathModuleRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [assistantBriefText, setAssistantBriefText] = useState("");
  const [prefilling, setPrefilling] = useState(false);
  const [aiPrefillPayload, setAiPrefillPayload] = useState<Record<string, any>>({});
  const aiPrefilledFieldKeys = useMemo(
    () =>
      new Set(
        Array.isArray(aiPrefillPayload.aiPrefillProvenance?.prefilledFields)
          ? aiPrefillPayload.aiPrefillProvenance.prefilledFields.map(String)
          : []
      ),
    [aiPrefillPayload]
  );
  const immediateAiResult =
    outputs && aiPrefill?.buildImmediateResult
      ? aiPrefill.buildImmediateResult(outputs)
      : null;
  // A grow change is an evidence/context revision. In-flight AI work and prior
  // calculated output must never cross from one grow into another.
  const executionInputKey = `${workspaceIdentityKey}::grow:${growId || "none"}::plant:${plantContext.plantId || "none"}::${externalInputKey}`;
  const userValuesRef = React.useRef<Record<string, string>>(initialValues);
  const valuesRef = React.useRef<Record<string, string>>(values);
  const aiPrefillPayloadRef = React.useRef<Record<string, any>>(aiPrefillPayload);
  const userEditedFieldKeysRef = React.useRef(new Set<string>());
  const externalAiDraftApplicationRef = React.useRef<{
    signature: string;
    scopeKey: string;
    managedFields: Set<string>;
    appliedFields: Set<string>;
    metadataKeys: Set<string>;
  }>({
    signature: "",
    scopeKey: "",
    managedFields: new Set(),
    appliedFields: new Set(),
    metadataKeys: new Set()
  });
  const externalInputKeyRef = React.useRef(executionInputKey);
  const workspaceIdentityRef = React.useRef(workspaceIdentityKey);
  const lastReportedExecutionBusyRef = React.useRef(false);

  React.useEffect(() => {
    const busy = running || prefilling;
    if (lastReportedExecutionBusyRef.current === busy) return;
    lastReportedExecutionBusyRef.current = busy;
    onExecutionBusyChange?.(busy);
  }, [onExecutionBusyChange, prefilling, running]);
  const latestExternalInputKeyRef = React.useRef(executionInputKey);
  const inputRevisionRef = React.useRef(0);
  const executionLockRef = React.useRef<"prefill" | "calculate" | null>(null);
  latestExternalInputKeyRef.current = executionInputKey;
  valuesRef.current = values;
  aiPrefillPayloadRef.current = aiPrefillPayload;

  React.useEffect(() => {
    if (externalInputKeyRef.current === executionInputKey) return;
    const workspaceChanged = workspaceIdentityRef.current !== workspaceIdentityKey;
    externalInputKeyRef.current = executionInputKey;
    workspaceIdentityRef.current = workspaceIdentityKey;
    inputRevisionRef.current += 1;
    if (workspaceChanged) {
      userValuesRef.current = initialValues;
      userEditedFieldKeysRef.current = new Set();
      externalAiDraftApplicationRef.current = {
        signature: "",
        scopeKey: "",
        managedFields: new Set(),
        appliedFields: new Set(),
        metadataKeys: new Set()
      };
      setValues(initialValues);
      setAvailableGrows([]);
      setGrowId(workspaceType === "personal" ? routeGrowId : "");
      executionLockRef.current = null;
      setRunning(false);
      setPrefilling(false);
    } else {
      setValues(userValuesRef.current);
    }
    setToolRun(null);
    onToolRunChange?.(null);
    setModuleRecord(null);
    setOutputs(null);
    setAiPrefillPayload({});
    setFeedback("");
    setAssistantBriefText("");
  }, [
    executionInputKey,
    initialValues,
    onToolRunChange,
    routeGrowId,
    workspaceIdentityKey,
    workspaceType
  ]);

  const externalAiDraftFieldKey = fields.map((field) => field.key).join("|");
  const externalAiDraftRevisionKey = String(externalAiDraft?.revisionKey || "");
  const externalAiDraftSourceScopeKey = String(externalAiDraft?.scopeKey || "");
  const externalAiDraftGrowId = String(externalAiDraft?.growId || "");

  React.useEffect(() => {
    const previous = externalAiDraftApplicationRef.current;
    const activeScopeKey = String(externalAiDraftScopeKey || "").trim();
    const sourceScopeKey = externalAiDraftSourceScopeKey.trim();
    const revisionKey = externalAiDraftRevisionKey.trim();
    const draftGrowMatches = !externalAiDraftGrowId || externalAiDraftGrowId === growId;
    const validDraft = Boolean(
      externalAiDraft &&
      activeScopeKey &&
      sourceScopeKey === activeScopeKey &&
      revisionKey &&
      draftGrowMatches
    );
    const signature = validDraft
      ? `${workspaceIdentityKey}::${growId || "no-grow"}::${activeScopeKey}::${revisionKey}`
      : "";

    if (previous.signature === signature && previous.scopeKey === activeScopeKey) {
      return;
    }
    if (
      !validDraft &&
      !previous.signature &&
      previous.appliedFields.size === 0 &&
      previous.metadataKeys.size === 0
    ) {
      externalAiDraftApplicationRef.current = {
        ...previous,
        scopeKey: activeScopeKey
      };
      return;
    }

    const knownFields = new Set(
      externalAiDraftFieldKey.split("|").filter((fieldKey) => fieldKey.length > 0)
    );
    const managedFields = new Set(
      validDraft
        ? Object.keys(externalAiDraft?.values || {}).filter((fieldKey) =>
            knownFields.has(fieldKey)
          )
        : []
    );
    const nextValues = { ...valuesRef.current };
    const currentPayload = aiPrefillPayloadRef.current;
    const currentPrefill =
      currentPayload.aiPrefillProvenance &&
      typeof currentPayload.aiPrefillProvenance === "object"
        ? currentPayload.aiPrefillProvenance
        : {};
    const previousPrefilledFields = Array.isArray(currentPrefill.prefilledFields)
      ? currentPrefill.prefilledFields.map(String)
      : [];
    const userReviewedFields = Array.isArray(currentPrefill.userReviewedFields)
      ? currentPrefill.userReviewedFields.map(String)
      : [];
    const userEditedFields = Array.isArray(currentPrefill.userEditedFields)
      ? currentPrefill.userEditedFields.map(String)
      : [];
    const fieldProvenance = {
      ...(currentPayload.fieldProvenance &&
      typeof currentPayload.fieldProvenance === "object"
        ? currentPayload.fieldProvenance
        : {})
    } as Record<string, string>;
    const appliedFields = new Set<string>();

    for (const fieldKey of previous.appliedFields) {
      const userOwnsField =
        userEditedFieldKeysRef.current.has(fieldKey) ||
        String(userValuesRef.current[fieldKey] || "").trim().length > 0 ||
        userReviewedFields.includes(fieldKey);
      const incomingValue = managedFields.has(fieldKey)
        ? normalizedPrefillText(externalAiDraft?.values?.[fieldKey]).trim()
        : "";
      if (!userOwnsField && !incomingValue) {
        nextValues[fieldKey] = "";
        if (fieldProvenance[fieldKey] === "visual_prefill_unverified") {
          delete fieldProvenance[fieldKey];
        }
      }
    }

    if (validDraft) {
      for (const fieldKey of managedFields) {
        const incomingValue = normalizedPrefillText(
          externalAiDraft?.values?.[fieldKey]
        ).trim();
        if (!incomingValue) continue;

        const userOwnsField =
          userEditedFieldKeysRef.current.has(fieldKey) ||
          String(userValuesRef.current[fieldKey] || "").trim().length > 0 ||
          userReviewedFields.includes(fieldKey);
        const currentValue = String(nextValues[fieldKey] || "").trim();
        const occupiedByAnotherSource =
          currentValue.length > 0 && !previous.appliedFields.has(fieldKey);
        if (userOwnsField || occupiedByAnotherSource) continue;

        nextValues[fieldKey] = incomingValue;
        appliedFields.add(fieldKey);
        fieldProvenance[fieldKey] = "visual_prefill_unverified";
      }
    }

    const prefilledFields = Array.from(
      new Set([
        ...previousPrefilledFields.filter(
          (fieldKey: string) => !previous.appliedFields.has(fieldKey)
        ),
        ...appliedFields
      ])
    );
    const nextPayload = { ...currentPayload };
    for (const metadataKey of previous.metadataKeys) {
      delete nextPayload[metadataKey];
    }
    if (validDraft && externalAiDraft?.metadata) {
      Object.assign(nextPayload, externalAiDraft.metadata);
    }
    nextPayload.fieldProvenance = fieldProvenance;
    nextPayload.aiPrefillProvenance = {
      ...currentPrefill,
      prefilledFields,
      userReviewedFields,
      userEditedFields
    };

    const metadataKeys = new Set(
      validDraft ? Object.keys(externalAiDraft?.metadata || {}) : []
    );
    externalAiDraftApplicationRef.current = {
      signature,
      scopeKey: activeScopeKey,
      managedFields,
      appliedFields,
      metadataKeys
    };
    inputRevisionRef.current += 1;
    valuesRef.current = nextValues;
    aiPrefillPayloadRef.current = nextPayload;
    setValues(nextValues);
    setAiPrefillPayload(nextPayload);
    setToolRun(null);
    onToolRunChange?.(null);
    setModuleRecord(null);
    setOutputs(null);
    setFeedback("");
    setAssistantBriefText("");
  }, [
    externalAiDraft,
    externalAiDraftFieldKey,
    externalAiDraftGrowId,
    externalAiDraftRevisionKey,
    externalAiDraftScopeKey,
    externalAiDraftSourceScopeKey,
    growId,
    onToolRunChange,
    workspaceIdentityKey
  ]);

  React.useEffect(() => {
    if (workspaceType === "personal" && routeGrowId) setGrowId(routeGrowId);
    if (locked) {
      setAvailableGrows([]);
      if (workspaceType !== "personal") setGrowId("");
      return;
    }
    let active = true;
    const growRequest: Promise<SelectableGrow[]> = Promise.resolve().then(() =>
      workspaceType === "personal"
        ? listPersonalGrows()
        : workspaceType === "commercial"
          ? fetchCommercialGrows()
          : facilityId
            ? listGrows(facilityId)
            : []
    );
    growRequest
      .then((grows) => {
        if (!active) return;
        setAvailableGrows(grows);
        const availableGrowIds = new Set(
          grows.map((grow) => String(grow.id || (grow as any)._id || "")).filter(Boolean)
        );
        setGrowId((current) => {
          if (workspaceType === "personal") {
            if (routeGrowId) return routeGrowId;
            if (current) return current;
          } else {
            if (routeGrowId && availableGrowIds.has(routeGrowId)) return routeGrowId;
            if (current && availableGrowIds.has(current)) return current;
          }
          if (!growOptional && grows.length === 1) {
            return String(grows[0].id || (grows[0] as any)._id || "");
          }
          return "";
        });
      })
      .catch(() => {
        if (!active) return;
        setAvailableGrows([]);
        if (workspaceType !== "personal") setGrowId("");
      });
    return () => {
      active = false;
    };
  }, [commercialAccountId, facilityId, growOptional, locked, routeGrowId, workspaceType]);

  function updateValue(key: string, value: string) {
    inputRevisionRef.current += 1;
    userEditedFieldKeysRef.current.add(key);
    if (externalAiDraftApplicationRef.current.managedFields.has(key)) {
      externalAiDraftApplicationRef.current.appliedFields.delete(key);
    }
    userValuesRef.current = { ...userValuesRef.current, [key]: value };
    setValues((current) => ({ ...current, [key]: value }));
    setToolRun(null);
    onToolRunChange?.(null);
    setModuleRecord(null);
    setOutputs(null);
    setAiPrefillPayload((current) => {
      const prefill =
        current.aiPrefillProvenance && typeof current.aiPrefillProvenance === "object"
          ? current.aiPrefillProvenance
          : null;
      const imageAnalysis =
        current.imageAnalysis && typeof current.imageAnalysis === "object"
          ? current.imageAnalysis
          : null;
      const prefilledFields = Array.isArray(prefill?.prefilledFields)
        ? prefill.prefilledFields.map(String)
        : Array.isArray(imageAnalysis?.prefilledFields)
          ? imageAnalysis.prefilledFields.map(String)
          : [];
      const remainingPrefilledFields = prefilledFields.filter(
        (fieldKey: string) => fieldKey !== key
      );
      const existingFieldProvenance =
        current.fieldProvenance && typeof current.fieldProvenance === "object"
          ? current.fieldProvenance
          : {};
      const wasVisualPrefill =
        prefilledFields.includes(key) ||
        String(existingFieldProvenance[key] || "").startsWith("visual_prefill");
      const userReviewedFields = Array.from(
        new Set([
          ...(Array.isArray(prefill?.userReviewedFields)
            ? prefill.userReviewedFields.map(String)
            : []),
          key
        ])
      );
      const userEditedFields = Array.from(
        new Set([
          ...(Array.isArray(prefill?.userEditedFields)
            ? prefill.userEditedFields.map(String)
            : []),
          key
        ])
      );
      const existingUserEnteredFields = Array.isArray(current.userEnteredFields)
        ? current.userEnteredFields.map(String)
        : [];

      return {
        ...current,
        fieldProvenance: {
          ...existingFieldProvenance,
          [key]: wasVisualPrefill ? "visual_prefill_user_reviewed" : "user_reported"
        },
        userEnteredFields: wasVisualPrefill
          ? existingUserEnteredFields.filter((fieldKey: string) => fieldKey !== key)
          : Array.from(new Set([...existingUserEnteredFields, key])),
        aiPrefillProvenance: {
          ...(prefill || {}),
          prefilledFields: remainingPrefilledFields,
          userReviewedFields,
          userEditedFields
        },
        ...(imageAnalysis
          ? {
              imageAnalysis: {
                ...imageAnalysis,
                prefilledFields: remainingPrefilledFields,
                userReviewedFields,
                userEditedFields
              }
            }
          : {})
      };
    });
    setFeedback("");
    setAssistantBriefText("");
  }

  async function prefillWithAI() {
    if (
      !aiPrefill ||
      !aiPrefillReady ||
      (!growId && !growOptional) ||
      prefilling ||
      running ||
      executionLockRef.current
    ) {
      return;
    }
    executionLockRef.current = "prefill";
    const requestInputRevision = inputRevisionRef.current;
    const requestExternalInputKey = latestExternalInputKeyRef.current;
    const activeExternalDraft = externalAiDraftApplicationRef.current;
    const externallyAppliedFieldsBeforePrefill = new Set(
      activeExternalDraft.appliedFields
    );
    const preserveExternalDraft = Boolean(
      aiPrefill.preserveAllExistingFields && activeExternalDraft.signature
    );
    const valuesBeforePrefill = preserveExternalDraft
      ? valuesRef.current
      : userValuesRef.current;
    const currentPrefillMetadata = aiPrefillPayloadRef.current;
    const metadataBeforePrefill = preserveExternalDraft
      ? {
          ...Object.fromEntries(
            Array.from(activeExternalDraft.metadataKeys)
              .filter((key) =>
                Object.prototype.hasOwnProperty.call(currentPrefillMetadata, key)
              )
              .map((key) => [key, currentPrefillMetadata[key]])
          ),
          ...(currentPrefillMetadata.fieldProvenance
            ? { fieldProvenance: currentPrefillMetadata.fieldProvenance }
            : {}),
          ...(currentPrefillMetadata.userEnteredFields
            ? { userEnteredFields: currentPrefillMetadata.userEnteredFields }
            : {}),
          ...(currentPrefillMetadata.aiPrefillProvenance
            ? {
                aiPrefillProvenance: currentPrefillMetadata.aiPrefillProvenance
              }
            : {})
        }
      : {};
    // A new AI attempt supersedes the visible result. Keeping the previous ToolRun
    // on screen after this attempt fails would make stale evidence look current.
    setOutputs(null);
    setToolRun(null);
    onToolRunChange?.(null);
    setModuleRecord(null);
    setAiPrefillPayload(metadataBeforePrefill);
    setValues(valuesBeforePrefill);
    setPrefilling(true);
    setFeedback("");
    try {
      await aiPrefill.prepare?.();
      if (
        inputRevisionRef.current !== requestInputRevision ||
        latestExternalInputKeyRef.current !== requestExternalInputKey
      ) {
        return;
      }
      const evidenceAssetIds = aiPrefill.evidenceAssetIds?.() || [];
      const response = await askPersonalAssistant({
        growId: growId || undefined,
        plantId: plantContext.plantId || undefined,
        ...(isCropIdentification || workspaceType !== "personal"
          ? { workspaceType }
          : {}),
        ...(workspaceType === "facility" && facilityId ? { facilityId } : {}),
        evidenceAssetIds,
        context: {
          workflow: toolKey,
          ...(isCropIdentification || workspaceType !== "personal"
            ? { workspaceType }
            : {}),
          ...(workspaceType === "facility" && facilityId ? { facilityId } : {}),
          requestedFields: fields.map((field) => field.key)
        },
        message: aiPrefill.buildMessage({
          growId,
          plantId: plantContext.plantId || "",
          // AI-filled values are presentation drafts, not user claims. When this
          // workflow preserves explicit user context, keep a later AI pass from
          // feeding an earlier model answer back as if the user supplied it.
          values: aiPrefill.preserveAllExistingFields ? userValuesRef.current : values
        })
      });
      if (
        inputRevisionRef.current !== requestInputRevision ||
        latestExternalInputKeyRef.current !== requestExternalInputKey
      ) {
        return;
      }
      if (!response?.success) {
        throw new Error(
          tool === "species-crop-id"
            ? "GrowPath could not complete the AI identification. No result was saved. Your uploaded evidence is still attached; press Identify Plant from Photos to try again."
            : "AI did not return usable prefill data for this tool."
        );
      }
      const parsed = parseAssistantObject(response.reply);
      if (!parsed) {
        throw new Error(
          tool === "species-crop-id"
            ? "GrowPath could not read the AI identification response, so no result was saved. Your uploaded evidence is still attached; press Identify Plant from Photos to try again. If it repeats, add sharper, evenly lit views."
            : "AI did not return usable prefill data for this tool."
        );
      }
      const next = Object.fromEntries(
        fields
          .filter((field) => parsed[field.key] != null)
          .map((field) => {
            const value = parsed[field.key];
            const configuredValue = aiPrefill.normalizeFieldValue?.({
              fieldKey: field.key,
              value,
              parsed,
              response,
              evidenceAssetIds
            });
            return [field.key, configuredValue ?? normalizedPrefillText(value)];
          })
      );
      const resolvedValues = Object.fromEntries(
        fields.map((field) => {
          const existingValue = valuesBeforePrefill[field.key] || "";
          const userEnteredValue = userValuesRef.current[field.key] || "";
          const preserveExisting =
            (aiPrefill.preserveAllExistingFields ||
              aiPrefill.preserveExistingFields?.includes(field.key)) &&
            (userEnteredValue.trim().length > 0 ||
              externallyAppliedFieldsBeforePrefill.has(field.key));
          return [
            field.key,
            preserveExisting
              ? existingValue
              : (next[field.key] ?? (aiPrefill.clearUnfilled ? "" : existingValue))
          ];
        })
      );
      const metadata =
        aiPrefill.buildPayloadMetadata?.({
          response,
          parsed,
          evidenceAssetIds
        }) || {};
      const newlyPrefilledFields = fields
        .filter((field) => {
          const existingValue = valuesBeforePrefill[field.key] || "";
          const userEnteredValue = userValuesRef.current[field.key] || "";
          const preserveExisting =
            (aiPrefill.preserveAllExistingFields ||
              aiPrefill.preserveExistingFields?.includes(field.key)) &&
            existingValue.trim().length > 0 &&
            (userEnteredValue.trim().length > 0 ||
              externallyAppliedFieldsBeforePrefill.has(field.key));
          return !preserveExisting && String(next[field.key] || "").trim().length > 0;
        })
        .map((field) => field.key);
      const existingPrefillProvenance =
        metadataBeforePrefill.aiPrefillProvenance &&
        typeof metadataBeforePrefill.aiPrefillProvenance === "object"
          ? metadataBeforePrefill.aiPrefillProvenance
          : {};
      const retainedPrefilledFields = Array.isArray(
        existingPrefillProvenance.prefilledFields
      )
        ? existingPrefillProvenance.prefilledFields
            .map(String)
            .filter(
              (fieldKey: string) =>
                externallyAppliedFieldsBeforePrefill.has(fieldKey) &&
                !newlyPrefilledFields.includes(fieldKey)
            )
        : [];
      const prefilledFields = Array.from(
        new Set([...retainedPrefilledFields, ...newlyPrefilledFields])
      );
      const userEnteredFields = fields
        .filter(
          (field) => String(userValuesRef.current[field.key] || "").trim().length > 0
        )
        .map((field) => field.key);
      const fieldProvenance = Object.fromEntries(
        fields
          .filter(
            (field) =>
              prefilledFields.includes(field.key) || userEnteredFields.includes(field.key)
          )
          .map((field) => [
            field.key,
            userEnteredFields.includes(field.key)
              ? "user_reported"
              : "visual_prefill_unverified"
          ])
      );
      const metadataWithProvenance = {
        ...metadataBeforePrefill,
        ...metadata,
        fieldProvenance: {
          ...(metadataBeforePrefill.fieldProvenance &&
          typeof metadataBeforePrefill.fieldProvenance === "object"
            ? metadataBeforePrefill.fieldProvenance
            : {}),
          ...(metadata.fieldProvenance && typeof metadata.fieldProvenance === "object"
            ? metadata.fieldProvenance
            : {}),
          ...fieldProvenance
        },
        userEnteredFields,
        aiPrefillProvenance: {
          ...existingPrefillProvenance,
          ...(metadata.aiPrefillProvenance &&
          typeof metadata.aiPrefillProvenance === "object"
            ? metadata.aiPrefillProvenance
            : {}),
          prefilledFields,
          userReviewedFields: Array.isArray(existingPrefillProvenance.userReviewedFields)
            ? existingPrefillProvenance.userReviewedFields.map(String)
            : []
        },
        ...(metadata.imageAnalysis && typeof metadata.imageAnalysis === "object"
          ? {
              imageAnalysis: {
                ...metadata.imageAnalysis,
                prefilledFields,
                userReviewedFields: []
              }
            }
          : {})
      };
      valuesRef.current = resolvedValues;
      aiPrefillPayloadRef.current = metadataWithProvenance;
      setValues(resolvedValues);
      setAiPrefillPayload(metadataWithProvenance);
      if (aiPrefill.runAfterPrefill) {
        await calculateWithValues(
          resolvedValues,
          metadataWithProvenance,
          {
            externalInputKey: requestExternalInputKey,
            revision: requestInputRevision
          },
          "prefill"
        );
      } else {
        const filledFieldLabels = fields
          .filter((field) => prefilledFields.includes(field.key))
          .map((field) => field.label);
        const filledFieldCount = filledFieldLabels.length;
        const prefillSummary = filledFieldCount
          ? `AI filled ${filledFieldCount} non-empty field${
              filledFieldCount === 1 ? "" : "s"
            } from available evidence (${filledFieldLabels.join(", ")}). Empty or unknown values were left blank. Fields marked AI draft remain unconfirmed until you review them.`
          : "AI reviewed the available evidence but could not prefill any non-empty fields. Empty or unknown values were left blank. Add clearer evidence or complete the form manually.";
        setFeedback(
          `${prefillSummary}${
            response.missingInformation?.length
              ? ` Optional missing details: ${response.missingInformation.join(", ")}.`
              : ""
          }`
        );
      }
    } catch (error: any) {
      setFeedback(error?.message || "AI could not prefill this workflow.");
    } finally {
      if (executionLockRef.current === "prefill") {
        executionLockRef.current = null;
      }
      setPrefilling(false);
    }
  }

  const payload = useMemo(
    () => ({
      ...buildPayload(values, {
        growId,
        facilityId,
        commercialAccountId,
        workspaceType,
        plantContext,
        userValues: userValuesRef.current
      }),
      ...aiPrefillPayload
    }),
    [
      aiPrefillPayload,
      buildPayload,
      commercialAccountId,
      facilityId,
      growId,
      plantContext,
      values,
      workspaceType
    ]
  );

  async function calculateWithValues(
    submittedValues: Record<string, string>,
    metadata: Record<string, any> = aiPrefillPayload,
    expectedInputState = {
      externalInputKey: latestExternalInputKeyRef.current,
      revision: inputRevisionRef.current
    },
    existingLock: "prefill" | null = null
  ) {
    if (executionBlocked) {
      setFeedback(executionBlockedMessage);
      return;
    }
    const validationMessage = validateValues?.(submittedValues, {
      metadata,
      source: existingLock === "prefill" ? "prefill" : "manual"
    });
    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }
    const usesExistingLock =
      existingLock === "prefill" && executionLockRef.current === "prefill";
    if (!usesExistingLock) {
      if (running || prefilling || executionLockRef.current) return;
      executionLockRef.current = "calculate";
    }
    setRunning(true);
    setFeedback("");
    const requestIsCurrent = () =>
      inputRevisionRef.current === expectedInputState.revision &&
      latestExternalInputKeyRef.current === expectedInputState.externalInputKey;
    try {
      const submittedPayload = {
        ...buildPayload(submittedValues, {
          growId,
          facilityId,
          commercialAccountId,
          workspaceType,
          plantContext,
          userValues: userValuesRef.current
        }),
        ...metadata
      };
      const response = await runCalculator<Record<string, any>>(tool, submittedPayload);
      if (!requestIsCurrent()) return;
      setOutputs(response.outputs);
      setToolRun(response.toolRun);
      onToolRunChange?.(response.toolRun);
      const modulePayload =
        workspaceType === "personal"
          ? buildModuleRecordInput({
              tool,
              title: defaultLogTitle(response.outputs),
              growId,
              plantId: plantContext.plantId,
              cropProfileId:
                response.toolRun?.cropProfileId || submittedPayload.cropProfileId || null,
              cropIdentity:
                response.toolRun?.cropIdentity || submittedPayload.cropIdentity || null,
              selectedPlantContext:
                response.toolRun?.selectedPlantContext ||
                submittedPayload.selectedPlantContext ||
                null,
              inputs: submittedPayload,
              outputs: response.outputs,
              toolRun: response.toolRun
            })
          : null;
      if (modulePayload) {
        try {
          const linkedModuleRecordId = String(
            response.toolRun?.linkedModuleRecordId || ""
          ).trim();
          if (linkedModuleRecordId) {
            const existingRecord = await getGrowpathModuleRecord(linkedModuleRecordId);
            if (!requestIsCurrent()) return;
            setModuleRecord(existingRecord);
            setFeedback(
              existingRecord
                ? "Calculated and saved as a ToolRun and module record."
                : "Calculated and saved. The backend created the module record, but it could not be reloaded yet. Open Saved Runs before calculating again."
            );
          } else {
            const createdRecord = await createGrowpathModuleRecord(modulePayload);
            if (!requestIsCurrent()) return;
            setModuleRecord(createdRecord);
            setFeedback("Calculated and saved as a ToolRun and module record.");
          }
        } catch (saveError: any) {
          if (!requestIsCurrent()) return;
          setModuleRecord(null);
          setFeedback(
            `Calculated and saved as a ToolRun. Module record save failed: ${
              saveError?.message || "unknown error"
            }`
          );
        }
      } else {
        setModuleRecord(null);
        setFeedback("Calculated and saved as a ToolRun.");
      }
    } catch (error: any) {
      if (requestIsCurrent()) {
        setFeedback(error?.message || "Unable to calculate.");
      }
    } finally {
      setRunning(false);
      if (!usesExistingLock && executionLockRef.current === "calculate") {
        executionLockRef.current = null;
      }
    }
  }

  async function calculate() {
    await calculateWithValues(values);
  }
  const displayOutputs = outputs ? prepareOutputsForDisplay?.(outputs) || outputs : null;
  const resultFollowUpToolRunId = String(toolRun?.id || toolRun?._id || "").trim();
  const resultFollowUpQuestions =
    displayOutputs && toolRun && resultFollowUp
      ? resultFollowUp.suggestions({
          outputs: displayOutputs,
          payload,
          toolRun,
          growId,
          plantId: plantContext.plantId,
          workspaceType
        })
      : [];

  async function submitResultFollowUp(question: string) {
    if (!resultFollowUp || !resultFollowUpToolRunId) {
      throw new Error("Save this result before asking an evidence-bound follow-up.");
    }
    const response = await askPersonalAssistant({
      message: question,
      sourceToolRunId: resultFollowUpToolRunId,
      growId: growId || undefined,
      plantId: plantContext.plantId || undefined,
      workspaceType,
      ...(workspaceType === "facility" && facilityId ? { facilityId } : {}),
      evidenceAssetIds: resultFollowUp.evidenceAssetIds?.() || [],
      context: {
        workflow: resultFollowUp.workflow,
        sourceToolRunId: resultFollowUpToolRunId,
        sourceTool: toolKey,
        workspaceType,
        ...(commercialAccountId ? { commercialAccountId } : {})
      }
    });
    const answer = String(response?.reply || "").trim();
    if (!response?.success || !answer) {
      throw new Error("AI did not return a usable follow-up answer.");
    }
    const photosAnalyzed = Number(response.mediaAnalysis?.photosAnalyzed || 0);
    return {
      answer,
      providerLabel: response.providerLabel || response.provider,
      evidenceInspected:
        photosAnalyzed > 0
          ? true
          : response.mediaAnalysis?.requested === true
            ? false
            : undefined,
      limitations: response.limitations || []
    };
  }
  const actions: ToolResultAction[] = [];
  if (outputs && workspaceType === "personal" && growId) {
    actions.push({
      key: "save-log",
      label: "Save to Grow Log",
      variant: "secondary",
      pendingLabel: "Saving...",
      successMessage: "Saved to grow log.",
      onPress: async () => {
        const result = await saveToolRunAndCreateLog({
          growId,
          ...plantContext.toolRunContext,
          toolKey,
          toolRunId: toolRun?.id || toolRun?._id,
          input: payload,
          output: outputs,
          title: defaultLogTitle(outputs),
          notes: outputSummary(outputs),
          tags: [toolKey, "tool-result"]
        });
        if (!result.ok) throw new Error(result.error);
      }
    });
    const task = defaultTask?.(outputs);
    if (task) {
      actions.push({
        key: "create-task",
        label: "Create Follow-up Task",
        variant: "secondary",
        pendingLabel: "Creating...",
        successMessage: "Created follow-up task in the selected workspace.",
        onPress: async () => {
          const result = await saveToolRunAndCreateTask({
            growId,
            ...plantContext.toolRunContext,
            toolKey,
            toolRunId: toolRun?.id || toolRun?._id,
            input: payload,
            output: outputs,
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: task.dueDate,
            endAt: task.endAt,
            allDay: task.allDay,
            calendarType: task.calendarType,
            sourceStage: task.sourceStage,
            reminderPlan: task.reminderPlan,
            recurrence: task.recurrence
          });
          if (!result.ok) throw new Error(result.error);
        }
      });
    }
  }
  if (outputs && buildActions) {
    try {
      actions.push(
        ...buildActions({
          outputs,
          payload,
          toolRun,
          moduleRecord,
          growId,
          facilityId,
          commercialAccountId,
          workspaceType,
          plantContext
        })
      );
    } catch (_error: any) {
      actions.push({
        key: "custom-action-error",
        label: "Action unavailable",
        variant: "secondary",
        disabled: true,
        onPress: () => {}
      });
    }
  }

  if (locked) {
    return (
      <ScreenBoundary title={title} showBack backFallbackHref={backFallbackHref}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <Text
            accessibilityRole="header"
            aria-level={pageHeadingLevel}
            style={styles.title}
          >
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {bannerPolicy.top ? (
            <FeedBanner
              placement="top"
              slots={bannerPolicy.slotsByPlacement.top}
              mode={entitlements.mode}
              plan={plan}
              railMode={bannerPolicy.railMode}
            />
          ) : null}
          <LockedScreen
            title={`${title} is a Pro tool`}
            message="Free accounts can use core tools and browse the app. Upgrade to run this tool and save its results to grow history."
          />
          {bannerPolicy.bottom ? (
            <FeedBanner
              placement="bottom"
              slots={bannerPolicy.slotsByPlacement.bottom}
              mode={entitlements.mode}
              plan={plan}
              railMode={bannerPolicy.railMode}
            />
          ) : null}
        </ScrollView>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary title={title} showBack backFallbackHref={backFallbackHref}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          aria-level={pageHeadingLevel}
          style={styles.title}
        >
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {bannerPolicy.top ? (
          <FeedBanner
            placement="top"
            slots={bannerPolicy.slotsByPlacement.top}
            mode={entitlements.mode}
            plan={plan}
            railMode={bannerPolicy.railMode}
          />
        ) : null}
        <View style={styles.guidanceCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.resultTitle}>
            How this tool works
          </Text>
          <Text style={styles.guidanceText}>{experienceMode}</Text>
          <Text style={styles.guidanceText}>{aiCreditMessage}</Text>
          {experience ? (
            <>
              <Text style={styles.guidanceText}>
                <Text style={styles.guidanceStrong}>Bring: </Text>
                {experience.inputSummary}
              </Text>
              <Text style={styles.guidanceText}>
                <Text style={styles.guidanceStrong}>You get: </Text>
                {experience.outputSummary}
              </Text>
            </>
          ) : null}
          <Text style={styles.guidanceText}>
            {workspaceType === "personal"
              ? "A successful run is saved to Saved Runs. Attach a grow to also enable grow-log, task, and plant-history actions."
              : "A successful run is saved to this shared workspace's Saved Runs. Select a shared grow to scope evidence and results; Personal plant-history actions remain separate."}
          </Text>
        </View>
        {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
        {availableGrows.length ? (
          <View style={styles.growPicker}>
            <Text style={styles.label}>
              {growOptional ? "Attach to a grow (optional)" : "Select grow"}
            </Text>
            {growOptional ? (
              <Text style={styles.guidanceText}>
                {workspaceType !== "personal"
                  ? "This workflow works without a grow. Attach an authorized shared grow to scope evidence and Saved Runs within this workspace."
                  : isCropIdentification
                    ? "Identification works without a grow. Attach one only to save the result, create tasks, or use plant history."
                    : "This workflow works without a grow. Attach one to use saved crop history and create linked logs, tasks, or plant records."}
              </Text>
            ) : null}
            <View style={styles.growPickerRow}>
              {growOptional ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${title} without a grow`}
                  onPress={() => setGrowId("")}
                  style={[styles.growPill, !growId && styles.growPillOn]}
                >
                  <Text style={[styles.growPillText, !growId && styles.growPillTextOn]}>
                    No grow
                  </Text>
                </Pressable>
              ) : null}
              {availableGrows.map((grow, index) => {
                const id = String(grow.id || (grow as any)._id || "");
                const growLabel = grow.name || grow.growName || `Grow ${index + 1}`;
                if (!id) return null;
                const selected = growId === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`Select grow ${growLabel}`}
                    onPress={() => setGrowId(id)}
                    style={[styles.growPill, selected && styles.growPillOn]}
                  >
                    <Text
                      style={[styles.growPillText, selected && styles.growPillTextOn]}
                    >
                      {growLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : !growId && growOptional ? (
          <Text style={styles.feedback}>
            {workspaceType !== "personal"
              ? "No shared grow is required. Add direct evidence now, or attach an authorized grow to scope the saved result within this workspace."
              : isCropIdentification
                ? "No grow is required. Upload photos or enter what you know to identify the crop."
                : "No grow is required. Enter direct observations or upload evidence; attach a grow later for linked history and tasks."}
          </Text>
        ) : !growId ? (
          <Text style={styles.feedback}>
            {noGrowContextMessage ||
              `Create or select a ${
                workspaceType === "personal" ? "grow" : `${workspaceType} grow`
              } first, then return here to run and save this tool.`}
          </Text>
        ) : null}
        {workspaceType === "personal" && (growId || !growOptional) ? (
          <ToolPlantContextPicker
            plants={plantContext.plants}
            plantId={plantContext.plantId}
            selectedPlant={plantContext.selectedPlant}
            onSelect={plantContext.setPlantId}
          />
        ) : null}

        {typeof formHeader === "function"
          ? formHeader({
              growId,
              plantId: plantContext.plantId,
              facilityId,
              commercialAccountId,
              workspaceType
            })
          : formHeader}

        {aiPrefill ? (
          <View style={styles.guidanceCard}>
            <Text style={styles.resultTitle}>
              {isCropIdentification
                ? "AI photo identification"
                : growOptional
                  ? "AI photo evidence prefill"
                  : "AI grow-context prefill"}
            </Text>
            <Text style={styles.guidanceText}>
              {isCropIdentification
                ? "AI can inspect uploaded photos and use an attached grow or plant as optional context. Review and confirm every identification."
                : growOptional
                  ? "AI can inspect uploaded photos and use an attached grow or plant as optional context. Review every filled observation before running the structured workflow."
                  : "AI will use saved grow and plant evidence to fill every supported field. You can add or correct anything before running the tool."}
            </Text>
            {!aiPrefillReady && aiPrefill.notReadyMessage ? (
              <Text style={styles.feedback}>{aiPrefill.notReadyMessage}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={
                !aiPrefillReady || (!growId && !growOptional) || prefilling || running
              }
              style={[
                styles.secondaryButton,
                (!aiPrefillReady ||
                  (!growId && !growOptional) ||
                  prefilling ||
                  running) &&
                  styles.disabled
              ]}
              onPress={prefillWithAI}
            >
              <Text style={styles.secondaryButtonText}>
                {prefilling
                  ? growOptional
                    ? "Analyzing photos..."
                    : "Reviewing grow..."
                  : aiPrefill.buttonLabel || "Fill with AI"}
              </Text>
            </Pressable>
            {immediateAiResult ? (
              <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[
                  styles.aiOutcomeCard,
                  immediateAiResult.tone === "success"
                    ? styles.aiOutcomeSuccess
                    : immediateAiResult.tone === "error"
                      ? styles.aiOutcomeError
                      : styles.aiOutcomeWarning
                ]}
              >
                <Text style={styles.aiOutcomeTitle}>{immediateAiResult.title}</Text>
                <Text style={styles.guidanceText}>{immediateAiResult.description}</Text>
                {(immediateAiResult.details || []).map((detail, index) => (
                  <Text key={`${index}-${detail}`} style={styles.aiOutcomeDetail}>
                    {`\u2022 ${detail}`}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {assistantBrief ? (
          <View style={styles.guidanceCard}>
            <Text style={styles.resultTitle}>{assistantBrief.title}</Text>
            <Text style={styles.guidanceText}>{assistantBrief.description}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={assistantBrief.accessibilityLabel}
              style={styles.secondaryButton}
              onPress={() =>
                setAssistantBriefText(
                  assistantBrief.buildBrief({ values, payload, growId, plantContext })
                )
              }
            >
              <Text style={styles.secondaryButtonText}>{assistantBrief.buttonLabel}</Text>
            </Pressable>
            {assistantBriefText ? (
              <View style={styles.briefBox}>
                <Text style={styles.resultTitle}>{assistantBrief.briefTitle}</Text>
                <Text selectable style={styles.briefText}>
                  {assistantBriefText}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.form}>
          {fields.map((field, index) => (
            <React.Fragment key={field.key}>
              {field.section &&
              (index === 0 || fields[index - 1]?.section !== field.section) ? (
                <Text style={styles.formSection}>{field.section}</Text>
              ) : null}
              <View style={styles.field}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.label}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Text>
                  {aiPrefilledFieldKeys.has(field.key) ? (
                    <Text
                      accessibilityLabel={`${field.label} was filled by AI and needs review`}
                      style={styles.aiDraftLabel}
                    >
                      AI draft - review
                    </Text>
                  ) : null}
                </View>
                {field.helpText ? (
                  <Text style={styles.fieldHelp}>{field.helpText}</Text>
                ) : null}
                {field.options?.length ? (
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel={`${title} ${field.label}`}
                    style={styles.optionGrid}
                  >
                    {field.options.map((option) => {
                      const selected = values[field.key] === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="radio"
                          accessibilityLabel={`${title} ${field.label}: ${option.label}`}
                          accessibilityHint={option.description}
                          accessibilityState={{ checked: selected }}
                          onPress={() => updateValue(field.key, option.value)}
                          style={[styles.optionCard, selected && styles.optionCardOn]}
                        >
                          <Text
                            style={[
                              styles.optionCardLabel,
                              selected && styles.optionCardLabelOn
                            ]}
                          >
                            {option.label}
                          </Text>
                          {option.description ? (
                            <Text style={styles.optionCardDescription}>
                              {option.description}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : field.inputType === "date" || field.inputType === "datetime" ? (
                  <CalendarDateField
                    accessibilityLabel={`${title} ${field.label}`}
                    label={undefined}
                    mode={field.inputType}
                    onChange={(value) => updateValue(field.key, value)}
                    optional={!field.required}
                    placeholder={
                      field.placeholder ||
                      (field.inputType === "datetime"
                        ? "Choose date and time"
                        : "Choose date")
                    }
                    value={values[field.key] ?? ""}
                  />
                ) : (
                  <TextInput
                    accessibilityLabel={`${title} ${field.label}`}
                    accessibilityHint={field.helpText}
                    placeholder={field.placeholder}
                    placeholderTextColor={palette.textMuted}
                    selectionColor={palette.accent}
                    style={[styles.input, field.multiline && styles.textArea]}
                    value={values[field.key] ?? ""}
                    onChangeText={(value) => updateValue(field.key, value)}
                    keyboardType={field.keyboardType || "default"}
                    multiline={field.multiline}
                  />
                )}
              </View>
            </React.Fragment>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={runAccessibilityLabel || `Run ${title}`}
          accessibilityHint={runLabel}
          disabled={running || prefilling || executionBlocked}
          onPress={calculate}
          style={[
            styles.button,
            (running || prefilling || executionBlocked) && styles.disabled
          ]}
        >
          <Text style={styles.buttonText}>{running ? "Working..." : runLabel}</Text>
        </Pressable>

        {bannerPolicy.middle ? (
          <FeedBanner
            placement="middle"
            slots={bannerPolicy.slotsByPlacement.middle}
            mode={entitlements.mode}
            plan={plan}
            railMode={bannerPolicy.railMode}
          />
        ) : null}

        {outputs && displayOutputs ? (
          <ToolResultSurface
            title={`${title} result`}
            status={status}
            metrics={buildMetrics(displayOutputs)}
            inputs={payload}
            outputs={displayOutputs}
            notices={buildNotices(displayOutputs, { payload })}
            recommendations={
              Array.isArray(displayOutputs.recommendations)
                ? displayOutputs.recommendations
                : []
            }
            formulas={[
              displayOutputs.formulaExplanation,
              displayOutputs.formula,
              displayOutputs.releaseDisclaimer,
              displayOutputs.realisticNotes
            ].filter(Boolean)}
            details={buildDetails?.(displayOutputs)}
            evidenceReview={inferEvidenceReview(displayOutputs, payload)}
            followUp={
              resultFollowUp && resultFollowUpToolRunId ? (
                <ResultQuestionCard
                  sourceKey={resultFollowUpToolRunId}
                  suggestions={resultFollowUpQuestions}
                  onSubmit={submitResultFollowUp}
                />
              ) : null
            }
            enableDefaultAskAI={!resultFollowUp}
            onAddEvidence={() =>
              setFeedback(
                "Add the requested evidence above, then run this tool again to update the review."
              )
            }
            actions={actions}
            feedback={feedback}
            contextMessage={
              growId
                ? undefined
                : noGrowContextMessage || "Select a grow to enable log and task actions."
            }
            copyPayload={{ tool, input: payload, output: displayOutputs }}
            footerMessage={
              moduleRecord?.id ? `Module record saved: ${moduleRecord.id}` : undefined
            }
          />
        ) : feedback ? (
          <Text style={styles.feedback}>{feedback}</Text>
        ) : null}
        {bannerPolicy.bottom ? (
          <FeedBanner
            placement="bottom"
            slots={bannerPolicy.slotsByPlacement.bottom}
            mode={entitlements.mode}
            plan={plan}
            railMode={bannerPolicy.railMode}
          />
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

export function createBackendCalculatorStyles(palette: ThemePalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 36, gap: 10 },
    title: { fontSize: 22, fontWeight: "700", color: palette.text },
    subtitle: { fontSize: 13, color: palette.textMuted },
    context: { color: palette.link, fontWeight: "700" },
    growPicker: { gap: 7 },
    growPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    growPill: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    growPillOn: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    growPillText: { color: palette.textMuted, fontWeight: "700" },
    growPillTextOn: { color: palette.link },
    guidanceCard: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: 8,
      padding: 12,
      gap: 8,
      backgroundColor: palette.surfaceMuted
    },
    resultTitle: { fontSize: 15, fontWeight: "800", color: palette.text },
    guidanceText: { color: palette.textMuted, lineHeight: 19 },
    guidanceStrong: { color: palette.text, fontWeight: "800" },
    aiOutcomeCard: {
      borderWidth: 2,
      borderRadius: 8,
      padding: 12,
      gap: 6,
      backgroundColor: palette.surface
    },
    aiOutcomeSuccess: { borderColor: palette.success },
    aiOutcomeWarning: { borderColor: palette.warning },
    aiOutcomeError: { borderColor: palette.danger },
    aiOutcomeTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    aiOutcomeDetail: { color: palette.text, lineHeight: 19 },
    formSection: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 8
    },
    fieldHelp: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    secondaryButton: {
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: palette.surface
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    briefBox: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: 8,
      padding: 10,
      gap: 6,
      backgroundColor: palette.surface
    },
    briefText: { color: palette.text, lineHeight: 19 },
    form: { gap: 10 },
    field: { gap: 6 },
    fieldLabelRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8
    },
    label: { fontSize: 13, fontWeight: "700", color: palette.text },
    aiDraftLabel: {
      color: palette.warning,
      backgroundColor: palette.surfaceStrong,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 11,
      fontWeight: "800",
      overflow: "hidden"
    },
    optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    optionCard: {
      minWidth: 150,
      flexGrow: 1,
      flexBasis: 180,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      padding: 10,
      gap: 3,
      backgroundColor: palette.surface
    },
    optionCardOn: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    optionCardLabel: { color: palette.text, fontWeight: "800" },
    optionCardLabelOn: { color: palette.link },
    optionCardDescription: { color: palette.textMuted, fontSize: 12, lineHeight: 16 },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surface,
      color: palette.text
    },
    textArea: { minHeight: 88, textAlignVertical: "top" },
    button: {
      borderRadius: 8,
      backgroundColor: palette.accent,
      paddingVertical: 12,
      alignItems: "center"
    },
    disabled: { opacity: 0.6 },
    buttonText: { color: palette.accentText, fontWeight: "700" },
    feedback: { color: palette.danger, fontWeight: "700" }
  });
}
