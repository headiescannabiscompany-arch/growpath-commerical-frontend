import { apiRequest } from "@/api/apiRequest";
import {
  businessDeskBase,
  type BusinessDeskRecord,
  type BusinessDeskRecordKind,
  type BusinessDeskRequestOptions,
  type BusinessDeskRevision,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";

export type BusinessDeskProviderOperationState =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export type BusinessDeskProviderOperationKind =
  | "expense_receipt_extraction"
  | "business_ask";

export type BusinessDeskProviderCredit = {
  credits: number;
  status: "not_reserved" | "reserved" | "charged" | "refunded";
};

export type BusinessDeskProviderOperationError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type BusinessDeskProviderTimestamps = {
  createdAt: string;
  updatedAt: string;
  queuedAt: string;
  processingAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

export type ExtractedField<TValue> = {
  value: TValue;
  confidenceBasisPoints: number;
};

export type ExpenseReceiptExtractionResult = {
  type: "expense_receipt_extraction";
  schemaVersion: "business-desk-expense-receipt-v1";
  resultDigestSha256: string;
  fields: {
    merchant: ExtractedField<string>;
    occurredAt: ExtractedField<string | null>;
    amountMinor: ExtractedField<number | null>;
    taxMinor: ExtractedField<number | null>;
    currency: ExtractedField<string>;
    minorUnitDigits: ExtractedField<number | null>;
    category: ExtractedField<string>;
    paymentMethod: ExtractedField<string>;
    notes: ExtractedField<string>;
  };
  itemLines: Array<{
    description: string;
    quantityMicros: number | null;
    unitAmountMinor: number | null;
    lineTotalMinor: number | null;
    category: string;
    confidenceBasisPoints: number;
  }>;
  missingFields: string[];
  validationErrors: Array<{ field: string; code: string; message: string }>;
  duplicate: { status: "unknown" | "unique" | "same_workspace_duplicate" };
  provenance: {
    sourceAttachmentId: string;
    sourceContentSha256: string;
    provider: "openai";
    model: string;
    schemaVersion: string;
    promptVersion: string;
    extractedAt: string;
    fieldConfidenceBasisPoints: Record<string, number>;
  };
  reviewerChanges: Array<{
    field: string;
    fromDigestSha256: string;
    toDigestSha256: string;
  }>;
};

export type BusinessAskCitation = {
  id: string;
  sourceType:
    | "business_desk_record"
    | "business_inventory_item"
    | "business_inventory_lot";
  recordId: string;
  parentRecordId: string | null;
  recordKind: string;
  title: string;
  version: number | null;
  sourceDate: string;
  dateRange: { from: string; to: string };
};

export type BusinessAskAttestation = {
  operationId: string;
  kind: "business_ask";
  state: "succeeded";
  providerInputDigestSha256: string;
  sourceManifestDigestSha256: string;
  resultDigestSha256: string;
  provider: string;
  model: string;
  schemaVersion: string;
  promptVersion: string;
  completedAt: string;
  sources: Array<{
    id: string;
    sourceType:
      | "business_desk_record"
      | "business_inventory_item"
      | "business_inventory_lot";
    recordId: string;
    parentRecordId: string | null;
    recordKind: string;
    version: number | null;
    sourceDate: string;
  }>;
};

export type BusinessAskResult = {
  type: "business_ask";
  schemaVersion: "business-desk-business-ask-v1";
  resultDigestSha256: string;
  answer: string;
  incomplete: boolean;
  answerCitationIds: string[];
  facts: Array<{ statement: string; citationIds: string[] }>;
  calculations: Array<{
    statement: string;
    formula: string;
    inputs: string[];
    citationIds: string[];
    incomplete: boolean;
    verification: "provider_unverified";
    requiresReview: true;
  }>;
  assumptions: Array<{ statement: string; citationIds: string[] }>;
  scenarios: Array<{ statement: string; citationIds: string[] }>;
  recommendations: Array<{
    statement: string;
    citationIds: string[];
    requiresReview: true;
  }>;
  limitations: string[];
  missingInformation: string[];
  citations: BusinessAskCitation[];
  dateRange: { from: string; to: string };
  selectedRecordCount: number;
  truncated: boolean;
  assistantDraftRecordId: string;
  assistantDraftVersion: number;
};

export type BusinessDeskProviderResult =
  | ExpenseReceiptExtractionResult
  | BusinessAskResult;

export type BusinessDeskProviderOperation<
  TResult extends BusinessDeskProviderResult = BusinessDeskProviderResult
> = {
  id: string;
  kind: BusinessDeskProviderOperationKind;
  state: BusinessDeskProviderOperationState;
  version: number;
  clientOperationKey: string;
  requestDigest: string;
  cancellable: boolean;
  timestamps: BusinessDeskProviderTimestamps;
  error: BusinessDeskProviderOperationError | null;
  credit: BusinessDeskProviderCredit;
  result: TResult | null;
};

export type BusinessDeskProviderOperationPacket<
  TResult extends BusinessDeskProviderResult = BusinessDeskProviderResult
> = {
  operation: BusinessDeskProviderOperation<TResult>;
  idempotentReplay: boolean | null;
};

export type BusinessDeskProviderCapability = {
  enabled: boolean;
  requiresReview?: true;
  createsDraftOnly?: true;
  creditCost: number;
  code: string | null;
};

export type BusinessDeskProviderCapabilities = {
  expenseReceiptExtraction: BusinessDeskProviderCapability & {
    requiresReview: true;
  };
  businessAsk: BusinessDeskProviderCapability & { createsDraftOnly: true };
  maxAskRecords: number;
  maxAskDateRangeDays: number;
  askRecordKinds: BusinessAskRecordKind[];
  inventorySelection: "explicit_boolean";
};

export type ReviewedExpenseExtraction = {
  title: string;
  merchant: string;
  occurredAt: string;
  amountMinor: number;
  taxMinor: number;
  currency: string;
  minorUnitDigits: number;
  category: string;
  paymentMethod: string;
  itemLines: Array<{
    description: string;
    quantityMicros: number;
    unitAmountMinor: number;
    lineTotalMinor: number;
    category: string;
  }>;
  notes: string;
  reviewNotes: string;
};

export type AppliedExpenseExtractionPacket = {
  operation: BusinessDeskProviderOperation<ExpenseReceiptExtractionResult>;
  record: BusinessDeskRecord;
  revision: BusinessDeskRevision;
  idempotentReplay: boolean;
};

export const BUSINESS_ASK_RECORD_KINDS = [
  "price_margin_scenario",
  "quote",
  "lead",
  "job",
  "expense",
  "vendor_comparison",
  "cash_flow_snapshot"
] as const satisfies readonly BusinessDeskRecordKind[];

export type BusinessAskRecordKind = (typeof BUSINESS_ASK_RECORD_KINDS)[number];

const OPERATION_STATES = new Set<BusinessDeskProviderOperationState>([
  "queued",
  "processing",
  "succeeded",
  "failed",
  "cancelled"
]);
const OPERATION_KINDS = new Set<BusinessDeskProviderOperationKind>([
  "expense_receipt_extraction",
  "business_ask"
]);
const CREDIT_STATES = new Set<BusinessDeskProviderCredit["status"]>([
  "not_reserved",
  "reserved",
  "charged",
  "refunded"
]);
const ASK_RECORD_KIND_SET = new Set<string>(BUSINESS_ASK_RECORD_KINDS);
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RESULT_ARRAY = 250;
const MAX_RESULT_TEXT = 20_000;

function envelope(response: any) {
  return response?.data && typeof response.data === "object" ? response.data : response;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, any>, allowed: readonly string[]) {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function validString(value: unknown, max = MAX_RESULT_TEXT) {
  return typeof value === "string" && value.length <= max;
}

function validRequiredString(value: unknown, max = MAX_RESULT_TEXT) {
  return typeof value === "string" && value.length <= max && value.trim().length > 0;
}

function validDigest(value: unknown) {
  return typeof value === "string" && DIGEST_PATTERN.test(value);
}

function validIsoTimestamp(value: unknown) {
  return (
    typeof value === "string" &&
    value.length <= 64 &&
    Number.isFinite(new Date(value).getTime())
  );
}

function validDate(value: unknown) {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

function validSafeInteger(value: unknown, minimum = 0) {
  return Number.isSafeInteger(value) && Number(value) >= minimum;
}

function validBasisPoints(value: unknown) {
  return validSafeInteger(value) && Number(value) <= 10_000;
}

function validBoundedStringArray(value: unknown, maximum = MAX_RESULT_ARRAY) {
  return (
    Array.isArray(value) &&
    value.length <= maximum &&
    value.every((entry) => validString(entry, 2_000))
  );
}

function validField(value: unknown, valueIsValid: (entry: unknown) => boolean) {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ["value", "confidenceBasisPoints"]) &&
    valueIsValid(value.value) &&
    validBasisPoints(value.confidenceBasisPoints)
  );
}

function validExpenseExtractionResult(
  value: unknown
): value is ExpenseReceiptExtractionResult {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "type",
      "schemaVersion",
      "resultDigestSha256",
      "fields",
      "itemLines",
      "missingFields",
      "validationErrors",
      "duplicate",
      "provenance",
      "reviewerChanges"
    ]) ||
    value.type !== "expense_receipt_extraction" ||
    value.schemaVersion !== "business-desk-expense-receipt-v1" ||
    !validDigest(value.resultDigestSha256) ||
    !isPlainObject(value.fields) ||
    !hasExactKeys(value.fields, [
      "merchant",
      "occurredAt",
      "amountMinor",
      "taxMinor",
      "currency",
      "minorUnitDigits",
      "category",
      "paymentMethod",
      "notes"
    ])
  ) {
    return false;
  }
  const fields = value.fields;
  const validOptionalInteger = (entry: unknown) =>
    entry === null || validSafeInteger(entry);
  if (
    !validField(fields.merchant, (entry) => validString(entry, 500)) ||
    !validField(fields.occurredAt, (entry) =>
      entry === null ? true : validString(entry, 64)
    ) ||
    !validField(fields.amountMinor, validOptionalInteger) ||
    !validField(fields.taxMinor, validOptionalInteger) ||
    !validField(fields.currency, (entry) => validString(entry, 3)) ||
    !validField(fields.minorUnitDigits, (entry) =>
      entry === null ? true : validSafeInteger(entry) && Number(entry) <= 6
    ) ||
    !validField(fields.category, (entry) => validString(entry, 200)) ||
    !validField(fields.paymentMethod, (entry) => validString(entry, 200)) ||
    !validField(fields.notes, (entry) => validString(entry, 5_000))
  ) {
    return false;
  }
  if (
    !Array.isArray(value.itemLines) ||
    value.itemLines.length > MAX_RESULT_ARRAY ||
    !value.itemLines.every(
      (line: unknown) =>
        isPlainObject(line) &&
        hasExactKeys(line, [
          "description",
          "quantityMicros",
          "unitAmountMinor",
          "lineTotalMinor",
          "category",
          "confidenceBasisPoints"
        ]) &&
        validString(line.description, 500) &&
        (line.quantityMicros === null || validSafeInteger(line.quantityMicros)) &&
        (line.unitAmountMinor === null || validSafeInteger(line.unitAmountMinor)) &&
        (line.lineTotalMinor === null || validSafeInteger(line.lineTotalMinor)) &&
        validString(line.category, 200) &&
        validBasisPoints(line.confidenceBasisPoints)
    ) ||
    !validBoundedStringArray(value.missingFields) ||
    !Array.isArray(value.validationErrors) ||
    value.validationErrors.length > MAX_RESULT_ARRAY ||
    !value.validationErrors.every(
      (entry: unknown) =>
        isPlainObject(entry) &&
        hasExactKeys(entry, ["field", "code", "message"]) &&
        validRequiredString(entry.field, 200) &&
        validRequiredString(entry.code, 200) &&
        validRequiredString(entry.message, 2_000)
    ) ||
    !isPlainObject(value.duplicate) ||
    !hasExactKeys(value.duplicate, ["status"]) ||
    !["unknown", "unique", "same_workspace_duplicate"].includes(value.duplicate.status)
  ) {
    return false;
  }
  const provenance = value.provenance;
  if (
    !isPlainObject(provenance) ||
    !hasExactKeys(provenance, [
      "sourceAttachmentId",
      "sourceContentSha256",
      "provider",
      "model",
      "schemaVersion",
      "promptVersion",
      "extractedAt",
      "fieldConfidenceBasisPoints"
    ]) ||
    !validRequiredString(provenance.sourceAttachmentId, 256) ||
    !validDigest(provenance.sourceContentSha256) ||
    provenance.provider !== "openai" ||
    !validRequiredString(provenance.model, 200) ||
    !validRequiredString(provenance.schemaVersion, 200) ||
    !validRequiredString(provenance.promptVersion, 200) ||
    !validIsoTimestamp(provenance.extractedAt) ||
    !isPlainObject(provenance.fieldConfidenceBasisPoints) ||
    Object.keys(provenance.fieldConfidenceBasisPoints).length > 100 ||
    !Object.values(provenance.fieldConfidenceBasisPoints).every(validBasisPoints)
  ) {
    return false;
  }
  return (
    Array.isArray(value.reviewerChanges) &&
    value.reviewerChanges.length <= MAX_RESULT_ARRAY &&
    value.reviewerChanges.every(
      (entry: unknown) =>
        isPlainObject(entry) &&
        hasExactKeys(entry, ["field", "fromDigestSha256", "toDigestSha256"]) &&
        validRequiredString(entry.field, 200) &&
        validDigest(entry.fromDigestSha256) &&
        validDigest(entry.toDigestSha256)
    )
  );
}

