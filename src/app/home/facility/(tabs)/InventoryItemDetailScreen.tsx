import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

type AnyRec = Record<string, any>;

function renderKV(obj: AnyRec | null, key: string) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;
  return (
    <View style={styles.kv} key={key}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v}>{typeof v === "string" ? v : JSON.stringify(v)}</Text>
    </View>
  );
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

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    if (!itemId) return;
    load();
  }, [facilityId, itemId, load, router]);

  const keys = useMemo(() => (item ? Object.keys(item).sort() : []), [item]);
  const quantity = Number(item?.quantity ?? item?.quantityOnHand ?? 0);
  const reorderPoint = Number(item?.reorderPoint ?? 0);
  const stockLabel =
    quantity <= 0
      ? "out of stock"
      : reorderPoint > 0 && quantity <= reorderPoint
        ? "low stock"
        : "stock ok";

  return (
    <ScreenBoundary title="Inventory Item">
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

        <Text style={styles.h1}>Inventory Item</Text>
        <Text style={styles.muted}>id: {itemId || "(missing id param)"}</Text>

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
          <Text style={styles.cardTitle}>Adjust quantity</Text>
          <Text style={styles.muted}>
            Use negative for decrement, positive for increment.
          </Text>
          {!canWriteInventory ? (
            <Text style={styles.lockedText}>
              Inventory changes unlock after facility checkout is active.
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
          <Text style={styles.cardTitle}>Details</Text>
          {item ? (
            <View style={{ marginTop: 8 }}>{keys.map((k) => renderKV(item, k))}</View>
          ) : (
            <Text style={styles.muted}>No item payload returned.</Text>
          )}
        </View>
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
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
  summaryCard: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    marginTop: 10
  },

  btn: {
    marginTop: 12,
    borderRadius: 12,
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

  kv: { marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7, marginBottom: 3 },
  v: { fontSize: 14 }
});
