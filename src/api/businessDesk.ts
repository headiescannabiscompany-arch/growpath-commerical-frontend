import { apiRequest } from "@/api/apiRequest";
import { loadAllBusinessDeskPages } from "@/api/businessDeskPagination";

export type CommercialBusinessDeskWorkspace = { workspaceType: "commercial" };
export type FacilityBusinessDeskWorkspace = {
  workspaceType: "facility";
  facilityId: string;
};
export type BusinessDeskWorkspace =
  | CommercialBusinessDeskWorkspace
  | FacilityBusinessDeskWorkspace;

export type BusinessDeskRequestOptions = { signal?: AbortSignal };

export const COMMERCIAL_BUSINESS_DESK_WORKSPACE = {
  workspaceType: "commercial"
} as const satisfies BusinessDeskWorkspace;

const FACILITY_ID_MAX_LENGTH = 128;

function normalizedFacilityId(value: unknown) {
  const facilityId = typeof value === "string" ? value.trim() : "";
  const hasControlCharacter = Array.from(facilityId).some((character) => {
    const codePoint = character.charCodeAt(0);
    return codePoint < 32 || codePoint === 127;
  });
  if (!facilityId || facilityId.length > FACILITY_ID_MAX_LENGTH || hasControlCharacter) {
    return null;
  }
  return facilityId;
}

export function resolveFacilityBusinessDeskWorkspace(
  facilityId: unknown
): FacilityBusinessDeskWorkspace | null {
  const normalized = normalizedFacilityId(facilityId);
  return normalized ? { workspaceType: "facility", facilityId: normalized } : null;
}

export function requireBusinessDeskWorkspace(
  workspace: BusinessDeskWorkspace | null | undefined
): BusinessDeskWorkspace {
  if (workspace?.workspaceType === "commercial") {
    return COMMERCIAL_BUSINESS_DESK_WORKSPACE;
  }
  if (workspace?.workspaceType === "facility") {
    const facilityId = normalizedFacilityId(workspace.facilityId);
    if (facilityId) return { workspaceType: "facility", facilityId };
  }
  throw new Error(
    "Select an authorized workspace before using the Business Desk. No Commercial fallback was used."
  );
}

export function businessDeskWorkspaceKey(
  workspace: BusinessDeskWorkspace | null | undefined
) {
  const resolved = requireBusinessDeskWorkspace(workspace);
  return resolved.workspaceType === "commercial"
    ? "commercial"
    : `facility:${resolved.facilityId}`;
}

export type BusinessDeskRecordKind =
  | "price_margin_scenario"
  | "quote"
  | "lead"
  | "job"
  | "expense"
  | "vendor_comparison"
  | "cash_flow_snapshot"
  | "assistant_draft";