function validStatementWithCitations(value: unknown) {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, ["statement", "citationIds"]) &&
    validRequiredString(value.statement) &&
    validBoundedStringArray(value.citationIds, 20) &&
    value.citationIds.length >= 1
  );
}

function validBusinessAskResult(value: unknown): value is BusinessAskResult {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "type",
      "schemaVersion",
      "resultDigestSha256",
      "answer",
      "incomplete",
      "answerCitationIds",
      "facts",
      "calculations",
      "assumptions",
      "scenarios",
      "recommendations",
      "limitations",
      "missingInformation",
      "citations",
      "dateRange",
      "selectedRecordCount",
      "truncated",
      "assistantDraftRecordId",
      "assistantDraftVersion"
    ]) ||
    value.type !== "business_ask" ||
    value.schemaVersion !== "business-desk-business-ask-v1" ||
    !validDigest(value.resultDigestSha256) ||
    !validRequiredString(value.answer) ||
    typeof value.incomplete !== "boolean" ||
    !validBoundedStringArray(value.answerCitationIds, 20) ||
    !Array.isArray(value.facts) ||
    value.facts.length > MAX_RESULT_ARRAY ||
    !value.facts.every(validStatementWithCitations) ||
    !Array.isArray(value.assumptions) ||
    value.assumptions.length > MAX_RESULT_ARRAY ||
    !value.assumptions.every(validStatementWithCitations) ||
    !Array.isArray(value.scenarios) ||
    value.scenarios.length > MAX_RESULT_ARRAY ||
    !value.scenarios.every(validStatementWithCitations)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.calculations) ||
    value.calculations.length > MAX_RESULT_ARRAY ||
    !value.calculations.every(
      (entry: unknown) =>
        isPlainObject(entry) &&
        hasExactKeys(entry, [
          "statement",
          "formula",
          "inputs",
          "citationIds",
          "incomplete",
          "verification",
          "requiresReview"
        ]) &&
        validRequiredString(entry.statement) &&
        validString(entry.formula, 5_000) &&
        validBoundedStringArray(entry.inputs) &&
        validBoundedStringArray(entry.citationIds, 20) &&
        entry.citationIds.length >= 1 &&
        typeof entry.incomplete === "boolean" &&
        entry.verification === "provider_unverified" &&
        entry.requiresReview === true
    ) ||
    !Array.isArray(value.recommendations) ||
    value.recommendations.length > MAX_RESULT_ARRAY ||
    !value.recommendations.every(
      (entry: unknown) =>
        isPlainObject(entry) &&
        hasExactKeys(entry, ["statement", "citationIds", "requiresReview"]) &&
        validRequiredString(entry.statement) &&
        validBoundedStringArray(entry.citationIds, 20) &&
        entry.citationIds.length >= 1 &&
        entry.requiresReview === true
    ) ||
    !validBoundedStringArray(value.limitations) ||
    !validBoundedStringArray(value.missingInformation)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.citations) ||
    value.citations.length > MAX_RESULT_ARRAY ||
    new Set(value.citations.map((citation: unknown) => (citation as any)?.id)).size !==
      value.citations.length ||
    !value.citations.every(
      (citation: unknown) =>
        isPlainObject(citation) &&
        hasExactKeys(citation, [
          "id",
          "sourceType",
          "recordId",
          "parentRecordId",
          "recordKind",
          "title",
          "version",
          "sourceDate",
          "dateRange"
        ]) &&
        validRequiredString(citation.id, 256) &&
        [
          "business_desk_record",
          "business_inventory_item",
          "business_inventory_lot"
        ].includes(citation.sourceType) &&
        validRequiredString(citation.recordId, 256) &&
        (citation.sourceType === "business_inventory_lot"
          ? validRequiredString(citation.parentRecordId, 256)
          : citation.parentRecordId === null) &&
        validRequiredString(citation.recordKind, 200) &&
        validRequiredString(citation.title, 500) &&
        (citation.sourceType === "business_desk_record"
          ? validSafeInteger(citation.version, 1)
          : citation.version === null) &&
        validIsoTimestamp(citation.sourceDate) &&
        isPlainObject(citation.dateRange) &&
        hasExactKeys(citation.dateRange, ["from", "to"]) &&
        validDate(citation.dateRange.from) &&
        validDate(citation.dateRange.to)
    ) ||
    !isPlainObject(value.dateRange) ||
    !hasExactKeys(value.dateRange, ["from", "to"]) ||
    !validDate(value.dateRange.from) ||
    !validDate(value.dateRange.to) ||
    !validSafeInteger(value.selectedRecordCount) ||
    typeof value.truncated !== "boolean" ||
    !validRequiredString(value.assistantDraftRecordId, 256) ||
    !validSafeInteger(value.assistantDraftVersion, 1)
  ) {
    return false;
  }
  const citationIds = new Set(value.citations.map((citation: any) => citation.id));
  const citedSections = [
    ...value.facts,
    ...value.calculations,
    ...value.assumptions,
    ...value.scenarios,
    ...value.recommendations
  ];
  if (
    !value.answerCitationIds.every((id: string) => citationIds.has(id)) ||
    !citedSections.every((entry: { citationIds: string[] }) =>
      entry.citationIds.every((id) => citationIds.has(id))
    )
  ) {
    return false;
  }
  if (value.incomplete) {
    return (
      value.answer ===
        "The authorized records are insufficient to answer this question." &&
      value.answerCitationIds.length === 0 &&
      value.facts.length === 0 &&
      value.calculations.length === 0 &&
      value.assumptions.length === 0 &&
      value.scenarios.length === 0 &&
      value.recommendations.length === 0
    );
  }
  return (
    value.answerCitationIds.length >= 1 &&
    value.answerCitationIds.length <= 20 &&
    value.assumptions.every(
      (entry: { citationIds: string[] }) => entry.citationIds.length >= 1
    ) &&
    value.scenarios.every(
      (entry: { citationIds: string[] }) => entry.citationIds.length >= 1
    )
  );
}

