import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { endpoints } from "@/api/endpoints";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useFacilityRecordScope } from "@/features/facility/useFacilityRecordRead";
import { useFacilityCollectionRead } from "@/features/facility/useFacilityCollectionRead";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { BusinessInventoryImportPanel } from "@/components/inventory/BusinessInventoryImportPanel";
import { BusinessInventoryAlerts } from "@/components/inventory/BusinessInventoryAlerts";
import {
  BusinessInventoryAlerts as BusinessInventoryAlertFlags,
  getBusinessInventoryAuditCsv
} from "@/api/businessInventory";
import { exportCsvContent, exportToCsv } from "@/utils/exportToCsv";
import { inventoryQuantitySummary } from "@/utils/inventoryQuantityGroups";

type InventoryItem = {
  _id?: string;
  id?: string;
  name?: string;
  sku?: string;
  quantity?: number;
  quantityOnHand?: number;
  reorderPoint?: number;
  unit?: string;
  category?: string;
  vendor?: string;
  location?: string;
  locationId?: string;
  storageLocation?: string;
  authorizedUnitCost?: number | null;
  currency?: string;
  alerts?: BusinessInventoryAlertFlags;
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
  if (item.alerts?.outOfStock) return "out";
  if (item.alerts?.lowStock) return "low";
  const quantity = quantityOf(item);
  const reorderPoint = reorderPointOf(item);
  if (quantity <= 0) return "out";
  if (reorderPoint > 0 && quantity <= reorderPoint) return "low";
  return "ok";
}

