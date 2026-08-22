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
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  BusinessInventoryLot,
  BusinessInventoryMovement,
  BusinessInventoryMovementPage,
  mergeBusinessInventoryMovements
} from "@/api/businessInventory";
import { BusinessInventoryOperations } from "@/components/inventory/BusinessInventoryOperations";
import { BusinessInventoryAlerts } from "@/components/inventory/BusinessInventoryAlerts";
import CalendarDateField from "@/components/forms/CalendarDateField";

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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityInventoryDetailStyles(palette), [palette]);

  const itemId = String(params?.id ?? params?.itemId ?? "");

  const mapApiError = useApiErrorHandler();
  const [error, setError] = useState<any>(null);
  const handleApiError = useCallback(
    (caught: any) => setError(mapApiError(caught) ?? caught),
    [mapApiError]
  );
  const clearError = useCallback(() => setError(null), []);

  const [item, setItem] = useState<AnyRec | null>(null);
  const [lots, setLots] = useState<BusinessInventoryLot[]>([]);
  const [movements, setMovements] = useState<BusinessInventoryMovement[]>([]);
  const [movementPage, setMovementPage] =
    useState<BusinessInventoryMovementPage | null>(null);
  const [loadingOlderMovements, setLoadingOlderMovements] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editReorderPoint, setEditReorderPoint] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editAuthorizedUnitCost, setEditAuthorizedUnitCost] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editSourceFreshnessAt, setEditSourceFreshnessAt] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const canWriteInventory = Boolean(ent?.can?.(CAPABILITY_KEYS.INVENTORY_WRITE));

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;
      if (!itemId) {
        setLoading(false);
        setError(new Error("This inventory link is missing its record ID."));
        return;
      }

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.inventoryItem(facilityId, itemId));
        setItem((res as AnyRec)?.item ?? (res as AnyRec)?.updated ?? res ?? null);
        setLots(Array.isArray((res as AnyRec)?.lots) ? (res as AnyRec).lots : []);
        setMovements(
          Array.isArray((res as AnyRec)?.movements) ? (res as AnyRec).movements : []
        );
        setMovementPage(
          (res as AnyRec)?.movementPage
            ? {
                limit: Number((res as AnyRec).movementPage.limit || 0),
                hasMore: Boolean((res as AnyRec).movementPage.hasMore),
                nextCursor: (res as AnyRec).movementPage.nextCursor
                  ? String((res as AnyRec).movementPage.nextCursor)
                  : null
              }
            : null
        );
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, itemId, clearError, handleApiError]
  );

  const loadOlderMovements = useCallback(async () => {
    const cursor = String(movementPage?.nextCursor || "").trim();
    if (
      !facilityId ||
      !itemId ||
      !movementPage?.hasMore ||
      !cursor ||
      loadingOlderMovements
    ) {
      return;
    }
    setLoadingOlderMovements(true);
    try {
      clearError();
      const path = `${endpoints.inventoryItem(facilityId, itemId)}?movementLimit=50&movementCursor=${encodeURIComponent(cursor)}`;
      const res = (await apiRequest(path)) as AnyRec;
      const older = Array.isArray(res?.movements) ? res.movements : [];
      setMovements((current) => mergeBusinessInventoryMovements(current, older));
      setMovementPage(
        res?.movementPage
          ? {
              limit: Number(res.movementPage.limit || 0),
              hasMore: Boolean(res.movementPage.hasMore),
              nextCursor: res.movementPage.nextCursor
                ? String(res.movementPage.nextCursor)
                : null
            }
          : null
      );
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setLoadingOlderMovements(false);
    }
  }, [
    clearError,
    facilityId,
    handleApiError,
    itemId,
    loadingOlderMovements,
    movementPage
  ]);

  const saveDetails = useCallback(async () => {
    if (!facilityId || !itemId || !item || !canWriteInventory) return;

    if (!editName.trim() || !editUnit.trim()) {
      setError(new Error("Item name and stock-counting unit are required."));
      setFeedback("");
      return;
    }
    const reorderPointNumber = editReorderPoint.trim()
      ? Number(editReorderPoint)
      : 0;
    if (!Number.isFinite(reorderPointNumber) || reorderPointNumber < 0) {
      setError(new Error("Reorder point must be a number that is zero or greater."));
      setFeedback("");
      return;
    }
    const costText = editAuthorizedUnitCost.trim();
    const authorizedUnitCost = costText ? Number(costText) : null;
    if (
      authorizedUnitCost !== null &&
      (!Number.isFinite(authorizedUnitCost) || authorizedUnitCost < 0)
    ) {
      setError(
        new Error("Authorized unit cost must be a number that is zero or greater.")
      );
      setFeedback("");
      return;
    }
    const currency = editCurrency.trim().toLowerCase();
    if (currency && !/^[a-z]{3}$/.test(currency)) {
      setError(new Error("Currency must be a three-letter code such as USD."));
      setFeedback("");
      return;
    }
    if (authorizedUnitCost !== null && !currency) {
      setError(new Error("Choose a currency when recording an authorized unit cost."));
      setFeedback("");
      return;
    }
    const body = {
      name: editName.trim(),
      unit: editUnit.trim(),
      reorderPoint: reorderPointNumber,
      category: editCategory.trim(),
      vendor: editVendor.trim(),
      authorizedUnitCost,
      currency,
      sourceFreshnessAt: editSourceFreshnessAt || null
    };

    setSavingDetails(true);
    try {
      clearError();
      setFeedback("");
      await apiRequest(endpoints.inventoryItem(facilityId, itemId), {
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
    editCategory,
    editVendor,
    editAuthorizedUnitCost,
    editCurrency,
    editSourceFreshnessAt,
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
    load();
  }, [facilityId, itemId, load, router]);

  useEffect(() => {
    if (!item) return;
    setEditName(String(item.name ?? ""));
    setEditUnit(String(item.unit ?? ""));
    setEditReorderPoint(String(item.reorderPoint ?? 0));
    setEditCategory(String(item.category ?? ""));
    setEditVendor(String(item.vendor ?? ""));
    setEditAuthorizedUnitCost(
      item.authorizedUnitCost === null || item.authorizedUnitCost === undefined
        ? ""
        : String(item.authorizedUnitCost)
    );
    setEditCurrency(String(item.currency ?? ""));
    setEditSourceFreshnessAt(
      /^\d{4}-\d{2}-\d{2}/.test(String(item.sourceFreshnessAt ?? ""))
        ? String(item.sourceFreshnessAt).slice(0, 10)
        : ""
    );
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
            tintColor={palette.accent}
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        {feedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </Text>
        ) : null}

        {loading ? (
          <View accessibilityLiveRegion="polite" style={styles.loading}>
            <ActivityIndicator
              accessibilityRole="progressbar"
              accessibilityLabel="Loading facility inventory item"
              color={palette.accent}
            />
            <Text style={styles.muted}>Loading item...</Text>
          </View>
        ) : null}

        {!loading && !item ? (
          <View style={styles.notFoundCard}>
            <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
              Inventory item not found
            </Text>
            <Text style={styles.muted}>
              This inventory item is unavailable or no longer belongs to the active
              facility. Return to Inventory to choose an available record.
            </Text>
          </View>
        ) : null}

        {item ? (
          <>
            <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
              {item.name || "Inventory Item"}
            </Text>

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

            <BusinessInventoryAlerts item={item} />

            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                Item details
              </Text>
              <Text style={styles.muted}>
                Keep the identity, stock-counting unit, reorder settings, source, and
                reviewed cost context current.
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
                placeholderTextColor={palette.textMuted}
                editable={canWriteInventory && !savingDetails}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Inventory detail item unit"
                value={editUnit}
                onChangeText={setEditUnit}
                placeholder="Unit"
                placeholderTextColor={palette.textMuted}
                editable={canWriteInventory && !savingDetails}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Inventory detail reorder point"
                value={editReorderPoint}
                onChangeText={setEditReorderPoint}
                placeholder="Reorder point"
                placeholderTextColor={palette.textMuted}
                keyboardType="numeric"
                editable={canWriteInventory && !savingDetails}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Inventory detail category"
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="Category (optional)"
                placeholderTextColor={palette.textMuted}
                editable={canWriteInventory && !savingDetails}
                style={styles.input}
              />
              <Text style={styles.privateHelp}>
                Private workspace fields — vendor and authorized cost are not published
                to Storefront or discovery.
              </Text>
              <TextInput
                accessibilityLabel="Inventory detail vendor"
                value={editVendor}
                onChangeText={setEditVendor}
                placeholder="Vendor (private, optional)"
                placeholderTextColor={palette.textMuted}
                editable={canWriteInventory && !savingDetails}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Inventory detail authorized unit cost"
                value={editAuthorizedUnitCost}
                onChangeText={setEditAuthorizedUnitCost}
                placeholder="Authorized unit cost (private, optional)"
                placeholderTextColor={palette.textMuted}
                keyboardType="decimal-pad"
                editable={canWriteInventory && !savingDetails}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Inventory detail currency"
                value={editCurrency}
                onChangeText={setEditCurrency}
                placeholder="Currency, e.g. USD"
                placeholderTextColor={palette.textMuted}
                autoCapitalize="characters"
                maxLength={3}
                editable={canWriteInventory && !savingDetails}
                style={styles.input}
              />
              <CalendarDateField
                accessibilityLabel="Inventory detail source freshness date"
                disabled={!canWriteInventory || savingDetails}
                label="Source freshness date"
                maximumDate={new Date().toISOString().slice(0, 10)}
                onChange={setEditSourceFreshnessAt}
                optional
                placeholder="When this source or cost was last verified"
                value={editSourceFreshnessAt}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save inventory details"
                accessibilityState={{
                  disabled: savingDetails || !canWriteInventory
                }}
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
              <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                Record information
              </Text>
              <View style={styles.recordList}>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>SKU</Text>
                  <Text style={styles.recordValue}>{item.sku || "Not set"}</Text>
                </View>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Category</Text>
                  <Text style={styles.recordValue}>{item.category || "Not set"}</Text>
                </View>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Vendor</Text>
                  <Text style={styles.recordValue}>{item.vendor || "Not set"}</Text>
                </View>
                {item.authorizedUnitCost !== null &&
                item.authorizedUnitCost !== undefined &&
                Number.isFinite(Number(item.authorizedUnitCost)) ? (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Authorized unit cost</Text>
                    <Text style={styles.recordValue}>
                      {item.currency ? `${item.currency} ` : ""}
                      {Number(item.authorizedUnitCost)}
                    </Text>
                  </View>
                ) : item.currency ? (
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Currency</Text>
                    <Text style={styles.recordValue}>{item.currency}</Text>
                  </View>
                ) : null}
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Source last verified</Text>
                  <Text style={styles.recordValue}>
                    {formatTimestamp(item.sourceFreshnessAt)}
                  </Text>
                </View>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Added</Text>
                  <Text style={styles.recordValue}>
                    {formatTimestamp(item.createdAt)}
                  </Text>
                </View>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Last updated</Text>
                  <Text style={styles.recordValue}>
                    {formatTimestamp(item.updatedAt)}
                  </Text>
                </View>
              </View>
            </View>

            <BusinessInventoryOperations
              canWrite={canWriteInventory}
              itemId={itemId}
              itemQuantity={Number.isFinite(quantity) ? quantity : 0}
              lots={lots}
              loadingOlderMovements={loadingOlderMovements}
              movements={movements}
              hasMoreMovements={Boolean(movementPage?.hasMore)}
              onLoadOlderMovements={loadOlderMovements}
              onReload={() => load({ refresh: true })}
              workspace={{ facilityId }}
            />

            {canWriteInventory ? (
              <View style={[styles.card, styles.dangerCard]}>
                <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                  Remove inventory item
                </Text>
                <Text style={styles.muted}>
                  Use this only for a duplicate, test, or mistakenly created item.
                  Quantity changes belong in Inventory movement above.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove inventory item"
                  accessibilityState={{ disabled: deleting }}
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
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

export const createFacilityInventoryDetailStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { padding: 16, paddingBottom: 28 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900", marginBottom: 4 },
    muted: { color: palette.textMuted, marginBottom: 12 },

    loading: { paddingVertical: 18, alignItems: "center" },

    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.card,
      marginBottom: 12
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
    notFoundCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 16,
      backgroundColor: palette.card
    },
    summaryCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.card,
      marginBottom: 12,
      gap: 8
    },
    summaryText: { color: palette.textSoft, fontWeight: "800" },
    stockPill: {
      alignSelf: "flex-start",
      borderRadius: 999,
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 12,
      fontWeight: "900"
    },
    stockOk: { color: palette.success, backgroundColor: palette.accentSoft },
    stockWarn: { color: palette.warning, backgroundColor: palette.surfaceMuted },
    stockDanger: { color: palette.danger, backgroundColor: palette.surfaceMuted },

    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surface,
      color: palette.text,
      marginTop: 10
    },

    btn: {
      marginTop: 12,
      borderRadius: radius.card,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceStrong
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: palette.text, fontWeight: "900" },
    lockedText: { color: palette.warning, fontWeight: "800", marginBottom: 8 },
    privateHelp: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 18,
      marginTop: 10
    },
    pressed: { opacity: 0.85 },
    feedback: {
      color: palette.success,
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      padding: 10,
      fontWeight: "800",
      marginBottom: 12
    },
    recordList: { gap: 10 },
    recordRow: { gap: 2 },
    recordLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    recordValue: { color: palette.text, fontSize: 14, fontWeight: "700" },
    dangerCard: { borderColor: palette.danger, backgroundColor: palette.surfaceMuted },
    dangerButton: {
      marginTop: 12,
      borderRadius: radius.card,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: palette.danger
    },
    dangerButtonText: { color: palette.dangerText, fontWeight: "900" }
  });
