import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

type InventoryItem = {
  _id?: string;
  id?: string;
  name?: string;
  sku?: string;
  quantity?: number;
  quantityOnHand?: number;
  reorderPoint?: number;
  unit?: string;
  updatedAt?: string;
  createdAt?: string;
};

function normalizeInventory(res: any): InventoryItem[] {
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.inventory)) return res.inventory;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.inventory)) return res.data.inventory;
  if (Array.isArray(res)) return res;
  return [];
}

function itemId(item: InventoryItem) {
  return String(item.id ?? item._id ?? item.sku ?? "");
}

function quantityOf(item: InventoryItem) {
  const value = item.quantity ?? item.quantityOnHand ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function reorderPointOf(item: InventoryItem) {
  const number = Number(item.reorderPoint ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function stockStatus(item: InventoryItem) {
  const quantity = quantityOf(item);
  const reorderPoint = reorderPointOf(item);
  if (quantity <= 0) return "out";
  if (reorderPoint > 0 && quantity <= reorderPoint) return "low";
  return "ok";
}

export default function FacilityInventoryTab() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const ent = useEntitlements();
  const apiErr: any = useApiErrorHandler();
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );

  const [items, setItems] = useState<InventoryItem[]>([]);
  const itemCountRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchItems = useCallback(async () => {
    if (!facilityId) return;
    setError(null);
    const res = await apiRequest(endpoints.inventory(facilityId));
    const nextItems = normalizeInventory(res);
    itemCountRef.current = nextItems.length;
    setItems(nextItems);
    setError(null);
  }, [facilityId]);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      await fetchItems();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  }, [facilityId, fetchItems, handleApiError]);

  const onRefresh = useCallback(async () => {
    if (!facilityId) return;
    setRefreshing(true);
    setError(null);
    try {
      await fetchItems();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setRefreshing(false);
    }
  }, [facilityId, fetchItems, handleApiError]);

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  useFocusEffect(
    useCallback(() => {
      if (facilityId) {
        void fetchItems().catch((e) => {
          if (!itemCountRef.current) setError(handleApiError(e));
          else handleApiError(e);
        });
      }
    }, [facilityId, fetchItems, handleApiError])
  );

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const statusRank = { out: 0, low: 1, ok: 2 } as const;
      const riskDelta = statusRank[stockStatus(a)] - statusRank[stockStatus(b)];
      if (riskDelta !== 0) return riskDelta;
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    return copy;
  }, [items]);

  const canWriteInventory = Boolean(ent?.can?.(CAPABILITY_KEYS.INVENTORY_WRITE));
  const outOfStock = items.filter((item) => stockStatus(item) === "out").length;
  const lowStock = items.filter((item) => stockStatus(item) === "low").length;
  const missingSku = items.filter((item) => !item.sku).length;
  const totalQuantity = items.reduce((sum, item) => sum + quantityOf(item), 0);

  if (loading) {
    return (
      <ScreenBoundary title="Inventory">
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary title="Inventory">
      <View style={styles.container}>
        <InlineError error={error} />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Inventory</Text>
            <Text style={styles.muted}>
              {items.length} items | {totalQuantity} units on hand
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reload inventory"
              onPress={load}
              style={styles.ghostButton}
            >
              <Text style={styles.ghostText}>Reload</Text>
            </Pressable>
            {items.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open inventory AI review"
                onPress={() =>
                  router.push("/home/facility/ai-ask?preset=inventory" as any)
                }
                style={styles.ghostButton}
              >
                <Text style={styles.ghostText}>AI review</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open sales and transfers"
          onPress={() => router.push("/home/facility/transfers" as any)}
          style={styles.ghostButton}
        >
          <Text style={styles.ghostText}>Sales & licensed transfers</Text>
        </Pressable>

        <View style={styles.summaryCard}>
          <View>
            <Text style={[styles.summaryValue, outOfStock ? styles.dangerText : null]}>
              {outOfStock}
            </Text>
            <Text style={styles.summaryLabel}>out of stock</Text>
          </View>
          <View>
            <Text style={[styles.summaryValue, lowStock ? styles.warnText : null]}>
              {lowStock}
            </Text>
            <Text style={styles.summaryLabel}>low stock</Text>
          </View>
          <View>
            <Text style={[styles.summaryValue, missingSku ? styles.warnText : null]}>
              {missingSku}
            </Text>
            <Text style={styles.summaryLabel}>missing SKU</Text>
          </View>
        </View>

        {!canWriteInventory ? (
          <Text style={styles.lockedText}>
            Inventory changes unlock after facility checkout is active.
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create inventory item"
            onPress={() => router.push("/home/facility/inventory/new")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Create Item</Text>
          </Pressable>
        )}

        {sorted.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No inventory items yet.</Text>
            <Text style={styles.empty}>
              Add real inputs, products, packaging, tools, or facility supplies before
              running AI reorder or stock-risk review.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(item, index) => itemId(item) || String(index)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => {
              const id = itemId(item);
              const qty = quantityOf(item);
              const unit = item.unit ? ` ${item.unit}` : "";
              const status = stockStatus(item);

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open inventory item ${item.name || item.sku || id}`}
                  onPress={() => {
                    if (!id) return;
                    router.push({
                      pathname: "/home/facility/inventory/[id]",
                      params: { id }
                    });
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{item.name || "Inventory Item"}</Text>
                    <Text style={styles.rowSub}>
                      SKU: {item.sku || "missing"} | Qty: {qty}
                      {unit}
                    </Text>
                    <View style={styles.badgeRow}>
                      <Text
                        style={[
                          styles.badge,
                          status === "ok" && styles.badgeOk,
                          status === "low" && styles.badgeWarn,
                          status === "out" && styles.badgeDanger
                        ]}
                      >
                        {status === "ok"
                          ? "stock ok"
                          : status === "low"
                            ? "low stock"
                            : "out of stock"}
                      </Text>
                      {!item.sku ? (
                        <Text style={[styles.badge, styles.badgeWarn]}>missing SKU</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.chev}>{">"}</Text>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 12
  },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { color: "#475569", fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ghostButton: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.14)",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  ghostText: { color: "#0f172a", fontWeight: "900" },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 12
  },
  summaryValue: { color: "#1e3a8a", fontSize: 20, fontWeight: "900" },
  summaryLabel: { color: "#1e40af", fontSize: 12, fontWeight: "800" },
  warnText: { color: "#b45309" },
  dangerText: { color: "#991b1b" },
  lockedText: { color: "#92400e", fontWeight: "800", marginBottom: 12 },
  emptyCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 14
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4
  },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12
  },
  primaryText: { color: "white", fontWeight: "900" },
  empty: { color: "#64748b", fontWeight: "700" },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "white"
  },
  rowMain: { flex: 1 },
  rowTitle: { color: "#0f172a", fontSize: 16, fontWeight: "900" },
  rowSub: { color: "#475569", fontWeight: "700", marginTop: 4 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  badge: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: "900"
  },
  badgeOk: { color: "#065f46", backgroundColor: "#d1fae5" },
  badgeWarn: { color: "#92400e", backgroundColor: "#fef3c7" },
  badgeDanger: { color: "#991b1b", backgroundColor: "#fee2e2" },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 10 },
  pressed: { opacity: 0.85 }
});
