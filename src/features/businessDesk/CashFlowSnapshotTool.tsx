import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  calculateBusinessDesk,
  type BusinessDeskRecord,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import {
  LabeledInput,
  RecordSaveArchiveActions,
  StatusSelector
} from "@/features/businessDesk/RecordFormControls";
import RecordToolScaffold from "@/features/businessDesk/RecordToolScaffold";
import {
  formatMoneyMinor,
  parseMoneyInput,
  resolveCurrencyContext,
  type CurrencyContext
} from "@/features/businessDesk/money";
import {
  businessDeskRecordId,
  isoToLocalDateTime,
  localDateTimeToIso,
  useBusinessDeskRecordCollection
} from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type CashDirection = "inflow" | "outflow";
type CashConfidence = "recorded" | "expected";
type CashSourceType =
  | "manual"
  | "quote"
  | "expense"
  | "job"
  | "invoice_provider"
  | "bank_import"
  | "inventory"
  | "external_reference";

type CashEntryDraft = {
  id: string;
  label: string;
  direction: CashDirection;
  confidence: CashConfidence;
  amount: string;
  dueAt: string;
  sourceType: CashSourceType;
  sourceRecordedAt: string;
  sourceFreshnessAt: string;
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
  { value: "expense", label: "Expense / bill" },
  { value: "job", label: "Job record" },
  { value: "invoice_provider", label: "Payment provider evidence" },
  { value: "bank_import", label: "Authorized bank import" },
  { value: "inventory", label: "B-02 inventory reference" },
  { value: "external_reference", label: "External reference" }
];

const SOURCE_LINK_TYPES: Partial<Record<CashSourceType, string>> = {
  quote: "quote",
  expense: "expense",
  job: "job",
  inventory: "inventory_item",
  invoice_provider: "external_reference",
  bank_import: "external_reference",
  external_reference: "external_reference"
};

let entrySequence = 0;

function nowLocalDateTime() {
  return isoToLocalDateTime(new Date().toISOString());
}

function newEntry(overrides: Partial<CashEntryDraft> = {}): CashEntryDraft {
  entrySequence += 1;
  const capturedAt = nowLocalDateTime();
  return {
    id: "cash-entry-" + entrySequence,
    label: "",
    direction: "inflow",
    confidence: "expected",
    amount: "",
    dueAt: "",
    sourceType: "manual",
    sourceRecordedAt: capturedAt,
    sourceFreshnessAt: capturedAt,
    sourceRecordId: "",
    ...overrides
  };
}

