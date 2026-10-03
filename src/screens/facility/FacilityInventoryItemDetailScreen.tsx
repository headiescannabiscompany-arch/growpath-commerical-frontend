import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useFacilityRecordScope } from "@/features/facility/useFacilityRecordRead";

type AnyRec = Record<string, any>;

function formatTimestamp(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

export default function InventoryItemDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; itemId?: string }>();
  const scope = useFacilityRecordScope(params.id ?? params.itemId);
  return <InventoryItemDetailContent key={scope} />;
}

function InventoryItemDetailContent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; itemId?: string }>();
  const { selectedId: facilityId } = useFacility();
  const ent = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityInventoryDetailStyles(palette), [palette]);

  const itemId = String(params?.id ?? params?.itemId ?? "");

  const mapApiError = useApiErrorHandler();
  const mapper = useRef(mapApiError);
  mapper.current = mapApiError;
  const mounted = useRef(true);
  const readInFlight = useRef(false);
  const mutationInFlight = useRef(false);
  const draftInitialized = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [error, setError] = useState<any>(null);
  const handleApiError = useCallback((caught: any) => {
    if (mounted.current) setError(mapper.current(caught) ?? caught);
  }, []);
  const clearError = useCallback(() => setError(null), []);

  const [item, setItem] = useState<AnyRec | null>(null);
  const [lots, setLots] = useState<BusinessInventoryLot[]>([]);
  const [movements, setMovements] = useState<BusinessInventoryMovement[]>([]);
  const [movementPage, setMovementPage] = useState<BusinessInventoryMovementPage | null>(
    null
  );
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
  const [readFailed, setReadFailed] = useState(false);
  const [childBusy, setChildBusy] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const canWriteInventory = Boolean(ent?.can?.(CAPABILITY_KEYS.INVENTORY_WRITE));
  const readable = Boolean(item && !readFailed && !loading && !refreshing);
  const busy =
    loading ||
    refreshing ||
    loadingOlderMovements ||
    savingDetails ||
    deleting ||
    childBusy;
  const itemArchived = Boolean(item?.deletedAt || item?.itemStatus === "archived");
  const canEdit = canWriteInventory && readable && !busy && !itemArchived;

  const populateDraft = useCallback((record: AnyRec) => {
    setEditName(String(record.name ?? ""));
    setEditUnit(String(record.unit ?? ""));
    setEditReorderPoint(String(record.reorderPoint ?? 0));
    setEditCategory(String(record.category ?? ""));
    setEditVendor(String(record.vendor ?? ""));
    setEditAuthorizedUnitCost(
      record.authorizedUnitCost == null ? "" : String(record.authorizedUnitCost)
    );
    setEditCurrency(String(record.currency ?? ""));
    setEditSourceFreshnessAt(
      /^\d{4}-\d{2}-\d{2}/.test(String(record.sourceFreshnessAt ?? ""))
        ? String(record.sourceFreshnessAt).slice(0, 10)
        : ""
    );
    draftInitialized.current = true;
  }, []);

  const load = useCallback(
    async (opts?: {
      refresh?: boolean;
      afterWrite?: boolean;
      resetDraft?: boolean;
    }): Promise<boolean> => {
      if (
        !mounted.current ||
        readInFlight.current ||
        (mutationInFlight.current && !opts?.afterWrite)
      )
        return false;
      if (!facilityId) return false;
      if (!itemId) {
        setLoading(false);
        setError(new Error("This inventory link is missing its record ID."));
        return false;
      }
      readInFlight.current = true;
      setConfirmingRemove(false);
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.inventoryItem(facilityId, itemId));
        if (!mounted.current) return false;
        const record =
          res && Object.prototype.hasOwnProperty.call(res, "item")
            ? (res as AnyRec).item
            : res && Object.prototype.hasOwnProperty.call(res, "updated")
              ? (res as AnyRec).updated
              : res;
        if (
          !record ||
          typeof record !== "object" ||
          Array.isArray(record) ||
          String(record.id || record._id || "") !== itemId ||
          (record.quantity ?? record.quantityOnHand) == null ||
          String(record.quantity ?? record.quantityOnHand).trim() === "" ||
          !Number.isFinite(Number(record.quantity ?? record.quantityOnHand))
        ) {
          throw new Error(
            "The inventory record is unavailable. Retry to load the saved item."
          );
        }
        setItem(record);
        setReadFailed(false);
        if (!draftInitialized.current || opts?.resetDraft) populateDraft(record);
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
        return true;
      } catch (e) {
        if (!mounted.current) return false;
        setReadFailed(true);
        handleApiError(e);
        return false;
      } finally {
        readInFlight.current = false;
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [facilityId, itemId, clearError, handleApiError, populateDraft]
  );

  const loadOlderMovements = useCallback(async () => {
    const cursor = String(movementPage?.nextCursor || "").trim();
    if (
      !facilityId ||
      !itemId ||
      !movementPage?.hasMore ||
      !cursor ||
      !readable ||
      readInFlight.current ||
      mutationInFlight.current ||
      !mounted.current
    ) {
      return;
    }
    readInFlight.current = true;
    setConfirmingRemove(false);
    setLoadingOlderMovements(true);
    try {
      clearError();
      const path = `${endpoints.inventoryItem(facilityId, itemId)}?movementLimit=50&movementCursor=${encodeURIComponent(cursor)}`;
      const res = (await apiRequest(path)) as AnyRec;
      if (!mounted.current) return;
      if (!Array.isArray(res?.movements))
        throw new Error("Movement history is unavailable. Retry the same page.");
      const older = res.movements;
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
      readInFlight.current = false;
      if (mounted.current) setLoadingOlderMovements(false);
    }
  }, [clearError, facilityId, handleApiError, itemId, readable, movementPage]);

  const saveDetails = useCallback(async () => {
    if (
      !mounted.current ||
      readInFlight.current ||
      mutationInFlight.current ||
      !facilityId ||
      !itemId ||
      !canEdit ||
      confirmingRemove
    )
      return;

    if (!editName.trim() || !editUnit.trim()) {
      setError(new Error("Item name and stock-counting unit are required."));
      setFeedback("");
      return;
    }
    const reorderPointNumber = editReorderPoint.trim() ? Number(editReorderPoint) : 0;
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

    mutationInFlight.current = true;
    setSavingDetails(true);
    try {
      clearError();
      setFeedback("");
      await apiRequest(endpoints.inventoryItem(facilityId, itemId), {
        method: "PATCH",
        body
      });
      if (!mounted.current) return;
      const refreshed = await load({ refresh: true, afterWrite: true, resetDraft: true });
      if (mounted.current)
        setFeedback(
          refreshed
            ? "Item details saved."
            : "Item details saved, but current inventory could not be refreshed. Retry the read before another change."
        );
    } catch (e) {
      handleApiError(e);
    } finally {
      mutationInFlight.current = false;
      if (mounted.current) setSavingDetails(false);
    }
  }, [
    facilityId,
    itemId,
    canEdit,
    confirmingRemove,
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
    if (
      !mounted.current ||
      readInFlight.current ||
      mutationInFlight.current ||
      !facilityId ||
      !itemId ||
      !canEdit ||
      !confirmingRemove
    )
      return;
    mutationInFlight.current = true;
    setDeleting(true);
    setFeedback("");
    try {
      clearError();
      await apiRequest(endpoints.inventoryItem(facilityId, itemId), {
        method: "DELETE"
      });
      if (mounted.current) router.replace("/home/facility/inventory");
    } catch (e) {
      handleApiError(e);
    } finally {
      mutationInFlight.current = false;
      if (mounted.current) setDeleting(false);
    }
  }, [facilityId, itemId, canEdit, confirmingRemove, clearError, handleApiError, router]);

  const beginChildOperation = () => {
    if (
      !mounted.current ||
      !canEdit ||
      confirmingRemove ||
      readInFlight.current ||
      mutationInFlight.current
    )
      return false;
    mutationInFlight.current = true;
    setChildBusy(true);
    return true;
  };
  const endChildOperation = () => {
    mutationInFlight.current = false;
    if (mounted.current) setChildBusy(false);
  };

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, itemId, load, router]);

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh inventory item"
          accessibilityState={{ disabled: busy, busy: loading || refreshing }}
          disabled={busy}
          onPress={() => load({ refresh: true })}
          style={[styles.btn, busy && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>
            {loading || refreshing ? "Refreshing…" : readFailed ? "Retry" : "Refresh"}
          </Text>
        </Pressable>
        {item && (readFailed || refreshing) ? (
          <Text accessibilityLiveRegion="polite" style={styles.lockedText}>
            Previously loaded inventory — current stock has not been verified. Retry or
            wait for the read before making changes.
          </Text>
        ) : null}
        {itemArchived ? (
          <Text style={styles.lockedText}>
            This archived item is read-only. Its ledger history is retained.
          </Text>
        ) : null}
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
              Inventory item unavailable
            </Text>
            <Text style={styles.muted}>
              The saved item could not be loaded. Stock and history are not verified.
              Retry the read or return to Inventory to choose an available record.
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
                editable={canEdit && !confirmingRemove}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Inventory detail item unit"
                value={editUnit}
                onChangeText={setEditUnit}
                placeholder="Unit"
                placeholderTextColor={palette.textMuted}
                editable={canEdit && !confirmingRemove}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Inventory detail reorder point"
                value={editReorderPoint}
                onChangeText={setEditReorderPoint}
                placeholder="Reorder point"
                placeholderTextColor={palette.textMuted}
                keyboardType="numeric"
                editable={canEdit && !confirmingRemove}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Inventory detail category"
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="Category (optional)"
                placeholderTextColor={palette.textMuted}
                editable={canEdit && !confirmingRemove}
                style={styles.input}
              />
              <Text style={styles.privateHelp}>
                Private workspace fields — vendor and authorized cost are not published to
                Storefront or discovery.
              </Text>
              <TextInput
                accessibilityLabel="Inventory detail vendor"
                value={editVendor}
                onChangeText={setEditVendor}
                placeholder="Vendor (private, optional)"
                placeholderTextColor={palette.textMuted}
                editable={canEdit && !confirmingRemove}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Inventory detail authorized unit cost"
                value={editAuthorizedUnitCost}
                onChangeText={setEditAuthorizedUnitCost}
                placeholder="Authorized unit cost (private, optional)"
                placeholderTextColor={palette.textMuted}
                keyboardType="decimal-pad"
                editable={canEdit && !confirmingRemove}
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
                editable={canEdit && !confirmingRemove}
                style={styles.input}
              />
              <CalendarDateField
                accessibilityLabel="Inventory detail source freshness date"
                disabled={!canEdit || confirmingRemove}
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
                  disabled: !canEdit || confirmingRemove
                }}
                onPress={saveDetails}
                disabled={!canEdit || confirmingRemove}
                style={({ pressed }) => [
                  styles.btn,
                  (!canEdit || confirmingRemove) && styles.btnDisabled,
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
              blocked={!readable || busy || confirmingRemove || itemArchived}
              historyBlocked={!readable || busy || confirmingRemove}
              onBeginOperation={beginChildOperation}
              onEndOperation={endChildOperation}
              itemId={itemId}
              itemQuantity={Number.isFinite(quantity) ? quantity : 0}
              lots={lots}
              loadingOlderMovements={loadingOlderMovements}
              movements={movements}
              hasMoreMovements={Boolean(movementPage?.hasMore)}
              onLoadOlderMovements={loadOlderMovements}
              onReload={async () => {
                await load({ refresh: true, afterWrite: true });
              }}
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
                  accessibilityState={{ disabled: !canEdit || confirmingRemove }}
                  onPress={() => {
                    if (canEdit && !readInFlight.current && !mutationInFlight.current)
                      setConfirmingRemove(true);
                  }}
                  disabled={!canEdit || confirmingRemove}
                  style={({ pressed }) => [
                    styles.dangerButton,
                    (!canEdit || confirmingRemove) && styles.btnDisabled,
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={styles.dangerButtonText}>
                    {deleting ? "Removing..." : "Remove item"}
                  </Text>
                </Pressable>
                {confirmingRemove ? (
                  <View accessibilityLabel="Confirm inventory removal">
                    <Text style={styles.cardTitle}>
                      Remove {String(item.name || "this inventory item")}?
                    </Text>
                    <Text style={styles.muted}>
                      This archives the saved item from active inventory and retains its
                      ledger history. Unsaved edits are not saved. Items or lots with
                      stock remaining cannot be removed. This screen has no restore
                      action.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Cancel inventory removal"
                      disabled={deleting}
                      accessibilityState={{ disabled: deleting }}
                      onPress={() => setConfirmingRemove(false)}
                      style={styles.btn}
                    >
                      <Text style={styles.btnText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Confirm remove inventory item"
                      disabled={!canEdit}
                      accessibilityState={{ disabled: !canEdit }}
                      onPress={removeItem}
                      style={styles.dangerButton}
                    >
                      <Text style={styles.dangerButtonText}>
                        {deleting ? "Removing…" : "Confirm removal"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
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