function operationFrom<TResult extends BusinessDeskProviderResult>(
  value: unknown,
  expectedKind?: BusinessDeskProviderOperationKind
): BusinessDeskProviderOperation<TResult> {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "id",
      "kind",
      "state",
      "version",
      "clientOperationKey",
      "requestDigest",
      "cancellable",
      "timestamps",
      "error",
      "credit",
      "result"
    ]) ||
    !validRequiredString(value.id, 256) ||
    !OPERATION_KINDS.has(value.kind) ||
    (expectedKind && value.kind !== expectedKind) ||
    !OPERATION_STATES.has(value.state) ||
    !validSafeInteger(value.version, 1) ||
    !validRequiredString(value.clientOperationKey, 256) ||
    !validDigest(value.requestDigest) ||
    typeof value.cancellable !== "boolean"
  ) {
    throw new Error("The Business Desk provider operation response was invalid.");
  }
  const timestamps = value.timestamps;
  if (
    !isPlainObject(timestamps) ||
    !hasExactKeys(timestamps, [
      "createdAt",
      "updatedAt",
      "queuedAt",
      "processingAt",
      "completedAt",
      "cancelledAt"
    ]) ||
    !validIsoTimestamp(timestamps.createdAt) ||
    !validIsoTimestamp(timestamps.updatedAt) ||
    !validIsoTimestamp(timestamps.queuedAt) ||
    !["processingAt", "completedAt", "cancelledAt"].every(
      (key) => timestamps[key] === null || validIsoTimestamp(timestamps[key])
    )
  ) {
    throw new Error("The Business Desk provider operation timestamps were invalid.");
  }
  const providerError = value.error;
  if (
    providerError !== null &&
    (!isPlainObject(providerError) ||
      !hasExactKeys(providerError, ["code", "message", "retryable"]) ||
      !validRequiredString(providerError.code, 200) ||
      !validRequiredString(providerError.message, 2_000) ||
      typeof providerError.retryable !== "boolean")
  ) {
    throw new Error("The Business Desk provider operation error was invalid.");
  }
  const credit = value.credit;
  if (
    !isPlainObject(credit) ||
    !hasExactKeys(credit, ["credits", "status"]) ||
    !validSafeInteger(credit.credits) ||
    !CREDIT_STATES.has(credit.status)
  ) {
    throw new Error("The Business Desk provider credit response was invalid.");
  }
  const result = value.result;
  if (
    result !== null &&
    !(
      (value.kind === "expense_receipt_extraction" &&
        validExpenseExtractionResult(result)) ||
      (value.kind === "business_ask" && validBusinessAskResult(result))
    )
  ) {
    throw new Error("The Business Desk provider result was invalid.");
  }
  if (value.state === "succeeded" && result === null) {
    throw new Error("The completed Business Desk provider result was missing.");
  }
  const invalidState = (() => {
    switch (value.state) {
      case "queued":
        return !(
          value.cancellable === true &&
          credit.status === "not_reserved" &&
          providerError === null &&
          result === null &&
          timestamps.processingAt === null &&
          timestamps.completedAt === null &&
          timestamps.cancelledAt === null
        );
      case "processing":
        return !(
          ((credit.status === "not_reserved" && value.cancellable === true) ||
            (credit.status === "reserved" && value.cancellable === false)) &&
          providerError === null &&
          result === null &&
          timestamps.processingAt !== null &&
          timestamps.completedAt === null &&
          timestamps.cancelledAt === null
        );
      case "succeeded":
        return !(
          value.cancellable === false &&
          credit.status === "charged" &&
          providerError === null &&
          result !== null &&
          timestamps.completedAt !== null &&
          timestamps.cancelledAt === null
        );
      case "failed":
        return !(
          value.cancellable === false &&
          ["not_reserved", "refunded"].includes(credit.status) &&
          providerError !== null &&
          result === null &&
          timestamps.completedAt !== null &&
          timestamps.cancelledAt === null
        );
      case "cancelled":
        return !(
          value.cancellable === false &&
          ["not_reserved", "refunded"].includes(credit.status) &&
          providerError === null &&
          result === null &&
          timestamps.completedAt !== null &&
          timestamps.cancelledAt !== null
        );
    }
  })();
  if (invalidState) {
    throw new Error("The Business Desk provider operation state was inconsistent.");
  }
  return value as BusinessDeskProviderOperation<TResult>;
}