function payloadOf(record: BusinessDeskRecord | null) {
  return (record?.payload?.cashFlowSnapshot || {}) as any;
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
      return {
        ...record,
        payload: { ...record.payload, cashFlowSnapshot: visibleSnapshot }
      };
    },
    [canViewCurrentCash]
  );
  const collection = useBusinessDeskRecordCollection(workspace, "cash_flow_snapshot", {
    sanitizeRecord
  });
  const [selected, setSelected] = useState<BusinessDeskRecord | null>(null);
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [currentCash, setCurrentCash] = useState("");
  const [asOf, setAsOf] = useState(nowLocalDateTime);
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

  const contentFingerprint = JSON.stringify({
    title,
    currency,
    currentCash,
    asOf,
    staleAfterDays,
    entries: entries.map(cleanEntryForFingerprint),
    assumptions
  });
  const exactSavedDraft = Boolean(
    selected?.status === "draft" && contentFingerprint === savedContentFingerprint
  );
  const visibleResult = resultFingerprint === contentFingerprint ? result : null;

  const reset = () => {
    setSelected(null);
    setTitle("");
    setCurrency("USD");
    setCurrentCash("");
    setAsOf(nowLocalDateTime());
    setStaleAfterDays("30");
    setEntries([]);
    setAssumptions("");
    setArchiveReason("");
    setSavedContentFingerprint("");
    setResult(null);
    setResultFingerprint("");
    setFormError("");
    setFeedback("");
  };

  const open = (record: BusinessDeskRecord) => {
    const payload = payloadOf(record);
    const digits = Number.isInteger(payload.minorUnitDigits)
      ? Number(payload.minorUnitDigits)
      : 2;
    const nextEntries = Array.isArray(payload.entries)
      ? payload.entries.map((entry: any) =>
          newEntry({
            label: String(entry.label || ""),
            direction: (entry.direction || "inflow") as CashDirection,
            confidence: (entry.confidence || "expected") as CashConfidence,
            amount: majorInput(entry.amountMinor, digits),
            dueAt: isoToLocalDateTime(entry.dueAt),
            sourceType: (entry.sourceType || "manual") as CashSourceType,
            sourceRecordedAt: isoToLocalDateTime(entry.sourceRecordedAt),
            sourceFreshnessAt: isoToLocalDateTime(entry.sourceFreshnessAt),
            sourceRecordId: String(entry.sourceRecordId || "")
          })
        )
      : [];
    const next = {
      title: record.title || "",
      currency: String(payload.currency || "USD"),
      currentCash: canViewCurrentCash ? majorInput(payload.currentCashMinor, digits) : "",
      asOf: isoToLocalDateTime(payload.asOf) || nowLocalDateTime(),
      staleAfterDays: String(payload.staleAfterDays || 30),
      entries: nextEntries,
      assumptions: String(payload.assumptions || "")
    };
    setSelected(record);
    setTitle(next.title);
    setCurrency(next.currency);
    setCurrentCash(next.currentCash);
    setAsOf(next.asOf);
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
    const normalizedAsOf = localDateTimeToIso(asOf);
    if (!normalizedAsOf) throw new Error("Choose the snapshot date and time.");
    const staleDays = Number(staleAfterDays.trim());
    if (!Number.isInteger(staleDays) || staleDays < 1 || staleDays > 3_650) {
      throw new Error("Freshness window must be 1 to 3650 whole days.");
    }
    const normalizedEntries = entries.map((entry, index) => {
      if (!entry.label.trim()) {
        throw new Error("Cash-flow entry " + (index + 1) + " needs a label.");
      }
      const dueAt = localDateTimeToIso(entry.dueAt);
      const sourceRecordedAt = localDateTimeToIso(entry.sourceRecordedAt);
      const sourceFreshnessAt = localDateTimeToIso(entry.sourceFreshnessAt);
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
      staleAfterDays: staleDays,
      horizonsDays: [30, 60, 90],
      entries: normalizedEntries
    };
  };

  const calculate = async () => {
    if (busy) return;
    setBusy(true);
    setFormError("");
    setFeedback("");
    try {
      const calculated = await calculateBusinessDesk<CashFlowCalculationResult>(
        workspace,
        buildCalculationInput()
      );
      setResult(calculated);
      setResultFingerprint(contentFingerprint);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The cash-flow snapshot could not be calculated."
      );
    } finally {
      setBusy(false);
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
      open(saved);
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
      reset();
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
      onNew={reset}
      onSelect={open}
    >
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
            placeholder="USD"
            hint="All entries use this currency. No conversion or FX is inferred."
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
              onChange={setAsOf}
            />
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
            const asOfTime = new Date(localDateTimeToIso(asOf) || 0).getTime();
            const freshnessTime = new Date(
              localDateTimeToIso(entry.sourceFreshnessAt) || 0
            ).getTime();
            const staleDays = Number(staleAfterDays);
            const stale =
              Number.isFinite(asOfTime) &&
              Number.isFinite(freshnessTime) &&
              Number.isFinite(staleDays) &&
              asOfTime - freshnessTime > staleDays * 86_400_000;
            const dueTime = new Date(localDateTimeToIso(entry.dueAt) || 0).getTime();
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
                <StatusSelector
                  label={"Cash-flow entry " + (index + 1) + " source type"}
                  value={entry.sourceType}
                  options={SOURCE_OPTIONS}
                  onChange={(value) =>
                    updateEntry(index, {
                      sourceType: value,
                      sourceRecordId: value === "manual" ? "" : entry.sourceRecordId
                    })
                  }
                />
                <View style={styles.fieldGrid}>
                  <View style={styles.dateField}>
                    <CalendarDateField
                      label="Due / expected at"
                      accessibilityLabel={
                        "Cash-flow entry " + (index + 1) + " due date and time"
                      }
                      mode="datetime"
                      value={entry.dueAt}
                      onChange={(value) => updateEntry(index, { dueAt: value })}
                    />
                  </View>
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
                        updateEntry(index, { sourceRecordedAt: value })
                      }
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
                        updateEntry(index, { sourceFreshnessAt: value })
                      }
                    />
                  </View>
                  <LabeledInput
                    label="Source / evidence ID"
                    accessibilityLabel={
                      "Cash-flow entry " + (index + 1) + " source record id"
                    }
                    value={entry.sourceRecordId}
                    onChangeText={(value) =>
                      updateEntry(index, { sourceRecordId: value })
                    }
                    placeholder={
                      entry.sourceType === "manual"
                        ? "Optional"
                        : "Required authorized record or evidence ID"
                    }
                    hint="Internal record IDs are reauthorized in this workspace when saved."
                  />
                </View>
              </View>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add cash-flow entry"
          onPress={() => setEntries((current) => [...current, newEntry()])}
          style={styles.secondaryButton}
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
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={() => void calculate()}
          style={[styles.primaryButton, busy && styles.disabled]}
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
        subtitle="Projected cash = owner-entered opening cash + recorded and expected incoming − recorded and expected outgoing through each horizon."
      >
        {visibleResult ? (
          <View style={styles.resultStack}>
            <View style={styles.summaryGrid}>
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
                    Through {new Date(horizon.through).toLocaleString()}
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
                    Net movement: {formatMoneyMinor(horizon.netMovementMinor, context)}
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
          hasRecord={Boolean(businessDeskRecordId(selected))}
          saveLabel="Save cash-flow draft"
          archiveReason={archiveReason}
          onArchiveReasonChange={setArchiveReason}
          onSave={() => void saveDraft()}
          onArchive={() => void archive()}
        />
      </AppCard>
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
