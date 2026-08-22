import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps
} from "react-native";

import {
  businessDeskWorkspaceKey,
  calculateBusinessDesk,
  type BusinessDeskRecord,
  type BusinessDeskRecordTotals,
  type BusinessDeskTax,
  type BusinessDeskWorkspace,
  type PriceMarginCalculationInput,
  type PriceMarginCalculationResult,
  type PriceMarginScenarioPayload
} from "@/api/businessDesk";
import InlineError from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import {
  businessDeskRecordId,
  useBusinessDeskRecordCollection
} from "@/features/businessDesk/recordWorkflow";
import {
  formatBasisPoints,
  formatMoneyMinor,
  isSupportedCurrencyCode,
  formatQuantityMicros,
  parseMoneyInput,
  parsePercentInput,
  parseQuantityInput,
  resolveCurrencyContext,
  type CurrencyContext
} from "@/features/businessDesk/money";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type TaxType = "none" | "percent" | "fixed";

type PriceMarginToolProps = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
};

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  styles: ReturnType<typeof createStyles>;
};

function Field({ label, hint, styles, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={inputProps.accessibilityLabel || label}
        placeholderTextColor={styles.inputPlaceholder.color}
        style={[styles.input, inputProps.style]}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function optionalMoney(value: string, context: CurrencyContext, label: string): number {
  return parseMoneyInput(value, context, { label, allowBlank: true }) ?? 0;
}

function resultReason(reason: string | null | undefined) {
  if (reason === "DIRECT_COST_UNKNOWN") {
    return "Add a reviewed direct cost before using the break-even result.";
  }
  if (reason === "NO_POSITIVE_CONTRIBUTION") {
    return "This scenario has no positive contribution, so it has no finite break-even point.";
  }
  return "Break-even is unavailable for the current inputs.";
}

function desiredMarginReason(reason: string | null | undefined) {
  if (reason === "DIRECT_COST_UNKNOWN") {
    return "Add a reviewed direct unit cost before using a target-margin price.";
  }
  return "The server could not produce a desired unit price for this target margin.";
}

function moneyMinorToInput(value: unknown, minorUnitDigits: number) {
  if (!Number.isSafeInteger(value)) return "";
  const scale = 10 ** minorUnitDigits;
  const absolute = Math.abs(Number(value));
  const whole = Math.floor(absolute / scale);
  const fraction = minorUnitDigits
    ? `.${String(absolute % scale)
        .padStart(minorUnitDigits, "0")
        .replace(/0+$/, "")}`
    : "";
  return `${Number(value) < 0 ? "-" : ""}${whole}${fraction === "." ? "" : fraction}`;
}

function quantityMicrosToInput(value: unknown) {
  if (!Number.isSafeInteger(value)) return "1";
  const absolute = Math.abs(Number(value));
  const whole = Math.floor(absolute / 1_000_000);
  const fraction = String(absolute % 1_000_000)
    .padStart(6, "0")
    .replace(/0+$/, "");
  return `${Number(value) < 0 ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function basisPointsToInput(value: unknown) {
  if (!Number.isSafeInteger(value)) return "";
  const absolute = Math.abs(Number(value));
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100)
    .padStart(2, "0")
    .replace(/0+$/, "");
  return `${Number(value) < 0 ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function scenarioPayload(record: BusinessDeskRecord | null) {
  const candidate = record?.payload?.priceMarginScenario;
  return candidate && typeof candidate === "object"
    ? (candidate as PriceMarginScenarioPayload)
    : null;
}

function scenarioTotals(record: BusinessDeskRecord | null) {
  return record?.totals?.calculator === "price_margin"
    ? record.totals
    : (null as BusinessDeskRecordTotals | null);
}

function calculatedAtLabel(value: unknown) {
  const raw = String(value || "").trim();
  const date = new Date(raw);
  return raw && Number.isFinite(date.getTime()) ? date.toLocaleString() : "Unknown";
}

function sanitizePriceMarginRecord(record: BusinessDeskRecord) {
  const id = businessDeskRecordId(record);
  const payload = scenarioPayload(record);
  const totals = scenarioTotals(record);
  const safeNonnegativeInteger = (value: unknown) =>
    Number.isSafeInteger(value) && Number(value) >= 0;
  const safeNonnegativeIntegerOrNull = (value: unknown) =>
    value === null || safeNonnegativeInteger(value);
  const validTax =
    payload?.tax?.type === "none" ||
    (payload?.tax?.type === "fixed" && safeNonnegativeInteger(payload.tax.amountMinor)) ||
    (payload?.tax?.type === "percent" &&
      safeNonnegativeInteger(payload.tax.basisPoints) &&
      payload.tax.basisPoints <= 10_000 &&
      ["discounted_subtotal", "discounted_subtotal_plus_shipping"].includes(
        payload.tax.base
      ));
  if (
    !id ||
    record.kind !== "price_margin_scenario" ||
    !record.title?.trim() ||
    !["draft", "reviewed"].includes(record.status) ||
    !Number.isSafeInteger(record.version) ||
    record.version < 1 ||
    !payload ||
    !totals ||
    !(
      String(payload.currency || "") === "" || /^[A-Z]{3}$/.test(String(payload.currency))
    ) ||
    !Number.isSafeInteger(payload.minorUnitDigits) ||
    payload.minorUnitDigits < 0 ||
    payload.minorUnitDigits > 4 ||
    !Number.isSafeInteger(payload.quantityMicros) ||
    payload.quantityMicros < 1 ||
    !safeNonnegativeInteger(payload.unitPriceMinor) ||
    !safeNonnegativeIntegerOrNull(payload.unitDirectCostMinor) ||
    !payload.discount ||
    payload.discount.order !== "percent_then_fixed" ||
    !safeNonnegativeInteger(payload.discount.percentBasisPoints) ||
    payload.discount.percentBasisPoints > 10_000 ||
    !safeNonnegativeInteger(payload.discount.fixedMinor) ||
    !validTax ||
    !safeNonnegativeInteger(payload.customerShippingMinor) ||
    !safeNonnegativeInteger(payload.businessFeesMinor) ||
    !safeNonnegativeInteger(payload.shippingCostMinor) ||
    !safeNonnegativeInteger(payload.fixedCostsMinor) ||
    !safeNonnegativeIntegerOrNull(payload.targetMarginBasisPoints) ||
    (payload.targetMarginBasisPoints !== null &&
      payload.targetMarginBasisPoints >= 10_000) ||
    totals.currency !== payload.currency ||
    totals.minorUnitDigits !== payload.minorUnitDigits ||
    totals.scenarioQuantityMicros !== payload.quantityMicros ||
    totals.unitPriceMinor !== payload.unitPriceMinor ||
    !safeNonnegativeInteger(totals.totalMinor) ||
    typeof totals.complete !== "boolean" ||
    !Array.isArray(totals.incompleteReasons) ||
    (totals.inputDigestSha256 !== undefined &&
      totals.inputDigestSha256 !== "" &&
      !/^[a-f0-9]{64}$/.test(totals.inputDigestSha256)) ||
    (totals.inputSnapshotJson !== undefined &&
      typeof totals.inputSnapshotJson !== "string") ||
    (totals.calculatedAt !== undefined &&
      totals.calculatedAt !== "" &&
      !Number.isFinite(Date.parse(totals.calculatedAt)))
  ) {
    throw new Error("The server returned an invalid saved Price & Margin scenario.");
  }
  return record;
}

export default function PriceMarginTool({
  workspace,
  workspaceLabel,
  basePath
}: PriceMarginToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const workspaceKey = businessDeskWorkspaceKey(workspace);
  const collection = useBusinessDeskRecordCollection(workspace, "price_margin_scenario", {
    sanitizeRecord: sanitizePriceMarginRecord
  });
  const [selectedState, setSelectedState] = useState<{
    workspaceKey: string;
    record: BusinessDeskRecord;
  } | null>(null);
  const [comparisonState, setComparisonState] = useState<{
    workspaceKey: string;
    recordIds: string[];
  }>({ workspaceKey, recordIds: [] });
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioNotes, setScenarioNotes] = useState("");
  const [currency, setCurrency] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitDirectCost, setUnitDirectCost] = useState("");
  const [targetMarginPercent, setTargetMarginPercent] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountFixed, setDiscountFixed] = useState("");
  const [customerShipping, setCustomerShipping] = useState("");
  const [businessFees, setBusinessFees] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [fixedCosts, setFixedCosts] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("none");
  const [taxRate, setTaxRate] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [taxShipping, setTaxShipping] = useState(false);
  const [result, setResult] = useState<PriceMarginCalculationResult | null>(null);
  const [resultFingerprint, setResultFingerprint] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [contentDirty, setContentDirty] = useState(false);
  const [calculationDirty, setCalculationDirty] = useState(true);
  const [busy, setBusy] = useState(false);

  const selected =
    selectedState?.workspaceKey === workspaceKey ? selectedState.record : null;
  const comparisonIds =
    comparisonState.workspaceKey === workspaceKey ? comparisonState.recordIds : [];
  const comparisonRecords = collection.records.filter((record) =>
    comparisonIds.includes(businessDeskRecordId(record))
  );
  const selectedId = businessDeskRecordId(selected);
  const selectionStale = Boolean(
    selected &&
    !collection.loading &&
    !collection.records.some(
      (record) =>
        businessDeskRecordId(record) === selectedId &&
        Number(record.version) === Number(selected.version)
    )
  );

  const inputFingerprint = JSON.stringify([
    currency,
    unitPrice,
    quantity,
    unitDirectCost,
    targetMarginPercent,
    discountPercent,
    discountFixed,
    customerShipping,
    businessFees,
    shippingCost,
    fixedCosts,
    taxType,
    taxRate,
    taxAmount,
    taxShipping
  ]);
  const currentResult = resultFingerprint === inputFingerprint ? result : null;
  const inputsChanged = Boolean(result && !currentResult);
  const currencyReady = isSupportedCurrencyCode(currency);

  const resetScenario = () => {
    setSelectedState(null);
    setScenarioName("");
    setScenarioNotes("");
    setCurrency("");
    setUnitPrice("");
    setQuantity("1");
    setUnitDirectCost("");
    setTargetMarginPercent("");
    setDiscountPercent("");
    setDiscountFixed("");
    setCustomerShipping("");
    setBusinessFees("");
    setShippingCost("");
    setFixedCosts("");
    setTaxType("none");
    setTaxRate("");
    setTaxAmount("");
    setTaxShipping(false);
    setResult(null);
    setResultFingerprint("");
    setError(null);
    setFormError("");
    setFeedback("");
    setArchiveReason("");
    setContentDirty(false);
    setCalculationDirty(true);
  };

  useEffect(() => {
    setSelectedState(null);
    setComparisonState({ workspaceKey, recordIds: [] });
    setScenarioName("");
    setScenarioNotes("");
    setCurrency("");
    setUnitPrice("");
    setQuantity("1");
    setUnitDirectCost("");
    setTargetMarginPercent("");
    setDiscountPercent("");
    setDiscountFixed("");
    setCustomerShipping("");
    setBusinessFees("");
    setShippingCost("");
    setFixedCosts("");
    setTaxType("none");
    setTaxRate("");
    setTaxAmount("");
    setTaxShipping(false);
    setResult(null);
    setResultFingerprint("");
    setError(null);
    setFormError("");
    setFeedback("");
    setArchiveReason("");
    setContentDirty(false);
    setCalculationDirty(true);
  }, [workspaceKey]);

  const markCalculationChanged = () => {
    setContentDirty(true);
    setCalculationDirty(true);
    setFeedback("");
  };

  const openScenario = (record: BusinessDeskRecord) => {
    const payload = scenarioPayload(record);
    if (!payload) {
      setFormError("This saved scenario did not contain a valid Price & Margin payload.");
      return;
    }
    const minorUnitDigits = Number(payload.minorUnitDigits);
    const tax = payload.tax;
    const taxTypeValue = ["none", "percent", "fixed"].includes(String(tax.type))
      ? (tax.type as TaxType)
      : "none";
    setSelectedState({ workspaceKey, record });
    setScenarioName(record.title || "");
    setScenarioNotes(String(payload.notes || ""));
    setCurrency(String(payload.currency || ""));
    setUnitPrice(moneyMinorToInput(payload.unitPriceMinor, minorUnitDigits));
    setQuantity(quantityMicrosToInput(payload.quantityMicros));
    setUnitDirectCost(
      payload.unitDirectCostMinor === null
        ? ""
        : moneyMinorToInput(payload.unitDirectCostMinor, minorUnitDigits)
    );
    setTargetMarginPercent(basisPointsToInput(payload.targetMarginBasisPoints));
    setDiscountPercent(basisPointsToInput(payload.discount?.percentBasisPoints));
    setDiscountFixed(moneyMinorToInput(payload.discount?.fixedMinor, minorUnitDigits));
    setCustomerShipping(
      moneyMinorToInput(payload.customerShippingMinor, minorUnitDigits)
    );
    setBusinessFees(moneyMinorToInput(payload.businessFeesMinor, minorUnitDigits));
    setShippingCost(moneyMinorToInput(payload.shippingCostMinor, minorUnitDigits));
    setFixedCosts(moneyMinorToInput(payload.fixedCostsMinor, minorUnitDigits));
    setTaxType(taxTypeValue);
    setTaxRate(tax.type === "percent" ? basisPointsToInput(tax.basisPoints) : "");
    setTaxAmount(
      tax.type === "fixed" ? moneyMinorToInput(tax.amountMinor, minorUnitDigits) : ""
    );
    setTaxShipping(
      tax.type === "percent" && tax.base === "discounted_subtotal_plus_shipping"
    );
    setResult(null);
    setResultFingerprint("");
    setError(null);
    setFormError("");
    setFeedback("");
    setArchiveReason("");
    setContentDirty(false);
    setCalculationDirty(false);
  };

  const currentSelectedRecord = () => {
    if (!selected) return null;
    if (selectionStale) {
      throw new Error(
        "This saved scenario changed or is no longer available. Refresh and reopen it before saving, reviewing, or archiving."
      );
    }
    return selected;
  };

  const buildScenarioInputs = () => {
    const context = resolveCurrencyContext(currency);
    const quantityMicros = parseQuantityInput(quantity, { label: "Quantity" });
    if (!quantityMicros || quantityMicros <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }
    const unitPriceMinor = parseMoneyInput(unitPrice, context, {
      label: "Selling price"
    });
    if (unitPriceMinor === null) throw new Error("Selling price is required.");
    const unitDirectCostMinor = parseMoneyInput(unitDirectCost, context, {
      label: "Direct unit cost",
      allowBlank: true
    });
    const percentBasisPoints =
      parsePercentInput(discountPercent, {
        label: "Discount percentage",
        allowBlank: true
      }) ?? 0;
    const targetMarginBasisPoints = parsePercentInput(targetMarginPercent, {
      label: "Target margin",
      allowBlank: true
    });
    if (targetMarginBasisPoints !== null && targetMarginBasisPoints >= 10_000) {
      throw new Error("Target margin must be less than 100%.");
    }

    let tax: BusinessDeskTax = { type: "none" };
    if (taxType === "fixed") {
      const amountMinor = parseMoneyInput(taxAmount, context, {
        label: "Tax amount"
      });
      if (amountMinor === null) throw new Error("Tax amount is required.");
      tax = { type: "fixed", amountMinor, currency: context.currency };
    } else if (taxType === "percent") {
      const basisPoints = parsePercentInput(taxRate, { label: "Tax rate" });
      if (basisPoints === null) throw new Error("Tax rate is required.");
      tax = {
        type: "percent",
        basisPoints,
        base: taxShipping ? "discounted_subtotal_plus_shipping" : "discounted_subtotal",
        currency: context.currency
      };
    }

    const shared = {
      ...context,
      unitPriceMinor,
      quantityMicros,
      unitDirectCostMinor,
      businessFeesMinor: optionalMoney(businessFees, context, "Scenario fees"),
      shippingCostMinor: optionalMoney(
        shippingCost,
        context,
        "Scenario fulfillment cost"
      ),
      customerShippingMinor: optionalMoney(
        customerShipping,
        context,
        "Customer shipping charge"
      ),
      fixedCostsMinor: optionalMoney(fixedCosts, context, "Fixed costs"),
      discount: {
        order: "percent_then_fixed" as const,
        percentBasisPoints,
        fixedMinor: optionalMoney(discountFixed, context, "Fixed discount")
      },
      tax
    };
    const calculationInput: PriceMarginCalculationInput = {
      calculator: "price_margin",
      ...shared,
      ...(targetMarginBasisPoints !== null ? { targetMarginBasisPoints } : {})
    };
    const persistedPayload: PriceMarginScenarioPayload = {
      ...shared,
      targetMarginBasisPoints,
      notes: scenarioNotes.trim()
    };
    return { calculationInput, persistedPayload };
  };

  const runCalculation = async () => {
    setError(null);
    setFormError("");
    setFeedback("");
    setBusy(true);
    try {
      const { calculationInput } = buildScenarioInputs();
      const nextResult = await calculateBusinessDesk<PriceMarginCalculationResult>(
        workspace,
        calculationInput
      );
      setResult(nextResult);
      setResultFingerprint(inputFingerprint);
      setCalculationDirty(false);
    } catch (nextError) {
      setResult(null);
      setResultFingerprint("");
      setCalculationDirty(true);
      setError(
        nextError instanceof Error
          ? nextError
          : new Error("The calculation could not be completed.")
      );
    } finally {
      setBusy(false);
    }
  };

  const saveScenario = async () => {
    setFormError("");
    setFeedback("");
    try {
      const current = currentSelectedRecord();
      if (!scenarioName.trim()) throw new Error("Give this scenario a clear name.");
      if (current && !contentDirty) {
        throw new Error("Change the selected scenario before saving another revision.");
      }
      if (calculationDirty || (!current && !currentResult)) {
        throw new Error("Calculate the current inputs before saving this scenario.");
      }
      const { persistedPayload } = buildScenarioInputs();
      const saved = await collection.save(
        {
          title: scenarioName.trim(),
          status: current?.status === "reviewed" ? "draft" : current?.status || "draft",
          payload: { priceMarginScenario: persistedPayload }
        },
        current
      );
      const revisedReviewed = current?.status === "reviewed";
      openScenario(saved);
      setFeedback(
        revisedReviewed
          ? `Reviewed revision ${current?.version} remains in history. Your edits were saved as draft revision ${saved.version}.`
          : `Scenario saved as ${saved.status} revision ${saved.version}.`
      );
    } catch (nextError) {
      setFormError(
        nextError instanceof Error
          ? nextError.message
          : "The named scenario could not be saved."
      );
    }
  };

  const reviewScenario = async () => {
    setFormError("");
    setFeedback("");
    try {
      const current = currentSelectedRecord();
      if (!current || current.status !== "draft") {
        throw new Error("Open an exact saved draft before reviewing it.");
      }
      if (contentDirty) {
        throw new Error("Save or discard the unsaved changes before review.");
      }
      const reviewed = await collection.transition(current, { status: "reviewed" });
      openScenario(reviewed);
      setFeedback(`Exact revision ${reviewed.version} is now reviewed.`);
    } catch (nextError) {
      setFormError(
        nextError instanceof Error
          ? nextError.message
          : "The scenario could not be reviewed."
      );
    }
  };

  const archiveScenario = async () => {
    setFormError("");
    setFeedback("");
    try {
      const current = currentSelectedRecord();
      if (!current) throw new Error("Open a saved scenario before archiving it.");
      if (contentDirty) {
        throw new Error("Save or discard the unsaved changes before archiving.");
      }
      if (archiveReason.trim().length < 3) {
        throw new Error("Enter an archive reason with at least three characters.");
      }
      const archivedTitle = current.title;
      await collection.archive(current, archiveReason.trim());
      setComparisonState((state) => ({
        workspaceKey,
        recordIds:
          state.workspaceKey === workspaceKey
            ? state.recordIds.filter((id) => id !== businessDeskRecordId(current))
            : []
      }));
      resetScenario();
      setFeedback(`${archivedTitle} was archived; its revision history was preserved.`);
    } catch (nextError) {
      setFormError(
        nextError instanceof Error
          ? nextError.message
          : "The scenario could not be archived."
      );
    }
  };

  const toggleComparison = (record: BusinessDeskRecord) => {
    const id = businessDeskRecordId(record);
    if (!id) return;
    setComparisonState((state) => {
      const currentIds = state.workspaceKey === workspaceKey ? state.recordIds : [];
      if (currentIds.includes(id)) {
        return { workspaceKey, recordIds: currentIds.filter((value) => value !== id) };
      }
      if (currentIds.length >= 10) {
        setFormError("Compare at most 10 named scenarios at one time.");
        return { workspaceKey, recordIds: currentIds };
      }
      setFormError("");
      return { workspaceKey, recordIds: [...currentIds, id] };
    });
  };

  const resultContext = currentResult
    ? {
        currency: currentResult.currency,
        minorUnitDigits: currentResult.minorUnitDigits
      }
    : null;
  const selectedTotals = scenarioTotals(selected);
  const comparisonContexts = new Set(
    comparisonRecords.map((record) => {
      const totals = scenarioTotals(record);
      return `${String(totals?.currency || "UNKNOWN")}:${String(
        totals?.minorUnitDigits ?? "UNKNOWN"
      )}`;
    })
  );
  const comparisonHasDifferentMoneyContexts = comparisonContexts.size > 1;

  return (
    <AppPage
      routeKey="business-desk-price-margin"
      railOverride={null}
      longContent
      backFallbackHref={basePath}
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>{workspaceLabel} Business Desk</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Price & Margin
          </Text>
          <Text style={styles.subtitle}>
            Calculate one explicit sales scenario. Unknown cost stays unknown, tax is used
            only when you enter it, and break-even repeats this exact scenario.
          </Text>
        </View>
      }
    >
      <AppCard
        title="Saved Price & Margin scenarios"
        titleLevel={2}
        subtitle="Saved scenarios stay private to this workspace. Each keeps its exact inputs, calculated totals, status, freshness, and immutable revisions."
      >
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start new price and margin scenario"
            disabled={busy || collection.saving}
            onPress={resetScenario}
            style={[
              styles.secondaryButton,
              (busy || collection.saving) && styles.disabled
            ]}
          >
            <Text style={styles.secondaryButtonText}>New scenario</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh saved price and margin scenarios"
            accessibilityState={{ busy: collection.loading }}
            disabled={collection.loading || collection.saving}
            onPress={() => void collection.reload()}
            style={[
              styles.secondaryButton,
              (collection.loading || collection.saving) && styles.disabled
            ]}
          >
            <Text style={styles.secondaryButtonText}>Refresh saved</Text>
          </Pressable>
        </View>
        {collection.loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.bodyText}>Loading every saved scenario page…</Text>
          </View>
        ) : collection.records.length ? (
          <View style={styles.savedList}>
            {collection.records.map((record) => {
              const id = businessDeskRecordId(record);
              const totals = scenarioTotals(record);
              const isSelected = id === selectedId && !selectionStale;
              const isCompared = comparisonIds.includes(id);
              return (
                <View
                  key={id || `${record.title}-${record.version}`}
                  style={[styles.savedRow, isSelected && styles.savedRowSelected]}
                >
                  <View style={styles.savedText}>
                    <Text style={styles.savedTitle}>{record.title}</Text>
                    <Text style={styles.savedMeta}>
                      {record.status} · revision {record.version} ·{" "}
                      {totals?.complete ? "complete" : "incomplete"}
                    </Text>
                    <Text style={styles.savedMeta}>
                      Calculation freshness: {calculatedAtLabel(totals?.calculatedAt)}
                    </Text>
                  </View>
                  <View style={styles.savedActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open price and margin scenario ${record.title}`}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => openScenario(record)}
                      style={styles.smallButton}
                    >
                      <Text style={styles.smallButtonText}>
                        {isSelected ? "Open" : "Load"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Compare price and margin scenario ${record.title}`}
                      accessibilityState={{ checked: isCompared }}
                      onPress={() => toggleComparison(record)}
                      style={[styles.smallButton, isCompared && styles.smallButtonActive]}
                    >
                      <Text
                        style={[
                          styles.smallButtonText,
                          isCompared && styles.smallButtonTextActive
                        ]}
                      >
                        Compare
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : collection.error ? null : (
          <Text style={styles.bodyText}>No named scenarios have been saved yet.</Text>
        )}
        {collection.error && !formError ? (
          <InlineError
            error={collection.error}
            onRetry={() => void collection.reload()}
          />
        ) : null}
      </AppCard>

      {comparisonRecords.length ? (
        <AppCard
          title="Selected scenario comparison"
          titleLevel={2}
          subtitle="Each revision is shown independently. GrowPathAI does not average, total, or convert scenario currencies."
        >
          {comparisonHasDifferentMoneyContexts ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Selected scenarios use different currencies or minor-unit precision. No FX
                rate was inferred and their values cannot be aggregated.
              </Text>
            </View>
          ) : null}
          {comparisonRecords.length === 1 ? (
            <Text style={styles.bodyText}>
              Choose another saved scenario to compare independent results.
            </Text>
          ) : null}
          <View style={styles.comparisonGrid}>
            {comparisonRecords.map((record) => {
              const totals = scenarioTotals(record);
              const context =
                totals?.currency && Number.isInteger(totals.minorUnitDigits)
                  ? {
                      currency: totals.currency,
                      minorUnitDigits: Number(totals.minorUnitDigits)
                    }
                  : null;
              return (
                <View
                  key={`comparison-${businessDeskRecordId(record)}`}
                  style={styles.comparisonCard}
                >
                  <Text style={styles.savedTitle}>{record.title}</Text>
                  <Text style={styles.savedMeta}>
                    {record.status} · revision {record.version}
                  </Text>
                  <Text style={styles.comparisonValue}>
                    Customer total:{" "}
                    {context ? formatMoneyMinor(totals?.totalMinor, context) : "Unknown"}
                  </Text>
                  <Text style={styles.comparisonValue}>
                    Gross profit:{" "}
                    {context
                      ? formatMoneyMinor(totals?.grossProfitMinor, context)
                      : "Unknown"}
                  </Text>
                  <Text style={styles.comparisonValue}>
                    Gross margin: {formatBasisPoints(totals?.marginBasisPoints)}
                  </Text>
                  <Text style={styles.comparisonValue}>
                    Break-even sales:{" "}
                    {Number.isSafeInteger(totals?.breakEvenSalesScenarios)
                      ? Number(totals?.breakEvenSalesScenarios).toLocaleString()
                      : "Unknown"}
                  </Text>
                  <Text style={styles.savedMeta}>
                    Completeness:{" "}
                    {totals?.complete
                      ? "Complete"
                      : `Incomplete${totals?.incompleteReasons?.length ? ` — ${totals.incompleteReasons.join(", ")}` : ""}`}
                  </Text>
                  <Text style={styles.savedMeta}>
                    Calculation freshness: {calculatedAtLabel(totals?.calculatedAt)}
                  </Text>
                  <Text style={styles.savedMeta}>
                    Formula: {totals?.formulaVersion || "Unknown"} · rounding:{" "}
                    {totals?.roundingRule || "Unknown"}
                  </Text>
                </View>
              );
            })}
          </View>
        </AppCard>
      ) : null}

      <AppCard
        title={
          selected ? `Named scenario revision ${selected.version}` : "Name this scenario"
        }
        titleLevel={2}
        subtitle={
          selected
            ? `This exact saved revision is ${selected.status}. Editing a reviewed scenario creates a new draft revision.`
            : "Calculation stays stateless until you explicitly save a named scenario."
        }
      >
        <View style={styles.fieldGrid}>
          <Field
            label="Scenario name"
            accessibilityLabel="Price and margin scenario name"
            value={scenarioName}
            onChangeText={(value) => {
              setScenarioName(value);
              setContentDirty(true);
              setFeedback("");
            }}
            placeholder="Retail case — current pricing"
            maxLength={200}
            styles={styles}
          />
          <Field
            label="Scenario notes (optional)"
            accessibilityLabel="Price and margin scenario notes"
            value={scenarioNotes}
            onChangeText={(value) => {
              setScenarioNotes(value);
              setContentDirty(true);
              setFeedback("");
            }}
            placeholder="Assumptions or decision context"
            maxLength={4000}
            multiline
            styles={styles}
          />
        </View>
        {selectedTotals ? (
          <View style={styles.savedExactBox}>
            <Text style={styles.savedTitle}>Saved exact result</Text>
            <Text style={styles.savedMeta}>
              {selectedTotals.currency} · {String(selectedTotals.minorUnitDigits)}{" "}
              minor-unit digits · {selectedTotals.complete ? "complete" : "incomplete"}
            </Text>
            <Text style={styles.savedMeta}>
              Calculated {calculatedAtLabel(selectedTotals.calculatedAt)} with{" "}
              {selectedTotals.formulaVersion || "an unknown formula version"}.
            </Text>
          </View>
        ) : null}
        {selectionStale ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              This selection is no longer the current saved revision. Refresh and reopen
              it before any mutation.
            </Text>
          </View>
        ) : null}
      </AppCard>

      <AppCard
        title="Sales scenario"
        titleLevel={2}
        subtitle="Amounts use the selected currency. Quantity may include up to six decimal places."
      >
        <View style={styles.fieldGrid}>
          <Field
            label="Currency"
            accessibilityLabel="Price and margin currency"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            value={currency}
            onChangeText={(value) => {
              setCurrency(value);
              markCalculationChanged();
            }}
            hint="Three-letter code; no currency conversion."
            styles={styles}
          />
          <Field
            label="Selling price per unit"
            accessibilityLabel="Price and margin selling price"
            keyboardType="decimal-pad"
            value={unitPrice}
            onChangeText={(value) => {
              setUnitPrice(value);
              markCalculationChanged();
            }}
            placeholder="25.00"
            styles={styles}
          />
          <Field
            label="Quantity in this sale"
            accessibilityLabel="Price and margin quantity"
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={(value) => {
              setQuantity(value);
              markCalculationChanged();
            }}
            placeholder="1"
            styles={styles}
          />
          <Field
            label="Direct cost per unit (optional)"
            accessibilityLabel="Price and margin direct unit cost"
            keyboardType="decimal-pad"
            value={unitDirectCost}
            onChangeText={(value) => {
              setUnitDirectCost(value);
              markCalculationChanged();
            }}
            placeholder="Leave blank if unknown"
            hint="Blank makes profit, margin, markup, and break-even incomplete."
            styles={styles}
          />
          <Field
            label="Target gross margin percent (optional)"
            accessibilityLabel="Price and margin target margin percent"
            keyboardType="decimal-pad"
            value={targetMarginPercent}
            onChangeText={(value) => {
              setTargetMarginPercent(value);
              markCalculationChanged();
            }}
            placeholder="25"
            hint="Must be below 100%. The server uses reviewed direct unit cost only."
            styles={styles}
          />
        </View>
      </AppCard>

      {!currencyReady ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Choose and review a valid three-letter ISO currency before calculating,
            saving, or reviewing this scenario. No currency is assumed.
          </Text>
        </View>
      ) : null}

      <AppCard
        title="Scenario adjustments"
        titleLevel={2}
        subtitle="Percentage discount is applied first, then the fixed discount. These amounts apply once to this sale."
      >
        <View style={styles.fieldGrid}>
          <Field
            label="Discount percent"
            accessibilityLabel="Price and margin discount percent"
            keyboardType="decimal-pad"
            value={discountPercent}
            onChangeText={(value) => {
              setDiscountPercent(value);
              markCalculationChanged();
            }}
            placeholder="0"
            styles={styles}
          />
          <Field
            label="Fixed discount"
            accessibilityLabel="Price and margin fixed discount"
            keyboardType="decimal-pad"
            value={discountFixed}
            onChangeText={(value) => {
              setDiscountFixed(value);
              markCalculationChanged();
            }}
            placeholder="0.00"
            styles={styles}
          />
          <Field
            label="Shipping charged to customer"
            accessibilityLabel="Price and margin customer shipping"
            keyboardType="decimal-pad"
            value={customerShipping}
            onChangeText={(value) => {
              setCustomerShipping(value);
              markCalculationChanged();
            }}
            placeholder="0.00"
            styles={styles}
          />
          <Field
            label="Business/payment fees for this sale"
            accessibilityLabel="Price and margin business fees"
            keyboardType="decimal-pad"
            value={businessFees}
            onChangeText={(value) => {
              setBusinessFees(value);
              markCalculationChanged();
            }}
            placeholder="0.00"
            styles={styles}
          />
          <Field
            label="Fulfillment/shipping cost for this sale"
            accessibilityLabel="Price and margin fulfillment cost"
            keyboardType="decimal-pad"
            value={shippingCost}
            onChangeText={(value) => {
              setShippingCost(value);
              markCalculationChanged();
            }}
            placeholder="0.00"
            styles={styles}
          />
          <Field
            label="Fixed costs to recover"
            accessibilityLabel="Price and margin fixed costs"
            keyboardType="decimal-pad"
            value={fixedCosts}
            onChangeText={(value) => {
              setFixedCosts(value);
              markCalculationChanged();
            }}
            placeholder="0.00"
            hint="Used for break-even; not subtracted from scenario gross profit."
            styles={styles}
          />
        </View>
      </AppCard>

      <AppCard
        title="Tax entered by you"
        titleLevel={2}
        subtitle="GrowPathAI does not choose a tax rate or decide taxability."
      >
        <View accessibilityRole="radiogroup" style={styles.choiceRow}>
          {(["none", "percent", "fixed"] as TaxType[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: taxType === value }}
              accessibilityLabel={`Tax type ${value}`}
              onPress={() => {
                setTaxType(value);
                markCalculationChanged();
              }}
              style={[styles.choice, taxType === value && styles.choiceActive]}
            >
              <Text
                style={[styles.choiceText, taxType === value && styles.choiceTextActive]}
              >
                {value === "none" ? "No tax" : value === "percent" ? "Rate" : "Amount"}
              </Text>
            </Pressable>
          ))}
        </View>
        {taxType === "percent" ? (
          <View style={styles.fieldGrid}>
            <Field
              label="Tax rate percent"
              accessibilityLabel="Price and margin tax rate"
              keyboardType="decimal-pad"
              value={taxRate}
              onChangeText={(value) => {
                setTaxRate(value);
                markCalculationChanged();
              }}
              placeholder="0"
              styles={styles}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: taxShipping }}
              accessibilityLabel="Include customer shipping in tax base"
              onPress={() => {
                setTaxShipping((current) => !current);
                markCalculationChanged();
              }}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, taxShipping && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>
                Include the customer shipping charge in the tax base
              </Text>
            </Pressable>
          </View>
        ) : null}
        {taxType === "fixed" ? (
          <Field
            label="Tax amount"
            accessibilityLabel="Price and margin tax amount"
            keyboardType="decimal-pad"
            value={taxAmount}
            onChangeText={(value) => {
              setTaxAmount(value);
              markCalculationChanged();
            }}
            placeholder="0.00"
            styles={styles}
          />
        ) : null}
      </AppCard>

      {error ? <InlineError error={error} /> : null}
      {inputsChanged ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Inputs changed. Recalculate before using the prior result.
          </Text>
        </View>
      ) : null}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calculate price and margin"
          accessibilityState={{ disabled: busy || !currencyReady }}
          disabled={busy || !currencyReady}
          onPress={() => void runCalculation()}
          style={[styles.primaryButton, (busy || !currencyReady) && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.primaryButtonText}>Calculate scenario</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset price and margin scenario"
          disabled={busy}
          onPress={resetScenario}
          style={[styles.secondaryButton, busy && styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>Reset scenario</Text>
        </Pressable>
      </View>

      {selected && calculationDirty && contentDirty ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Calculator inputs changed. Recalculate before saving the next revision.
          </Text>
        </View>
      ) : null}
      {formError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      ) : null}
      {feedback ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}
      <AppCard
        title="Save and review"
        titleLevel={2}
        subtitle="Saving is explicit and audited. Review applies only to the exact saved revision; it never sends, purchases, calls AI, or changes inventory."
      >
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save named price and margin scenario"
            disabled={busy || collection.saving || selectionStale || !currencyReady}
            onPress={() => void saveScenario()}
            style={[
              styles.primaryButton,
              (busy || collection.saving || selectionStale || !currencyReady) &&
                styles.disabled
            ]}
          >
            {collection.saving ? (
              <ActivityIndicator color={palette.accentText} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {selected ? "Save draft revision" : "Save named scenario"}
              </Text>
            )}
          </Pressable>
          {selected?.status === "draft" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review exact saved price and margin scenario"
              disabled={
                busy ||
                collection.saving ||
                contentDirty ||
                selectionStale ||
                !currencyReady
              }
              onPress={() => void reviewScenario()}
              style={[
                styles.secondaryButton,
                (busy ||
                  collection.saving ||
                  contentDirty ||
                  selectionStale ||
                  !currencyReady) &&
                  styles.disabled
              ]}
            >
              <Text style={styles.secondaryButtonText}>Mark exact revision reviewed</Text>
            </Pressable>
          ) : null}
        </View>
        {selected ? (
          <View style={styles.archivePanel}>
            <Field
              label="Archive reason"
              accessibilityLabel="Price and margin archive reason"
              value={archiveReason}
              onChangeText={setArchiveReason}
              placeholder="Why this scenario is no longer active"
              maxLength={500}
              styles={styles}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Archive selected price and margin scenario"
              disabled={busy || collection.saving || contentDirty || selectionStale}
              onPress={() => void archiveScenario()}
              style={[
                styles.secondaryButton,
                (busy || collection.saving || contentDirty || selectionStale) &&
                  styles.disabled
              ]}
            >
              <Text style={styles.secondaryButtonText}>Archive selected scenario</Text>
            </Pressable>
          </View>
        ) : null}
      </AppCard>

      {currentResult && resultContext ? (
        <>
          <AppCard
            title="Scenario result"
            titleLevel={2}
            subtitle="Gross profit is a planning result from the known direct costs—not net income, tax advice, or bookkeeping."
          >
            <View style={styles.metricGrid}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Revenue before tax</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(
                    currentResult.totals.customerRevenueBeforeTaxMinor,
                    resultContext
                  )}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Customer total</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(currentResult.totals.totalMinor, resultContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Known costs</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(currentResult.totals.knownCostMinor, resultContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Gross profit</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(currentResult.totals.grossProfitMinor, resultContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Gross margin</Text>
                <Text style={styles.metricValue}>
                  {formatBasisPoints(currentResult.totals.marginBasisPoints)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Markup on known cost</Text>
                <Text style={styles.metricValue}>
                  {formatBasisPoints(currentResult.totals.markupBasisPoints)}
                </Text>
              </View>
            </View>
            {!currentResult.totals.complete ? (
              <View style={styles.incompleteBox}>
                <Text style={styles.incompleteTitle}>Profitability is incomplete</Text>
                <Text style={styles.incompleteText}>
                  Missing direct cost is not treated as zero. Add the reviewed cost and
                  recalculate before relying on margin or markup.
                </Text>
              </View>
            ) : null}
          </AppCard>

          {currentResult.desiredMargin?.targetMarginBasisPoints !== null &&
          currentResult.desiredMargin?.targetMarginBasisPoints !== undefined ? (
            <AppCard
              title="Target-margin unit price"
              titleLevel={2}
              subtitle={`Server result for a ${formatBasisPoints(
                currentResult.desiredMargin.targetMarginBasisPoints
              )} gross-margin target.`}
            >
              {currentResult.desiredMargin.desiredUnitPriceMinor === null ? (
                <View style={styles.incompleteBox}>
                  <Text style={styles.incompleteTitle}>
                    Desired unit price unavailable
                  </Text>
                  <Text style={styles.incompleteText}>
                    {desiredMarginReason(currentResult.desiredMargin.reason)}
                  </Text>
                </View>
              ) : (
                <View style={styles.metricGrid}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Desired unit price</Text>
                    <Text style={styles.metricValue}>
                      {formatMoneyMinor(
                        currentResult.desiredMargin.desiredUnitPriceMinor,
                        resultContext
                      )}
                    </Text>
                  </View>
                </View>
              )}
              <Text style={styles.bodyText}>
                This price uses the reviewed direct unit cost only. It does not solve for
                this scenario&apos;s discounts, fees, shipping, tax, or fixed costs.
              </Text>
            </AppCard>
          ) : null}

          <AppCard
            title="Break-even"
            titleLevel={2}
            subtitle={`This repeats the exact ${formatQuantityMicros(
              currentResult.totals.quantityMicros
            )}-unit sales scenario, including its scenario-level adjustments.`}
          >
            {currentResult.breakEven.salesScenarios === null ? (
              <Text style={styles.bodyText}>
                {resultReason(currentResult.breakEven.reason)}
              </Text>
            ) : (
              <View style={styles.metricGrid}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Sales needed</Text>
                  <Text style={styles.metricValue}>
                    {currentResult.breakEven.salesScenarios.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Total quantity</Text>
                  <Text style={styles.metricValue}>
                    {formatQuantityMicros(currentResult.breakEven.quantityMicros)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Break-even revenue</Text>
                  <Text style={styles.metricValue}>
                    {formatMoneyMinor(
                      currentResult.breakEven.revenueMinor,
                      resultContext
                    )}
                  </Text>
                </View>
              </View>
            )}
          </AppCard>

          <AppCard title="Calculation boundary" titleLevel={2}>
            <Text style={styles.bodyText}>
              Currency: {currentResult.currency} · minor-unit digits:{" "}
              {String(currentResult.minorUnitDigits)} · quantity scale:{" "}
              {currentResult.quantityScale.toLocaleString()} · rates: basis points ·
              rounding: half away from zero.
            </Text>
            <Text style={styles.bodyText}>
              This calculator is deterministic and does not use AI credits. It does not
              save anything until you choose Save named scenario. Saving still does not
              change B‑02 inventory, send a quote, call AI, or contact a payment provider.
            </Text>
          </AppCard>
        </>
      ) : null}
    </AppPage>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    archivePanel: { alignItems: "flex-end", gap: 10, marginTop: 14 },
    bodyText: { color: palette.textMuted, fontSize: 13, lineHeight: 20, marginTop: 6 },
    checkbox: {
      borderColor: palette.border,
      borderRadius: 4,
      borderWidth: 2,
      height: 20,
      width: 20
    },
    checkboxChecked: { backgroundColor: palette.accent, borderColor: palette.accent },
    checkboxLabel: { color: palette.text, flex: 1, fontSize: 13, lineHeight: 19 },
    checkboxRow: {
      alignItems: "center",
      flexBasis: 280,
      flexDirection: "row",
      flexGrow: 1,
      gap: 9,
      minHeight: 48,
      paddingVertical: 8
    },
    choice: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 44,
      paddingHorizontal: 15,
      paddingVertical: 11
    },
    choiceActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    choiceText: { color: palette.text, fontSize: 13, fontWeight: "800" },
    choiceTextActive: { color: palette.accentText },
    comparisonCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: 260,
      flexGrow: 1,
      gap: 5,
      minWidth: 230,
      padding: 12
    },
    comparisonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
    comparisonValue: { color: palette.text, fontSize: 13, fontWeight: "800" },
    disabled: { opacity: 0.65 },
    errorBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 11
    },
    errorText: { color: palette.danger, fontSize: 13, fontWeight: "800" },
    feedbackBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.success,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 11
    },
    feedbackText: { color: palette.success, fontSize: 13, fontWeight: "800" },
    field: { flexBasis: 240, flexGrow: 1, gap: 5, minWidth: 220 },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    fieldHint: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    fieldLabel: { color: palette.text, fontSize: 13, fontWeight: "800" },
    header: { gap: 6 },
    incompleteBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 14,
      padding: 12
    },
    incompleteText: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4
    },
    incompleteTitle: { color: palette.warning, fontSize: 14, fontWeight: "900" },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontSize: 15,
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    inputPlaceholder: { color: palette.textMuted },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
    metric: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: 180,
      flexGrow: 1,
      minWidth: 160,
      padding: 12
    },
    metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    metricLabel: { color: palette.textMuted, fontSize: 11, fontWeight: "800" },
    metricValue: { color: palette.text, fontSize: 20, fontWeight: "900", marginTop: 5 },
    notice: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 11
    },
    noticeText: { color: palette.text, fontSize: 13, lineHeight: 19 },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      flexGrow: 1,
      justifyContent: "center",
      minHeight: 48,
      minWidth: 210,
      paddingHorizontal: 18,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontSize: 15, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 48,
      minWidth: 150,
      paddingHorizontal: 18,
      paddingVertical: 12
    },
    secondaryButtonText: { color: palette.text, fontSize: 14, fontWeight: "900" },
    savedActions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    savedExactBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      marginTop: 12,
      padding: 11
    },
    savedList: { gap: 8, marginTop: 12 },
    savedMeta: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    savedRow: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between",
      padding: 11
    },
    savedRowSelected: { borderColor: palette.accent, borderWidth: 2 },
    savedText: { flex: 1, minWidth: 220 },
    savedTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    smallButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    smallButtonActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    smallButtonText: { color: palette.text, fontSize: 12, fontWeight: "900" },
    smallButtonTextActive: { color: palette.accentText },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 820 },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" }
  });
}