function operationPacketFrom<TResult extends BusinessDeskProviderResult>(
  response: unknown,
  expectedKind?: BusinessDeskProviderOperationKind
): BusinessDeskProviderOperationPacket<TResult> {
  const value = envelope(response);
  const operationCandidate =
    isPlainObject(value) && value.operation ? value.operation : value;
  const replay = isPlainObject(value) ? value.idempotentReplay : undefined;
  if (replay !== undefined && typeof replay !== "boolean") {
    throw new Error("The Business Desk provider replay response was invalid.");
  }
  return {
    operation: operationFrom<TResult>(operationCandidate, expectedKind),
    idempotentReplay: typeof replay === "boolean" ? replay : null
  };
}

function unavailableProviderCapabilities(
  code: string | null = "invalid_capability_contract"
): BusinessDeskProviderCapabilities {
  return {
    expenseReceiptExtraction: {
      enabled: false,
      requiresReview: true,
      creditCost: 0,
      code
    },
    businessAsk: {
      enabled: false,
      createsDraftOnly: true,
      creditCost: 0,
      code
    },
    maxAskRecords: 50,
    maxAskDateRangeDays: 366,
    askRecordKinds: [...BUSINESS_ASK_RECORD_KINDS],
    inventorySelection: "explicit_boolean"
  };
}

