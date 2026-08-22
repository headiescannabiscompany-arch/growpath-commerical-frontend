import { apiRequest } from "@/api/apiRequest";

export type InventoryWorkspace = { facilityId?: string | null };

export type BusinessInventoryAlerts = {
  lowStock: boolean;
  outOfStock: boolean;
  held: boolean;
  expiredLots: number;
  expiringSoonLots: number;
  lotQuantityExceedsItem: boolean;
  unallocatedQuantity: number;
  sourceAgeDays: number | null;
};

export type BusinessInventoryItem = {
  id: string;
  _id?: string;
  name: string;
  sku: string;
  quantity: number;
  quantityOnHand?: number;
  unit: string;
  status?: string;
  itemStatus?: string;
  reorderPoint?: number;
  category?: string;
  vendor?: string;
  location?: string;
  locationId?: string | null;
  authorizedUnitCost?: number | null;
  currency?: string;
  sourceFreshnessAt?: string | null;
  importProvenance?: Record<string, unknown> | null;
  alerts?: BusinessInventoryAlerts;
  notes?: string;
  updatedAt?: string;
};

export type BusinessInventoryLot = {
  id: string;
  _id?: string;
  itemId: string;
  lotCode: string;
  batchCode?: string;
  quantityOnHand?: number;
  unit?: string;
  locationId?: string | null;
  status?: string;
  receivedAt?: string | null;
  expiresAt?: string | null;
  authorizedUnitCost?: number | null;
  sourceFreshnessAt?: string | null;
  importProvenance?: Record<string, unknown> | null;
};

export type BusinessInventoryMovement = {
  _id?: string;
  id?: string;
  movementType:
    | "receive"
    | "move"
    | "adjust"
    | "transfer"
    | "hold"
    | "release"
    | "consume";
  quantityDelta?: number;
  quantity?: number;
  reason: string;
  occurredAt?: string;
  lotId?: string | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  actorUserId?: string;
};

export type BusinessInventoryDetail = {
  item: BusinessInventoryItem;
  lots: BusinessInventoryLot[];
  movements: BusinessInventoryMovement[];
  movementPage: BusinessInventoryMovementPage | null;
};

