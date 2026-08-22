import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  calculateBusinessDesk,
  listBusinessDeskRecords,
  normalizeIanaTimeZone,
  type BusinessDeskRecord,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import { BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES } from "@/api/businessDeskArtifacts";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import {
  LabeledInput,
  RecordSaveArchiveActions,
  StatusSelector
} from "@/features/businessDesk/RecordFormControls";
import RecordToolScaffold from "@/features/businessDesk/RecordToolScaffold";
import ReviewedArtifactPanel from "@/features/businessDesk/ReviewedArtifactPanel";
import {
  useBusinessDeskWorkspaceTimeZone,
  WorkspaceTimeZoneControl,
  workspaceTimeZoneReady
} from "@/features/businessDesk/WorkspaceTimeZoneControl";
import {
  formatMoneyMinor,
  isSupportedCurrencyCode,
  parseMoneyInput,
  resolveCurrencyContext,
  type CurrencyContext
} from "@/features/businessDesk/money";
import {
  businessDeskRecordId,
  useBusinessDeskRecordCollection
} from "@/features/businessDesk/recordWorkflow";
import {
  isoInstantToZonedLocalDateTime,
  zonedLocalDateTimeToIsoStrict
} from "@/features/businessDesk/zonedDateTime";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type CashDirection = "inflow" | "outflow";
type CashConfidence = "recorded" | "expected";
type CashSourceType = "manual" | "quote" | "expense";

type CashEntryDraft = {
  id: string;
  label: string;
  direction: CashDirection;
  confidence: CashConfidence;
  amount: string;
  dueAt: string;
  dueAtIsoHint: string;
  sourceType: CashSourceType;
  sourceRecordedAt: string;
  sourceRecordedAtIsoHint: string;
  sourceFreshnessAt: string;
  sourceFreshnessAtIsoHint: string;
  sourceRecordId: string;
};

type CashHorizon = {
  days: number;
  through: string;
  recordedInflowMinor: number;
  recordedOutflowMinor: number;
  expectedInflowMinor: number;
  expectedOutflowMinor: number;
  netMovementMinor: number;
  staleEntryCount: number;
  projectedCashMinor: number | null;
};

type CashFlowCalculationResult = {
  calculator: "cash_flow";
  currency: string;
  minorUnitDigits: number;
  asOf: string;
  timeZone: string;
  workspaceTimeZoneVersion: number;
  staleAfterDays: number;
  currentCashMinor: number | null;
  evidenceSummary: {
    freshCount: number;
    staleCount: number;
    recordedCount: number;
    expectedCount: number;
  };
  horizons: CashHorizon[];
  complete: boolean;
  incompleteReasons: string[];
};

type CashFlowSnapshotToolProps = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
  canViewCurrentCash: boolean;
};

const DIRECTION_OPTIONS: Array<{ value: CashDirection; label: string }> = [
  { value: "inflow", label: "Incoming" },
  { value: "outflow", label: "Outgoing" }
];

const CONFIDENCE_OPTIONS: Array<{ value: CashConfidence; label: string }> = [
  { value: "recorded", label: "Recorded" },
  { value: "expected", label: "Expected" }
];

const SOURCE_OPTIONS: Array<{ value: CashSourceType; label: string }> = [
  { value: "manual", label: "Owner-entered" },
  { value: "quote", label: "Reviewed quote expectation" },
  { value: "expense", label: "Reviewed expense expectation" }
];

const SOURCE_LINK_TYPES: Partial<Record<CashSourceType, string>> = {
  quote: "quote",
  expense: "expense"
};

let entrySequence = 0;

function formatInstantInTimeZone(value: string, timeZone: string) {
  try {
    return new Date(value).toLocaleString(undefined, { timeZone });
  } catch {
    return value;
  }
}

function zonedNow(timeZone: string) {
  const iso = new Date().toISOString();
  return {
    iso,
    wall: isoInstantToZonedLocalDateTime(iso, timeZone)
  };
}

function newEntry(
  timeZone: string,
  overrides: Partial<CashEntryDraft> = {}
): CashEntryDraft {
  entrySequence += 1;
  const capturedAtIso = new Date().toISOString();
  const capturedAt = isoInstantToZonedLocalDateTime(capturedAtIso, timeZone);
  return {
    id: "cash-entry-" + entrySequence,
    label: "",
    direction: "inflow",
    confidence: "expected",
    amount: "",
    dueAt: "",
    dueAtIsoHint: "",
    sourceType: "manual",
    sourceRecordedAt: capturedAt,
    sourceRecordedAtIsoHint: capturedAtIso,
    sourceFreshnessAt: capturedAt,
    sourceFreshnessAtIsoHint: capturedAtIso,
    sourceRecordId: "",
    ...overrides
  };
}

function payloadOf(record: BusinessDeskRecord | null) {
  return (record?.payload?.cashFlowSnapshot || {}) as any;
}

function sourceRecordId(record: BusinessDeskRecord) {
  return String(record.id || record._id || "");
}

function validIsoInstant(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw && Number.isFinite(new Date(raw).getTime()) ? raw : null;
}

function cashFlowWallTimeToIso(
  label: string,
  value: string,
  timeZone: string,
  exactIsoHint = ""
) {
  try {
    return zonedLocalDateTimeToIsoStrict(value, timeZone, exactIsoHint);
  } catch (error) {
    throw new Error(
      `${label}: ${error instanceof Error ? error.message : "choose a valid date and time."}`
    );
  }
}

function previewEpoch(value: string, timeZone: string | null, exactIsoHint = "") {
  if (!timeZone) return Number.NaN;
  try {
    const iso = zonedLocalDateTimeToIsoStrict(value, timeZone, exactIsoHint);
    return iso ? new Date(iso).getTime() : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function majorInput(value: unknown, digits: number) {
  if (!Number.isSafeInteger(value)) return "";
  return (Number(value) / 10 ** digits).toFixed(digits);
}

function cleanEntryForFingerprint(entry: CashEntryDraft) {
  const { id: _id, ...content } = entry;
  return content;
}

function deduplicatedSourceLinks(entries: CashEntryDraft[]) {
  const seen = new Set<string>();
  return entries.flatMap((entry) => {
    const entityType = SOURCE_LINK_TYPES[entry.sourceType];
    const entityId = entry.sourceRecordId.trim();
    if (!entityType || !entityId) return [];
    const key = entityType + ":" + entityId;
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        entityType,
        entityId,
        label: entry.label.trim() || entry.sourceType.replace(/_/g, " ")
      }
    ];
  });
}

