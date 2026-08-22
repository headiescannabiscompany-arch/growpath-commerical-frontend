import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  archiveBusinessDeskRecord,
  calculateBusinessDesk,
  correctBusinessDeskQuotePayment,
  createBusinessDeskRecord,
  getBusinessDeskQuoteLifecycle,
  getBusinessDeskQuotePaymentEvidenceChains,
  getBusinessDeskQuotePaymentSummary,
  listBusinessDeskRecords,
  listBusinessDeskRevisions,
  recordBusinessDeskQuotePayment,
  updateBusinessDeskRecord,
  voidBusinessDeskQuotePayment,
  type BusinessDeskRecord,
  type BusinessDeskRevision,
  type BusinessDeskTax,
  type BusinessDeskWorkspace,
  type QuoteCalculationInput,
  type QuoteCalculationResult,
  type QuoteDeposit,
  type QuoteLifecycle,
  type QuoteLineCategory,
  type QuotePaymentEvidence,
  type QuotePaymentEvidenceChain,
  type QuotePaymentEvidenceChains,
  type QuotePaymentSummary,
  type QuoteRecordPayload
} from "@/api/businessDesk";
import { BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES } from "@/api/businessDeskArtifacts";
import CalendarDateField from "@/components/forms/CalendarDateField";
import InlineError from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import ReviewedArtifactPanel from "@/features/businessDesk/ReviewedArtifactPanel";
import {
  formatBasisPoints,
  formatMoneyMinor,
  formatQuantityMicros,
  parseMoneyInput,
  parsePercentInput,
  parseQuantityInput,
  resolveCurrencyContext,
  type CurrencyContext
} from "@/features/businessDesk/money";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import type { CsvExportResult } from "@/utils/exportToCsv";

type TaxType = "none" | "percent" | "fixed";
type DepositType = "none" | "percent" | "fixed";
type PaymentAdjustmentType = "correction" | "void";

type QuoteCalculationResultWithMetadata = QuoteCalculationResult & {
  resultMetadata: {
    formulaVersion: string;
    roundingRule: "half_away_from_zero_at_conversion_boundaries";
    calculatedAt: string;
    inputSnapshot: Record<string, unknown>;
    inputDigestSha256: string;
    missingInputs: string[];
  };
};

export type QuoteArtifactLocalOutcome =
  | { method: "clipboard" }
  | { method: "native-share"; action: "shared" | "dismissed" | "unknown" }
  | { method: CsvExportResult["method"] };

export function quoteArtifactOutcomeMessage(
  preparedFromVersion: number,
  outcome: QuoteArtifactLocalOutcome
) {
  const prefix = `Reviewed revision ${preparedFromVersion} was prepared.`;
  switch (outcome.method) {
    case "clipboard":
      return `${prefix} Its text was copied to this device's clipboard. GrowPathAI did not observe recipient delivery or acceptance.`;
    case "native-share":
      if (outcome.action === "dismissed") {
        return `${prefix} The system share sheet was dismissed, so GrowPathAI did not observe a completed share, recipient delivery, or acceptance.`;
      }
      if (outcome.action === "shared") {
        return `${prefix} The device reported a completed local share action. GrowPathAI did not observe recipient delivery or acceptance.`;
      }
      return `${prefix} The system share sheet closed. GrowPathAI did not observe whether it was shared, delivered, or accepted.`;
    case "web-download":
      return `${prefix} A local CSV download was started. GrowPathAI did not observe recipient delivery or acceptance.`;
    case "native-share-file":
    case "native-share-text":
      return `${prefix} The system export/share sheet closed. GrowPathAI did not observe whether the artifact was shared, delivered, or accepted.`;
    case "empty":
      return `${prefix} No local artifact was produced. GrowPathAI did not observe delivery or acceptance.`;
  }
}

type QuoteLineDraft = {
  localId: string;
  category: QuoteLineCategory;
  description: string;
  quantity: string;
  unitPrice: string;
  unitDirectCost: string;
};

type QuoteEstimateToolProps = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
};

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  multiline?: boolean;
  styles: ReturnType<typeof createStyles>;
};

const LINE_CATEGORIES: Array<{ value: QuoteLineCategory; label: string }> = [
  { value: "product", label: "Product" },
  { value: "material", label: "Material" },
  { value: "service", label: "Service" },
  { value: "labor", label: "Labor" },
  { value: "shipping", label: "Shipping" },
  { value: "fee", label: "Fee" },
  { value: "other", label: "Other" }
];

let localLineSequence = 0;

function newLine(overrides: Partial<QuoteLineDraft> = {}): QuoteLineDraft {
  localLineSequence += 1;
  return {
    localId: `quote-line-${localLineSequence}`,
    category: "service",
    description: "",
    quantity: "1",
    unitPrice: "",
    unitDirectCost: "",
    ...overrides
  };
}