export type BusinessDeskRecord = {
  id?: string;
  _id?: string;
  kind: BusinessDeskRecordKind;
  title: string;
  status: string;
  version: number;
  payload: Record<string, unknown>;
  totals?: BusinessDeskRecordTotals;
  sourceLinks?: Array<Record<string, unknown>>;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BusinessDeskRevision = {
  id?: string;
  _id?: string;
  recordId: string;
  version?: number;
  revisionNumber?: number;
  operation?:
    | "create"
    | "update"
    | "archive"
    | "quote_copy_prepared"
    | "quote_export_prepared";
  stateMutation?: boolean;
  snapshot?: Record<string, unknown>;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown>;
  actorUserId?: string;
  createdAt?: string;
};

export type BusinessDeskRecordTotals = {
  calculator: "price_margin" | "quote" | "vendor" | "cash_flow" | "none";
  currency?: string;
  minorUnitDigits?: number | null;
  subtotalMinor?: number | null;
  discountMinor?: number | null;
  customerShippingMinor?: number | null;
  taxMinor?: number | null;
  totalMinor?: number | null;
  depositDueMinor?: number | null;
  balanceAfterDepositMinor?: number | null;
  directCostMinor?: number | null;
  businessFeesMinor?: number | null;
  shippingCostMinor?: number | null;
  knownCostMinor?: number | null;
  grossProfitMinor?: number | null;
  marginBasisPoints?: number | null;
  markupBasisPoints?: number | null;
  scenarioQuantityMicros?: number | null;
  unitPriceMinor?: number | null;
  unitDirectCostMinor?: number | null;
  lineRevenueMinor?: number | null;
  discountPercentMinor?: number | null;
  discountFixedAppliedMinor?: number | null;
  discountedSubtotalMinor?: number | null;
  customerRevenueBeforeTaxMinor?: number | null;
  fixedCostsMinor?: number | null;
  contributionMinor?: number | null;
  breakEvenSalesScenarios?: number | null;
  breakEvenQuantityMicros?: number | null;
  breakEvenRevenueMinor?: number | null;
  breakEvenReason?: string;
  targetMarginBasisPoints?: number | null;
  desiredUnitPriceMinor?: number | null;
  desiredMarginReason?: string;
  complete?: boolean;
  incompleteReasons?: string[];
  formulaVersion?: string;
  roundingRule?: string;
  calculatedAt?: string;
  inputDigestSha256?: string;
  inputSnapshotJson?: string;
  missingInputs?: string[];
};

export type BusinessDeskDiscount = {
  order: "percent_then_fixed";
  percentBasisPoints: number;
  fixedMinor: number;
};

export type BusinessDeskTax =
  | { type: "none" }
  | { type: "fixed"; amountMinor: number; currency?: string }
  | {
      type: "percent";
      basisPoints: number;
      base: "discounted_subtotal" | "discounted_subtotal_plus_shipping";
      currency?: string;
    };

export type PriceMarginCalculationInput = {
  calculator: "price_margin";
  currency: string;
  minorUnitDigits: number;
  unitPriceMinor: number;
  quantityMicros: number;
  unitDirectCostMinor: number | null;
  businessFeesMinor?: number;
  shippingCostMinor?: number;
  customerShippingMinor?: number;
  fixedCostsMinor?: number;
  targetMarginBasisPoints?: number;
  discount?: BusinessDeskDiscount;
  tax?: BusinessDeskTax;
};

export type PriceMarginScenarioPayload = Omit<
  PriceMarginCalculationInput,
  "calculator" | "targetMarginBasisPoints"
> & {
  discount: BusinessDeskDiscount;
  tax: BusinessDeskTax;
  businessFeesMinor: number;
  shippingCostMinor: number;
  customerShippingMinor: number;
  fixedCostsMinor: number;
  targetMarginBasisPoints: number | null;
  notes: string;
};

export type PriceMarginTotals = {
  quantityMicros: number;
  unitPriceMinor: number;
  lineRevenueMinor: number;
  discount: BusinessDeskDiscount & {
    percentMinor: number;
    totalMinor: number;
    discountedSubtotalMinor: number;
  };
  customerShippingMinor: number;
  tax: BusinessDeskTax & { amountMinor: number; basisPoints?: number; base?: string };
  customerRevenueBeforeTaxMinor: number;
  totalMinor: number;
  unitDirectCostMinor: number | null;
  directCostMinor: number | null;
  businessFeesMinor: number;
  shippingCostMinor: number;
  knownCostMinor: number | null;
  grossProfitMinor: number | null;
  marginBasisPoints: number | null;
  markupBasisPoints: number | null;
  complete: boolean;
  incompleteReasons: string[];
};

export type PriceMarginCalculationResult = {
  calculator: "price_margin";
  currency: string;
  minorUnitDigits: number;
  quantityScale: number;
  basisPointScale: number;
  totals: PriceMarginTotals;
  breakEven: {
    salesScenarios: number | null;
    quantityMicros: number | null;
    revenueMinor: number | null;
    contributionMinor?: number | null;
    reason: string | null;
  };
  desiredMargin: {
    targetMarginBasisPoints: number | null;
    desiredUnitPriceMinor: number | null;
    reason: string | null;
  };
};

export type QuoteLineCategory =
  | "product"
  | "material"
  | "service"
  | "labor"
  | "shipping"
  | "fee"
  | "other";

export type QuoteLineInput = {
  kind: QuoteLineCategory;
  description: string;
  quantityMicros: number;
  unitPriceMinor: number;
  unitDirectCostMinor: number | null;
  currency: string;
};

export type QuoteDeposit =
  | { type: "none" }
  | { type: "fixed"; amountMinor: number }
  | { type: "percent"; basisPoints: number };

export type QuoteCalculationInput = {
  calculator: "quote";
  currency: string;
  minorUnitDigits: number;
  lineItems: QuoteLineInput[];
  discount: BusinessDeskDiscount & { currency?: string };
  customerShippingMinor: number;
  tax: BusinessDeskTax;
  businessFeesMinor: number;
  shippingCostMinor: number;
  deposit: QuoteDeposit;
};

export type QuoteCalculationResult = {
  calculator: "quote";
  currency: string;
  minorUnitDigits: number;
  quantityScale: number;
  basisPointScale: number;
  lineItems: Array<{
    quantityMicros: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
    unitDirectCostMinor: number | null;
    lineDirectCostMinor: number | null;
  }>;
  totals: {
    subtotalMinor: number;
    discount: BusinessDeskDiscount & {
      percentMinor: number;
      totalMinor: number;
      discountedSubtotalMinor: number;
    };
    customerShippingMinor: number;
    tax: BusinessDeskTax & { amountMinor: number; basisPoints?: number; base?: string };
    totalMinor: number;
    depositDueMinor: number;
    balanceAfterDepositMinor: number;
    directCostMinor: number | null;
    businessFeesMinor: number;
    shippingCostMinor: number;
    knownCostMinor: number | null;
    grossProfitMinor: number | null;
    marginBasisPoints: number | null;
    markupBasisPoints: number | null;
    complete: boolean;
    incompleteReasons: string[];
  };
};

export type QuoteRecordPayload = Omit<QuoteCalculationInput, "calculator"> & {
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
  };
  project: string;
  quoteNumber: string;
  expiresAt: string | null;
  scope: string;
  customerNotes: string;
  terms: string;
  assumptions: string;
  exclusions: string;
  internalNotes: string;
};