export type BusinessInventoryMovementPage = {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type InventoryImportRecord = {
  id?: string;
  _id?: string;
  sourceName: string;
  sourceDigest: string;
  detectedColumns?: string[];
  previewRows?: Record<string, unknown>[];
  reviewedMapping?: Record<string, string>;
  rowSummary?: {
    total?: number;
    sample?: Record<string, unknown>[];
    existingSkuConflicts?: Array<{ sku?: string; name?: string }>;
    invalidRows?: Array<{ row: number; problems: string[] }>;
    duplicateSourceSkus?: Array<{ sku: string; lotCode?: string; rows: number[] }>;
    locationConflicts?: Array<{
      row: number;
      sku: string;
      lotCode?: string;
      currentLocation: string;
      requestedLocation: string;
      resolution: string;
    }>;
    unitConflicts?: Array<{
      row: number;
      sku: string;
      currentUnit: string;
      requestedUnit: string;
      resolution: string;
    }>;
    closedLotConflicts?: Array<{
      row: number;
      sku: string;
      lotCode: string;
      status: string;
      resolution: string;
    }>;
    reviewedConflictPolicy?: string;
    reviewedQuantityMode?: string;
    requiresReview?: boolean;
    applied?: number;
  };
  status: "preview" | "conflict" | "applying" | "applied" | "rejected";
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  appliedAt?: string | null;
};

export function businessInventoryBase(workspace: InventoryWorkspace = {}) {
  const facilityId = String(workspace.facilityId || "").trim();
  return facilityId
    ? `/api/facility/${encodeURIComponent(facilityId)}/business-inventory`
    : "/api/business-inventory";
}

function itemId(value: { id?: string; _id?: string }) {
  return String(value.id || value._id || "");
}

export async function listBusinessInventory(workspace: InventoryWorkspace = {}) {
  const response = await apiRequest(businessInventoryBase(workspace));
  return (
    Array.isArray(response?.items) ? response.items : []
  ) as BusinessInventoryItem[];
}

export async function getBusinessInventoryItem(
  workspace: InventoryWorkspace,
  id: string,
  options: { movementLimit?: number; movementCursor?: string | null } = {}
): Promise<BusinessInventoryDetail> {
  const params: string[] = [];
  if (Number.isFinite(options.movementLimit) && Number(options.movementLimit) > 0) {
    params.push(`movementLimit=${encodeURIComponent(String(options.movementLimit))}`);
  }
  if (String(options.movementCursor || "").trim()) {
    params.push(
      `movementCursor=${encodeURIComponent(String(options.movementCursor).trim())}`
    );
  }
  const response = await apiRequest(
    `${businessInventoryBase(workspace)}/${encodeURIComponent(id)}${params.length ? `?${params.join("&")}` : ""}`
  );
  return {
    item: response?.item,
    lots: Array.isArray(response?.lots) ? response.lots : [],
    movements: Array.isArray(response?.movements) ? response.movements : [],
    movementPage: response?.movementPage
      ? {
          limit: Number(response.movementPage.limit || 0),
          hasMore: Boolean(response.movementPage.hasMore),
          nextCursor: response.movementPage.nextCursor
            ? String(response.movementPage.nextCursor)
            : null
        }
      : null
  };
}

function movementIdentity(movement: BusinessInventoryMovement) {
  return String(
    movement.id ||
      movement._id ||
      [
        movement.occurredAt,
        movement.movementType,
        movement.reason,
        movement.lotId,
        movement.quantityDelta,
        movement.quantity,
        movement.fromLocationId,
        movement.toLocationId
      ].join("|")
  );
}

export function mergeBusinessInventoryMovements(
  current: BusinessInventoryMovement[],
  older: BusinessInventoryMovement[]
) {
  const merged = new Map<string, BusinessInventoryMovement>();
  [...current, ...older].forEach((movement) => {
    merged.set(movementIdentity(movement), movement);
  });
  return [...merged.values()];
}

export async function createBusinessInventoryLot(
  workspace: InventoryWorkspace,
  id: string,
  input: Record<string, unknown>
) {
  return apiRequest(
    `${businessInventoryBase(workspace)}/${encodeURIComponent(id)}/lots`,
    { method: "POST", body: input }
  );
}

export async function applyBusinessInventoryMovement(
  workspace: InventoryWorkspace,
  id: string,
  input: Omit<BusinessInventoryMovement, "quantityDelta"> & {
    quantity: number;
    adjustment?: number;
    idempotencyKey: string;
  }
) {
  return apiRequest(
    `${businessInventoryBase(workspace)}/${encodeURIComponent(id)}/movements`,
    { method: "POST", body: input }
  );
}

export async function previewBusinessInventoryImport(
  workspace: InventoryWorkspace,
  input: {
    sourceName: string;
    rows: Record<string, string>[];
    mapping?: Record<string, string>;
  }
) {
  const response = await apiRequest(
    `${businessInventoryBase(workspace)}/imports/preview`,
    {
      method: "POST",
      body: input
    }
  );
  return response?.import as InventoryImportRecord;
}

export async function reviewBusinessInventoryImport(
  workspace: InventoryWorkspace,
  record: InventoryImportRecord,
  input: {
    conflictPolicy: "skip_existing" | "update_fields";
    quantityMode: "receive" | "set_on_hand";
    mapping?: Record<string, string>;
  }
) {
  const id = itemId(record);
  const response = await apiRequest(
    `${businessInventoryBase(workspace)}/imports/${encodeURIComponent(id)}/review`,
    { method: "PATCH", body: input }
  );
  return response?.import as InventoryImportRecord;
}

export async function applyBusinessInventoryImport(
  workspace: InventoryWorkspace,
  record: InventoryImportRecord
) {
  const id = itemId(record);
  return apiRequest(
    `${businessInventoryBase(workspace)}/imports/${encodeURIComponent(id)}/apply`,
    { method: "POST" }
  );
}

export async function listBusinessInventoryImports(workspace: InventoryWorkspace = {}) {
  const response = await apiRequest(`${businessInventoryBase(workspace)}/imports`);
  return (
    Array.isArray(response?.imports) ? response.imports : []
  ) as InventoryImportRecord[];
}

export async function getBusinessInventoryImport(
  workspace: InventoryWorkspace,
  id: string
) {
  const response = await apiRequest(
    `${businessInventoryBase(workspace)}/imports/${encodeURIComponent(id)}`
  );
  return response?.import as InventoryImportRecord;
}

export async function withdrawBusinessInventoryImport(
  workspace: InventoryWorkspace,
  record: InventoryImportRecord
) {
  const id = itemId(record);
  const response = await apiRequest(
    `${businessInventoryBase(workspace)}/imports/${encodeURIComponent(id)}/withdraw`,
    { method: "POST" }
  );
  return response?.import as InventoryImportRecord;
}

export async function getBusinessInventoryAuditCsv(workspace: InventoryWorkspace = {}) {
  const response = await apiRequest(
    `${businessInventoryBase(workspace)}/exports/audit.csv`,
    { method: "GET", responseType: "text" }
  );
  if (typeof response !== "string" || !response.trim()) {
    throw new Error("The inventory audit export was empty or invalid.");
  }
  return response;
}