function Field({ label, hint, styles, multiline, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={inputProps.accessibilityLabel || label}
        multiline={multiline}
        placeholderTextColor={styles.inputPlaceholder.color}
        style={[styles.input, multiline && styles.textArea, inputProps.style]}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function optionalMoney(value: string, context: CurrencyContext, label: string) {
  return quoteMoney(value, context, { label, allowBlank: true }) ?? 0;
}

function quoteMoney(
  value: string,
  context: CurrencyContext,
  options: { label: string; allowBlank?: boolean }
) {
  const raw = String(value ?? "").trim();
  if (raw || !options.allowBlank) {
    const match = /^\d+(?:\.(\d+))?$/.exec(raw);
    if (match?.[1] && match[1].length > context.minorUnitDigits) {
      throw new Error(
        `${options.label} supports at most ${context.minorUnitDigits} decimal place${
          context.minorUnitDigits === 1 ? "" : "s"
        } in ${context.currency}.`
      );
    }
  }
  return parseMoneyInput(raw, context, options);
}

function quoteQuantity(value: string, label: string) {
  const raw = String(value ?? "").trim();
  const match = /^\d+(?:\.(\d+))?$/.exec(raw);
  if (match?.[1] && match[1].length > 6) {
    throw new Error(`${label} supports at most 6 decimal places.`);
  }
  return parseQuantityInput(raw, { label });
}

function quotePercent(value: string, label: string, allowBlank = false) {
  const raw = String(value ?? "").trim();
  const match = /^\d+(?:\.(\d+))?$/.exec(raw);
  if (match?.[1] && match[1].length > 2) {
    throw new Error(`${label} supports at most 2 decimal places.`);
  }
  const basisPoints = parsePercentInput(raw, { label, allowBlank });
  if (basisPoints !== null && basisPoints > 10_000) {
    throw new Error(`${label} cannot exceed 100%.`);
  }
  return basisPoints;
}

function rawMajor(amount: unknown, minorUnitDigits: number) {
  if (!Number.isSafeInteger(amount)) return "";
  const value = Number(amount) / 10 ** minorUnitDigits;
  return value.toFixed(minorUnitDigits);
}

function rawQuantity(amount: unknown) {
  if (!Number.isSafeInteger(amount)) return "1";
  return String(Number(amount) / 1_000_000);
}

function recordId(record: BusinessDeskRecord | null | undefined) {
  return String(record?._id || record?.id || "");
}

function uniqueKey(operation: string, target = "new") {
  return `business-desk:${operation}:${target}:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function readableDate(value: string | undefined) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleString()
    : "Recorded date unavailable";
}

function verifiedQuoteResult(
  value: QuoteCalculationResultWithMetadata,
  input: QuoteCalculationInput
) {
  const metadata = value?.resultMetadata;
  if (
    value?.calculator !== "quote" ||
    value.currency !== input.currency ||
    value.minorUnitDigits !== input.minorUnitDigits ||
    !Array.isArray(value.lineItems) ||
    value.lineItems.length !== input.lineItems.length ||
    !metadata ||
    typeof metadata.formulaVersion !== "string" ||
    !metadata.formulaVersion.trim() ||
    metadata.roundingRule !== "half_away_from_zero_at_conversion_boundaries" ||
    !Number.isFinite(new Date(metadata.calculatedAt).getTime()) ||
    !/^[a-f0-9]{64}$/.test(String(metadata.inputDigestSha256 || "")) ||
    !metadata.inputSnapshot ||
    typeof metadata.inputSnapshot !== "object" ||
    Array.isArray(metadata.inputSnapshot) ||
    !Array.isArray(metadata.missingInputs)
  ) {
    throw new Error(
      "The quote calculation response was incomplete or did not match the requested inputs."
    );
  }
  return value;
}

function payloadFrom(record: BusinessDeskRecord): QuoteRecordPayload | null {
  const value = (record.payload as { quote?: unknown })?.quote;
  return value && typeof value === "object" ? (value as QuoteRecordPayload) : null;
}

export default function QuoteEstimateTool({
  workspace,
  workspaceLabel,
  basePath
}: QuoteEstimateToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [quoteTitle, setQuoteTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [lines, setLines] = useState<QuoteLineDraft[]>(() => [newLine()]);
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountFixed, setDiscountFixed] = useState("");
  const [customerShipping, setCustomerShipping] = useState("");
  const [businessFees, setBusinessFees] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("none");
  const [taxRate, setTaxRate] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [taxShipping, setTaxShipping] = useState(false);
  const [depositType, setDepositType] = useState<DepositType>("none");
  const [depositPercent, setDepositPercent] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [scopeText, setScopeText] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [records, setRecords] = useState<BusinessDeskRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<BusinessDeskRecord | null>(null);
  const [revisions, setRevisions] = useState<BusinessDeskRevision[]>([]);
  const [savedFingerprint, setSavedFingerprint] = useState("");
  const [result, setResult] = useState<QuoteCalculationResultWithMetadata | null>(null);
  const [resultFingerprint, setResultFingerprint] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [feedback, setFeedback] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [paymentSummary, setPaymentSummary] = useState<QuotePaymentSummary | null>(null);
  const [quoteLifecycle, setQuoteLifecycle] = useState<QuoteLifecycle | null>(null);
  const [paymentChains, setPaymentChains] = useState<QuotePaymentEvidenceChains | null>(
    null
  );
  const [paymentEvidence, setPaymentEvidence] = useState<QuotePaymentEvidence | null>(
    null
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentOccurredAt, setPaymentOccurredAt] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentAdjustmentType, setPaymentAdjustmentType] =
    useState<PaymentAdjustmentType | null>(null);
  const [paymentAdjustmentEvidenceId, setPaymentAdjustmentEvidenceId] = useState("");
  const [paymentCorrectionAmount, setPaymentCorrectionAmount] = useState("");
  const [paymentAdjustmentReason, setPaymentAdjustmentReason] = useState("");
  const [paymentAdjustmentOccurredAt, setPaymentAdjustmentOccurredAt] = useState("");
  const [paymentAdjustmentConfirmed, setPaymentAdjustmentConfirmed] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<Error | null>(null);
  const [paymentFeedback, setPaymentFeedback] = useState("");
  const workspaceType = workspace.workspaceType;
  const workspaceFacilityId = workspaceType === "facility" ? workspace.facilityId : "";
  const workspaceKey =
    workspaceType === "facility" ? `facility:${workspaceFacilityId}` : "commercial";
  const requestWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      workspaceType === "facility"
        ? { workspaceType: "facility", facilityId: workspaceFacilityId }
        : { workspaceType: "commercial" },
    [workspaceFacilityId, workspaceType]
  );
  const activeWorkspaceKey = useRef(workspaceKey);
  const loadRequest = useRef<{ epoch: number; controller: AbortController | null }>({
    epoch: 0,
    controller: null
  });
  activeWorkspaceKey.current = workspaceKey;
  const retryIdentity = useRef<{
    signature: string;
    key: string;
  } | null>(null);
  const paymentLoadRequest = useRef<{
    epoch: number;
    controller: AbortController | null;
  }>({ epoch: 0, controller: null });
  const paymentRetryIdentity = useRef<{
    signature: string;
    key: string;
  } | null>(null);

  const inputFingerprint = JSON.stringify({
    quoteTitle,
    projectName,
    quoteNumber,
    validUntil,
    customerName,
    customerCompany,
    customerEmail,
    customerPhone,
    currency,
    lines: lines.map(({ localId: _localId, ...line }) => line),
    discountPercent,
    discountFixed,
    customerShipping,
    businessFees,
    shippingCost,
    taxType,
    taxRate,
    taxAmount,
    taxShipping,
    depositType,
    depositPercent,
    depositAmount,
    scopeText,
    customerNotes,
    terms,
    assumptions,
    exclusions,
    internalNotes
  });
  const dirty = inputFingerprint !== savedFingerprint;
  const currentResult = resultFingerprint === inputFingerprint ? result : null;

  const clearPaymentEvidence = useCallback(() => {
    paymentLoadRequest.current.controller?.abort();
    paymentLoadRequest.current = {
      epoch: paymentLoadRequest.current.epoch + 1,
      controller: null
    };
    setPaymentSummary(null);
    setQuoteLifecycle(null);
    setPaymentChains(null);
    setPaymentEvidence(null);
    setPaymentLoading(false);
    setPaymentError(null);
    setPaymentFeedback("");
    paymentRetryIdentity.current = null;
  }, []);

  const loadQuoteEvidence = useCallback(
    async (record: BusinessDeskRecord) => {
      const id = recordId(record).trim();
      if (!id || record.status !== "reviewed" || record.version < 1) {
        clearPaymentEvidence();
        return;
      }
      const requestWorkspaceKey = workspaceKey;
      const epoch = paymentLoadRequest.current.epoch + 1;
      paymentLoadRequest.current.controller?.abort();
      const controller =
        typeof AbortController === "undefined" ? null : new AbortController();
      paymentLoadRequest.current = { epoch, controller };
      setPaymentLoading(true);
      setPaymentError(null);
      try {
        const [summary, lifecycle, chains] = await Promise.all([
          getBusinessDeskQuotePaymentSummary(requestWorkspace, id, record.version, {
            signal: controller?.signal
          }),
          getBusinessDeskQuoteLifecycle(requestWorkspace, id, record.version, {
            signal: controller?.signal
          }),
          getBusinessDeskQuotePaymentEvidenceChains(
            requestWorkspace,
            id,
            record.version,
            { signal: controller?.signal }
          )
        ]);
        if (
          activeWorkspaceKey.current !== requestWorkspaceKey ||
          paymentLoadRequest.current.epoch !== epoch ||
          controller?.signal.aborted
        ) {
          return;
        }
        setPaymentSummary(summary);
        setQuoteLifecycle(lifecycle);
        setPaymentChains(chains);
      } catch (caught) {
        if (
          activeWorkspaceKey.current === requestWorkspaceKey &&
          paymentLoadRequest.current.epoch === epoch &&
          !controller?.signal.aborted
        ) {
          setPaymentSummary(null);
          setQuoteLifecycle(null);
          setPaymentChains(null);
          setPaymentError(
            caught instanceof Error
              ? caught
              : new Error("The exact Quote payment evidence could not be loaded.")
          );
        }
      } finally {
        if (
          activeWorkspaceKey.current === requestWorkspaceKey &&
          paymentLoadRequest.current.epoch === epoch
        ) {
          setPaymentLoading(false);
        }
      }
    },
    [clearPaymentEvidence, requestWorkspace, workspaceKey]
  );

  const loadRecords = useCallback(async () => {
    const requestWorkspaceKey = workspaceKey;
    const epoch = loadRequest.current.epoch + 1;
    loadRequest.current.controller?.abort();
    const controller =
      typeof AbortController === "undefined" ? null : new AbortController();
    loadRequest.current = { epoch, controller };
    setLoading(true);
    setError(null);
    try {
      const next = await listBusinessDeskRecords(
        requestWorkspace,
        { kind: "quote" },
        { signal: controller?.signal }
      );
      if (
        activeWorkspaceKey.current !== requestWorkspaceKey ||
        loadRequest.current.epoch !== epoch ||
        controller?.signal.aborted
      ) {
        return;
      }
      setRecords(next);
    } catch (caught) {
      if (
        activeWorkspaceKey.current === requestWorkspaceKey &&
        loadRequest.current.epoch === epoch &&
        !controller?.signal.aborted
      ) {
        setError(
          caught instanceof Error
            ? caught
            : new Error("Saved quotes could not be loaded.")
        );
      }
    } finally {
      if (
        activeWorkspaceKey.current === requestWorkspaceKey &&
        loadRequest.current.epoch === epoch
      ) {
        setLoading(false);
      }
    }
  }, [requestWorkspace, workspaceKey]);

  useEffect(() => {
    setQuoteTitle("");
    setProjectName("");
    setQuoteNumber("");
    setValidUntil("");
    setCustomerName("");
    setCustomerCompany("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCurrency("USD");
    setLines([newLine()]);
    setDiscountPercent("");
    setDiscountFixed("");
    setCustomerShipping("");
    setBusinessFees("");
    setShippingCost("");
    setTaxType("none");
    setTaxRate("");
    setTaxAmount("");
    setTaxShipping(false);
    setDepositType("none");
    setDepositPercent("");
    setDepositAmount("");
    setScopeText("");
    setCustomerNotes("");
    setTerms("");
    setAssumptions("");
    setExclusions("");
    setInternalNotes("");
    setRecords([]);
    setSelectedRecord(null);
    setRevisions([]);
    setSavedFingerprint("");
    setResult(null);
    setResultFingerprint("");
    setBusy(false);
    setError(null);
    setFeedback("");
    setArchiveReason("");
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentOccurredAt("");
    setPaymentConfirmed(false);
    setPaymentAdjustmentType(null);
    setPaymentAdjustmentEvidenceId("");
    setPaymentCorrectionAmount("");
    setPaymentAdjustmentReason("");
    setPaymentAdjustmentOccurredAt("");
    setPaymentAdjustmentConfirmed(false);
    setPaymentBusy(false);
    retryIdentity.current = null;
    clearPaymentEvidence();
    void loadRecords();
    return () => {
      loadRequest.current.controller?.abort();
      paymentLoadRequest.current.controller?.abort();
    };
  }, [clearPaymentEvidence, loadRecords, workspaceKey]);

  function updateLine(localId: string, patch: Partial<QuoteLineDraft>) {
    setLines((current) =>
      current.map((line) => (line.localId === localId ? { ...line, ...patch } : line))
    );
    setFeedback("");
  }

  function buildCalculationInput(): QuoteCalculationInput {
    const context = resolveCurrencyContext(currency);
    if (!lines.length) throw new Error("Add at least one quote line.");
    const lineItems = lines.map((line, index) => {
      const description = line.description.trim();
      if (!description) throw new Error(`Line ${index + 1} needs a description.`);
      const quantityMicros = quoteQuantity(line.quantity, `Line ${index + 1} quantity`);
      if (!quantityMicros || quantityMicros <= 0) {
        throw new Error(`Line ${index + 1} quantity must be greater than zero.`);
      }
      const unitPriceMinor = quoteMoney(line.unitPrice, context, {
        label: `Line ${index + 1} unit price`
      });
      if (unitPriceMinor === null)
        throw new Error(`Line ${index + 1} needs a unit price.`);
      const unitDirectCostMinor = quoteMoney(line.unitDirectCost, context, {
        label: `Line ${index + 1} direct unit cost`,
        allowBlank: true
      });
      return {
        kind: line.category,
        description,
        quantityMicros,
        unitPriceMinor,
        unitDirectCostMinor,
        currency: context.currency
      };
    });
    const percentBasisPoints =
      quotePercent(discountPercent, "Discount percentage", true) ?? 0;

    let tax: BusinessDeskTax = { type: "none" };
    if (taxType === "fixed") {
      const amountMinor = quoteMoney(taxAmount, context, { label: "Tax amount" });
      if (amountMinor === null) throw new Error("Enter the explicit tax amount.");
      tax = { type: "fixed", amountMinor, currency: context.currency };
    } else if (taxType === "percent") {
      const basisPoints = quotePercent(taxRate, "Tax rate");
      if (basisPoints === null) throw new Error("Enter the explicit tax rate.");
      tax = {
        type: "percent",
        basisPoints,
        base: taxShipping ? "discounted_subtotal_plus_shipping" : "discounted_subtotal",
        currency: context.currency
      };
    }

    let deposit: QuoteDeposit = { type: "none" };
    if (depositType === "fixed") {
      const amountMinor = quoteMoney(depositAmount, context, {
        label: "Deposit amount"
      });
      if (amountMinor === null) throw new Error("Enter the requested deposit amount.");
      deposit = { type: "fixed", amountMinor };
    } else if (depositType === "percent") {
      const basisPoints = quotePercent(depositPercent, "Deposit percentage");
      if (basisPoints === null)
        throw new Error("Enter the requested deposit percentage.");
      deposit = { type: "percent", basisPoints };
    }

    return {
      calculator: "quote",
      ...context,
      lineItems,
      discount: {
        order: "percent_then_fixed",
        percentBasisPoints,
        fixedMinor: optionalMoney(discountFixed, context, "Fixed discount"),
        currency: context.currency
      },
      customerShippingMinor: optionalMoney(
        customerShipping,
        context,
        "Shipping charged to customer"
      ),
      tax,
      businessFeesMinor: optionalMoney(businessFees, context, "Scenario fees"),
      shippingCostMinor: optionalMoney(
        shippingCost,
        context,
        "Fulfillment and shipping cost"
      ),
      deposit
    };
  }

  function buildPayload(calculation: QuoteCalculationInput): QuoteRecordPayload {
    const { calculator: _calculator, ...money } = calculation;
    return {
      ...money,
      customer: {
        name: customerName.trim(),
        company: customerCompany.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim()
      },
      project: projectName.trim(),
      quoteNumber: quoteNumber.trim(),
      expiresAt: validUntil || null,
      scope: scopeText.trim(),
      customerNotes: customerNotes.trim(),
      terms: terms.trim(),
      assumptions: assumptions.trim(),
      exclusions: exclusions.trim(),
      internalNotes: internalNotes.trim()
    };
  }

  async function calculate() {
    if (busy) return;
    const requestWorkspaceKey = workspaceKey;
    setBusy(true);
    setError(null);
    setFeedback("");
    try {
      const input = buildCalculationInput();
      const next = verifiedQuoteResult(
        await calculateBusinessDesk<QuoteCalculationResultWithMetadata>(
          requestWorkspace,
          input
        ),
        input
      );
      if (activeWorkspaceKey.current !== requestWorkspaceKey) return;
      setResult(next);
      setResultFingerprint(inputFingerprint);
    } catch (caught) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setResult(null);
        setResultFingerprint("");
        setError(
          caught instanceof Error
            ? caught
            : new Error("The quote could not be calculated.")
        );
      }
    } finally {
      if (activeWorkspaceKey.current === requestWorkspaceKey) setBusy(false);
    }
  }

  async function loadRevisions(nextRecord: BusinessDeskRecord) {
    const requestWorkspaceKey = workspaceKey;
    const id = recordId(nextRecord);
    if (!id) return setRevisions([]);
    try {
      const nextRevisions = await listBusinessDeskRevisions(requestWorkspace, id);
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setRevisions(nextRevisions);
      }
    } catch (caught) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setError(
          caught instanceof Error
            ? caught
            : new Error("The immutable revision history could not be loaded.")
        );
      }
    }
  }

  async function saveDraft() {
    if (busy) return;
    const requestWorkspaceKey = workspaceKey;
    setError(null);
    setFeedback("");
    if (!quoteTitle.trim()) {
      setError(new Error("Quote title is required."));
      return;
    }
    setBusy(true);
    try {
      const calculation = buildCalculationInput();
      const nextResult = verifiedQuoteResult(
        await calculateBusinessDesk<QuoteCalculationResultWithMetadata>(
          requestWorkspace,
          calculation
        ),
        calculation
      );
      if (activeWorkspaceKey.current !== requestWorkspaceKey) return;
      const payload = buildPayload(calculation);
      const id = recordId(selectedRecord);
      const signature = JSON.stringify({
        operation: "draft",
        id: id || "new",
        expectedVersion: selectedRecord?.version || 0,
        title: quoteTitle.trim(),
        payload
      });
      if (!retryIdentity.current || retryIdentity.current.signature !== signature) {
        retryIdentity.current = {
          signature,
          key: uniqueKey("draft", id || "new")
        };
      }

      const saved = selectedRecord
        ? await updateBusinessDeskRecord(requestWorkspace, id, {
            expectedVersion: selectedRecord.version,
            title: quoteTitle.trim(),
            status: "draft",
            payload: { quote: payload },
            idempotencyKey: retryIdentity.current.key
          })
        : await createBusinessDeskRecord(requestWorkspace, {
            kind: "quote",
            title: quoteTitle.trim(),
            status: "draft",
            payload: { quote: payload },
            idempotencyKey: retryIdentity.current.key
          });

      if (activeWorkspaceKey.current !== requestWorkspaceKey) return;
      retryIdentity.current = null;
      setSelectedRecord(saved);
      setSavedFingerprint(inputFingerprint);
      setResult(nextResult);
      setResultFingerprint(inputFingerprint);
      setRecords((current) => [
        saved,
        ...current.filter((record) => recordId(record) !== recordId(saved))
      ]);
      clearPaymentEvidence();
      setFeedback(
        `Draft revision ${saved.version} saved. Review the exact saved revision before export or handoff.`
      );
      await loadRevisions(saved);
    } catch (caught) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setError(
          caught instanceof Error
            ? caught
            : new Error("The quote could not be saved. Your draft remains on screen.")
        );
      }
    } finally {
      if (activeWorkspaceKey.current === requestWorkspaceKey) setBusy(false);
    }
  }

  async function reviewDraft() {
    if (busy) return;
    const requestWorkspaceKey = workspaceKey;
    setError(null);
    setFeedback("");
    if (!selectedRecord || selectedRecord.status !== "draft" || dirty) {
      setError(
        new Error(
          "Save this exact content as a draft first. Then review that saved revision without changing it."
        )
      );
      return;
    }

    const id = recordId(selectedRecord);
    if (!id) {
      setError(new Error("The selected quote has no identifier."));
      return;
    }

    setBusy(true);
    try {
      const signature = JSON.stringify({
        operation: "reviewed",
        id,
        expectedVersion: selectedRecord.version,
        status: "reviewed"
      });
      if (!retryIdentity.current || retryIdentity.current.signature !== signature) {
        retryIdentity.current = {
          signature,
          key: uniqueKey("reviewed", id)
        };
      }
      const reviewed = await updateBusinessDeskRecord(requestWorkspace, id, {
        expectedVersion: selectedRecord.version,
        status: "reviewed",
        idempotencyKey: retryIdentity.current.key
      });
      if (activeWorkspaceKey.current !== requestWorkspaceKey) return;
      retryIdentity.current = null;
      setSelectedRecord(reviewed);
      setSavedFingerprint(inputFingerprint);
      setRecords((current) => [
        reviewed,
        ...current.filter((record) => recordId(record) !== recordId(reviewed))
      ]);
      setFeedback(`Revision ${reviewed.version} reviewed. Nothing was sent or charged.`);
      await loadRevisions(reviewed);
      await loadQuoteEvidence(reviewed);
    } catch (caught) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setError(
          caught instanceof Error
            ? caught
            : new Error("The exact saved quote revision could not be reviewed.")
        );
      }
    } finally {
      if (activeWorkspaceKey.current === requestWorkspaceKey) setBusy(false);
    }
  }

  async function archiveQuote() {
    if (!selectedRecord || busy) return;
    const requestWorkspaceKey = workspaceKey;
    const id = recordId(selectedRecord);
    const reason = archiveReason.trim();
    if (!id) {
      setError(new Error("The selected quote has no identifier."));
      return;
    }
    if (reason.length < 3) {
      setError(new Error("Enter an archive reason with at least three characters."));
      return;
    }
    setBusy(true);
    setError(null);
    setFeedback("");
    try {
      const signature = JSON.stringify({
        operation: "archive",
        id,
        expectedVersion: selectedRecord.version,
        reason
      });
      if (!retryIdentity.current || retryIdentity.current.signature !== signature) {
        retryIdentity.current = {
          signature,
          key: uniqueKey("archive", id)
        };
      }
      await archiveBusinessDeskRecord(requestWorkspace, id, {
        expectedVersion: selectedRecord.version,
        reason,
        idempotencyKey: retryIdentity.current.key
      });
      if (activeWorkspaceKey.current !== requestWorkspaceKey) return;
      retryIdentity.current = null;
      setRecords((current) => current.filter((record) => recordId(record) !== id));
      setSelectedRecord(null);
      setRevisions([]);
      setSavedFingerprint("");
      setResult(null);
      setResultFingerprint("");
      setArchiveReason("");
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentOccurredAt("");
      setPaymentConfirmed(false);
      setPaymentAdjustmentType(null);
      setPaymentAdjustmentEvidenceId("");
      setPaymentCorrectionAmount("");
      setPaymentAdjustmentReason("");
      setPaymentAdjustmentOccurredAt("");
      setPaymentAdjustmentConfirmed(false);
      clearPaymentEvidence();
      setFeedback(
        `Archived ${selectedRecord.title} revision ${selectedRecord.version}. Its immutable history was preserved; the fields above remain an unsaved copy you can edit or save as a new draft.`
      );
    } catch (caught) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setError(
          caught instanceof Error ? caught : new Error("The quote could not be archived.")
        );
      }
    } finally {
      if (activeWorkspaceKey.current === requestWorkspaceKey) setBusy(false);
    }
  }

  async function confirmManualPayment() {
    if (busy || paymentBusy) return;
    const record = selectedRecord;
    const id = recordId(record);
    if (
      !record ||
      !id ||
      record.status !== "reviewed" ||
      dirty ||
      !paymentSummary ||
      !quoteLifecycle ||
      paymentSummary.quoteRecordId !== id ||
      paymentSummary.quoteRevisionNumber !== record.version ||
      quoteLifecycle.quoteRecordId !== id ||
      quoteLifecycle.quoteRevisionNumber !== record.version ||
      quoteLifecycle.facets.content !== "reviewed" ||
      quoteLifecycle.facets.revision !== "current"
    ) {
      setPaymentError(
        new Error(
          "Reload a current, exact reviewed Quote revision before recording payment evidence. Unsaved, cancelled, or superseded Quotes are blocked."
        )
      );
      return;
    }
    const context = {
      currency: paymentSummary.currency,
      minorUnitDigits: paymentSummary.minorUnitDigits
    };
    let amountMinor: number | null;
    try {
      amountMinor = quoteMoney(paymentAmount, context, {
        label: "Confirmed payment amount"
      });
    } catch (caught) {
      setPaymentError(
        caught instanceof Error
          ? caught
          : new Error("Enter the confirmed payment amount in exact minor units.")
      );
      return;
    }
    if (amountMinor === null || amountMinor < 1) {
      setPaymentError(new Error("Confirmed payment amount must be greater than zero."));
      return;
    }
    const occurredAt = paymentOccurredAt.trim();
    if (!occurredAt || !Number.isFinite(new Date(occurredAt).getTime())) {
      setPaymentError(new Error("Choose the date the confirmed payment occurred."));
      return;
    }
    const reference = paymentReference.trim();
    if (reference.length > 300) {
      setPaymentError(new Error("Payment reference cannot exceed 300 characters."));
      return;
    }
    if (!paymentConfirmed) {
      setPaymentError(
        new Error(
          "Confirm that this is user-reported payment evidence before recording it."
        )
      );
      return;
    }

    const requestWorkspaceKey = workspaceKey;
    const signature = JSON.stringify({
      operation: "payment",
      id,
      expectedVersion: record.version,
      amountMinor,
      currency: context.currency,
      minorUnitDigits: context.minorUnitDigits,
      occurredAt,
      reference
    });
    if (
      !paymentRetryIdentity.current ||
      paymentRetryIdentity.current.signature !== signature
    ) {
      paymentRetryIdentity.current = {
        signature,
        key: uniqueKey("payment", `${id}:revision-${record.version}`)
      };
    }

    setBusy(true);
    setPaymentBusy(true);
    setPaymentError(null);
    setPaymentFeedback("");
    try {
      const result = await recordBusinessDeskQuotePayment(requestWorkspace, id, {
        expectedVersion: record.version,
        amountMinor,
        currency: context.currency,
        minorUnitDigits: context.minorUnitDigits,
        occurredAt,
        reference,
        confirmed: true,
        idempotencyKey: paymentRetryIdentity.current.key
      });
      if (activeWorkspaceKey.current !== requestWorkspaceKey) return;
      paymentRetryIdentity.current = null;
      setPaymentEvidence(result.evidence);
      setPaymentConfirmed(false);
      setPaymentFeedback(
        `${result.idempotentReplay ? "Recovered" : "Recorded"} ${formatMoneyMinor(
          result.evidence.amountMinor,
          context
        )} as user-confirmed evidence for reviewed revision ${record.version}. No customer was charged and no inventory changed.`
      );
      await loadQuoteEvidence(record);
    } catch (caught) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setPaymentError(
          caught instanceof Error
            ? caught
            : new Error(
                "Payment evidence could not be recorded. The form and retry identity were preserved."
              )
        );
      }
    } finally {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setPaymentBusy(false);
        setBusy(false);
      }
    }
  }

  function beginPaymentAdjustment(
    chain: QuotePaymentEvidenceChain,
    adjustmentType: PaymentAdjustmentType
  ) {
    if (busy || paymentBusy || dirty || !chain.active) return;
    if (
      (adjustmentType === "correction" && !chain.canCorrect) ||
      (adjustmentType === "void" && !chain.canVoid)
    ) {
      setPaymentError(
        new Error("This payment evidence chain is no longer eligible for that action.")
      );
      return;
    }
    setPaymentAdjustmentType(adjustmentType);
    setPaymentAdjustmentEvidenceId(chain.latestEvidenceId);
    setPaymentCorrectionAmount(
      paymentChains ? rawMajor(chain.amountMinor, paymentChains.minorUnitDigits) : ""
    );
    setPaymentAdjustmentReason("");
    setPaymentAdjustmentOccurredAt(
      adjustmentType === "correction" ? chain.occurredAt.slice(0, 10) : ""
    );
    setPaymentAdjustmentConfirmed(false);
    setPaymentError(null);
    setPaymentFeedback("");
    paymentRetryIdentity.current = null;
  }

  async function confirmPaymentAdjustment() {
    if (busy || paymentBusy) return;
    const record = selectedRecord;
    const id = recordId(record);
    const chain = paymentChains?.chains.find(
      (candidate) => candidate.latestEvidenceId === paymentAdjustmentEvidenceId
    );
    if (
      !record ||
      !id ||
      record.status !== "reviewed" ||
      dirty ||
      !paymentSummary ||
      !quoteLifecycle ||
      !paymentChains ||
      paymentSummary.quoteRecordId !== id ||
      paymentChains.quoteRecordId !== id ||
      paymentSummary.quoteRevisionNumber !== record.version ||
      paymentChains.quoteRevisionNumber !== record.version ||
      quoteLifecycle.quoteRecordId !== id ||
      quoteLifecycle.quoteRevisionNumber !== record.version ||
      quoteLifecycle.facets.content !== "reviewed" ||
      quoteLifecycle.facets.revision !== "current" ||
      !paymentAdjustmentType ||
      !chain ||
      !chain.active ||
      (paymentAdjustmentType === "correction" && !chain.canCorrect) ||
      (paymentAdjustmentType === "void" && !chain.canVoid)
    ) {
      setPaymentError(
        new Error(
          "Reload the current reviewed Quote and choose its latest active payment evidence before correcting or voiding it."
        )
      );
      return;
    }
    const reason = paymentAdjustmentReason.trim();
    if (!reason || reason.length > 2_000) {
      setPaymentError(
        new Error("Enter a correction or void reason of no more than 2,000 characters.")
      );
      return;
    }
    const occurredAt = paymentAdjustmentOccurredAt.trim();
    if (!occurredAt || !Number.isFinite(new Date(occurredAt).getTime())) {
      setPaymentError(new Error("Choose the date for this correction or void."));
      return;
    }
    if (!paymentAdjustmentConfirmed) {
      setPaymentError(
        new Error(
          `Explicitly confirm this ${paymentAdjustmentType} before it is appended to the payment evidence history.`
        )
      );
      return;
    }
    const context = {
      currency: paymentChains.currency,
      minorUnitDigits: paymentChains.minorUnitDigits
    };
    let amountMinor = 0;
    if (paymentAdjustmentType === "correction") {
      try {
        amountMinor =
          quoteMoney(paymentCorrectionAmount, context, {
            label: "Corrected payment amount"
          }) ?? 0;
      } catch (caught) {
        setPaymentError(
          caught instanceof Error
            ? caught
            : new Error("Enter the corrected payment amount.")
        );
        return;
      }
      if (amountMinor < 1) {
        setPaymentError(new Error("Corrected payment amount must be greater than zero."));
        return;
      }
    }

    const requestWorkspaceKey = workspaceKey;
    const signature = JSON.stringify({
      operation: paymentAdjustmentType,
      id,
      expectedVersion: record.version,
      evidenceId: chain.latestEvidenceId,
      amountMinor,
      currency: context.currency,
      minorUnitDigits: context.minorUnitDigits,
      occurredAt,
      reason
    });
    if (
      !paymentRetryIdentity.current ||
      paymentRetryIdentity.current.signature !== signature
    ) {
      paymentRetryIdentity.current = {
        signature,
        key: uniqueKey(
          `payment-${paymentAdjustmentType}`,
          `${id}:revision-${record.version}:${chain.latestEvidenceId}`
        )
      };
    }

    setBusy(true);
    setPaymentBusy(true);
    setPaymentError(null);
    setPaymentFeedback("");
    try {
      const retryKey = paymentRetryIdentity.current.key;
      const result =
        paymentAdjustmentType === "correction"
          ? await correctBusinessDeskQuotePayment(
              requestWorkspace,
              id,
              chain.latestEvidenceId,
              {
                expectedVersion: record.version,
                amountMinor,
                currency: context.currency,
                minorUnitDigits: context.minorUnitDigits,
                occurredAt,
                reason,
                confirmed: true,
                idempotencyKey: retryKey
              }
            )
          : await voidBusinessDeskQuotePayment(
              requestWorkspace,
              id,
              chain.latestEvidenceId,
              {
                expectedVersion: record.version,
                currency: context.currency,
                minorUnitDigits: context.minorUnitDigits,
                occurredAt,
                reason,
                confirmed: true,
                idempotencyKey: retryKey
              }
            );
      if (activeWorkspaceKey.current !== requestWorkspaceKey) return;
      paymentRetryIdentity.current = null;
      setPaymentEvidence(result.evidence);
      setPaymentAdjustmentType(null);
      setPaymentAdjustmentEvidenceId("");
      setPaymentCorrectionAmount("");
      setPaymentAdjustmentReason("");
      setPaymentAdjustmentOccurredAt("");
      setPaymentAdjustmentConfirmed(false);
      setPaymentFeedback(
        `${result.idempotentReplay ? "Recovered" : "Recorded"} a user-confirmed ${
          result.evidence.eventType
        } for reviewed revision ${record.version}. The prior evidence remains in immutable history; no customer was charged and no inventory changed.`
      );
      await loadQuoteEvidence(record);
    } catch (caught) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setPaymentError(
          caught instanceof Error
            ? caught
            : new Error(
                "The payment evidence change failed. The form and stable retry identity were preserved."
              )
        );
      }
    } finally {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setPaymentBusy(false);
        setBusy(false);
      }
    }
  }

  function selectRecord(record: BusinessDeskRecord) {
    if (busy) return;
    const payload = payloadFrom(record);
    if (!payload) {
      setError(new Error("The selected saved quote payload is invalid."));
      return;
    }
    const digits = Number.isInteger(payload.minorUnitDigits)
      ? payload.minorUnitDigits
      : 2;
    const nextLines = (payload.lineItems || []).map((line) =>
      newLine({
        category: line.kind || "service",
        description: line.description || "",
        quantity: rawQuantity(line.quantityMicros),
        unitPrice: rawMajor(line.unitPriceMinor, digits),
        unitDirectCost:
          line.unitDirectCostMinor === null || line.unitDirectCostMinor === undefined
            ? ""
            : rawMajor(line.unitDirectCostMinor, digits)
      })
    );
    const tax = payload.tax || { type: "none" as const };
    const deposit = payload.deposit || { type: "none" as const };
    const nextState = {
      quoteTitle: record.title || "",
      projectName: payload.project || "",
      quoteNumber: payload.quoteNumber || "",
      validUntil: String(payload.expiresAt || "").slice(0, 10),
      customerName: payload.customer?.name || "",
      customerCompany: payload.customer?.company || "",
      customerEmail: payload.customer?.email || "",
      customerPhone: payload.customer?.phone || "",
      currency: payload.currency || "USD",
      lines: nextLines.length ? nextLines : [newLine()],
      discountPercent: String((payload.discount?.percentBasisPoints || 0) / 100),
      discountFixed: rawMajor(payload.discount?.fixedMinor || 0, digits),
      customerShipping: rawMajor(payload.customerShippingMinor || 0, digits),
      businessFees: rawMajor(payload.businessFeesMinor || 0, digits),
      shippingCost: rawMajor(payload.shippingCostMinor || 0, digits),
      taxType: tax.type as TaxType,
      taxRate: tax.type === "percent" ? String((tax.basisPoints || 0) / 100) : "",
      taxAmount: tax.type === "fixed" ? rawMajor(tax.amountMinor, digits) : "",
      taxShipping:
        tax.type === "percent" && tax.base === "discounted_subtotal_plus_shipping",
      depositType: deposit.type as DepositType,
      depositPercent:
        deposit.type === "percent" ? String((deposit.basisPoints || 0) / 100) : "",
      depositAmount:
        deposit.type === "fixed" ? rawMajor(deposit.amountMinor, digits) : "",
      scopeText: payload.scope || "",
      customerNotes: payload.customerNotes || "",
      terms: payload.terms || "",
      assumptions: payload.assumptions || "",
      exclusions: payload.exclusions || "",
      internalNotes: payload.internalNotes || ""
    };
    setQuoteTitle(nextState.quoteTitle);
    setProjectName(nextState.projectName);
    setQuoteNumber(nextState.quoteNumber);
    setValidUntil(nextState.validUntil);
    setCustomerName(nextState.customerName);
    setCustomerCompany(nextState.customerCompany);
    setCustomerEmail(nextState.customerEmail);
    setCustomerPhone(nextState.customerPhone);
    setCurrency(nextState.currency);
    setLines(nextState.lines);
    setDiscountPercent(nextState.discountPercent);
    setDiscountFixed(nextState.discountFixed);
    setCustomerShipping(nextState.customerShipping);
    setBusinessFees(nextState.businessFees);
    setShippingCost(nextState.shippingCost);
    setTaxType(nextState.taxType);
    setTaxRate(nextState.taxRate);
    setTaxAmount(nextState.taxAmount);
    setTaxShipping(nextState.taxShipping);
    setDepositType(nextState.depositType);
    setDepositPercent(nextState.depositPercent);
    setDepositAmount(nextState.depositAmount);
    setScopeText(nextState.scopeText);
    setCustomerNotes(nextState.customerNotes);
    setTerms(nextState.terms);
    setAssumptions(nextState.assumptions);
    setExclusions(nextState.exclusions);
    setInternalNotes(nextState.internalNotes);
    const fingerprint = JSON.stringify({
      ...nextState,
      lines: nextState.lines.map(({ localId: _localId, ...line }) => line)
    });
    setSelectedRecord(record);
    setSavedFingerprint(fingerprint);
    setResult(null);
    setResultFingerprint("");
    setFeedback(`Loaded saved ${record.status} revision ${record.version}.`);
    setError(null);
    retryIdentity.current = null;
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentOccurredAt("");
    setPaymentConfirmed(false);
    setPaymentAdjustmentType(null);
    setPaymentAdjustmentEvidenceId("");
    setPaymentCorrectionAmount("");
    setPaymentAdjustmentReason("");
    setPaymentAdjustmentOccurredAt("");
    setPaymentAdjustmentConfirmed(false);
    clearPaymentEvidence();
    void loadRevisions(record);
    if (record.status === "reviewed") void loadQuoteEvidence(record);
  }

  const resultContext = currentResult
    ? {
        currency: currentResult.currency,
        minorUnitDigits: currentResult.minorUnitDigits
      }
    : null;
  const canReview = Boolean(
    selectedRecord && selectedRecord.status === "draft" && !dirty && !busy
  );
  const exactReviewedRevision = Boolean(
    selectedRecord && selectedRecord.status === "reviewed"
  );
  const selectedQuoteId = recordId(selectedRecord);
  const paymentEvidenceReady = Boolean(
    selectedRecord &&
    selectedQuoteId &&
    selectedRecord.status === "reviewed" &&
    !dirty &&
    paymentSummary?.quoteRecordId === selectedQuoteId &&
    paymentSummary.quoteRevisionNumber === selectedRecord.version &&
    paymentChains?.quoteRecordId === selectedQuoteId &&
    paymentChains.quoteRevisionNumber === selectedRecord.version &&
    quoteLifecycle?.quoteRecordId === selectedQuoteId &&
    quoteLifecycle.quoteRevisionNumber === selectedRecord.version &&
    quoteLifecycle.facets.content === "reviewed" &&
    quoteLifecycle.facets.revision === "current"
  );
  const paymentContext = paymentSummary
    ? {
        currency: paymentSummary.currency,
        minorUnitDigits: paymentSummary.minorUnitDigits
      }
    : null;
  const selectedPaymentChain = paymentChains?.chains.find(
    (chain) => chain.latestEvidenceId === paymentAdjustmentEvidenceId
  );
  const taxSourceLabel = currentResult
    ? currentResult.totals.tax.type === "percent"
      ? `${formatBasisPoints(currentResult.totals.tax.basisPoints ?? null)} entered by the operator; base: ${
          currentResult.totals.tax.base === "discounted_subtotal_plus_shipping"
            ? "discounted line subtotal plus customer shipping"
            : "discounted line subtotal"
        }.`
      : currentResult.totals.tax.type === "fixed"
        ? "Fixed amount entered by the operator."
        : "No tax entered."
    : "";
  const requestedFixedDiscountMinor =
    currentResult && resultContext
      ? (quoteMoney(discountFixed, resultContext, {
          label: "Fixed discount",
          allowBlank: true
        }) ?? 0)
      : 0;
  const fixedDiscountWasCapped = Boolean(
    currentResult &&
    requestedFixedDiscountMinor > currentResult.totals.discount.fixedMinor
  );
  const requestedFixedDepositMinor =
    currentResult && resultContext && depositType === "fixed"
      ? (quoteMoney(depositAmount, resultContext, {
          label: "Deposit amount",
          allowBlank: true
        }) ?? 0)
      : 0;
  const fixedDepositWasCapped = Boolean(
    currentResult &&
    depositType === "fixed" &&
    requestedFixedDepositMinor > currentResult.totals.depositDueMinor
  );

  return (
    <AppPage
      routeKey="business-desk-quotes"
      railOverride={null}
      longContent
      backFallbackHref={basePath}
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>{workspaceLabel} Business Desk</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Quote / Estimate
          </Text>
          <Text style={styles.subtitle}>
            Build explicit line-item totals, preserve unknown costs, and review an
            immutable saved revision. This tool does not send a quote, accept terms,
            charge a customer, calculate tax law, or change inventory.
          </Text>
        </View>
      }
    >
      <AppCard
        title="Quote identity and customer"
        titleLevel={2}
        subtitle="Private business information stays in this authorized workspace."
      >
        <View style={styles.fieldGrid}>
          <Field
            label="Quote title"
            accessibilityLabel="Quote title"
            value={quoteTitle}
            onChangeText={setQuoteTitle}
            placeholder="Spring installation estimate"
            styles={styles}
          />
          <Field
            label="Project"
            accessibilityLabel="Quote project"
            value={projectName}
            onChangeText={setProjectName}
            placeholder="Customer-facing project name"
            styles={styles}
          />
          <Field
            label="Quote number"
            accessibilityLabel="Quote number"
            value={quoteNumber}
            onChangeText={setQuoteNumber}
            placeholder="Optional internal or customer reference"
            styles={styles}
          />
          <Field
            label="Currency"
            accessibilityLabel="Quote currency"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            value={currency}
            onChangeText={setCurrency}
            hint="One explicit ISO currency. Cross-currency quotes are blocked."
            styles={styles}
          />
          <Field
            label="Customer name"
            accessibilityLabel="Quote customer name"
            value={customerName}
            onChangeText={setCustomerName}
            styles={styles}
          />
          <Field
            label="Customer business"
            accessibilityLabel="Quote customer business"
            value={customerCompany}
            onChangeText={setCustomerCompany}
            styles={styles}
          />
          <Field
            label="Customer email"
            accessibilityLabel="Quote customer email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={customerEmail}
            onChangeText={setCustomerEmail}
            styles={styles}
          />
          <Field
            label="Customer phone"
            accessibilityLabel="Quote customer phone"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            styles={styles}
          />
        </View>
        <CalendarDateField
          label="Expires on (optional)"
          accessibilityLabel="Quote expiration date"
          value={validUntil}
          onChange={setValidUntil}
          optional
        />
      </AppCard>

      <AppCard
        title="Products, services, labor, and materials"
        titleLevel={2}
        subtitle="Each line rounds once to the selected currency's minor unit. Quantity supports up to six decimal places."
      >
        <View style={styles.stack}>
          {lines.map((line, index) => (
            <View key={line.localId} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <Text accessibilityRole="header" aria-level={3} style={styles.lineTitle}>
                  Line {index + 1}
                </Text>
                {lines.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove quote line ${index + 1}`}
                    onPress={() =>
                      setLines((current) =>
                        current.filter((candidate) => candidate.localId !== line.localId)
                      )
                    }
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkButtonText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.fieldLabel}>Line type</Text>
              <View accessibilityRole="radiogroup" style={styles.choiceRow}>
                {LINE_CATEGORIES.map((category) => (
                  <Pressable
                    key={category.value}
                    accessibilityRole="radio"
                    accessibilityLabel={`Quote line ${index + 1} type ${category.label}`}
                    accessibilityState={{ checked: line.category === category.value }}
                    onPress={() => updateLine(line.localId, { category: category.value })}
                    style={[
                      styles.choice,
                      line.category === category.value && styles.choiceActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        line.category === category.value && styles.choiceTextActive
                      ]}
                    >
                      {category.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Field
                label="Description"
                accessibilityLabel={`Quote line ${index + 1} description`}
                value={line.description}
                onChangeText={(value) => updateLine(line.localId, { description: value })}
                placeholder="Describe the product, service, labor, or material"
                styles={styles}
              />
              <View style={styles.fieldGrid}>
                <Field
                  label="Quantity"
                  accessibilityLabel={`Quote line ${index + 1} quantity`}
                  keyboardType="decimal-pad"
                  value={line.quantity}
                  onChangeText={(value) => updateLine(line.localId, { quantity: value })}
                  styles={styles}
                />
                <Field
                  label="Price per unit"
                  accessibilityLabel={`Quote line ${index + 1} unit price`}
                  keyboardType="decimal-pad"
                  value={line.unitPrice}
                  onChangeText={(value) => updateLine(line.localId, { unitPrice: value })}
                  styles={styles}
                />
                <Field
                  label="Known direct cost per unit (optional)"
                  accessibilityLabel={`Quote line ${index + 1} direct unit cost`}
                  keyboardType="decimal-pad"
                  value={line.unitDirectCost}
                  onChangeText={(value) =>
                    updateLine(line.localId, { unitDirectCost: value })
                  }
                  placeholder="Leave blank if unknown"
                  hint="Blank keeps estimated profit, margin, and markup incomplete."
                  styles={styles}
                />
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add quote line"
            onPress={() => setLines((current) => [...current, newLine()])}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Add line</Text>
          </Pressable>
        </View>
      </AppCard>

      <AppCard
        title="Discount, shipping, fees, and tax"
        titleLevel={2}
        subtitle="Percentage discount is applied first, then the fixed discount. Tax is used only when you enter it and choose its base."
      >
        <View style={styles.fieldGrid}>
          <Field
            label="Discount percent"
            accessibilityLabel="Quote discount percent"
            keyboardType="decimal-pad"
            value={discountPercent}
            onChangeText={setDiscountPercent}
            styles={styles}
          />
          <Field
            label="Fixed discount"
            accessibilityLabel="Quote fixed discount"
            keyboardType="decimal-pad"
            value={discountFixed}
            onChangeText={setDiscountFixed}
            styles={styles}
          />
          <Field
            label="Shipping charged to customer"
            accessibilityLabel="Quote customer shipping"
            keyboardType="decimal-pad"
            value={customerShipping}
            onChangeText={setCustomerShipping}
            styles={styles}
          />
          <Field
            label="Scenario / payment fees"
            accessibilityLabel="Quote scenario fees"
            keyboardType="decimal-pad"
            value={businessFees}
            onChangeText={setBusinessFees}
            hint="Known business cost for the whole quote, not a customer charge."
            styles={styles}
          />
          <Field
            label="Fulfillment / shipping cost"
            accessibilityLabel="Quote fulfillment cost"
            keyboardType="decimal-pad"
            value={shippingCost}
            onChangeText={setShippingCost}
            hint="Known business cost for the whole quote."
            styles={styles}
          />
        </View>
        <Text style={styles.fieldLabel}>Tax entered by you</Text>
        <View accessibilityRole="radiogroup" style={styles.choiceRow}>
          {(["none", "percent", "fixed"] as TaxType[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`Quote tax type ${value}`}
              accessibilityState={{ checked: taxType === value }}
              onPress={() => setTaxType(value)}
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
              accessibilityLabel="Quote tax rate"
              keyboardType="decimal-pad"
              value={taxRate}
              onChangeText={setTaxRate}
              styles={styles}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Include quote shipping in tax base"
              accessibilityState={{ checked: taxShipping }}
              onPress={() => setTaxShipping((current) => !current)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, taxShipping && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>
                Include customer shipping in tax base
              </Text>
            </Pressable>
          </View>
        ) : null}
        {taxType === "fixed" ? (
          <Field
            label="Tax amount"
            accessibilityLabel="Quote tax amount"
            keyboardType="decimal-pad"
            value={taxAmount}
            onChangeText={setTaxAmount}
            styles={styles}
          />
        ) : null}
      </AppCard>

      <AppCard
        title="Deposit request"
        titleLevel={2}
        subtitle="A deposit is a quote term only. It does not charge or mark a payment."
      >
        <View accessibilityRole="radiogroup" style={styles.choiceRow}>
          {(["none", "percent", "fixed"] as DepositType[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`Quote deposit type ${value}`}
              accessibilityState={{ checked: depositType === value }}
              onPress={() => setDepositType(value)}
              style={[styles.choice, depositType === value && styles.choiceActive]}
            >
              <Text
                style={[
                  styles.choiceText,
                  depositType === value && styles.choiceTextActive
                ]}
              >
                {value === "none"
                  ? "No deposit"
                  : value === "percent"
                    ? "Percentage"
                    : "Fixed amount"}
              </Text>
            </Pressable>
          ))}
        </View>
        {depositType === "percent" ? (
          <Field
            label="Deposit percent"
            accessibilityLabel="Quote deposit percent"
            keyboardType="decimal-pad"
            value={depositPercent}
            onChangeText={setDepositPercent}
            styles={styles}
          />
        ) : null}
        {depositType === "fixed" ? (
          <Field
            label="Deposit amount"
            accessibilityLabel="Quote deposit amount"
            keyboardType="decimal-pad"
            value={depositAmount}
            onChangeText={setDepositAmount}
            styles={styles}
          />
        ) : null}
      </AppCard>

      <AppCard
        title="Scope and reviewed language"
        titleLevel={2}
        subtitle="GrowPathAI does not invent scope, contract terms, assumptions, or exclusions."
      >
        <View style={styles.stack}>
          <Field
            label="Scope / deliverables"
            accessibilityLabel="Quote scope"
            value={scopeText}
            onChangeText={setScopeText}
            multiline
            styles={styles}
          />
          <Field
            label="Customer notes"
            accessibilityLabel="Quote customer notes"
            value={customerNotes}
            onChangeText={setCustomerNotes}
            multiline
            styles={styles}
          />
          <Field
            label="Terms"
            accessibilityLabel="Quote terms"
            value={terms}
            onChangeText={setTerms}
            multiline
            styles={styles}
          />
          <Field
            label="Assumptions"
            accessibilityLabel="Quote assumptions"
            value={assumptions}
            onChangeText={setAssumptions}
            multiline
            styles={styles}
          />
          <Field
            label="Exclusions"
            accessibilityLabel="Quote exclusions"
            value={exclusions}
            onChangeText={setExclusions}
            multiline
            styles={styles}
          />
          <Field
            label="Private internal notes"
            accessibilityLabel="Quote internal notes"
            value={internalNotes}
            onChangeText={setInternalNotes}
            multiline
            hint="Internal notes are not part of the customer-facing export."
            styles={styles}
          />
        </View>
      </AppCard>

      {error ? <InlineError error={error} /> : null}
      {feedback ? (
        <View accessibilityLiveRegion="polite" style={styles.notice}>
          <Text style={styles.noticeText}>{feedback}</Text>
        </View>
      ) : null}
      {selectedRecord && dirty ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            {selectedRecord.status === "reviewed"
              ? `These edits differ from reviewed revision ${selectedRecord.version}. Copy and export remain pinned to that exact reviewed revision until you save these edits as a new draft.`
              : `This differs from saved revision ${selectedRecord.version}. Save a new draft revision before review.`}
          </Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calculate quote"
          disabled={busy}
          onPress={() => void calculate()}
          style={[styles.secondaryButton, busy && styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>Calculate totals</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save quote draft"
          disabled={busy}
          onPress={() => void saveDraft()}
          style={[styles.primaryButton, busy && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {selectedRecord ? "Save draft revision" : "Save draft"}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Review and save quote revision"
          accessibilityState={{ disabled: !canReview }}
          disabled={!canReview}
          onPress={() => void reviewDraft()}
          style={[styles.primaryButton, !canReview && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>Review & save exact revision</Text>
        </Pressable>
      </View>

      {currentResult && resultContext ? (
        <AppCard
          title="Deterministic quote totals"
          titleLevel={2}
          subtitle="Gross profit is a planning estimate from known direct costs—not net income, accounting, or tax advice."
        >
          <View style={styles.metricGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Line subtotal</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(currentResult.totals.subtotalMinor, resultContext)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Discount</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(
                  currentResult.totals.discount.totalMinor,
                  resultContext
                )}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Tax entered</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(currentResult.totals.tax.amountMinor, resultContext)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Customer shipping</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(
                  currentResult.totals.customerShippingMinor,
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
              <Text style={styles.metricLabel}>Deposit requested</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(currentResult.totals.depositDueMinor, resultContext)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Balance after deposit</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(
                  currentResult.totals.balanceAfterDepositMinor,
                  resultContext
                )}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Known costs</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(currentResult.totals.knownCostMinor, resultContext)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Business / payment fees</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(currentResult.totals.businessFeesMinor, resultContext)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Fulfillment / shipping cost</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(currentResult.totals.shippingCostMinor, resultContext)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Estimated gross profit</Text>
              <Text style={styles.metricValue}>
                {formatMoneyMinor(currentResult.totals.grossProfitMinor, resultContext)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Estimated gross margin</Text>
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
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>Profitability is incomplete</Text>
              <Text style={styles.warningText}>
                At least one line has unknown direct cost. Unknown cost remains unknown
                and is never treated as zero.
              </Text>
            </View>
          ) : null}
          {fixedDiscountWasCapped ? (
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>Fixed discount limited to subtotal</Text>
              <Text style={styles.warningText}>
                The entered fixed discount was larger than the amount remaining after the
                percentage discount. The applied discount shown above was capped at that
                remaining subtotal.
              </Text>
            </View>
          ) : null}
          {fixedDepositWasCapped ? (
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>Deposit limited to customer total</Text>
              <Text style={styles.warningText}>
                The entered fixed deposit was larger than the customer total. The
                requested deposit shown above was capped at the customer total; no charge
                or payment occurred.
              </Text>
            </View>
          ) : null}
          <View style={styles.lineTotals}>
            {currentResult.lineItems.map((line, index) => (
              <Text key={index} style={styles.bodyText}>
                Line {index + 1}: {formatQuantityMicros(line.quantityMicros)} ×{" "}
                {formatMoneyMinor(line.unitPriceMinor, resultContext)} ={" "}
                {formatMoneyMinor(line.lineTotalMinor, resultContext)}
              </Text>
            ))}
          </View>
          <Text style={styles.boundaryText}>
            Customer total = discounted line subtotal + customer shipping + tax entered by
            the operator. Tax source: {taxSourceLabel} Known costs = completed line direct
            costs + business/payment fees + fulfillment/shipping cost. Tax is not treated
            as revenue or cost for the estimated gross-profit calculation.
          </Text>
          <Text style={styles.boundaryText}>
            Currency: {currentResult.currency} · minor-unit digits:{" "}
            {currentResult.minorUnitDigits} · quantity scale:{" "}
            {currentResult.quantityScale.toLocaleString()} · rates: basis points ·
            rounding: half away from zero. Formula:{" "}
            {currentResult.resultMetadata.formulaVersion}
            {" · "}calculated {readableDate(currentResult.resultMetadata.calculatedAt)}
            {" · "}input fingerprint: {currentResult.resultMetadata.inputDigestSha256}.
          </Text>
        </AppCard>
      ) : null}

      <ReviewedArtifactPanel
        workspace={requestWorkspace}
        artifactKind="quote_copy"
        revisionSelections={
          exactReviewedRevision && selectedRecord
            ? [
                {
                  recordId: recordId(selectedRecord),
                  revisionNumber: selectedRecord.version
                }
              ]
            : []
        }
        expectedRedactionProfile={BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.quote_copy}
        title="Reviewed quote copy"
        selectionLabel={
          exactReviewedRevision && selectedRecord
            ? `Pinned to reviewed quote revision ${selectedRecord.version}.`
            : "No reviewed quote revision is selected."
        }
        disclosure="The customer copy excludes internal notes, known direct costs, business/payment fees, fulfillment cost, and internal gross-profit fields. Review every included customer-facing field before confirming."
        contextNotice={
          dirty && exactReviewedRevision && selectedRecord
            ? `The editor contains unsaved changes. This copy remains pinned to reviewed revision ${selectedRecord.version}; the edits are not included.`
            : undefined
        }
        disabled={!exactReviewedRevision || busy}
        disabledReason="Save and review an exact quote revision before previewing its customer copy."
        previewButtonLabel="Preview reviewed quote copy"
        prepareButtonLabel="Confirm and copy reviewed quote"
      />

      <ReviewedArtifactPanel
        workspace={requestWorkspace}
        artifactKind="quote_csv"
        revisionSelections={
          exactReviewedRevision && selectedRecord
            ? [
                {
                  recordId: recordId(selectedRecord),
                  revisionNumber: selectedRecord.version
                }
              ]
            : []
        }
        expectedRedactionProfile={BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.quote_csv}
        title="Reviewed quote CSV"
        selectionLabel={
          exactReviewedRevision && selectedRecord
            ? `Pinned to reviewed quote revision ${selectedRecord.version}.`
            : "No reviewed quote revision is selected."
        }
        disclosure="The customer CSV excludes internal notes, known direct costs, business/payment fees, fulfillment cost, and internal gross-profit fields. The server projection is formula-safe and the client hands off those exact reviewed bytes without rebuilding the CSV."
        contextNotice={
          dirty && exactReviewedRevision && selectedRecord
            ? `The editor contains unsaved changes. This CSV remains pinned to reviewed revision ${selectedRecord.version}; the edits are not included.`
            : undefined
        }
        disabled={!exactReviewedRevision || busy}
        disabledReason="Save and review an exact quote revision before previewing its CSV."
        previewButtonLabel="Preview reviewed quote CSV"
        prepareButtonLabel="Confirm and export reviewed quote CSV"
      />

      <AppCard
        title="Reviewed quote lifecycle and payment evidence"
        titleLevel={2}
        subtitle="Payment evidence is pinned to one exact reviewed revision. It records what an authorized user confirms; it does not charge a customer, send an invoice, accept terms, or move B‑02 inventory."
      >
        {!exactReviewedRevision || !selectedRecord ? (
          <Text style={styles.bodyText}>
            Select and review an exact saved quote revision to load its lifecycle and
            payment evidence.
          </Text>
        ) : null}

        {paymentLoading ? (
          <View accessibilityLiveRegion="polite" style={styles.actionRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.bodyText}>
              Loading exact revision {selectedRecord?.version} evidence…
            </Text>
          </View>
        ) : null}
        {paymentError ? <InlineError error={paymentError} /> : null}
        {paymentFeedback ? (
          <View accessibilityLiveRegion="polite" style={styles.notice}>
            <Text style={styles.noticeText}>{paymentFeedback}</Text>
          </View>
        ) : null}

        {exactReviewedRevision && selectedRecord ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reload exact quote lifecycle and payment evidence"
            accessibilityState={{ disabled: paymentLoading || busy }}
            disabled={paymentLoading || busy}
            onPress={() => void loadQuoteEvidence(selectedRecord)}
            style={[styles.secondaryButton, (paymentLoading || busy) && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>Reload exact revision evidence</Text>
          </Pressable>
        ) : null}

        {paymentSummary && quoteLifecycle && paymentChains && paymentContext ? (
          <View style={styles.stack}>
            <View style={styles.metricGrid}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Lifecycle</Text>
                <Text style={styles.metricValue}>
                  {quoteLifecycle.displayStatus.replace(/_/g, " ")}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Quote total</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(paymentSummary.quoteTotalMinor, paymentContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Deposit requested</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(paymentSummary.requestedDepositMinor, paymentContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>User-confirmed payments</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(paymentSummary.paidMinor, paymentContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Outstanding quote balance</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(paymentSummary.outstandingMinor, paymentContext)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Deposit still outstanding</Text>
                <Text style={styles.metricValue}>
                  {formatMoneyMinor(
                    paymentSummary.depositOutstandingMinor,
                    paymentContext
                  )}
                </Text>
              </View>
              {paymentSummary.overpaymentMinor > 0 ? (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Reported overpayment</Text>
                  <Text style={styles.metricValue}>
                    {formatMoneyMinor(paymentSummary.overpaymentMinor, paymentContext)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.boundaryText}>
              Revision {paymentSummary.quoteRevisionNumber} · content:{" "}
              {quoteLifecycle.facets.content} · artifact:{" "}
              {quoteLifecycle.facets.artifact.replace(/_/g, " ")} · time:{" "}
              {quoteLifecycle.facets.time.replace(/_/g, " ")} · revision:{" "}
              {quoteLifecycle.facets.revision} · derived{" "}
              {readableDate(quoteLifecycle.derivedAt)}.
            </Text>
            <Text style={styles.boundaryText}>
              The requested deposit is a quote term, not payment evidence.{" "}
              {paymentSummary.depositSatisfied
                ? "User-confirmed evidence currently meets the requested deposit."
                : "User-confirmed evidence does not yet meet the requested deposit."}{" "}
              Provider observations and provider draft handoff are not configured, so no
              Stripe or other provider payment is claimed here.
            </Text>

            {!paymentEvidenceReady ? (
              <View style={styles.warning}>
                <Text style={styles.warningTitle}>Payment changes are locked</Text>
                <Text style={styles.warningText}>
                  {dirty
                    ? `The editor differs from reviewed revision ${selectedRecord?.version}. Payment evidence remains visible for that revision, but recording or changing it is blocked until you reload or save and review a new exact revision.`
                    : "This Quote is cancelled, superseded, stale, or no longer matches the exact evidence response. Reload before taking action."}
                </Text>
              </View>
            ) : null}

            <View style={styles.lineCard}>
              <Text accessibilityRole="header" aria-level={3} style={styles.lineTitle}>
                Record a manual payment
              </Text>
              <Text style={styles.bodyText}>
                Use this only when an authorized person has evidence that a payment
                occurred. GrowPathAI records a user-confirmed claim; it does not verify a
                bank or payment provider.
              </Text>
              <View style={styles.fieldGrid}>
                <Field
                  label={`Confirmed payment amount (${paymentSummary.currency})`}
                  accessibilityLabel="Confirmed quote payment amount"
                  keyboardType="decimal-pad"
                  value={paymentAmount}
                  onChangeText={(value) => {
                    setPaymentAmount(value);
                    setPaymentFeedback("");
                  }}
                  editable={paymentEvidenceReady && !busy}
                  styles={styles}
                />
                <Field
                  label="Payment reference (optional)"
                  accessibilityLabel="Confirmed quote payment reference"
                  value={paymentReference}
                  onChangeText={(value) => {
                    setPaymentReference(value);
                    setPaymentFeedback("");
                  }}
                  maxLength={300}
                  editable={paymentEvidenceReady && !busy}
                  hint="Receipt, transfer, check, or other operator-reviewed reference."
                  styles={styles}
                />
              </View>
              <CalendarDateField
                label="Payment occurred on"
                accessibilityLabel="Confirmed quote payment date"
                value={paymentOccurredAt}
                onChange={(value) => {
                  setPaymentOccurredAt(value);
                  setPaymentFeedback("");
                }}
                disabled={!paymentEvidenceReady || busy}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Confirm user-reported quote payment evidence"
                accessibilityState={{
                  checked: paymentConfirmed,
                  disabled: !paymentEvidenceReady || busy
                }}
                disabled={!paymentEvidenceReady || busy}
                onPress={() => setPaymentConfirmed((current) => !current)}
                style={styles.checkboxRow}
              >
                <View
                  style={[styles.checkbox, paymentConfirmed && styles.checkboxChecked]}
                />
                <Text style={styles.checkboxLabel}>
                  I confirm this payment evidence is based on records I reviewed and is
                  not a provider-verified charge.
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Record confirmed manual quote payment"
                accessibilityState={{
                  disabled: !paymentEvidenceReady || busy || !paymentConfirmed
                }}
                disabled={!paymentEvidenceReady || busy || !paymentConfirmed}
                onPress={() => void confirmManualPayment()}
                style={[
                  styles.primaryButton,
                  (!paymentEvidenceReady || busy || !paymentConfirmed) && styles.disabled
                ]}
              >
                {paymentBusy ? (
                  <ActivityIndicator color={palette.accentText} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Record user-confirmed payment
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.stack}>
              <Text accessibilityRole="header" aria-level={3} style={styles.lineTitle}>
                User-confirmed payment evidence history
              </Text>
              {paymentChains.chains.length === 0 ? (
                <Text style={styles.bodyText}>
                  No user-confirmed payment evidence has been recorded for this exact
                  revision.
                </Text>
              ) : null}
              {paymentChains.chains.map((chain, index) => (
                <View key={chain.rootPaymentEvidenceId} style={styles.lineCard}>
                  <Text style={styles.revisionTitle}>Payment {index + 1}</Text>
                  <Text style={styles.savedMeta}>
                    {chain.active
                      ? formatMoneyMinor(chain.amountMinor, paymentContext)
                      : "Voided"}{" "}
                    · latest event {chain.latestEventType} · sequence {chain.sequence} ·{" "}
                    {readableDate(chain.occurredAt)}
                  </Text>
                  {chain.reference ? (
                    <Text style={styles.bodyText}>Reference: {chain.reference}</Text>
                  ) : null}
                  {chain.reason ? (
                    <Text style={styles.bodyText}>Reason: {chain.reason}</Text>
                  ) : null}
                  <Text style={styles.boundaryText}>
                    User-confirmed evidence only. Provider observations are excluded.
                  </Text>
                  {chain.active ? (
                    <View style={styles.actionRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Correct user-confirmed payment ${index + 1}`}
                        accessibilityState={{
                          disabled: !paymentEvidenceReady || busy || !chain.canCorrect
                        }}
                        disabled={!paymentEvidenceReady || busy || !chain.canCorrect}
                        onPress={() => beginPaymentAdjustment(chain, "correction")}
                        style={[
                          styles.secondaryButton,
                          (!paymentEvidenceReady || busy || !chain.canCorrect) &&
                            styles.disabled
                        ]}
                      >
                        <Text style={styles.secondaryButtonText}>Correct payment</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Void user-confirmed payment ${index + 1}`}
                        accessibilityState={{
                          disabled: !paymentEvidenceReady || busy || !chain.canVoid
                        }}
                        disabled={!paymentEvidenceReady || busy || !chain.canVoid}
                        onPress={() => beginPaymentAdjustment(chain, "void")}
                        style={[
                          styles.secondaryButton,
                          (!paymentEvidenceReady || busy || !chain.canVoid) &&
                            styles.disabled
                        ]}
                      >
                        <Text style={styles.secondaryButtonText}>Void payment</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>

            {paymentAdjustmentType && selectedPaymentChain ? (
              <View style={styles.lineCard}>
                <Text accessibilityRole="header" aria-level={3} style={styles.lineTitle}>
                  {paymentAdjustmentType === "correction"
                    ? "Correct selected payment"
                    : "Void selected payment"}
                </Text>
                <Text style={styles.bodyText}>
                  Selected latest evidence:{" "}
                  {formatMoneyMinor(selectedPaymentChain.amountMinor, paymentContext)} on{" "}
                  {readableDate(selectedPaymentChain.occurredAt)}
                  {selectedPaymentChain.reference
                    ? ` · reference ${selectedPaymentChain.reference}`
                    : ""}
                  . The prior event remains in immutable history.
                </Text>
                {paymentAdjustmentType === "correction" ? (
                  <Field
                    label={`Corrected payment amount (${paymentSummary.currency})`}
                    accessibilityLabel="Corrected quote payment amount"
                    keyboardType="decimal-pad"
                    value={paymentCorrectionAmount}
                    onChangeText={setPaymentCorrectionAmount}
                    editable={paymentEvidenceReady && !busy}
                    styles={styles}
                  />
                ) : null}
                <Field
                  label={
                    paymentAdjustmentType === "correction"
                      ? "Correction reason"
                      : "Void reason"
                  }
                  accessibilityLabel={
                    paymentAdjustmentType === "correction"
                      ? "Quote payment correction reason"
                      : "Quote payment void reason"
                  }
                  value={paymentAdjustmentReason}
                  onChangeText={setPaymentAdjustmentReason}
                  multiline
                  maxLength={2_000}
                  editable={paymentEvidenceReady && !busy}
                  styles={styles}
                />
                <CalendarDateField
                  label={
                    paymentAdjustmentType === "correction"
                      ? "Corrected payment occurred on"
                      : "Payment void recorded on"
                  }
                  accessibilityLabel={
                    paymentAdjustmentType === "correction"
                      ? "Quote payment correction date"
                      : "Quote payment void date"
                  }
                  value={paymentAdjustmentOccurredAt}
                  onChange={setPaymentAdjustmentOccurredAt}
                  disabled={!paymentEvidenceReady || busy}
                />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Confirm quote payment ${paymentAdjustmentType}`}
                  accessibilityState={{
                    checked: paymentAdjustmentConfirmed,
                    disabled: !paymentEvidenceReady || busy
                  }}
                  disabled={!paymentEvidenceReady || busy}
                  onPress={() => setPaymentAdjustmentConfirmed((current) => !current)}
                  style={styles.checkboxRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      paymentAdjustmentConfirmed && styles.checkboxChecked
                    ]}
                  />
                  <Text style={styles.checkboxLabel}>
                    I confirm this {paymentAdjustmentType} and understand it appends
                    evidence rather than rewriting the prior event.
                  </Text>
                </Pressable>
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Save quote payment ${paymentAdjustmentType}`}
                    accessibilityState={{
                      disabled:
                        !paymentEvidenceReady || busy || !paymentAdjustmentConfirmed
                    }}
                    disabled={
                      !paymentEvidenceReady || busy || !paymentAdjustmentConfirmed
                    }
                    onPress={() => void confirmPaymentAdjustment()}
                    style={[
                      styles.primaryButton,
                      (!paymentEvidenceReady || busy || !paymentAdjustmentConfirmed) &&
                        styles.disabled
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>
                      Save confirmed {paymentAdjustmentType}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel quote payment evidence change"
                    disabled={busy}
                    onPress={() => {
                      setPaymentAdjustmentType(null);
                      setPaymentAdjustmentEvidenceId("");
                      setPaymentAdjustmentConfirmed(false);
                      paymentRetryIdentity.current = null;
                    }}
                    style={[styles.secondaryButton, busy && styles.disabled]}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {paymentEvidence ? (
              <Text style={styles.boundaryText}>
                Last acknowledged evidence event: {paymentEvidence.eventType} · sequence{" "}
                {paymentEvidence.sequence} · confirmed{" "}
                {readableDate(paymentEvidence.confirmation.confirmedAt)}.
              </Text>
            ) : null}
          </View>
        ) : null}
      </AppCard>

      <AppCard
        title="Optional payment-provider draft handoff"
        titleLevel={2}
        subtitle="Provider handoff is a separate consequential action and is not part of copy or CSV preparation."
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Payment provider draft handoff unavailable"
          accessibilityState={{ disabled: true }}
          disabled
          style={[styles.secondaryButton, styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>Provider draft handoff</Text>
        </Pressable>
        <Text style={styles.boundaryText}>
          Provider handoff is not configured. No Stripe object, invoice, payment link,
          customer charge, acceptance, payment state, or B‑02 inventory movement is
          created.
        </Text>
      </AppCard>

      <AppCard
        title="Saved quotes"
        titleLevel={2}
        subtitle="Opening a saved quote loads its current version; revision history remains append-only."
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh saved quote list"
          accessibilityState={{ disabled: loading || busy }}
          disabled={loading || busy}
          onPress={() => void loadRecords()}
          style={[styles.secondaryButton, (loading || busy) && styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>Refresh saved quotes</Text>
        </Pressable>
        {loading ? <ActivityIndicator color={palette.accent} /> : null}
        {!loading && records.length === 0 ? (
          <Text style={styles.bodyText}>
            No quote drafts have been saved in this workspace.
          </Text>
        ) : null}
        <View style={styles.stack}>
          {records.map((record) => (
            <Pressable
              key={recordId(record)}
              accessibilityRole="button"
              accessibilityLabel={`Open saved quote ${record.title}`}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => selectRecord(record)}
              style={[
                styles.savedCard,
                recordId(record) === recordId(selectedRecord) && styles.savedCardActive
              ]}
            >
              <Text style={styles.savedTitle}>{record.title}</Text>
              <Text style={styles.savedMeta}>
                {record.status} · revision {record.version} · updated{" "}
                {readableDate(record.updatedAt)}
              </Text>
            </Pressable>
          ))}
        </View>
      </AppCard>

      {selectedRecord ? (
        <>
          <AppCard
            title="Immutable revision history"
            titleLevel={2}
            subtitle={`Current record version ${selectedRecord.version}. A stale save is rejected and this on-screen draft is retained.`}
          >
            {revisions.length === 0 ? (
              <Text style={styles.bodyText}>No revision entries were returned yet.</Text>
            ) : (
              <View style={styles.stack}>
                {revisions.map((revision, index) => (
                  <View
                    key={String(
                      revision._id || revision.id || `${revision.revisionNumber}-${index}`
                    )}
                    style={styles.revisionRow}
                  >
                    <Text style={styles.revisionTitle}>
                      Revision {revision.revisionNumber || revision.version || "?"}
                    </Text>
                    <Text style={styles.savedMeta}>
                      {revision.operation || "saved"} · {readableDate(revision.createdAt)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </AppCard>
          <AppCard
            title="Archive selected quote"
            titleLevel={2}
            subtitle="Archiving removes this quote from the active list but preserves its immutable revisions and audit history."
          >
            <Field
              label="Archive reason"
              accessibilityLabel="Quote archive reason"
              value={archiveReason}
              onChangeText={setArchiveReason}
              placeholder="Why is this quote being archived?"
              styles={styles}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Archive selected quote"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => void archiveQuote()}
              style={[styles.secondaryButton, busy && styles.disabled]}
            >
              <Text style={styles.secondaryButtonText}>Archive quote</Text>
            </Pressable>
          </AppCard>
        </>
      ) : null}
    </AppPage>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    bodyText: { color: palette.textMuted, fontSize: 14, lineHeight: 21 },
    boundaryText: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12
    },
    checkbox: {
      borderColor: palette.border,
      borderRadius: 4,
      borderWidth: 2,
      height: 18,
      width: 18
    },
    checkboxChecked: { backgroundColor: palette.accent, borderColor: palette.accent },
    checkboxLabel: { color: palette.text, flex: 1, fontSize: 14 },
    checkboxRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      minHeight: 44,
      paddingVertical: 8
    },
    choice: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      minHeight: 40,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    choiceActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
    choiceText: { color: palette.text, fontSize: 13, fontWeight: "800" },
    choiceTextActive: { color: palette.accentText },
    disabled: { opacity: 0.48 },
    field: { flexBasis: 250, flexGrow: 1, gap: 5 },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    fieldHint: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    fieldLabel: { color: palette.text, fontSize: 13, fontWeight: "800", marginTop: 4 },
    header: { gap: 6 },
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
    lineCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    lineHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    lineTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    lineTotals: { gap: 4, marginTop: 12 },
    linkButton: { minHeight: 40, padding: 8 },
    linkButtonText: { color: palette.link, fontSize: 13, fontWeight: "900" },
    metric: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: 180,
      flexGrow: 1,
      gap: 5,
      padding: 12
    },
    metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    metricLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    metricValue: { color: palette.text, fontSize: 19, fontWeight: "900" },
    notice: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    noticeText: { color: palette.text, fontSize: 14, lineHeight: 20 },
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
    revisionRow: {
      borderBottomColor: palette.borderSoft,
      borderBottomWidth: 1,
      gap: 3,
      paddingVertical: 9
    },
    revisionTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    savedCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      padding: 12
    },
    savedCardActive: { borderColor: palette.accent, borderWidth: 2 },
    savedMeta: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    savedTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 15,
      paddingVertical: 10
    },
    secondaryButtonText: { color: palette.text, fontSize: 14, fontWeight: "900" },
    stack: { gap: 10 },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 850 },
    textArea: { minHeight: 96, textAlignVertical: "top" },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" },
    warning: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      padding: 12
    },
    warningText: { color: palette.text, fontSize: 13, lineHeight: 19 },
    warningTitle: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "900",
      marginBottom: 4
    }
  });
}
