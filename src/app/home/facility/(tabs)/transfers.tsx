import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import {
  createFacilityTransfer,
  listFacilityTransfers,
  updateFacilityTransfer
} from "@/api/facilityTransfers";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useEntitlements } from "@/entitlements";
import {
  canManageFacilityTransfers,
  canShipFacilityTransfers,
  transferTotal,
  validateFacilityTransfer,
  type FacilityTransfer,
  type FacilityTransferStatus
} from "@/features/facility/transfers";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

type InventoryItem = {
  id?: string;
  _id?: string;
  name?: string;
  sku?: string;
  lotNumber?: string;
  batchNumber?: string;
  quantity?: number;
  quantityOnHand?: number;
  unit?: string;
};

const emptyForm = {
  inventoryItemId: "",
  quantity: "",
  unitPrice: "",
  recipientName: "",
  recipientLicense: "",
  recipientLicenseType: "Dispensary",
  recipientState: "",
  destinationAddress: "",
  manifestNumber: "",
  carrier: "",
  trackingNumber: "",
  notes: ""
};

function rows(payload: any): InventoryItem[] {
  const value = payload?.items || payload?.inventory || payload?.data?.items || payload;
  return Array.isArray(value) ? value : [];
}

function idOf(value: any) {
  return String(value?.id || value?._id || "");
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value || 0)
  );
}