export async function getBusinessDeskProviderCapabilities(
  workspace: BusinessDeskWorkspace,
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskProviderCapabilities> {
  const response = await apiRequest(`${businessDeskBase(workspace)}/capabilities`, {
    ...(request.signal ? { signal: request.signal } : {})
  });
  const value = envelope(response);
  if (!isPlainObject(value)) {
    throw new Error("The Business Desk capabilities response was invalid.");
  }
  const provider = value.providerOperations;
  if (
    !isPlainObject(provider) ||
    !hasExactKeys(provider, [
      "creditCost",
      "maxAskRecords",
      "maxAskDateRangeDays",
      "askRecordKinds",
      "inventorySelection",
      "operations"
    ]) ||
    !validSafeInteger(provider.creditCost, 1) ||
    !validSafeInteger(provider.maxAskRecords, 1) ||
    !validSafeInteger(provider.maxAskDateRangeDays, 1) ||
    provider.inventorySelection !== "explicit_boolean" ||
    !Array.isArray(provider.askRecordKinds) ||
    provider.askRecordKinds.length > BUSINESS_ASK_RECORD_KINDS.length ||
    new Set(provider.askRecordKinds).size !== provider.askRecordKinds.length ||
    provider.askRecordKinds.some(
      (kind: unknown) => !ASK_RECORD_KIND_SET.has(String(kind))
    ) ||
    !isPlainObject(provider.operations)
  ) {
    return unavailableProviderCapabilities();
  }
  const extraction = provider.operations.expenseReceiptExtraction;
  const businessAsk = provider.operations.businessAsk;
  const extractionValid =
    isPlainObject(extraction) &&
    hasExactKeys(extraction, [
      "enabled",
      "availabilityCode",
      "schemaVersion",
      "promptVersion",
      "requiresReadyProtectedAttachment"
    ]) &&
    typeof extraction.enabled === "boolean" &&
    validRequiredString(extraction.availabilityCode, 200) &&
    validRequiredString(extraction.schemaVersion, 200) &&
    validRequiredString(extraction.promptVersion, 200) &&
    extraction.requiresReadyProtectedAttachment === true;
  const askValid =
    isPlainObject(businessAsk) &&
    hasExactKeys(businessAsk, [
      "enabled",
      "availabilityCode",
      "schemaVersion",
      "promptVersion",
      "savesAssistantDraftOnly",
      "performsActions"
    ]) &&
    typeof businessAsk.enabled === "boolean" &&
    validRequiredString(businessAsk.availabilityCode, 200) &&
    validRequiredString(businessAsk.schemaVersion, 200) &&
    validRequiredString(businessAsk.promptVersion, 200) &&
    businessAsk.savesAssistantDraftOnly === true &&
    businessAsk.performsActions === false;
  const creditCost = Number(provider.creditCost);
  return {
    expenseReceiptExtraction: {
      enabled: extractionValid && extraction.enabled === true,
      requiresReview: true,
      creditCost,
      code:
        extractionValid && extraction.enabled === true
          ? null
          : extractionValid
            ? String(extraction.availabilityCode)
            : "invalid_capability_contract"
    },
    businessAsk: {
      enabled: askValid && businessAsk.enabled === true,
      createsDraftOnly: true,
      creditCost,
      code:
        askValid && businessAsk.enabled === true
          ? null
          : askValid
            ? String(businessAsk.availabilityCode)
            : "invalid_capability_contract"
    },
    maxAskRecords: Number(provider.maxAskRecords),
    maxAskDateRangeDays: Number(provider.maxAskDateRangeDays),
    askRecordKinds: provider.askRecordKinds as BusinessAskRecordKind[],
    inventorySelection: "explicit_boolean"
  };
}

function requireOperationKey(value: string) {
  const key = String(value || "").trim();
  if (!key || key.length > 256) {
    throw new Error("A stable Business Desk provider operation key is required.");
  }
  return key;
}

export async function startExpenseReceiptExtraction(
  workspace: BusinessDeskWorkspace,
  input: { clientOperationKey: string; attachmentId: string },
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskProviderOperationPacket<ExpenseReceiptExtractionResult>> {
  const attachmentId = String(input.attachmentId || "").trim();
  if (!attachmentId) throw new Error("Choose a READY protected receipt first.");
  const response = await apiRequest(
    `${businessDeskBase(workspace)}/provider-operations/extract-receipt`,
    {
      method: "POST",
      body: {
        clientOperationKey: requireOperationKey(input.clientOperationKey),
        attachmentId
      },
      ...(request.signal ? { signal: request.signal } : {})
    }
  );
  return operationPacketFrom<ExpenseReceiptExtractionResult>(
    response,
    "expense_receipt_extraction"
  );
}

export async function startBusinessAsk(
  workspace: BusinessDeskWorkspace,
  input: {
    clientOperationKey: string;
    question: string;
    dateRange: { from: string; to: string };
    recordKinds: BusinessAskRecordKind[];
    includeInventory: boolean;
  },
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskProviderOperationPacket<BusinessAskResult>> {
  const question = String(input.question || "").trim();
  if (!question || question.length > 2_000) {
    throw new Error("Ask one business question using 2,000 characters or fewer.");
  }
  if (!validDate(input.dateRange?.from) || !validDate(input.dateRange?.to)) {
    throw new Error("Choose a valid Business Ask date range.");
  }
  const recordKinds = [...new Set(input.recordKinds || [])];
  if (
    recordKinds.length > BUSINESS_ASK_RECORD_KINDS.length ||
    recordKinds.some((kind) => !ASK_RECORD_KIND_SET.has(kind))
  ) {
    throw new Error("Choose only supported Business Desk source types.");
  }
  if (!recordKinds.length && input.includeInventory !== true) {
    throw new Error("Choose at least one authorized source type.");
  }
  const response = await apiRequest(
    `${businessDeskBase(workspace)}/provider-operations/business-ask`,
    {
      method: "POST",
      body: {
        clientOperationKey: requireOperationKey(input.clientOperationKey),
        question,
        dateRange: input.dateRange,
        recordKinds,
        includeInventory: input.includeInventory === true
      },
      ...(request.signal ? { signal: request.signal } : {})
    }
  );
  return operationPacketFrom<BusinessAskResult>(response, "business_ask");
}

export async function getBusinessDeskProviderOperation<
  TResult extends BusinessDeskProviderResult = BusinessDeskProviderResult
>(
  workspace: BusinessDeskWorkspace,
  operationId: string,
  expectedKind?: BusinessDeskProviderOperationKind,
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskProviderOperationPacket<TResult>> {
  const id = String(operationId || "").trim();
  if (!id) throw new Error("The Business Desk provider operation is missing.");
  const response = await apiRequest(
    `${businessDeskBase(workspace)}/provider-operations/${encodeURIComponent(id)}`,
    request.signal ? { signal: request.signal } : {}
  );
  return operationPacketFrom<TResult>(response, expectedKind);
}

export async function listBusinessDeskProviderOperations<
  TResult extends BusinessDeskProviderResult = BusinessDeskProviderResult
>(
  workspace: BusinessDeskWorkspace,
  options: {
    kind?: BusinessDeskProviderOperationKind;
    state?: BusinessDeskProviderOperationState;
    cursor?: string;
    limit?: number;
  } = {},
  request: BusinessDeskRequestOptions = {}
): Promise<{
  operations: BusinessDeskProviderOperation<TResult>[];
  nextCursor: string | null;
}> {
  const params = new URLSearchParams();
  if (
    options.kind &&
    !["expense_receipt_extraction", "business_ask"].includes(options.kind)
  ) {
    throw new Error("Choose a supported provider-operation kind.");
  }
  if (
    options.state &&
    !["queued", "processing", "succeeded", "failed", "cancelled"].includes(options.state)
  ) {
    throw new Error("Choose a supported provider-operation state.");
  }
  if (options.kind) params.set("kind", options.kind);
  if (options.state) params.set("state", options.state);
  if (options.cursor) params.set("cursor", String(options.cursor));
  const limit = options.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("Provider-operation history limit must be between 1 and 50.");
  }
  params.set("limit", String(limit));
  const response = await apiRequest(
    `${businessDeskBase(workspace)}/provider-operations?${params.toString()}`,
    request.signal ? { signal: request.signal } : {}
  );
  const value = envelope(response);
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, ["operations", "nextCursor"]) ||
    !Array.isArray(value.operations) ||
    value.operations.length > limit ||
    !(value.nextCursor === null || validRequiredString(value.nextCursor, 2_000))
  ) {
    throw new Error("The Business Desk provider-operation history was invalid.");
  }
  return {
    operations: value.operations.map((operation) =>
      operationFrom<TResult>(operation, options.kind)
    ),
    nextCursor: value.nextCursor as string | null
  };
}

export async function getBusinessAskAttestation(
  workspace: BusinessDeskWorkspace,
  operationId: string,
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessAskAttestation> {
  const id = String(operationId || "").trim();
  if (!id) throw new Error("The Business Ask operation is missing.");
  const response = await apiRequest(
    `${businessDeskBase(workspace)}/provider-operations/${encodeURIComponent(
      id
    )}/attestation`,
    request.signal ? { signal: request.signal } : {}
  );
  const value = envelope(response)?.attestation;
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "operationId",
      "kind",
      "state",
      "providerInputDigestSha256",
      "sourceManifestDigestSha256",
      "resultDigestSha256",
      "provider",
      "model",
      "schemaVersion",
      "promptVersion",
      "completedAt",
      "sources"
    ]) ||
    value.operationId !== id ||
    value.kind !== "business_ask" ||
    value.state !== "succeeded" ||
    !validDigest(value.providerInputDigestSha256) ||
    !validDigest(value.sourceManifestDigestSha256) ||
    !validDigest(value.resultDigestSha256) ||
    !validRequiredString(value.provider, 200) ||
    !validRequiredString(value.model, 200) ||
    !validRequiredString(value.schemaVersion, 200) ||
    !validRequiredString(value.promptVersion, 200) ||
    !validIsoTimestamp(value.completedAt) ||
    !Array.isArray(value.sources) ||
    value.sources.length > MAX_RESULT_ARRAY ||
    new Set(value.sources.map((source: unknown) => (source as any)?.id)).size !==
      value.sources.length ||
    !value.sources.every(
      (source: unknown) =>
        isPlainObject(source) &&
        hasExactKeys(source, [
          "id",
          "sourceType",
          "recordId",
          "parentRecordId",
          "recordKind",
          "version",
          "sourceDate"
        ]) &&
        validRequiredString(source.id, 256) &&
        [
          "business_desk_record",
          "business_inventory_item",
          "business_inventory_lot"
        ].includes(source.sourceType) &&
        validRequiredString(source.recordId, 256) &&
        (source.sourceType === "business_inventory_lot"
          ? validRequiredString(source.parentRecordId, 256)
          : source.parentRecordId === null) &&
        validRequiredString(source.recordKind, 200) &&
        (source.sourceType === "business_desk_record"
          ? validSafeInteger(source.version, 1)
          : source.version === null) &&
        validIsoTimestamp(source.sourceDate)
    )
  ) {
    throw new Error("The Business Ask attestation response was invalid.");
  }
  return value as BusinessAskAttestation;
}