export type QuotePreparedArtifact = {
  mode: "copy" | "csv";
  contentType: string;
  filename: string;
  content: string;
  preparedFromVersion: number;
  checksumSha256: string;
  deliveryStatus: "not_observed";
};

export type ExpenseBatchSelection = {
  recordId: string;
  expectedVersion: number;
};

export type ExpenseBatchRecordPin = {
  recordId: string;
  recordKind: "expense";
  version: number;
  snapshotDigest: string;
};

export type ExpenseBatchPreparedArtifact = {
  mode: "csv";
  contentType: "text/csv; charset=utf-8";
  filename: string;
  content: string;
  checksumSha256: string;
  rowCount: number;
  recordCount: number;
  deliveryStatus: "not_observed";
};

export type ExpenseBatchPreparedPacket = {
  artifact: ExpenseBatchPreparedArtifact;
  recordPins: ExpenseBatchRecordPin[];
  receipt: {
    id?: string;
    _id?: string;
    exportKind: "expense_csv_batch";
    recordPins: ExpenseBatchRecordPin[];
    preparedArtifact: ExpenseBatchPreparedArtifact;
  };
  idempotentReplay: boolean;
};

export type BusinessDeskRecordListOptions = {
  kind?: BusinessDeskRecordKind;
  status?: string;
  includeArchived?: boolean;
};

export type BusinessDeskRecordPageOptions = BusinessDeskRecordListOptions & {
  cursor?: string;
  limit?: number;
};