export default function FacilityTransfersScreen() {
  const { selectedId: facilityId } = useFacility();
  const ent = useEntitlements();
  const role = String(ent.facilityRole || "VIEWER").toUpperCase();
  const canManage = canManageFacilityTransfers(role);
  const canShip = canShipFacilityTransfers(role);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transfers, setTransfers] = useState<FacilityTransfer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const [inventory, transferRows] = await Promise.all([
        apiRequest(endpoints.inventory(facilityId)),
        listFacilityTransfers(facilityId)
      ]);
      setItems(rows(inventory));
      setTransfers(transferRows);
    } catch (e: any) {
      setError({ title: "Unable to load sales", message: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = items.find((item) => idOf(item) === form.inventoryItemId);
  const quantity = Number(form.quantity || 0);
  const unitPrice = Number(form.unitPrice || 0);
  const total = transferTotal(quantity, unitPrice);
  const shippedRevenue = useMemo(
    () =>
      transfers
        .filter((row) => ["shipped", "delivered"].includes(row.status))
        .reduce((sum, row) => sum + Number(row.total || 0), 0),
    [transfers]
  );

  const create = async () => {
    if (!facilityId || !selected) return;
    const payload: FacilityTransfer = {
      facilityId,
      orderType: "licensed_cannabis_transfer",
      status: "draft",
      inventoryItemId: idOf(selected),
      itemName: selected.name || selected.sku || "Cannabis inventory lot",
      lotNumber: selected.lotNumber || selected.batchNumber || selected.sku,
      quantity,
      unit: selected.unit || "units",
      unitPrice,
      total,
      recipientName: form.recipientName.trim(),
      recipientLicense: form.recipientLicense.trim(),
      recipientLicenseType: form.recipientLicenseType.trim(),
      recipientState: form.recipientState.trim(),
      destinationAddress: form.destinationAddress.trim(),
      manifestNumber: form.manifestNumber.trim(),
      carrier: form.carrier.trim(),
      trackingNumber: form.trackingNumber.trim(),
      notes: form.notes.trim()
    };
    const validation = validateFacilityTransfer(payload);
    const available = Number(selected.quantity ?? selected.quantityOnHand ?? 0);
    if (quantity > available)
      validation.push(`Only ${available} ${payload.unit} are on hand.`);
    if (validation.length) {
      Alert.alert("Complete the transfer", validation.join("\n"));
      return;
    }
    setSaving(true);
    try {
      await createFacilityTransfer(payload);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (e: any) {
      Alert.alert("Transfer not saved", e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (
    transfer: FacilityTransfer,
    status: FacilityTransferStatus
  ) => {
    const transferId = idOf(transfer);
    if (!transferId || !facilityId) return;
    setSaving(true);
    try {
      const timestamps =
        status === "shipped"
          ? { shippedAt: new Date().toISOString() }
          : status === "delivered"
            ? { deliveredAt: new Date().toISOString() }
            : {};
      await updateFacilityTransfer(transferId, { status, ...timestamps });
      if (status === "shipped" && transfer.status !== "shipped") {
        await apiRequest(
          endpoints.inventoryAdjust(facilityId, transfer.inventoryItemId),
          {
            method: "POST",
            body: {
              delta: -Number(transfer.quantity),
              reason: `Licensed transfer ${transfer.manifestNumber || transferId}`
            }
          }
        );
      }
      await load();
    } catch (e: any) {
      Alert.alert("Status not updated", e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenBoundary
        title="Sales & Transfers"
        showBack
        backFallbackHref="/home/facility/dashboard"
      >
        <ActivityIndicator style={{ marginTop: 40 }} />
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title="Sales & Transfers"
      showBack
      backFallbackHref="/home/facility/dashboard"
    >
      <ScrollView contentContainerStyle={styles.page}>
        <InlineError error={error} />
        <Text style={styles.h1}>Licensed sales & transfers</Text>
        <Text style={styles.lead}>
          Track cannabis inventory sold or shipped to licensed commercial recipients. The
          public storefront remains a catalog and inquiry surface—there is no public
          cannabis checkout.
        </Text>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Verification stays with your facility</Text>
          <Text style={styles.noticeText}>
            Record the recipient license and required manifest. GrowPath stores the
            workflow; it does not determine whether a transfer is permitted in your
            jurisdiction.
          </Text>
        </View>
        <View style={styles.metrics}>
          <View>
            <Text style={styles.metric}>{transfers.length}</Text>
            <Text>records</Text>
          </View>
          <View>
            <Text style={styles.metric}>
              {transfers.filter((x) => x.status === "draft").length}
            </Text>
            <Text>drafts</Text>
          </View>
          <View>
            <Text style={styles.metric}>{money(shippedRevenue)}</Text>
            <Text>shipped sales</Text>
          </View>
        </View>

        {canManage ? (
          <Pressable
            style={styles.primary}
            onPress={() => setShowForm((value) => !value)}
          >
            <Text style={styles.primaryText}>
              {showForm ? "Close form" : "New licensed transfer"}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.readOnly}>
            Your {role.toLowerCase()} role can view shipment records
            {canShip ? " and update fulfillment" : ""}.
          </Text>
        )}

        {showForm ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Select inventory lot</Text>
            <View style={styles.choiceRow}>
              {items.map((item) => {
                const id = idOf(item);
                const active = id === form.inventoryItemId;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setForm({ ...form, inventoryItemId: id })}
                    style={[styles.choice, active && styles.choiceActive]}
                  >
                    <Text style={styles.choiceTitle}>
                      {item.name || item.sku || "Inventory item"}
                    </Text>
                    <Text>
                      {item.lotNumber || item.batchNumber || item.sku || "No lot"} ·{" "}
                      {Number(item.quantity ?? item.quantityOnHand ?? 0)}{" "}
                      {item.unit || "units"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.cardTitle}>2. Sale and recipient</Text>
            <TextInput
              accessibilityLabel="Transfer quantity"
              placeholder="Quantity"
              keyboardType="decimal-pad"
              value={form.quantity}
              onChangeText={(value) => setForm({ ...form, quantity: value })}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Unit price"
              placeholder="Unit price (USD)"
              keyboardType="decimal-pad"
              value={form.unitPrice}
              onChangeText={(value) => setForm({ ...form, unitPrice: value })}
              style={styles.input}
            />
            <Text style={styles.total}>Sale total: {money(total)}</Text>
            <TextInput
              accessibilityLabel="Recipient business"
              placeholder="Licensed dispensary / business name"
              value={form.recipientName}
              onChangeText={(value) => setForm({ ...form, recipientName: value })}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Recipient license"
              placeholder="Recipient license number"
              value={form.recipientLicense}
              onChangeText={(value) => setForm({ ...form, recipientLicense: value })}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Recipient license type"
              placeholder="License type"
              value={form.recipientLicenseType}
              onChangeText={(value) => setForm({ ...form, recipientLicenseType: value })}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Recipient jurisdiction"
              placeholder="State / jurisdiction"
              value={form.recipientState}
              onChangeText={(value) => setForm({ ...form, recipientState: value })}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Destination address"
              placeholder="Ship-to address"
              value={form.destinationAddress}
              onChangeText={(value) => setForm({ ...form, destinationAddress: value })}
              style={styles.input}
            />
            <Text style={styles.cardTitle}>3. Manifest and shipment</Text>
            <TextInput
              accessibilityLabel="Manifest number"
              placeholder="Manifest / transfer number"
              value={form.manifestNumber}
              onChangeText={(value) => setForm({ ...form, manifestNumber: value })}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Carrier"
              placeholder="Transporter / carrier"
              value={form.carrier}
              onChangeText={(value) => setForm({ ...form, carrier: value })}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Tracking number"
              placeholder="Tracking / vehicle reference"
              value={form.trackingNumber}
              onChangeText={(value) => setForm({ ...form, trackingNumber: value })}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Transfer notes"
              placeholder="Notes"
              multiline
              value={form.notes}
              onChangeText={(value) => setForm({ ...form, notes: value })}
              style={[styles.input, styles.notes]}
            />
            <Pressable
              disabled={saving}
              onPress={create}
              style={[styles.primary, saving && styles.disabled]}
            >
              <Text style={styles.primaryText}>
                {saving ? "Saving…" : "Save draft transfer"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Transfer history</Text>
        {transfers.length ? (
          transfers.map((transfer) => (
            <View key={idOf(transfer)} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{transfer.itemName}</Text>
                <Text style={styles.status}>{transfer.status}</Text>
              </View>
              <Text>
                {transfer.quantity} {transfer.unit} · {money(transfer.total)}
              </Text>
              <Text style={styles.detail}>
                To {transfer.recipientName} · License {transfer.recipientLicense} ·{" "}
                {transfer.recipientState}
              </Text>
              <Text style={styles.detail}>
                Lot {transfer.lotNumber || "—"} · Manifest{" "}
                {transfer.manifestNumber || "pending"}
              </Text>
              {canManage && transfer.status === "draft" ? (
                <Pressable
                  disabled={saving}
                  style={styles.secondary}
                  onPress={() => setStatus(transfer, "approved")}
                >
                  <Text style={styles.secondaryText}>Approve transfer</Text>
                </Pressable>
              ) : null}
              {canShip && transfer.status === "approved" ? (
                <Pressable
                  disabled={saving}
                  style={styles.primary}
                  onPress={() => setStatus(transfer, "shipped")}
                >
                  <Text style={styles.primaryText}>Mark shipped & deduct inventory</Text>
                </Pressable>
              ) : null}
              {canShip && transfer.status === "shipped" ? (
                <Pressable
                  disabled={saving}
                  style={styles.secondary}
                  onPress={() => setStatus(transfer, "delivered")}
                >
                  <Text style={styles.secondaryText}>Mark delivered</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No transfer records yet.</Text>
        )}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  page: { padding: 18, gap: 12, paddingBottom: 60 },
  h1: { fontSize: 28, fontWeight: "900" },
  lead: { color: "#475569", lineHeight: 21 },
  notice: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 13
  },
  noticeTitle: { fontWeight: "900", color: "#78350f" },
  noticeText: { color: "#78350f", marginTop: 4, lineHeight: 19 },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 28,
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: radius.card
  },
  metric: { fontSize: 20, fontWeight: "900" },
  primary: {
    backgroundColor: "#166534",
    padding: 12,
    borderRadius: radius.card,
    alignItems: "center"
  },
  primaryText: { color: "white", fontWeight: "900" },
  secondary: {
    borderColor: "#166534",
    borderWidth: 1,
    padding: 10,
    borderRadius: radius.card,
    alignItems: "center",
    marginTop: 8
  },
  secondaryText: { color: "#166534", fontWeight: "900" },
  card: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    padding: 14,
    gap: 9
  },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  choiceRow: { gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    padding: 10
  },
  choiceActive: { borderColor: "#166534", borderWidth: 2, backgroundColor: "#f0fdf4" },
  choiceTitle: { fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  notes: { minHeight: 70, textAlignVertical: "top" },
  total: { fontSize: 18, fontWeight: "900", color: "#166534" },
  sectionTitle: { fontSize: 21, fontWeight: "900", marginTop: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  status: { textTransform: "uppercase", fontWeight: "900", color: "#166534" },
  detail: { color: "#475569" },
  readOnly: { color: "#475569", fontWeight: "700" },
  empty: { color: "#64748b", paddingVertical: 20 },
  disabled: { opacity: 0.55 }
});