export async function cancelBusinessDeskProviderOperation<
  TResult extends BusinessDeskProviderResult = BusinessDeskProviderResult
>(
  workspace: BusinessDeskWorkspace,
  operationId: string,
  input: { expectedVersion: number },
  expectedKind?: BusinessDeskProviderOperationKind,
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskProviderOperationPacket<TResult>> {
  if (!validSafeInteger(input.expectedVersion, 1)) {
    throw new Error("Reload the provider operation before canceling it.");
  }
  const response = await apiRequest(
    `${businessDeskBase(workspace)}/provider-operations/${encodeURIComponent(
      operationId
    )}/cancel`,
    {
      method: "POST",
      body: { expectedVersion: input.expectedVersion },
      ...(request.signal ? { signal: request.signal } : {})
    }
  );
  return operationPacketFrom<TResult>(response, expectedKind);
}

export async function applyExpenseReceiptExtraction(
  workspace: BusinessDeskWorkspace,
  operationId: string,
  input: {
    recordId: string;
    expectedVersion: number;
    idempotencyKey: string;
    reviewedExpense: ReviewedExpenseExtraction;
  },
  request: BusinessDeskRequestOptions = {}
): Promise<AppliedExpenseExtractionPacket> {
  const response = await apiRequest(
    `${businessDeskBase(workspace)}/provider-operations/${encodeURIComponent(
      operationId
    )}/apply`,
    {
      method: "POST",
      body: {
        recordId: String(input.recordId || "").trim(),
        expectedVersion: input.expectedVersion,
        idempotencyKey: requireOperationKey(input.idempotencyKey),
        reviewedExpense: input.reviewedExpense
      },
      ...(request.signal ? { signal: request.signal } : {})
    }
  );
  const value = envelope(response);
  if (
    !isPlainObject(value) ||
    !isPlainObject(value.record) ||
    !validRequiredString(value.record.id || value.record._id, 256) ||
    value.record.kind !== "expense" ||
    !validSafeInteger(value.record.version, 1) ||
    !isPlainObject(value.revision) ||
    typeof value.idempotentReplay !== "boolean"
  ) {
    throw new Error("The applied receipt extraction response was invalid.");
  }
  return {
    operation: operationFrom<ExpenseReceiptExtractionResult>(
      value.operation,
      "expense_receipt_extraction"
    ),
    record: value.record as BusinessDeskRecord,
    revision: value.revision as BusinessDeskRevision,
    idempotentReplay: value.idempotentReplay
  };
}
