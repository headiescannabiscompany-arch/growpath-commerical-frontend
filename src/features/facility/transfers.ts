export type FacilityTransferStatus =
  | "draft"
  | "approved"
  | "shipped"
  | "delivered"
  | "cancelled";

export type FacilityTransfer = {
  id?: string;
  _id?: string;
  facilityId: string;
  orderType: "licensed_cannabis_transfer";
  status: FacilityTransferStatus;
  inventoryItemId: string;
  itemName: string;
  lotNumber?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  recipientName: string;
  recipientLicense: string;
  recipientLicenseType?: string;
  recipientState: string;
  destinationAddress?: string;
  manifestNumber?: string;
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
  inventoryMovementStatus?: "not_required" | "pending" | "applied";
  inventoryMovementId?: string;
  auditEvents?: Array<{
    action: string;
    actorUserId?: string;
    actorRole?: string;
    at: string;
    fromStatus?: string;
    toStatus?: string;
  }>;
  createdAt?: string;
};

export function normalizeFacilityTransfers(payload: any, facilityId: string) {
  const rows = Array.isArray(payload)
    ? payload
    : payload?.orders || payload?.items || payload?.data?.orders || payload?.data || [];
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row) =>
      row?.orderType === "licensed_cannabis_transfer" &&
      String(row?.facilityId || "") === String(facilityId)
  ) as FacilityTransfer[];
}

export function transferTotal(quantity: number, unitPrice: number) {
  const value = Number(quantity) * Number(unitPrice);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

export function validateFacilityTransfer(input: Partial<FacilityTransfer>) {
  const errors: string[] = [];
  if (!input.inventoryItemId) errors.push("Select an inventory lot.");
  if (!(Number(input.quantity) > 0)) errors.push("Quantity must be greater than zero.");
  if (!(Number(input.unitPrice) >= 0)) errors.push("Enter a valid unit price.");
  if (!input.recipientName?.trim()) errors.push("Recipient business is required.");
  if (!input.recipientLicense?.trim()) errors.push("Recipient license is required.");
  if (!input.recipientState?.trim()) errors.push("Recipient jurisdiction is required.");
  return errors;
}

export function canManageFacilityTransfers(role?: string | null) {
  return ["OWNER", "MANAGER"].includes(String(role || "").toUpperCase());
}

export function canShipFacilityTransfers(role?: string | null) {
  return ["OWNER", "MANAGER", "STAFF"].includes(String(role || "").toUpperCase());
}
