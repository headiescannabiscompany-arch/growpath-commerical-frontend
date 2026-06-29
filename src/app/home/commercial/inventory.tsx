import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.inventory)) return res.inventory;
  return [];
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.inventoryId ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec): string {
  return String(x?.name ?? x?.title ?? x?.label ?? x?.sku ?? "Inventory Item");
}

function pickSubtitle(x: AnyRec): string {
  const qty = quantityOf(x);
  const unit = x?.unit ?? x?.uom ?? "";
  const cat = x?.category ?? x?.type ?? "";
  const a = `On hand: ${String(qty)}${unit ? ` ${unit}` : ""}`;
  const b = cat ? `Category: ${String(cat)}` : "";
  return [a, b].filter(Boolean).join(" -  ");
}

function quantityOf(x: AnyRec): number {
  const value = x?.qty ?? x?.quantity ?? x?.onHand ?? x?.count ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function reorderPointOf(x: AnyRec): number {
  const number = Number(x?.reorderPoint ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function stockStatus(x: AnyRec): "out" | "low" | "ok" {
  const explicit = String(x?.status || "").toLowerCase();
  if (explicit === "out_of_stock") return "out";
  if (explicit === "low_stock") return "low";

  const quantity = quantityOf(x);
  const reorderPoint = reorderPointOf(x);
  if (quantity <= 0) return "out";
  if (reorderPoint > 0 && quantity <= reorderPoint) return "low";
  return "ok";
}

export default function CommercialInventoryRoute() {
  const router = useRouter();
  const ent = useEntitlements();
  const canCreate = !!ent?.can?.(CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE);

  const apiErr: any = useApiErrorHandler();
  const resolved = useMemo(() => {
    const error = apiErr?.error ?? apiErr?.[0] ?? null;
    const handleApiError = apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {});
    const clearError = apiErr?.clearError ?? apiErr?.[2] ?? (() => {});
    return { error, handleApiError, clearError };
  }, [apiErr]);

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        resolved.clearError();

        // Commercial inventory endpoints vary by backend; try known shapes, then fall back safely.
        const path =
          (endpoints as any)?.commercial?.inventory ??
          (endpoints as any)?.inventoryGlobal ??
          "/api/inventory";

        const res = await apiRequest(path, { method: "GET" });
        setItems(asArray(res));
      } catch (e) {
        resolved.handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [resolved]
  );

  useEffect(() => {
    if (ent?.ready && ent.mode !== "commercial") {
      router.replace("/home" as any);
      return;
    }
    load();
  }, [ent?.ready, ent?.mode, load, router]);

  useFocusEffect(
    useCallback(() => {
      if (ent?.ready && ent.mode === "commercial") {
        void load({ refresh: true });
      }
    }, [ent?.ready, ent?.mode, load])
  );

  const sorted = useMemo(() => {
    const rank = { out: 0, low: 1, ok: 2 } as const;
    return [...items].sort((a, b) => rank[stockStatus(a)] - rank[stockStatus(b)]);
  }, [items]);
  const outOfStock = items.filter((item) => stockStatus(item) === "out").length;
  const lowStock = items.filter((item) => stockStatus(item) === "low").length;
  const totalQuantity = items.reduce((sum, item) => sum + quantityOf(item), 0);

  if (!ent?.ready) return null;
  if (ent.mode !== "commercial") return null;

  return (
    <ScreenBoundary title="Inventory">
      <View style={styles.container}>
        {resolved.error ? <InlineError error={resolved.error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Commercial Inventory</Text>
          <View style={styles.headerActions}>
            <Text style={styles.muted}>{items.length} items</Text>
            {canCreate ? (
              <TouchableOpacity
                onPress={() => router.push("/home/commercial/inventory-create")}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading inventory...</Text>
          </View>
        ) : null}

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
            <Text style={styles.summaryValue}>{totalQuantity}</Text>
            <Text style={styles.summaryLabel}>units on hand</Text>
          </View>
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No inventory yet</Text>
                <Text style={styles.muted}>
                  When inventory exists on the backend, it will show here.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const id = pickId(item);
            const title = pickTitle(item);
            const subtitle = pickSubtitle(item);
            const status = stockStatus(item);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open commercial inventory item ${title}`}
                onPress={() => {
                  if (!id) return;
                  router.push({
                    pathname: "/home/commercial/inventory-item/[id]",
                    params: { id }
                  });
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
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
                  </View>
                </View>
                <Text style={styles.chev}>{">"}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  headerRow: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7 },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "space-between"
  },
  createBtn: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  createBtnText: { fontWeight: "800" },

  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },

  summaryCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16
  },
  summaryValue: { color: "#1e3a8a", fontSize: 20, fontWeight: "900" },
  summaryLabel: { color: "#1e40af", fontSize: 12, fontWeight: "800" },
  warnText: { color: "#b45309" },
  dangerText: { color: "#991b1b" },

  list: { paddingVertical: 6, gap: 10 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  rowPressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  rowSub: { opacity: 0.7 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
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
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 8 },

  empty: { paddingVertical: 26, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" }
});