function matchesInventorySearch(item: InventoryItem, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  return [
    item.sku,
    item.name,
    item.category,
    item.vendor,
    item.location,
    item.storageLocation,
    item.locationId
  ].some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export default function FacilityInventoryTab() {
  const { growId } = useLocalSearchParams();
  const scope = useFacilityRecordScope(growId);
  return <FacilityInventoryContent key={scope} />;
}

function FacilityInventoryContent() {
  const router = useRouter();
  const { growId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const sourceGrowId = Array.isArray(growId) ? growId[0] : growId;
  const backProps = {
    preferBackFallback: Boolean(sourceGrowId),
    backFallbackHref: sourceGrowId
      ? `/home/facility/grows/${encodeURIComponent(sourceGrowId)}`
      : "/account/workspace"
  };
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { selectedId: facilityId } = useFacility();
  const ent = useEntitlements();
  const {
    items,
    loading,
    refreshing,
    load,
    error,
    handleApiError,
    mounted,
    hasLoaded,
    readFailed,
    readable
  } = useFacilityCollectionRead(
    facilityId ? endpoints.inventory(facilityId) : null,
    normalizeInventory
  );
  const [query, setQuery] = useState("");
  const [exportingAudit, setExportingAudit] = useState(false);
  const auditInFlight = useRef(false);
  const auditLifetime = useRef(0);
  const [auditFeedback, setAuditFeedback] = useState("");
  const onRefresh = load;

  useFocusEffect(
    useCallback(() => {
      setAuditFeedback("");
      return () => {
        auditLifetime.current += 1;
      };
    }, [])
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
    }
  }, [facilityId, router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => matchesInventorySearch(item, normalizedQuery)),
    [items, normalizedQuery]
  );
  const sorted = useMemo(() => {
    const copy = [...filteredItems];
    copy.sort((a, b) => {
      const statusRank = { out: 0, low: 1, ok: 2 } as const;
      const riskDelta = statusRank[stockStatus(a)] - statusRank[stockStatus(b)];
      if (riskDelta !== 0) return riskDelta;
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    return copy;
  }, [filteredItems]);

  const canWriteInventory = Boolean(ent?.can?.(CAPABILITY_KEYS.INVENTORY_WRITE));
  const canReadAudit = Boolean(ent?.can?.(CAPABILITY_KEYS.AUDIT_READ));
  const outOfStock = items.filter((item) => stockStatus(item) === "out").length;
  const lowStock = items.filter((item) => stockStatus(item) === "low").length;
  const missingSku = items.filter((item) => !item.sku).length;
  const quantitySummary = useMemo(() => inventoryQuantitySummary(items), [items]);

  const exportCurrent = useCallback(async () => {
    if (!readable) return;
    try {
      await exportToCsv("growpath-facility-inventory", items, [
        { key: "sku", label: "SKU" },
        { key: "name", label: "Name" },
        { key: "quantity", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "itemStatus", label: "Status" },
        { key: "locationId", label: "Location" },
        { key: "reorderPoint", label: "Reorder point" },
        { key: "updatedAt", label: "Updated at" }
      ]);
    } catch (caught) {
      handleApiError(caught);
    }
  }, [handleApiError, items, readable]);

  const exportFullAudit = useCallback(async () => {
    if (!facilityId || auditInFlight.current || !canReadAudit) return;
    const lifetime = auditLifetime.current;
    const isCurrent = () => mounted.current && lifetime === auditLifetime.current;
    auditInFlight.current = true;
    setExportingAudit(true);
    setAuditFeedback("");
    try {
      const csv = await getBusinessInventoryAuditCsv({ facilityId });
      if (!isCurrent()) return;
      await exportCsvContent("growpath-inventory-audit", csv);
      if (!isCurrent()) return;
      setAuditFeedback("Full inventory audit CSV is ready.");
    } catch (caught) {
      if (!isCurrent()) return;
      handleApiError(caught);
    } finally {
      auditInFlight.current = false;
      if (mounted.current) setExportingAudit(false);
    }
  }, [canReadAudit, facilityId, handleApiError, mounted]);

  if (loading && !hasLoaded) {
    return (
      <ScreenBoundary title="Inventory" {...backProps}>
        <View accessibilityLiveRegion="polite" style={styles.center}>
          <ActivityIndicator
            accessibilityRole="progressbar"
            accessibilityLabel="Loading facility inventory"
            color={palette.accent}
          />
        </View>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary title="Inventory" {...backProps}>
      <View style={styles.container}>
        <InlineError error={error} />
        {readFailed ? (
          <Text accessibilityLiveRegion="polite" style={styles.lockedText}>
            {hasLoaded
              ? "Previously loaded inventory — refresh failed. These are not current verified counts."
              : "Inventory unavailable. Retry to load current records."}
          </Text>
        ) : null}

        <View style={styles.headerRow}>
          <View>
            <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
              Facility Inventory
            </Text>
            <Text style={styles.muted}>
              {hasLoaded
                ? `${items.length} items${quantitySummary ? ` | ${quantitySummary}` : ""}`
                : "Inventory count unknown"}
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reload inventory"
              onPress={load}
              disabled={refreshing}
              accessibilityState={{ disabled: refreshing, busy: refreshing }}
              style={styles.ghostButton}
            >
              <Text style={styles.ghostText}>
                {refreshing ? "Refreshing…" : readFailed ? "Retry" : "Reload"}
              </Text>
            </Pressable>
            {canReadAudit ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Export facility inventory full audit CSV"
                accessibilityState={{ disabled: exportingAudit, busy: exportingAudit }}
                disabled={exportingAudit}
                onPress={exportFullAudit}
                style={[styles.ghostButton, exportingAudit && styles.disabled]}
              >
                <Text style={styles.ghostText}>
                  {exportingAudit ? "Preparing…" : "Full Audit CSV"}
                </Text>
              </Pressable>
            ) : null}
            {items.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Export facility inventory CSV"
                disabled={!readable}
                accessibilityState={{ disabled: !readable }}
                onPress={exportCurrent}
                style={styles.ghostButton}
              >
                <Text style={styles.ghostText}>Export CSV</Text>
              </Pressable>
            ) : null}
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

        {auditFeedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.auditFeedback}>
            {auditFeedback}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open sales and transfers"
          onPress={() => router.push("/home/facility/transfers" as any)}
          style={styles.ghostButton}
        >
          <Text style={styles.ghostText}>Sales & licensed transfers</Text>
        </Pressable>

        {items.length ? (
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
        ) : null}

        {!canWriteInventory ? (
          <Text style={styles.lockedText}>
            Your facility role or plan does not allow inventory changes. Viewers remain
            read-only; owners and managers can manage stock when inventory access is
            active.
          </Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create inventory item"
            disabled={!readable}
            accessibilityState={{ disabled: !readable }}
            onPress={() => readable && router.push("/home/facility/inventory/new")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Create Item</Text>
          </Pressable>
        )}

        {hasLoaded && (
          <BusinessInventoryImportPanel
            canWrite={canWriteInventory}
            onApplied={onRefresh}
            workspace={{ facilityId }}
          />
        )}

        <TextInput
          accessibilityLabel="Search facility inventory"
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
          <Text accessibilityLiveRegion="polite" style={styles.searchStatus}>
            Showing {sorted.length} of {items.length} inventory items.
          </Text>
        ) : null}

        {!hasLoaded ? null : sorted.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>
              {normalizedQuery && items.length
                ? `No inventory items match “${query.trim()}”.`
                : "No inventory items yet."}
            </Text>
            <Text style={styles.empty}>
              {normalizedQuery && items.length
                ? "Try another SKU, name, category, vendor, or location."
                : "Add real inputs, products, packaging, tools, or facility supplies before running AI reorder or stock-risk review."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(item, index) => itemId(item) || String(index)}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.accent}
                colors={[palette.accent]}
                progressBackgroundColor={palette.surface}
              />
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
                  accessibilityRole="link"
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
                    {item.vendor ? (
                      <Text style={styles.rowSub}>Vendor: {item.vendor}</Text>
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
                      {!item.sku ? (
                        <Text style={[styles.badge, styles.badgeWarn]}>missing SKU</Text>
                      ) : null}
                    </View>
                    <BusinessInventoryAlerts compact item={item} />
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

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    headerRow: {
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      marginBottom: 12
    },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900", marginBottom: 4 },
    muted: { color: palette.textMuted, fontWeight: "700" },
    auditFeedback: { color: palette.success, fontWeight: "800", marginBottom: 8 },
    privateCost: { color: palette.text, fontSize: 12, fontWeight: "800" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    ghostButton: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    ghostText: { color: palette.text, fontWeight: "900" },
    disabled: { opacity: 0.5 },
    summaryCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      backgroundColor: palette.surfaceMuted,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
      marginBottom: 12
    },
    summaryValue: { color: palette.text, fontSize: 20, fontWeight: "900" },
    summaryLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    warnText: { color: palette.warning },
    dangerText: { color: palette.danger },
    lockedText: { color: palette.warning, fontWeight: "800", marginBottom: 12 },
    emptyCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 14
    },
    emptyTitle: {
      color: palette.text,
      fontSize: 15,
      fontWeight: "900",
      marginBottom: 4
    },
    primaryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    empty: { color: palette.textMuted, fontWeight: "700" },
    searchInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      marginBottom: 8,
      marginTop: 12,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    searchStatus: {
      color: palette.textMuted,
      fontWeight: "700",
      marginBottom: 8
    },
    list: { paddingBottom: 24 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surface
    },
    rowMain: { flex: 1 },
    rowTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    rowSub: { color: palette.textMuted, fontWeight: "700", marginTop: 4 },
    badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    badge: {
      borderRadius: 999,
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 12,
      fontWeight: "900"
    },
    badgeOk: { color: palette.success, backgroundColor: palette.surfaceStrong },
    badgeWarn: { color: palette.warning, backgroundColor: palette.surfaceStrong },
    badgeDanger: { color: palette.danger, backgroundColor: palette.surfaceStrong },
    chev: { color: palette.textMuted, fontSize: 22, opacity: 0.5, paddingLeft: 10 },
    pressed: { opacity: 0.85 }
  });
