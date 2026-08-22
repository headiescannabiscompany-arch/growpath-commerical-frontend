import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
import { BusinessInventoryImportPanel } from "@/components/inventory/BusinessInventoryImportPanel";
import { BusinessInventoryAlerts } from "@/components/inventory/BusinessInventoryAlerts";
import { getBusinessInventoryAuditCsv } from "@/api/businessInventory";
import { exportCsvContent, exportToCsv } from "@/utils/exportToCsv";
import { groupInventoryQuantities } from "@/utils/inventoryQuantityGroups";

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
  const vendor = x?.vendor ?? "";
  const a = `On hand: ${String(qty)}${unit ? ` ${unit}` : ""}`;
  const b = cat ? `Category: ${String(cat)}` : "";
  const c = type ? `Type: ${String(type)}` : "";
  const d = location ? `Location: ${String(location)}` : "";
  const e = vendor ? `Vendor: ${String(vendor)}` : "";
  return [a, b, c, d, e].filter(Boolean).join(" -  ");
}

function quantityOf(x: AnyRec): number {
  const value = x?.qty ?? x?.quantity ?? x?.quantityOnHand ?? x?.onHand ?? x?.count ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function reorderPointOf(x: AnyRec): number {
  const number = Number(x?.reorderPoint ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function stockStatus(x: AnyRec): "out" | "low" | "ok" {
  if (x?.alerts?.outOfStock) return "out";
  if (x?.alerts?.lowStock) return "low";
  const explicit = String(x?.status || "").toLowerCase();
  if (explicit === "out_of_stock") return "out";
  if (explicit === "low_stock") return "low";

  const quantity = quantityOf(x);
  const reorderPoint = reorderPointOf(x);
  if (quantity <= 0) return "out";
  if (reorderPoint > 0 && quantity <= reorderPoint) return "low";
  return "ok";
}

function matchesInventorySearch(item: AnyRec, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  return [
    item?.sku,
    item?.name,
    item?.category,
    item?.vendor,
    item?.location,
    item?.storageLocation,
    item?.locationId
  ].some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export default function CommercialInventoryRoute() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialInventoryStyles(palette), [palette]);
  const ent = useEntitlements();
  const canCreate = !!ent?.can?.(CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE);

  const mapApiError = useApiErrorHandler();

  const [items, setItems] = useState<AnyRec[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any>(null);
  const [exportingAudit, setExportingAudit] = useState(false);
  const [auditFeedback, setAuditFeedback] = useState("");
  const loadInFlightRef = useRef(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (loadInFlightRef.current) return;
      loadInFlightRef.current = true;
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
        setError(mapApiError(e) ?? e);
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mapApiError]
  );

  useEffect(() => {
    if (!ent?.ready) return;
    if (ent.mode !== "commercial") {
      router.replace("/home" as any);
      return;
    }
    void load();
  }, [ent?.ready, ent?.mode, load, router]);

  useFocusEffect(
    useCallback(() => {
      if (ent?.ready && ent.mode === "commercial") {
        void load({ refresh: true });
      }
    }, [ent?.ready, ent?.mode, load])
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => matchesInventorySearch(item, normalizedQuery)),
    [items, normalizedQuery]
  );
  const sorted = useMemo(() => {
    const rank = { out: 0, low: 1, ok: 2 } as const;
    return [...filteredItems].sort((a, b) => rank[stockStatus(a)] - rank[stockStatus(b)]);
  }, [filteredItems]);
  const outOfStock = items.filter((item) => stockStatus(item) === "out").length;
  const lowStock = items.filter((item) => stockStatus(item) === "low").length;
  const quantityGroups = useMemo(() => groupInventoryQuantities(items), [items]);

  const exportCurrent = useCallback(async () => {
    try {
      await exportToCsv("growpath-commercial-inventory", items, [
        { key: "sku", label: "SKU" },
        { key: "name", label: "Name" },
        { key: "quantity", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "status", label: "Status" },
        { key: "location", label: "Location" },
        { key: "reorderPoint", label: "Reorder point" },
        { key: "updatedAt", label: "Updated at" }
      ]);
    } catch (caught) {
      setError(caught);
    }
  }, [items]);

  const exportFullAudit = useCallback(async () => {
    if (exportingAudit) return;
    setExportingAudit(true);
    setAuditFeedback("");
    try {
      const csv = await getBusinessInventoryAuditCsv({});
      await exportCsvContent("growpath-inventory-audit", csv);
      setAuditFeedback("Full inventory audit CSV is ready.");
    } catch (caught) {
      setError(mapApiError(caught) ?? caught);
    } finally {
      setExportingAudit(false);
    }
  }, [exportingAudit, mapApiError]);

  if (!ent?.ready) return null;
  if (ent.mode !== "commercial") return null;

  return (
    <ScreenBoundary title="Inventory Support">
      <View style={styles.container}>
        {error ? (
          <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
            <InlineError error={error} />
            <TouchableOpacity
              accessibilityLabel="Retry commercial inventory support"
              accessibilityRole="button"
              disabled={loading || refreshing}
              onPress={() => load()}
              style={[styles.createBtn, (loading || refreshing) && styles.disabled]}
            >
              <Text style={styles.createBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.headerRow}>
          <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
            Commercial Inventory Support
          </Text>
          <View style={styles.headerActions}>
            <Text style={styles.muted}>{items.length} items</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Export commercial inventory full audit CSV"
              accessibilityState={{ disabled: exportingAudit, busy: exportingAudit }}
              disabled={exportingAudit}
              onPress={exportFullAudit}
              style={[styles.createBtn, exportingAudit && styles.disabled]}
            >
              <Text style={styles.createBtnText}>
                {exportingAudit ? "Preparing…" : "Full Audit CSV"}
              </Text>
            </TouchableOpacity>
            {items.length ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Export commercial inventory CSV"
                onPress={exportCurrent}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>Export CSV</Text>
              </TouchableOpacity>
            ) : null}
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

        {auditFeedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.auditFeedback}>
            {auditFeedback}
          </Text>
        ) : null}

        {loading ? (
          <View
            accessibilityLabel="Loading commercial inventory support"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
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
          {quantityGroups.map((group) => (
            <View key={group.unit.toLocaleLowerCase()}>
              <Text style={styles.summaryValue}>{group.quantity}</Text>
              <Text style={styles.summaryLabel}>{group.unit} on hand</Text>
            </View>
          ))}
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
        <TextInput
          accessibilityLabel="Search commercial inventory"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Search SKU, name, category, vendor, or location"
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          style={styles.searchInput}
          value={query}
        />
        {normalizedQuery && items.length ? (
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            Showing {sorted.length} of {items.length} inventory records.
          </Text>
        ) : null}
        <BusinessInventoryImportPanel
          canWrite={canCreate}
          onApplied={() => load({ refresh: true })}
          workspace={{}}
        />
        <FlatList
          data={sorted}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              colors={[palette.accent]}
              enabled={!loading}
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
              tintColor={palette.accent}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.empty}>
                {normalizedQuery && items.length ? (
                  <>
                    <Text style={styles.emptyTitle}>
                      No inventory records match “{query.trim()}”
                    </Text>
                    <Text style={styles.muted}>
                      Try another SKU, name, category, vendor, or location.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyTitle}>
                      No inventory support records yet
                    </Text>
                    <Text style={styles.muted}>
                      Create a stock support record to track quantities, reorder points,
                      suppliers, and product links.
                    </Text>
                  </>
                )}
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
                accessibilityState={{ disabled: !id }}
                disabled={!id}
                onPress={() => {
                  if (!id) return;
                  router.push({
                    pathname: "/home/commercial/inventory/[id]",
                    params: { id }
                  });
                }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                  !id && styles.disabled
                ]}
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
                  {item.authorizedUnitCost !== null &&
                  item.authorizedUnitCost !== undefined &&
                  Number.isFinite(Number(item.authorizedUnitCost)) ? (
                    <Text style={styles.privateCost}>
                      Authorized unit cost: {item.currency ? `${item.currency} ` : ""}
                      {Number(item.authorizedUnitCost)}
                    </Text>
                  ) : item.currency ? (
                    <Text style={styles.privateCost}>Currency: {item.currency}</Text>
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
                  <BusinessInventoryAlerts compact item={item} />
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
    auditFeedback: { color: palette.success, fontWeight: "800" },
    privateCost: { color: palette.text, fontSize: 12, fontWeight: "800" },

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
    errorPanel: { alignItems: "flex-start", gap: 8 },
    disabled: { opacity: 0.55 },

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
    searchInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10
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