export type BusinessDeskRecordPage = {
  records: BusinessDeskRecord[];
  page: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export type BusinessDeskTransitionEvidence =
  | {
      orderOrigin: "external_provider" | "manual_off_platform";
      externalOrderReference?: string;
    }
  | { inventoryReceiptMovementId: string };

export const BUSINESS_DESK_PAGE_SIZE = 100;
export const BUSINESS_DESK_MAX_LOAD_ALL_RECORDS = 5_000;

export type BusinessDeskCalculationInput =
  | PriceMarginCalculationInput
  | QuoteCalculationInput
  | {
      calculator: "vendor" | "cash_flow";
      currency: string;
      minorUnitDigits: number;
      [key: string]: unknown;
    };

export function businessDeskBase(workspace: BusinessDeskWorkspace) {
  const resolved = requireBusinessDeskWorkspace(workspace);
  return resolved.workspaceType === "facility"
    ? `/api/facility/${encodeURIComponent(resolved.facilityId)}/business-desk`
    : "/api/business-desk";
}

function envelope(response: any) {
  return response?.data && typeof response.data === "object" ? response.data : response;
}

function recordFrom(response: any): BusinessDeskRecord {
  const value = envelope(response)?.record;
  if (!value || typeof value !== "object") {
    throw new Error("The Business Desk record response was invalid.");
  }
  return value as BusinessDeskRecord;
}

export async function calculateBusinessDesk<TResult>(
  workspace: BusinessDeskWorkspace,
  input: BusinessDeskCalculationInput,
  request: BusinessDeskRequestOptions = {}
): Promise<TResult> {
  const response = await apiRequest(`${businessDeskBase(workspace)}/calculate`, {
    method: "POST",
    body: input,
    ...(request.signal ? { signal: request.signal } : {})
  });
  const result = envelope(response);
  if (!result || typeof result !== "object" || result.calculator !== input.calculator) {
    throw new Error("The Business Desk calculation response was invalid.");
  }
  return result as TResult;
}

function businessDeskRecordPageFrom(response: unknown): BusinessDeskRecordPage {
  const value = envelope(response);
  const records = value?.records;
  const page = value?.page;
  if (
    !Array.isArray(records) ||
    records.some(
      (record) =>
        !record ||
        typeof record !== "object" ||
        !String(
          (record as BusinessDeskRecord).id || (record as BusinessDeskRecord)._id || ""
        ).trim()
    ) ||
    !page ||
    typeof page !== "object" ||
    !Number.isSafeInteger(page.limit) ||
    page.limit < 1 ||
    page.limit > BUSINESS_DESK_PAGE_SIZE ||
    records.length > page.limit ||
    typeof page.hasMore !== "boolean" ||
    (page.hasMore && (typeof page.nextCursor !== "string" || !page.nextCursor.trim())) ||
    (!page.hasMore && page.nextCursor !== null)
  ) {
    throw new Error("The Business Desk page response was invalid.");
  }
  return { records: records as BusinessDeskRecord[], page } as BusinessDeskRecordPage;
}

export async function listBusinessDeskRecordPage(
  workspace: BusinessDeskWorkspace,
  options: BusinessDeskRecordPageOptions = {},
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskRecordPage> {
  const limit = options.limit ?? BUSINESS_DESK_PAGE_SIZE;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > BUSINESS_DESK_PAGE_SIZE) {
    throw new Error(
      `Business Desk page size must be between 1 and ${BUSINESS_DESK_PAGE_SIZE}.`
    );
  }
  const params = new URLSearchParams();
  if (options.kind) params.set("kind", options.kind);
  if (options.status) params.set("status", options.status);
  if (options.includeArchived) params.set("includeArchived", "true");
  params.set("limit", String(limit));
  if (options.cursor) params.set("cursor", options.cursor);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const url = `${businessDeskBase(workspace)}${suffix}`;
  const response = request.signal
    ? await apiRequest(url, { signal: request.signal })
    : await apiRequest(url);
  return businessDeskRecordPageFrom(response);
}

export async function listBusinessDeskRecords(
  workspace: BusinessDeskWorkspace,
  options: BusinessDeskRecordListOptions = {},
  request: BusinessDeskRequestOptions = {}
) {
  return loadAllBusinessDeskPages(
    (cursor) =>
      listBusinessDeskRecordPage(
        workspace,
        { ...options, limit: BUSINESS_DESK_PAGE_SIZE, ...(cursor ? { cursor } : {}) },
        request
      ),
    {
      maxRecords: BUSINESS_DESK_MAX_LOAD_ALL_RECORDS,
      recordKey: (record) => String(record.id || record._id || "")
    }
  );
}

export async function createBusinessDeskRecord(
  workspace: BusinessDeskWorkspace,
  input: {
    kind: BusinessDeskRecordKind;
    title: string;
    status?: string;
    payload: Record<string, unknown>;
    sourceLinks?: Array<Record<string, unknown>>;
    idempotencyKey: string;
  },
  request: BusinessDeskRequestOptions = {}
) {
  return recordFrom(
    await apiRequest(businessDeskBase(workspace), {
      method: "POST",
      body: input,
      ...(request.signal ? { signal: request.signal } : {})
    })
  );
}

export async function getBusinessDeskRecord(
  workspace: BusinessDeskWorkspace,
  recordId: string,
  request: BusinessDeskRequestOptions = {}
) {
  return recordFrom(
    request.signal
      ? await apiRequest(
          `${businessDeskBase(workspace)}/${encodeURIComponent(recordId)}`,
          { signal: request.signal }
        )
      : await apiRequest(`${businessDeskBase(workspace)}/${encodeURIComponent(recordId)}`)
  );
}

export async function updateBusinessDeskRecord(
  workspace: BusinessDeskWorkspace,
  recordId: string,
  input: {
    expectedVersion: number;
    title?: string;
    status?: string;
    payload?: Record<string, unknown>;
    sourceLinks?: Array<Record<string, unknown>>;
    transitionEvidence?: BusinessDeskTransitionEvidence;
    idempotencyKey: string;
  },
  request: BusinessDeskRequestOptions = {}
) {
  return recordFrom(
    await apiRequest(`${businessDeskBase(workspace)}/${encodeURIComponent(recordId)}`, {
      method: "PATCH",
      body: input,
      ...(request.signal ? { signal: request.signal } : {})
    })
  );
}

export async function archiveBusinessDeskRecord(
  workspace: BusinessDeskWorkspace,
  recordId: string,
  input: { expectedVersion: number; reason: string; idempotencyKey: string },
  request: BusinessDeskRequestOptions = {}
) {
  return recordFrom(
    await apiRequest(
      `${businessDeskBase(workspace)}/${encodeURIComponent(recordId)}/archive`,
      {
        method: "POST",
        body: input,
        ...(request.signal ? { signal: request.signal } : {})
      }
    )
  );
}

export async function listBusinessDeskRevisions(
  workspace: BusinessDeskWorkspace,
  recordId: string,
  request: BusinessDeskRequestOptions = {}
) {
  const url = `${businessDeskBase(workspace)}/${encodeURIComponent(recordId)}/revisions`;
  const response = request.signal
    ? await apiRequest(url, { signal: request.signal })
    : await apiRequest(url);
  const revisions = envelope(response)?.revisions;
  return (Array.isArray(revisions) ? revisions : []) as BusinessDeskRevision[];
}

export async function getBusinessDeskRevision(
  workspace: BusinessDeskWorkspace,
  recordId: string,
  revisionNumber: number,
  request: BusinessDeskRequestOptions = {}
) {
  const normalizedRecordId = String(recordId || "").trim();
  if (
    !normalizedRecordId ||
    !Number.isSafeInteger(revisionNumber) ||
    revisionNumber < 1
  ) {
    throw new Error("Choose an exact Business Desk record revision.");
  }
  const url = `${businessDeskBase(workspace)}/${encodeURIComponent(
    normalizedRecordId
  )}/revisions/${revisionNumber}`;
  const response = request.signal
    ? await apiRequest(url, { signal: request.signal })
    : await apiRequest(url);
  const revision = envelope(response)?.revision;
  const returnedVersion = Number(revision?.revisionNumber ?? revision?.version);
  if (
    !revision ||
    typeof revision !== "object" ||
    String(revision.recordId || "") !== normalizedRecordId ||
    returnedVersion !== revisionNumber
  ) {
    throw new Error("The exact Business Desk revision response was invalid.");
  }
  return revision as BusinessDeskRevision;
}

function normalizedExpenseBatchSelection(records: ExpenseBatchSelection[]) {
  if (!Array.isArray(records) || records.length < 1 || records.length > 100) {
    throw new Error("Choose between 1 and 100 reviewed Expense revisions to export.");
  }
  const normalized = records
    .map((record) => ({
      recordId: String(record?.recordId || "")
        .trim()
        .toLowerCase(),
      expectedVersion: Number(record?.expectedVersion)
    }))
    .sort((left, right) => left.recordId.localeCompare(right.recordId));
  if (
    normalized.some(
      (record) =>
        !/^[a-f0-9]{24}$/.test(record.recordId) ||
        !Number.isSafeInteger(record.expectedVersion) ||
        record.expectedVersion < 1
    ) ||
    new Set(normalized.map((record) => record.recordId)).size !== normalized.length
  ) {
    throw new Error("Every Expense export selection must be a unique saved revision.");
  }
  return normalized;
}

function expenseBatchPacketFrom(
  response: unknown,
  selected: ExpenseBatchSelection[]
): ExpenseBatchPreparedPacket {
  const value = envelope(response);
  const artifact = value?.artifact;
  const pins = value?.recordPins;
  const receipt = value?.receipt;
  const expected = new Map(
    selected.map((record) => [record.recordId, record.expectedVersion])
  );
  const validRecordPins = (candidate: unknown) =>
    Array.isArray(candidate) &&
    candidate.length === selected.length &&
    new Set(candidate.map((pin) => String(pin?.recordId || "").toLowerCase())).size ===
      selected.length &&
    candidate.every(
      (pin) =>
        pin &&
        typeof pin === "object" &&
        expected.get(String(pin.recordId || "").toLowerCase()) === pin.version &&
        pin.recordKind === "expense" &&
        /^[a-f0-9]{64}$/.test(String(pin.snapshotDigest || ""))
    );
  if (
    !artifact ||
    typeof artifact !== "object" ||
    artifact.mode !== "csv" ||
    artifact.contentType !== "text/csv; charset=utf-8" ||
    typeof artifact.filename !== "string" ||
    !artifact.filename.toLowerCase().endsWith(".csv") ||
    typeof artifact.content !== "string" ||
    artifact.content.length < 1 ||
    artifact.content.length > 150_000 ||
    !/^[a-f0-9]{64}$/.test(String(artifact.checksumSha256 || "")) ||
    !Number.isSafeInteger(artifact.rowCount) ||
    artifact.rowCount < 1 ||
    artifact.rowCount > 30_000 ||
    artifact.recordCount !== selected.length ||
    artifact.deliveryStatus !== "not_observed" ||
    !validRecordPins(pins) ||
    !receipt ||
    typeof receipt !== "object" ||
    !String(receipt.id || receipt._id || "").trim() ||
    receipt.exportKind !== "expense_csv_batch" ||
    !validRecordPins(receipt.recordPins) ||
    receipt.preparedArtifact?.checksumSha256 !== artifact.checksumSha256 ||
    receipt.preparedArtifact?.recordCount !== selected.length ||
    receipt.preparedArtifact?.deliveryStatus !== "not_observed" ||
    typeof value?.idempotentReplay !== "boolean"
  ) {
    throw new Error("The prepared Expense export response was invalid.");
  }
  return value as ExpenseBatchPreparedPacket;
}

export async function prepareBusinessDeskExpenseBatchCsv(
  workspace: BusinessDeskWorkspace,
  input: {
    records: ExpenseBatchSelection[];
    idempotencyKey: string;
  },
  request: BusinessDeskRequestOptions = {}
): Promise<ExpenseBatchPreparedPacket> {
  const records = normalizedExpenseBatchSelection(input.records);
  const response = await apiRequest(
    `${businessDeskBase(workspace)}/exports/expenses/prepare-csv`,
    {
      method: "POST",
      body: { records, idempotencyKey: input.idempotencyKey },
      ...(request.signal ? { signal: request.signal } : {})
    }
  );
  return expenseBatchPacketFrom(response, records);
}

export async function prepareBusinessDeskQuoteArtifact(
  workspace: BusinessDeskWorkspace,
  recordId: string,
  input: {
    expectedVersion: number;
    mode: "copy" | "csv";
    idempotencyKey: string;
  },
  request: BusinessDeskRequestOptions = {}
): Promise<QuotePreparedArtifact> {
  const response = await apiRequest(
    `${businessDeskBase(workspace)}/${encodeURIComponent(recordId)}/prepare-artifact`,
    {
      method: "POST",
      body: input,
      ...(request.signal ? { signal: request.signal } : {})
    }
  );
  const data = envelope(response);
  const artifact = data?.artifact;
  const revision = data?.revision;
  const expectedOperation =
    input.mode === "csv" ? "quote_export_prepared" : "quote_copy_prepared";
  const expectedContentType =
    input.mode === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8";
  if (
    !artifact ||
    typeof artifact !== "object" ||
    artifact.mode !== input.mode ||
    artifact.preparedFromVersion !== input.expectedVersion ||
    artifact.contentType !== expectedContentType ||
    typeof artifact.filename !== "string" ||
    (input.mode === "csv" && !artifact.filename.toLowerCase().endsWith(".csv")) ||
    typeof artifact.content !== "string" ||
    artifact.content.length === 0 ||
    !/^[a-f0-9]{64}$/.test(String(artifact.checksumSha256 || "")) ||
    artifact.deliveryStatus !== "not_observed" ||
    !revision ||
    typeof revision !== "object" ||
    revision.operation !== expectedOperation ||
    revision.revisionNumber !== input.expectedVersion ||
    revision.stateMutation !== false
  ) {
    throw new Error("The prepared quote artifact response was invalid.");
  }
  return artifact as QuotePreparedArtifact;
}
