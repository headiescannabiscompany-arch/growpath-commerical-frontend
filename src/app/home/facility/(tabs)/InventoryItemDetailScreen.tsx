import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

function formatTimestamp(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

export default function InventoryItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; itemId?: string }>();
  const { selectedId: facilityId } = useFacility();
  const ent = useEntitlements();

  const itemId = String(params?.id ?? params?.itemId ?? "");

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;

  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );

  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editReorderPoint, setEditReorderPoint] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const canWriteInventory = Boolean(ent?.can?.(CAPABILITY_KEYS.INVENTORY_WRITE));

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;
      if (!itemId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.inventoryItem(facilityId, itemId));
        setItem((res as AnyRec)?.item ?? (res as AnyRec)?.updated ?? res ?? null);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, itemId, clearError, handleApiError]
  );

  const adjust = useCallback(async () => {
    if (!facilityId || !itemId || !item || !canWriteInventory) return;

    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) return;

    const sku = String(item?.sku ?? "");
    if (!sku) return;

    const current = Number(item?.quantity ?? item?.quantityOnHand ?? 0);
    const nextQuantity = (Number.isFinite(current) ? current : 0) + n;

    setSaving(true);
    try {
      clearError();
      setFeedback("");
      await apiRequest(endpoints.inventoryItem(facilityId, sku), {
        method: "PATCH",
        body: {
          quantity: nextQuantity,
          adjustmentReason: reason.trim() || undefined
        }
      });
      setDelta("");
      setReason("");
      await load({ refresh: true });
      setFeedback("Quantity updated.");
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }, [
    facilityId,
    itemId,
    item,
    canWriteInventory,
    delta,
    reason,
    clearError,
    handleApiError,
    load
  ]);

  const saveDetails = useCallback(async () => {
    if (!facilityId || !itemId || !item || !canWriteInventory) return;

    const sku = String(item?.sku ?? "");
    if (!sku) return;

    const reorderPointNumber = Number(editReorderPoint);
    const body = {
      name: editName.trim() || item.name,
      unit: editUnit.trim() || undefined,
      reorderPoint:
        editReorderPoint.trim() && Number.isFinite(reorderPointNumber)
          ? reorderPointNumber
          : 0
    };

    setSavingDetails(true);
    try {
      clearError();
      setFeedback("");
      await apiRequest(endpoints.inventoryItem(facilityId, sku), {
        method: "PATCH",
        body
      });
      await load({ refresh: true });
      setFeedback("Item details saved.");
    } catch (e) {
      handleApiError(e);
    } finally {
      setSavingDetails(false);
    }
  }, [
    facilityId,
    itemId,
    item,
    canWriteInventory,
    editName,
    editUnit,
    editReorderPoint,
    clearError,
    handleApiError,
    load
  ]);

  const removeItem = useCallback(async () => {
    if (!facilityId || !itemId || !canWriteInventory) return;

    setDeleting(true);
    setFeedback("");
    try {
      clearError();
      await apiRequest(endpoints.inventoryItem(facilityId, itemId), {
        method: "DELETE"
      });
      router.replace("/home/facility/inventory");
    } catch (e) {
      handleApiError(e);
    } finally {
      setDeleting(false);
    }
  }, [facilityId, itemId, canWriteInventory, clearError, handleApiError, router]);

  const confirmRemoveItem = useCallback(() => {
    if (!canWriteInventory || deleting) return;
    const message =
      "This removes the item from active facility inventory. This action cannot be undone.";

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
    ) {
      if (window.confirm(`Remove inventory item?\n\n${message}`)) void removeItem();
      return;
    }

    Alert.alert("Remove inventory item?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove item", style: "destructive", onPress: removeItem }
    ]);
  }, [canWriteInventory, deleting, removeItem]);

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    if (!itemId) return;
    load();
  }, [facilityId, itemId, load, router]);

  useEffect(() => {
    if (!item) return;
    setEditName(String(item.name ?? ""));
    setEditUnit(String(item.unit ?? ""));
    setEditReorderPoint(String(item.reorderPoint ?? 0));
  }, [item]);

  const quantity = Number(item?.quantity ?? item?.quantityOnHand ?? 0);
  const reorderPoint = Number(item?.reorderPoint ?? 0);
  const stockLabel =
    quantity <= 0
      ? "out of stock"
      : reorderPoint > 0 && quantity <= reorderPoint
        ? "low stock"
        : "stock ok";

  return (
    <ScreenBoundary
      title="Inventory Item"
      showBack
      backFallbackHref="/home/facility/inventory"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        <Text style={styles.h1}>{item?.name || "Inventory Item"}</Text>

        {feedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading item...</Text>
          </View>
        ) : null}

        {item ? (
          <View style={styles.summaryCard}>
            <Text
              style={[
                styles.stockPill,
                stockLabel === "stock ok" && styles.stockOk,
                stockLabel === "low stock" && styles.stockWarn,
                stockLabel === "out of stock" && styles.stockDanger
              ]}
            >
              {stockLabel}
            </Text>
            <Text style={styles.summaryText}>
              Qty {Number.isFinite(quantity) ? quantity : 0}
              {item.unit ? ` ${item.unit}` : ""} | Reorder at{" "}
              {Number.isFinite(reorderPoint) ? reorderPoint : 0}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Item details</Text>
          <Text style={styles.muted}>
            Keep the item name, stock-counting unit, and reorder point current.
          </Text>
          {!canWriteInventory ? (
            <Text style={styles.lockedText}>
              Your facility role or plan does not allow inventory changes.
            </Text>
          ) : null}
          <TextInput
            accessibilityLabel="Inventory detail item name"
            value={editName}
            onChangeText={setEditName}
            placeholder="Item name"
            editable={canWriteInventory}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Inventory detail item unit"
            value={editUnit}
            onChangeText={setEditUnit}
            placeholder="Unit"
            editable={canWriteInventory}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Inventory detail reorder point"
            value={editReorderPoint}
            onChangeText={setEditReorderPoint}
            placeholder="Reorder point"
            keyboardType="numeric"
            editable={canWriteInventory}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save inventory details"
            onPress={saveDetails}
            disabled={savingDetails || !canWriteInventory}
            style={({ pressed }) => [
              styles.btn,
              (savingDetails || !canWriteInventory) && styles.btnDisabled,
              pressed && styles.pressed
            ]}
          >
            <Text style={styles.btnText}>
              {savingDetails ? "Saving..." : "Save item details"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Adjust quantity</Text>
          <Text style={styles.muted}>
            Enter a positive amount for received stock or a negative amount for stock
            used, transferred, or corrected.
          </Text>
          {!canWriteInventory ? (
            <Text style={styles.lockedText}>
              Your facility role or plan does not allow inventory changes.
            </Text>
          ) : null}

          <TextInput
            accessibilityLabel="Inventory adjustment quantity"
            value={delta}
            onChangeText={setDelta}
            placeholder="e.g. 10 or -2"
            keyboardType="numeric"
            editable={canWriteInventory}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Inventory adjustment reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (optional)"
            editable={canWriteInventory}
            style={styles.input}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save inventory adjustment"
            onPress={adjust}
            disabled={saving || !canWriteInventory}
            style={({ pressed }) => [
              styles.btn,
              (saving || !canWriteInventory) && styles.btnDisabled,
              pressed && styles.pressed
            ]}
          >
            <Text style={styles.btnText}>{saving ? "Saving..." : "Save adjustment"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Record information</Text>
          {item ? (
            <View style={styles.recordList}>
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>SKU</Text>
                <Text style={styles.recordValue}>{item.sku || "Not set"}</Text>
              </View>
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>Added</Text>
                <Text style={styles.recordValue}>{formatTimestamp(item.createdAt)}</Text>
              </View>
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>Last updated</Text>
                <Text style={styles.recordValue}>{formatTimestamp(item.updatedAt)}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.muted}>Inventory information is unavailable.</Text>
          )}
        </View>

        {item && canWriteInventory ? (
          <View style={[styles.card, styles.dangerCard]}>
            <Text style={styles.cardTitle}>Remove inventory item</Text>
            <Text style={styles.muted}>
              Use this only for a duplicate, test, or mistakenly created item. Quantity
              changes belong in Adjust quantity above.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove inventory item"
              onPress={confirmRemoveItem}
              disabled={deleting}
              style={({ pressed }) => [
                styles.dangerButton,
                deleting && styles.btnDisabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.dangerButtonText}>
                {deleting ? "Removing..." : "Remove item"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { opacity: 0.7, marginBottom: 12 },

  loading: { paddingVertical: 18, alignItems: "center" },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
  summaryCard: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12,
    gap: 8
  },
  summaryText: { color: "#334155", fontWeight: "800" },
  stockPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: "900"
  },
  stockOk: { color: "#065f46", backgroundColor: "#d1fae5" },
  stockWarn: { color: "#92400e", backgroundColor: "#fef3c7" },
  stockDanger: { color: "#991b1b", backgroundColor: "#fee2e2" },

  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    marginTop: 10
  },

  btn: {
    marginTop: 12,
    borderRadius: radius.card,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: "900" },
  lockedText: { color: "#92400e", fontWeight: "800", marginBottom: 8 },
  pressed: { opacity: 0.85 },
  feedback: {
    color: "#166534",
    backgroundColor: "#dcfce7",
    borderRadius: radius.card,
    padding: 10,
    fontWeight: "800",
    marginBottom: 12
  },
  recordList: { gap: 10 },
  recordRow: { gap: 2 },
  recordLabel: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  recordValue: { color: "#0f172a", fontSize: 14, fontWeight: "700" },
  dangerCard: { borderColor: "#fecaca", backgroundColor: "#fff7f7" },
  dangerButton: {
    marginTop: 12,
    borderRadius: radius.card,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#991b1b"
  },
  dangerButtonText: { color: "white", fontWeight: "900" }
});