export default function CashFlowSnapshotTool({
  workspace,
  workspaceLabel,
  basePath,
  canViewCurrentCash
}: CashFlowSnapshotToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const sanitizeRecord = useCallback(
    (record: BusinessDeskRecord) => {
      if (canViewCurrentCash) return record;
      const cashFlowSnapshot = (record.payload?.cashFlowSnapshot || {}) as Record<
        string,
        unknown
      >;
      const { currentCashMinor: _privateCurrentCash, ...visibleSnapshot } =
        cashFlowSnapshot;
      const totals = record.totals
        ? ({ ...record.totals } as Record<string, any>)
        : undefined;
      if (totals) {
        delete totals.currentCashMinor;
        delete totals.inputSnapshotJson;
        if (Array.isArray(totals.horizons)) {
          totals.horizons = totals.horizons.map((horizon: unknown) => {
            const source =
              horizon && typeof horizon === "object"
                ? (horizon as Record<string, unknown>)
                : {};
            const { projectedCashMinor: _projectedCash, ...visibleHorizon } = source;
            return visibleHorizon;
          });
        }
      }
      return {
        ...record,
        payload: { ...record.payload, cashFlowSnapshot: visibleSnapshot },
        ...(totals ? { totals: totals as unknown as BusinessDeskRecord["totals"] } : {})
      };
    },
    [canViewCurrentCash]
  );
  const collection = useBusinessDeskRecordCollection(workspace, "cash_flow_snapshot", {
    sanitizeRecord
  });
  const workspaceType = workspace.workspaceType;
  const facilityId = workspaceType === "facility" ? workspace.facilityId : "";
  const stableWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      workspaceType === "facility"
        ? { workspaceType: "facility", facilityId }
        : { workspaceType: "commercial" },
    [facilityId, workspaceType]
  );
  const workspaceKey =
    workspaceType === "facility" ? `facility:${facilityId}` : "commercial";
  const workspaceTimeZoneState = useBusinessDeskWorkspaceTimeZone(stableWorkspace);
  const authoritativeTimeZone = workspaceTimeZoneState.value?.configured
    ? workspaceTimeZoneState.value.timeZone
    : null;
  const authoritativeTimeZoneVersion = workspaceTimeZoneState.value?.configured
    ? workspaceTimeZoneState.value.version
    : 0;
  const currentWorkspaceKey = useRef(workspaceKey);
  const resetWorkspaceKey = useRef(workspaceKey);
  currentWorkspaceKey.current = workspaceKey;
  const calculationEpoch = useRef(0);
  const appliedTimeZone = useRef<{
    workspaceKey: string;
    timeZone: string;
    version: number;
  } | null>(null);
  const [selected, setSelected] = useState<BusinessDeskRecord | null>(null);
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("");
  const [currentCash, setCurrentCash] = useState("");
  const [asOf, setAsOf] = useState("");
  const [asOfIsoHint, setAsOfIsoHint] = useState("");
  const [asOfTouched, setAsOfTouched] = useState(false);
  const [timeZone, setTimeZone] = useState("");
  const [timeZoneVersion, setTimeZoneVersion] = useState(0);
  const [staleAfterDays, setStaleAfterDays] = useState("30");
  const [entries, setEntries] = useState<CashEntryDraft[]>([]);
  const [assumptions, setAssumptions] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [savedContentFingerprint, setSavedContentFingerprint] = useState("");
  const [result, setResult] = useState<CashFlowCalculationResult | null>(null);
  const [resultFingerprint, setResultFingerprint] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [authorizedSources, setAuthorizedSources] = useState<BusinessDeskRecord[]>([]);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [sourceError, setSourceError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setSourceLoading(true);
    setSourceError("");
    Promise.all([
      listBusinessDeskRecords(
        stableWorkspace,
        { kind: "quote" },
        {
          signal: controller.signal
        }
      ),
      listBusinessDeskRecords(
        stableWorkspace,
        { kind: "expense" },
        {
          signal: controller.signal
        }
      )
    ])
      .then(([quotes, expenses]) => {
        if (active) {
          setAuthorizedSources(
            [...quotes, ...expenses].filter(
              (record) => record.status === "reviewed" && sourceRecordId(record)
            )
          );
        }
      })
      .catch((error) => {
        if (active && error?.name !== "AbortError") {
          setAuthorizedSources([]);
          setSourceError(
            error instanceof Error
              ? error.message
              : "Authorized cash-flow sources could not be loaded."
          );
        }
      })
      .finally(() => {
        if (active) setSourceLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [stableWorkspace]);

  const contentFingerprint = JSON.stringify({
    title,
    currency,
    currentCash,
    asOf,
    asOfIsoHint,
    timeZone,
    timeZoneVersion,
    staleAfterDays,
    entries: entries.map(cleanEntryForFingerprint),
    assumptions
  });
  const currencyReady = isSupportedCurrencyCode(currency);
  const exactSavedDraft = Boolean(
    selected?.status === "draft" &&
    contentFingerprint === savedContentFingerprint &&
    currencyReady
  );
  const exactReviewedRevision = Boolean(
    selected?.status === "reviewed" &&
    contentFingerprint === savedContentFingerprint &&
    currencyReady
  );
  const visibleResult = resultFingerprint === contentFingerprint ? result : null;
  const timeSensitiveBlocked =
    !workspaceTimeZoneReady(workspaceTimeZoneState) ||
    timeZone !== authoritativeTimeZone ||
    timeZoneVersion !== authoritativeTimeZoneVersion;

  const reset = useCallback((nextTimeZone = "", nextTimeZoneVersion = 0) => {
    const nextAsOf = nextTimeZone ? zonedNow(nextTimeZone) : null;
    calculationEpoch.current += 1;
    setSelected(null);
    setTitle("");
    setCurrency("");
    setCurrentCash("");
    setAsOf(nextAsOf?.wall || "");
    setAsOfIsoHint(nextAsOf?.iso || "");
    setAsOfTouched(false);
    setTimeZone(nextTimeZone);
    setTimeZoneVersion(nextTimeZoneVersion);
    setStaleAfterDays("30");
    setEntries([]);
    setAssumptions("");
    setArchiveReason("");
    setSavedContentFingerprint("");
    setResult(null);
    setResultFingerprint("");
    setFormError("");
    setFeedback("");
    setBusy(false);
  }, []);

  const startNew = useCallback(
    () => reset(authoritativeTimeZone || "", authoritativeTimeZoneVersion),
    [authoritativeTimeZone, authoritativeTimeZoneVersion, reset]
  );

  useEffect(() => {
    if (resetWorkspaceKey.current === workspaceKey) return;
    resetWorkspaceKey.current = workspaceKey;
    appliedTimeZone.current = null;
    reset();
  }, [reset, workspaceKey]);

  useEffect(() => {
    if (!authoritativeTimeZone || authoritativeTimeZoneVersion < 1) return;
    const prior = appliedTimeZone.current;
    if (
      prior?.workspaceKey === workspaceKey &&
      prior.timeZone === authoritativeTimeZone &&
      prior.version === authoritativeTimeZoneVersion
    ) {
      return;
    }
    appliedTimeZone.current = {
      workspaceKey,
      timeZone: authoritativeTimeZone,
      version: authoritativeTimeZoneVersion
    };
    setTimeZone(authoritativeTimeZone);
    setTimeZoneVersion(authoritativeTimeZoneVersion);
    const priorTimeZone =
      prior?.workspaceKey === workspaceKey ? prior.timeZone : timeZone;
    if (priorTimeZone && priorTimeZone !== authoritativeTimeZone) {
      const exactAsOf = validIsoInstant(asOfIsoHint);
      setAsOf(
        exactAsOf ? isoInstantToZonedLocalDateTime(exactAsOf, authoritativeTimeZone) : ""
      );
      setEntries((current) =>
        current.map((entry) => {
          const dueAt = validIsoInstant(entry.dueAtIsoHint);
          const sourceRecordedAt = validIsoInstant(entry.sourceRecordedAtIsoHint);
          const sourceFreshnessAt = validIsoInstant(entry.sourceFreshnessAtIsoHint);
          return {
            ...entry,
            dueAt: dueAt
              ? isoInstantToZonedLocalDateTime(dueAt, authoritativeTimeZone)
              : "",
            sourceRecordedAt: sourceRecordedAt
              ? isoInstantToZonedLocalDateTime(sourceRecordedAt, authoritativeTimeZone)
              : "",
            sourceFreshnessAt: sourceFreshnessAt
              ? isoInstantToZonedLocalDateTime(sourceFreshnessAt, authoritativeTimeZone)
              : ""
          };
        })
      );
      setFormError(
        "The authoritative workspace time zone changed. Exact saved instants were converted; enter every cleared local date and review the scenario before calculating or saving."
      );
    } else if (!selected && !asOfTouched) {
      const nextAsOf = zonedNow(authoritativeTimeZone);
      setAsOf(nextAsOf.wall);
      setAsOfIsoHint(nextAsOf.iso);
    }
  }, [
    asOfIsoHint,
    asOfTouched,
    authoritativeTimeZone,
    authoritativeTimeZoneVersion,
    selected,
    timeZone,
    workspaceKey
  ]);

  const open = (record: BusinessDeskRecord) => {
    const payload = payloadOf(record);
    const savedTimeZone = normalizeIanaTimeZone(payload.timeZone);
    const displayTimeZone = authoritativeTimeZone || savedTimeZone;
    if (!displayTimeZone) {
      setFormError(
        "This saved snapshot has no valid pinned time zone and the workspace setting is unset."
      );
      return;
    }
    const savedAsOfIso = validIsoInstant(payload.asOf);
    const fallbackAsOf = zonedNow(displayTimeZone);
    const digits = Number.isInteger(payload.minorUnitDigits)
      ? Number(payload.minorUnitDigits)
      : 2;
    const nextEntries = Array.isArray(payload.entries)
      ? payload.entries.map((entry: any) => {
          const dueAtIso = validIsoInstant(entry.dueAt);
          const sourceRecordedAtIso = validIsoInstant(entry.sourceRecordedAt);
          const sourceFreshnessAtIso = validIsoInstant(entry.sourceFreshnessAt);
          return newEntry(displayTimeZone, {
            label: String(entry.label || ""),
            direction: (entry.direction || "inflow") as CashDirection,
            confidence: (entry.confidence || "expected") as CashConfidence,
            amount: majorInput(entry.amountMinor, digits),
            dueAt: dueAtIso
              ? isoInstantToZonedLocalDateTime(dueAtIso, displayTimeZone)
              : "",
            dueAtIsoHint: dueAtIso || "",
            sourceType: (entry.sourceType || "manual") as CashSourceType,
            sourceRecordedAt: sourceRecordedAtIso
              ? isoInstantToZonedLocalDateTime(sourceRecordedAtIso, displayTimeZone)
              : "",
            sourceRecordedAtIsoHint: sourceRecordedAtIso || "",
            sourceFreshnessAt: sourceFreshnessAtIso
              ? isoInstantToZonedLocalDateTime(sourceFreshnessAtIso, displayTimeZone)
              : "",
            sourceFreshnessAtIsoHint: sourceFreshnessAtIso || "",
            sourceRecordId: String(entry.sourceRecordId || "")
          });
        })
      : [];
    const next = {
      title: record.title || "",
      currency: String(payload.currency || ""),
      currentCash: canViewCurrentCash ? majorInput(payload.currentCashMinor, digits) : "",
      asOf: savedAsOfIso
        ? isoInstantToZonedLocalDateTime(savedAsOfIso, displayTimeZone)
        : fallbackAsOf.wall,
      asOfIsoHint: savedAsOfIso || fallbackAsOf.iso,
      timeZone: displayTimeZone,
      timeZoneVersion:
        authoritativeTimeZoneVersion ||
        (Number.isSafeInteger(payload.timeZoneVersion) ? payload.timeZoneVersion : 0),
      staleAfterDays: String(payload.staleAfterDays || 30),
      entries: nextEntries,
      assumptions: String(payload.assumptions || "")
    };
    setSelected(record);
    setTitle(next.title);
    setCurrency(next.currency);
    setCurrentCash(next.currentCash);
    setAsOf(next.asOf);
    setAsOfIsoHint(next.asOfIsoHint);
    setAsOfTouched(false);
    setTimeZone(next.timeZone);
    setTimeZoneVersion(next.timeZoneVersion);
    setStaleAfterDays(next.staleAfterDays);
    setEntries(next.entries);
    setAssumptions(next.assumptions);
    setArchiveReason("");
    setSavedContentFingerprint(
      JSON.stringify({
        ...next,
        entries: next.entries.map(cleanEntryForFingerprint)
      })
    );
    setResult(null);
    setResultFingerprint("");
    setFormError("");
    setFeedback("Loaded saved " + record.status + " revision " + record.version + ".");
  };

  const updateEntry = (index: number, patch: Partial<CashEntryDraft>) => {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry
      )
    );
  };

  const buildCalculationInput = () => {
    const context = resolveCurrencyContext(currency);
    const authoritative = workspaceTimeZoneState.value;
    if (!workspaceTimeZoneReady(workspaceTimeZoneState) || !authoritative?.timeZone) {
      throw new Error(
        "The workspace owner must configure and reload the authoritative time zone before calculating or saving local date boundaries."
      );
    }
    const normalizedTimeZone = normalizeIanaTimeZone(authoritative.timeZone);
    if (
      !normalizedTimeZone ||
      normalizedTimeZone !== timeZone ||
      authoritative.version !== timeZoneVersion
    ) {
      throw new Error(
        "The workspace time-zone version changed. Reload it and review every local date before continuing."
      );
    }
    const normalizedAsOf = cashFlowWallTimeToIso(
      "Snapshot date and time",
      asOf,
      normalizedTimeZone,
      asOfIsoHint
    );
    if (!normalizedAsOf) throw new Error("Choose the snapshot date and time.");
    const staleDays = Number(staleAfterDays.trim());
    if (!Number.isInteger(staleDays) || staleDays < 1 || staleDays > 3_650) {
      throw new Error("Freshness window must be 1 to 3650 whole days.");
    }
    const normalizedEntries = entries.map((entry, index) => {
      if (!entry.label.trim()) {
        throw new Error("Cash-flow entry " + (index + 1) + " needs a label.");
      }
      const dueAt = cashFlowWallTimeToIso(
        "Cash-flow entry " + (index + 1) + " due date and time",
        entry.dueAt,
        normalizedTimeZone,
        entry.dueAtIsoHint
      );
      let sourceRecordedAt = cashFlowWallTimeToIso(
        "Cash-flow entry " + (index + 1) + " source-recorded date and time",
        entry.sourceRecordedAt,
        normalizedTimeZone,
        entry.sourceRecordedAtIsoHint
      );
      let sourceFreshnessAt = cashFlowWallTimeToIso(
        "Cash-flow entry " + (index + 1) + " freshness date and time",
        entry.sourceFreshnessAt,
        normalizedTimeZone,
        entry.sourceFreshnessAtIsoHint
      );
      if (entry.sourceType !== "manual") {
        const source = authorizedSources.find(
          (record) =>
            record.kind === entry.sourceType &&
            record.status === "reviewed" &&
            sourceRecordId(record) === entry.sourceRecordId
        );
        if (!source) {
          throw new Error(
            "Cash-flow entry " +
              (index + 1) +
              " must select a reviewed record from this workspace."
          );
        }
        const observedAt = validIsoInstant(source.updatedAt || source.createdAt);
        sourceRecordedAt = validIsoInstant(entry.sourceRecordedAtIsoHint) || observedAt;
        sourceFreshnessAt =
          validIsoInstant(entry.sourceFreshnessAtIsoHint) || sourceRecordedAt;
        if (!sourceRecordedAt || !sourceFreshnessAt) {
          throw new Error(
            "Cash-flow entry " +
              (index + 1) +
              " selected source does not have a valid recorded instant."
          );
        }
        if (entry.confidence !== "expected") {
          throw new Error(
            "Reviewed quote and expense records are expectations, not recorded cash evidence."
          );
        }
        if (
          (entry.sourceType === "quote" && entry.direction !== "inflow") ||
          (entry.sourceType === "expense" && entry.direction !== "outflow")
        ) {
          throw new Error("The selected source has the wrong cash-flow direction.");
        }
      }
      if (!dueAt || !sourceRecordedAt || !sourceFreshnessAt) {
        throw new Error(
          "Cash-flow entry " +
            (index + 1) +
            " needs due, source-recorded, and freshness dates."
        );
      }
      if (
        new Date(sourceRecordedAt).getTime() > new Date(normalizedAsOf).getTime() ||
        new Date(sourceFreshnessAt).getTime() > new Date(normalizedAsOf).getTime()
      ) {
        throw new Error(
          "Cash-flow entry " +
            (index + 1) +
            " source evidence cannot be newer than the snapshot."
        );
      }
      if (entry.sourceType !== "manual" && !entry.sourceRecordId.trim()) {
        throw new Error(
          "Cash-flow entry " +
            (index + 1) +
            " needs the authorized source or evidence ID."
        );
      }
      return {
        label: entry.label.trim(),
        direction: entry.direction,
        confidence: entry.confidence,
        amountMinor:
          parseMoneyInput(entry.amount, context, {
            label: "Cash-flow entry " + (index + 1) + " amount"
          }) || 0,
        currency: context.currency,
        dueAt,
        sourceType: entry.sourceType,
        sourceRecordedAt,
        sourceFreshnessAt,
        sourceRecordId: entry.sourceRecordId.trim()
      };
    });
    return {
      calculator: "cash_flow" as const,
      currency: context.currency,
      minorUnitDigits: context.minorUnitDigits,
      currentCashMinor: canViewCurrentCash
        ? parseMoneyInput(currentCash, context, {
            label: "Owner-entered current cash",
            allowNegative: true,
            allowBlank: true
          })
        : null,
      asOf: normalizedAsOf,
      timeZone: normalizedTimeZone,
      timeZoneVersion: authoritative.version,
      staleAfterDays: staleDays,
      horizonsDays: [30, 60, 90],
      entries: normalizedEntries
    };
  };

  const calculate = async () => {
    if (busy) return;
    const epoch = calculationEpoch.current + 1;
    calculationEpoch.current = epoch;
    const requestWorkspaceKey = workspaceKey;
    setBusy(true);
    setFormError("");
    setFeedback("");
    try {
      const input = buildCalculationInput();
      const calculated = await calculateBusinessDesk<CashFlowCalculationResult>(
        stableWorkspace,
        input
      );
      if (
        calculationEpoch.current !== epoch ||
        currentWorkspaceKey.current !== requestWorkspaceKey
      ) {
        return;
      }
      if (normalizeIanaTimeZone(calculated.timeZone) !== input.timeZone) {
        throw new Error(
          "The cash-flow result did not match the requested planning time zone."
        );
      }
      if (calculated.workspaceTimeZoneVersion !== authoritativeTimeZoneVersion) {
        await workspaceTimeZoneState.reload();
        throw new Error(
          "The workspace time-zone version changed during calculation. Reload before using the result."
        );
      }
      const visibleCalculated = canViewCurrentCash
        ? calculated
        : {
            ...calculated,
            currentCashMinor: null,
            horizons: calculated.horizons.map((horizon) => ({
              ...horizon,
              projectedCashMinor: null
            })),
            complete: false,
            incompleteReasons: [
              ...new Set([...calculated.incompleteReasons, "CURRENT_CASH_UNKNOWN"])
            ]
          };
      setResult(visibleCalculated);
      setResultFingerprint(contentFingerprint);
    } catch (error) {
      if (
        calculationEpoch.current === epoch &&
        currentWorkspaceKey.current === requestWorkspaceKey
      ) {
        setFormError(
          error instanceof Error
            ? error.message
            : "The cash-flow snapshot could not be calculated."
        );
      }
    } finally {
      if (
        calculationEpoch.current === epoch &&
        currentWorkspaceKey.current === requestWorkspaceKey
      ) {
        setBusy(false);
      }
    }
  };

  const saveDraft = async () => {
    if (busy || collection.saving) return;
    setFormError("");
    setFeedback("");
    try {
      if (!title.trim()) throw new Error("Give this cash-flow snapshot a clear title.");
      const input = buildCalculationInput();
      const saved = await collection.save(
        {
          title: title.trim(),
          status: "draft",
          payload: {
            cashFlowSnapshot: {
              asOf: input.asOf,
              timeZone: input.timeZone,
              timeZoneVersion: authoritativeTimeZoneVersion,
              currency: input.currency,
              minorUnitDigits: input.minorUnitDigits,
              ...(canViewCurrentCash ? { currentCashMinor: input.currentCashMinor } : {}),
              horizonsDays: input.horizonsDays,
              staleAfterDays: input.staleAfterDays,
              entries: input.entries,
              assumptions: assumptions.trim()
            }
          },
          sourceLinks: deduplicatedSourceLinks(entries)
        },
        selected
      );
      const pinnedPayload = payloadOf(saved);
      const pinnedTimeZone = normalizeIanaTimeZone(pinnedPayload.timeZone);
      const pinnedTimeZoneVersion = Number(pinnedPayload.timeZoneVersion);
      open(saved);
      if (
        pinnedTimeZone !== input.timeZone ||
        pinnedTimeZoneVersion !== input.timeZoneVersion
      ) {
        setSavedContentFingerprint("");
        await workspaceTimeZoneState.reload();
        setFormError(
          "The workspace time zone changed while this draft was saving. The server-pinned revision was retained; reload the setting and review every local date before calculating, saving, or reviewing it."
        );
        setFeedback(`Cash-flow draft revision ${saved.version} was saved.`);
        return;
      }
      setFeedback(
        "Cash-flow draft revision " +
          saved.version +
          " saved. Review the exact unchanged draft separately."
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The cash-flow snapshot could not be saved."
      );
    }
  };

  const reviewDraft = async () => {
    if (busy || collection.saving) return;
    setFormError("");
    setFeedback("");
    try {
      if (!selected || selected.status !== "draft") {
        throw new Error("Save the cash-flow snapshot as a draft before reviewing it.");
      }
      if (contentFingerprint !== savedContentFingerprint) {
        throw new Error(
          "Save this exact snapshot as a draft before reviewing that revision."
        );
      }
      const reviewed = await collection.transition(selected, { status: "reviewed" });
      open(reviewed);
      setFeedback("Exact cash-flow revision " + reviewed.version + " reviewed.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The cash-flow snapshot could not be reviewed."
      );
    }
  };

  const archive = async () => {
    setFormError("");
    setFeedback("");
    try {
      if (!selected) return;
      if (archiveReason.trim().length < 3) {
        throw new Error("Enter an archive reason with at least three characters.");
      }
      await collection.archive(selected, archiveReason.trim());
      startNew();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The snapshot could not be archived."
      );
    }
  };

  return (
    <RecordToolScaffold
      title="Cash-flow Snapshot"
      workspaceLabel={workspaceLabel}
      basePath={basePath}
      description="Build source-labeled 30, 60, and 90-day planning scenarios from recorded and expected evidence—without pretending to be a bank balance, bookkeeping system, or ML forecast."
      records={collection.records}
      selectedRecord={selected}
      loading={collection.loading}
      error={collection.error}
      onRetry={() => void collection.reload()}
      onNew={startNew}
      onSelect={open}
    >
      <WorkspaceTimeZoneControl
        state={workspaceTimeZoneState}
        workspaceLabel={workspaceLabel}
        canConfigure={workspaceType === "commercial" || canViewCurrentCash}
      />
      <AppCard
        title={
          selected
            ? "Edit snapshot revision " + selected.version
            : "New cash-flow snapshot"
        }
        titleLevel={2}
        subtitle="Current cash is an explicit owner-entered value and may remain unknown. Every entry stays recorded or expected and carries source freshness."
      >
        <View style={styles.fieldGrid}>
          <LabeledInput
            label="Record title"
            accessibilityLabel="Cash-flow record title"
            value={title}
            onChangeText={setTitle}
            placeholder="September operating snapshot"
          />
          <LabeledInput
            label="Currency"
            accessibilityLabel="Cash-flow currency"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            value={currency}
            onChangeText={setCurrency}
            placeholder="Three-letter ISO code"
            hint="Required for calculation, save, review, and export. No conversion or currency is inferred."
          />
          {canViewCurrentCash ? (
            <LabeledInput
              label="Owner-entered current cash"
              accessibilityLabel="Owner-entered current cash"
              keyboardType="numbers-and-punctuation"
              value={currentCash}
              onChangeText={setCurrentCash}
              placeholder="Unknown if blank"
              hint="A planning input, not a bank-connected or verified bank balance."
            />
          ) : (
            <View style={styles.restrictedField}>
              <Text style={styles.fieldAccessLabel}>Opening cash is owner-only</Text>
              <Text style={styles.bodyText}>
                Managers can build and review cash-movement scenarios without seeing or
                storing the owner&apos;s current-cash input.
              </Text>
            </View>
          )}
          <LabeledInput
            label="Freshness window (days)"
            accessibilityLabel="Cash-flow freshness days"
            keyboardType="number-pad"
            value={staleAfterDays}
            onChangeText={setStaleAfterDays}
            placeholder="30"
          />
          <View style={styles.dateField}>
            <CalendarDateField
              label="Snapshot as of"
              accessibilityLabel="Cash-flow snapshot as of date and time"
              mode="datetime"
              value={asOf}
              onChange={(value) => {
                setAsOf(value);
                setAsOfIsoHint("");
                setAsOfTouched(true);
              }}
              disabled={timeSensitiveBlocked}
              timeZoneLabel={timeZone || undefined}
            />
          </View>
          <View style={styles.restrictedField}>
            <Text style={styles.fieldAccessLabel}>Authoritative planning time zone</Text>
            <Text style={styles.bodyText}>
              {timeZone && timeZoneVersion > 0
                ? `${timeZone} · workspace setting version ${timeZoneVersion}`
                : "Unset. The owner must configure the workspace setting above."}
            </Text>
            <Text style={styles.bodyText}>
              All wall times and 30, 60, and 90-day cutoffs use this exact setting.
              Skipped or repeated clock-change times are rejected rather than guessed.
            </Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          Saved state: {selected ? selected.status.replace(/_/g, " ") : "not saved"}.
          Content saves always create a draft revision; review is a separate exact-version
          action.
        </Text>
        <Text style={styles.bodyText}>
          A reviewed quote is not expected cash merely because it exists. The operator
          must deliberately add it as an expected entry and retain its authorized source
          ID.
        </Text>

        <View style={styles.entryStack}>
          {entries.map((entry, index) => {
            const previewTimeZone = normalizeIanaTimeZone(timeZone);
            const asOfTime = previewEpoch(asOf, previewTimeZone, asOfIsoHint);
            const freshnessTime = previewEpoch(
              entry.sourceFreshnessAt,
              previewTimeZone,
              entry.sourceFreshnessAtIsoHint
            );
            const staleDays = Number(staleAfterDays);
            const stale =
              Number.isFinite(asOfTime) &&
              Number.isFinite(freshnessTime) &&
              Number.isFinite(staleDays) &&
              asOfTime - freshnessTime > staleDays * 86_400_000;
            const dueTime = previewEpoch(
              entry.dueAt,
              previewTimeZone,
              entry.dueAtIsoHint
            );
            const overdue = Number.isFinite(dueTime) && dueTime < asOfTime;
            return (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>Cash-flow entry {index + 1}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={"Remove cash-flow entry " + (index + 1)}
                    onPress={() =>
                      setEntries((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
                <View style={styles.badgeRow}>
                  {stale ? <Text style={styles.warningBadge}>Stale source</Text> : null}
                  {overdue ? <Text style={styles.warningBadge}>Overdue date</Text> : null}
                  <Text style={styles.neutralBadge}>{entry.confidence}</Text>
                </View>
                <View style={styles.fieldGrid}>
                  <LabeledInput
                    label="Label"
                    accessibilityLabel={"Cash-flow entry " + (index + 1) + " label"}
                    value={entry.label}
                    onChangeText={(value) => updateEntry(index, { label: value })}
                    placeholder="Invoice, bill, purchase, or owner entry"
                  />
                  <LabeledInput
                    label="Amount"
                    accessibilityLabel={"Cash-flow entry " + (index + 1) + " amount"}
                    keyboardType="decimal-pad"
                    value={entry.amount}
                    onChangeText={(value) => updateEntry(index, { amount: value })}
                    placeholder="0.00"
                  />
                </View>
                {entry.sourceType === "manual" ? (
                  <>
                    <StatusSelector
                      label={"Cash-flow entry " + (index + 1) + " direction"}
                      value={entry.direction}
                      options={DIRECTION_OPTIONS}
                      onChange={(value) => updateEntry(index, { direction: value })}
                    />
                    <StatusSelector
                      label={"Cash-flow entry " + (index + 1) + " evidence state"}
                      value={entry.confidence}
                      options={CONFIDENCE_OPTIONS}
                      onChange={(value) => updateEntry(index, { confidence: value })}
                    />
                  </>
                ) : (
                  <Text style={styles.bodyText}>
                    {entry.sourceType === "quote" ? "Incoming" : "Outgoing"} · Expected. A
                    reviewed business record is not proof that cash moved.
                  </Text>
                )}
                <StatusSelector
                  label={"Cash-flow entry " + (index + 1) + " source type"}
                  value={entry.sourceType}
                  options={SOURCE_OPTIONS}
                  onChange={(value) =>
                    updateEntry(index, {
                      sourceType: value,
                      sourceRecordId: "",
                      sourceRecordedAtIsoHint: "",
                      sourceFreshnessAtIsoHint: "",
                      direction:
                        value === "quote"
                          ? "inflow"
                          : value === "expense"
                            ? "outflow"
                            : entry.direction,
                      confidence: value === "manual" ? entry.confidence : "expected"
                    })
                  }
                />
                {entry.sourceType !== "manual" ? (
                  <View style={styles.sourcePicker}>
                    <Text style={styles.entryTitle}>
                      Select a reviewed {entry.sourceType}
                    </Text>
                    {sourceLoading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color={palette.accent} />
                        <Text style={styles.bodyText}>Loading authorized records…</Text>
                      </View>
                    ) : sourceError ? (
                      <Text style={styles.errorText}>{sourceError}</Text>
                    ) : authorizedSources.filter(
                        (record) => record.kind === entry.sourceType
                      ).length ? (
                      <View
                        accessibilityRole="radiogroup"
                        style={styles.sourceChoiceStack}
                      >
                        {authorizedSources
                          .filter((record) => record.kind === entry.sourceType)
                          .map((record) => {
                            const id = sourceRecordId(record);
                            const chosen = entry.sourceRecordId === id;
                            const observedAtIso = validIsoInstant(
                              record.updatedAt || record.createdAt
                            );
                            const selectedTimeZone = normalizeIanaTimeZone(timeZone);
                            const observedAt =
                              observedAtIso && selectedTimeZone
                                ? isoInstantToZonedLocalDateTime(
                                    observedAtIso,
                                    selectedTimeZone
                                  )
                                : entry.sourceRecordedAt;
                            return (
                              <Pressable
                                key={id}
                                accessibilityRole="radio"
                                accessibilityLabel={
                                  "Use cash-flow source " +
                                  record.title +
                                  " revision " +
                                  record.version
                                }
                                accessibilityState={{ checked: chosen }}
                                onPress={() =>
                                  updateEntry(index, {
                                    sourceRecordId: id,
                                    sourceRecordedAt: observedAt,
                                    sourceRecordedAtIsoHint: observedAtIso || "",
                                    sourceFreshnessAt: observedAt,
                                    sourceFreshnessAtIsoHint: observedAtIso || "",
                                    direction:
                                      record.kind === "quote" ? "inflow" : "outflow",
                                    confidence: "expected",
                                    label: entry.label.trim() ? entry.label : record.title
                                  })
                                }
                                style={[
                                  styles.sourceChoice,
                                  chosen && styles.sourceChoiceSelected
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.sourceChoiceTitle,
                                    chosen && styles.sourceChoiceTitleSelected
                                  ]}
                                >
                                  {record.title} · revision {record.version}
                                </Text>
                                <Text style={styles.sourceChoiceMeta}>
                                  Reviewed ·{" "}
                                  {observedAtIso && selectedTimeZone
                                    ? `${observedAt} (${selectedTimeZone})`
                                    : "date unavailable"}
                                </Text>
                              </Pressable>
                            );
                          })}
                      </View>
                    ) : (
                      <Text style={styles.warningText}>
                        No reviewed {entry.sourceType} records are available in this
                        workspace. Review one first or use an honest owner-entered entry.
                      </Text>
                    )}
                  </View>
                ) : null}
                <View style={styles.fieldGrid}>
                  <View style={styles.dateField}>
                    <CalendarDateField
                      label="Due / expected at"
                      accessibilityLabel={
                        "Cash-flow entry " + (index + 1) + " due date and time"
                      }
                      mode="datetime"
                      value={entry.dueAt}
                      onChange={(value) =>
                        updateEntry(index, { dueAt: value, dueAtIsoHint: "" })
                      }
                      disabled={timeSensitiveBlocked}
                      timeZoneLabel={timeZone || undefined}
                    />
                  </View>
                  {entry.sourceType === "manual" ? (
                    <>
                      <View style={styles.dateField}>
                        <CalendarDateField
                          label="Source recorded at"
                          accessibilityLabel={
                            "Cash-flow entry " +
                            (index + 1) +
                            " source recorded date and time"
                          }
                          mode="datetime"
                          value={entry.sourceRecordedAt}
                          onChange={(value) =>
                            updateEntry(index, {
                              sourceRecordedAt: value,
                              sourceRecordedAtIsoHint: ""
                            })
                          }
                          disabled={timeSensitiveBlocked}
                          timeZoneLabel={timeZone || undefined}
                        />
                      </View>
                      <View style={styles.dateField}>
                        <CalendarDateField
                          label="Source fresh as of"
                          accessibilityLabel={
                            "Cash-flow entry " +
                            (index + 1) +
                            " source freshness date and time"
                          }
                          mode="datetime"
                          value={entry.sourceFreshnessAt}
                          onChange={(value) =>
                            updateEntry(index, {
                              sourceFreshnessAt: value,
                              sourceFreshnessAtIsoHint: ""
                            })
                          }
                          disabled={timeSensitiveBlocked}
                          timeZoneLabel={timeZone || undefined}
                        />
                      </View>
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add cash-flow entry"
          accessibilityState={{ disabled: timeSensitiveBlocked }}
          disabled={timeSensitiveBlocked}
          onPress={() => setEntries((current) => [...current, newEntry(timeZone)])}
          style={[styles.secondaryButton, timeSensitiveBlocked && styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>Add cash-flow entry</Text>
        </Pressable>
        <LabeledInput
          label="Scenario assumptions"
          accessibilityLabel="Cash-flow assumptions"
          multiline
          value={assumptions}
          onChangeText={setAssumptions}
          placeholder="Owner-reviewed assumptions and limitations"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calculate cash-flow snapshot"
          accessibilityState={{
            busy,
            disabled: busy || timeSensitiveBlocked || !currencyReady
          }}
          disabled={busy || timeSensitiveBlocked || !currencyReady}
          onPress={() => void calculate()}
          style={[
            styles.primaryButton,
            (busy || timeSensitiveBlocked || !currencyReady) && styles.disabled
          ]}
        >
          {busy ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.primaryButtonText}>Calculate 30 / 60 / 90 days</Text>
          )}
        </Pressable>
      </AppCard>

      <AppCard
        title="Deterministic scenarios"
        titleLevel={2}
        subtitle="Projected cash = owner-entered opening cash + expected incoming − expected outgoing. Recorded rows remain visible but are not added again."
      >
        {visibleResult ? (
          <View style={styles.resultStack}>
            <View style={styles.summaryGrid}>
              <Text style={styles.summaryText}>
                Planning time zone: {visibleResult.timeZone}
              </Text>
              <Text style={styles.summaryText}>
                Fresh sources: {visibleResult.evidenceSummary.freshCount}
              </Text>
              <Text style={styles.summaryText}>
                Stale sources: {visibleResult.evidenceSummary.staleCount}
              </Text>
              <Text style={styles.summaryText}>
                Recorded entries: {visibleResult.evidenceSummary.recordedCount}
              </Text>
              <Text style={styles.summaryText}>
                Expected entries: {visibleResult.evidenceSummary.expectedCount}
              </Text>
            </View>
            {!visibleResult.complete ? (
              <Text style={styles.warningText}>
                Incomplete: current cash is unknown. Net movement is still shown, but
                projected cash is not invented.
              </Text>
            ) : null}
            {visibleResult.horizons.map((horizon) => {
              const context: CurrencyContext = {
                currency: visibleResult.currency,
                minorUnitDigits: visibleResult.minorUnitDigits
              };
              return (
                <View key={horizon.days} style={styles.resultCard}>
                  <Text style={styles.resultTitle}>{horizon.days}-day scenario</Text>
                  <Text style={styles.bodyText}>
                    Through{" "}
                    {formatInstantInTimeZone(horizon.through, visibleResult.timeZone)}
                    {" · "}
                    {visibleResult.timeZone}
                  </Text>
                  <View style={styles.summaryGrid}>
                    <Text style={styles.summaryText}>
                      Recorded in:{" "}
                      {formatMoneyMinor(horizon.recordedInflowMinor, context)}
                    </Text>
                    <Text style={styles.summaryText}>
                      Recorded out:{" "}
                      {formatMoneyMinor(horizon.recordedOutflowMinor, context)}
                    </Text>
                    <Text style={styles.summaryText}>
                      Expected in:{" "}
                      {formatMoneyMinor(horizon.expectedInflowMinor, context)}
                    </Text>
                    <Text style={styles.summaryText}>
                      Expected out:{" "}
                      {formatMoneyMinor(horizon.expectedOutflowMinor, context)}
                    </Text>
                  </View>
                  <Text style={styles.resultMetric}>
                    Expected net movement:{" "}
                    {formatMoneyMinor(horizon.netMovementMinor, context)}
                  </Text>
                  {canViewCurrentCash ? (
                    <Text style={styles.resultMetric}>
                      Projected cash:{" "}
                      {formatMoneyMinor(horizon.projectedCashMinor, context)}
                    </Text>
                  ) : null}
                  {horizon.staleEntryCount ? (
                    <Text style={styles.warningText}>
                      {horizon.staleEntryCount} stale source
                      {horizon.staleEntryCount === 1 ? "" : "s"} included in this horizon.
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.bodyText}>
            Calculate the current inputs to see source counts and separate
            recorded/expected 30, 60, and 90-day scenarios. Changed inputs require a new
            calculation.
          </Text>
        )}
      </AppCard>

      <AppCard
        title="Save and review"
        titleLevel={2}
        subtitle="Review applies only to an unchanged saved draft. Saving does not create a payment, expense, sale, bank connection, or inventory movement."
      >
        <Text style={styles.warningText}>
          This is a planning scenario, not bookkeeping, a bank balance, tax advice, or an
          ML forecast.
        </Text>
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Review saved cash-flow draft"
          accessibilityState={{
            busy: collection.saving,
            disabled: !exactSavedDraft || collection.saving || busy
          }}
          disabled={!exactSavedDraft || collection.saving || busy}
          onPress={() => void reviewDraft()}
          style={[
            styles.reviewButton,
            (!exactSavedDraft || collection.saving || busy) && styles.disabled
          ]}
        >
          <Text style={styles.reviewButtonText}>Review exact saved draft</Text>
        </Pressable>
        <RecordSaveArchiveActions
          saving={collection.saving || busy}
          saveDisabled={timeSensitiveBlocked || !currencyReady}
          hasRecord={Boolean(businessDeskRecordId(selected))}
          saveLabel="Save cash-flow draft"
          archiveReason={archiveReason}
          onArchiveReasonChange={setArchiveReason}
          onSave={() => void saveDraft()}
          onArchive={() => void archive()}
        />
      </AppCard>

      <ReviewedArtifactPanel
        workspace={stableWorkspace}
        artifactKind="cash_flow_csv"
        revisionSelections={
          exactReviewedRevision && selected
            ? [
                {
                  recordId: businessDeskRecordId(selected),
                  revisionNumber: selected.version
                }
              ]
            : []
        }
        expectedRedactionProfile={
          canViewCurrentCash
            ? BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.cash_flow_full
            : BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.cash_flow_facility_manager
        }
        title={
          canViewCurrentCash
            ? "Owner full cash-flow CSV"
            : "Facility Manager cash-redacted CSV"
        }
        selectionLabel={
          exactReviewedRevision && selected
            ? `Pinned to reviewed cash-flow revision ${selected.version}.`
            : "No unchanged reviewed cash-flow revision is selected."
        }
        disclosure={
          canViewCurrentCash
            ? "This owner-authorized private export includes the reviewed current-cash input and projected-cash scenarios when present, along with recorded and expected movement. It is not a bank statement, bookkeeping record, payment evidence, or ML forecast. Confirm the private destination before export."
            : "Facility Manager export omits owner-only current cash and projected cash. It includes only the authorized cash-movement scenario fields in the exact preview. The redacted export is not a bank statement, bookkeeping record, payment evidence, or ML forecast."
        }
        disabled={!exactReviewedRevision || collection.saving || busy}
        disabledReason="Save and explicitly review an unchanged cash-flow revision before previewing its role-filtered CSV."
        previewButtonLabel={
          canViewCurrentCash
            ? "Preview owner full cash-flow CSV"
            : "Preview Manager cash-redacted CSV"
        }
        prepareButtonLabel="Confirm and export cash-flow CSV"
        stalenessKey={`${businessDeskRecordId(selected)}:${selected?.version || 0}:${exactReviewedRevision ? "reviewed" : "changed"}:${canViewCurrentCash ? "full" : "manager"}`}
      />
    </RecordToolScaffold>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    bodyText: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    dateField: { flexBasis: 250, flexGrow: 1, minWidth: 220 },
    disabled: { opacity: 0.65 },
    entryCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      padding: 12
    },
    entryHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    entryStack: { gap: 12 },
    entryTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    errorText: { color: palette.danger, fontSize: 13, fontWeight: "800" },
    feedbackText: { color: palette.success, fontSize: 13, fontWeight: "800" },
    fieldAccessLabel: { color: palette.text, fontSize: 13, fontWeight: "900" },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    neutralBadge: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      color: palette.text,
      fontSize: 11,
      fontWeight: "900",
      paddingHorizontal: 9,
      paddingVertical: 5,
      textTransform: "capitalize"
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontSize: 14, fontWeight: "900" },
    removeText: { color: palette.danger, fontSize: 12, fontWeight: "900" },
    reviewButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    reviewButtonText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    restrictedField: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: 250,
      flexGrow: 1,
      gap: 5,
      minWidth: 220,
      padding: 12
    },
    resultCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 7,
      padding: 12
    },
    resultMetric: { color: palette.text, fontSize: 14, fontWeight: "900" },
    resultStack: { gap: 10 },
    resultTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    loadingRow: { alignItems: "center", flexDirection: "row", gap: 9 },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    sourceChoice: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      minHeight: 48,
      padding: 11
    },
    sourceChoiceMeta: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    sourceChoiceSelected: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.accent,
      borderWidth: 2
    },
    sourceChoiceStack: { gap: 8 },
    sourceChoiceTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
    sourceChoiceTitleSelected: { color: palette.accent },
    sourcePicker: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      padding: 12
    },
    summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    summaryText: { color: palette.text, fontSize: 13, fontWeight: "800" },
    warningBadge: {
      backgroundColor: palette.surface,
      borderColor: palette.warning,
      borderRadius: 999,
      borderWidth: 1,
      color: palette.warning,
      fontSize: 11,
      fontWeight: "900",
      paddingHorizontal: 9,
      paddingVertical: 5
    },
    warningText: {
      color: palette.warning,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 19
    }
  });
}
