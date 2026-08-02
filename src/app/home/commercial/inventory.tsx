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
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

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
  return String(x?.name ?? x?.title ?? x?.label ?? x?.sku ?? "Inventory Record");
}

function pickSubtitle(x: AnyRec): string {
  const qty = quantityOf(x);
  const unit = x?.unit ?? x?.uom ?? "";
  const cat = x?.category ?? "";
  const type = x?.itemType ?? x?.type ?? "";
  const location = x?.location ?? x?.storageLocation ?? "";
  const a = `On hand: ${String(qty)}${unit ? ` ${unit}` : ""}`;
  const b = cat ? `Category: ${String(cat)}` : "";
  const c = type ? `Type: ${String(type)}` : "";
  const d = location ? `Location: ${String(location)}` : "";
  return [a, b, c, d].filter(Boolean).join(" -  ");
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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialInventoryStyles(palette), [palette]);
  const ent = useEntitlements();
  const canCreate = !!ent?.can?.(CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE);

  const mapApiError = useApiErrorHandler();

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        setError(null);

        // Commercial inventory endpoints vary by backend; try known shapes, then fall back safely.
        const path =
          (endpoints as any)?.commercial?.inventory ??
          (endpoints as any)?.inventoryGlobal ??
          "/api/inventory";

        const res = await apiRequest(path, { method: "GET" });
        setItems(asArray(res));
      } catch (e) {
        setError(mapApiError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mapApiError]
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
    <ScreenBoundary title="Inventory Support">
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}

        <View style={styles.headerRow}>
          <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
            Commercial Inventory Support
          </Text>
          <View style={styles.headerActions}>
            <Text style={styles.muted}>{items.length} items</Text>
            {canCreate ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Create inventory support record"
                accessibilityHint="Opens the form for a new Commercial inventory support record"
                onPress={() => router.push("/home/commercial/inventory/new")}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading inventory support...</Text>
          </View>
        ) : null}

        <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
          Stock overview
        </Text>
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

        <View style={styles.guideCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.guideTitle}>
            Inventory support scope
          </Text>
          <Text style={styles.guideText}>
            Track stock behind products, batches/lots, ingredients, packaging, genetics,
            equipment, courses, services, and retail items. Product records still hold
            public copy, photos, use instructions, links, and trial evidence.
          </Text>
        </View>

        <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
          Inventory records
        </Text>
        <FlatList
          data={sorted}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              colors={[palette.accent]}
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
              tintColor={palette.accent}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No inventory support records yet</Text>
                <Text style={styles.muted}>
                  Create a stock support record to track quantities, reorder points,
                  suppliers, and product links.
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
                accessibilityLabel={`Open commercial inventory record ${title}`}
                onPress={() => {
                  if (!id) return;
                  router.push({
                    pathname: "/home/commercial/inventory/[id]",
                    params: { id }
                  });
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    accessibilityRole="header"
                    aria-level={3}
                    style={styles.rowTitle}
                    numberOfLines={1}
                  >
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

export function createCommercialInventoryStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { backgroundColor: palette.page, flex: 1, gap: 12, padding: 16 },
    headerRow: { gap: 4 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    sectionTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    muted: { color: palette.textMuted },

    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between"
    },
    createBtn: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    createBtnText: { color: palette.link, fontWeight: "800" },

    loading: { alignItems: "center", gap: 10, paddingVertical: 18 },

    summaryCard: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
      padding: 12
    },
    summaryValue: { color: palette.link, fontSize: 20, fontWeight: "900" },
    summaryLabel: { color: palette.textSoft, fontSize: 12, fontWeight: "800" },
    warnText: { color: palette.warning },
    dangerText: { color: palette.danger },
    guideCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      padding: 12
    },
    guideTitle: { color: palette.text, fontWeight: "900" },
    guideText: {
      color: palette.textSoft,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19
    },

    list: { gap: 10, paddingVertical: 6 },

    row: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      padding: 14
    },
    rowPressed: { opacity: 0.85 },
    rowTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    rowSub: { color: palette.textMuted },
    badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    badge: {
      borderRadius: 999,
      fontSize: 12,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3
    },
    badgeOk: { backgroundColor: palette.surfaceStrong, color: palette.success },
    badgeWarn: { backgroundColor: palette.surfaceStrong, color: palette.warning },
    badgeDanger: { backgroundColor: palette.surfaceStrong, color: palette.danger },
    chev: { color: palette.textMuted, fontSize: 22, paddingLeft: 8 },

    empty: { alignItems: "center", gap: 8, paddingVertical: 26 },
    emptyTitle: { color: palette.text, fontSize: 16, fontWeight: "800" }
  });
}
