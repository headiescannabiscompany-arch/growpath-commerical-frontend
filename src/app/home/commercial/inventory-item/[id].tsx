import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
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
import { useAuth } from "@/auth/AuthContext";

type AnyRec = Record<string, any>;

function safeId(params: Record<string, any>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function renderKV(
  obj: AnyRec | null,
  key: string,
  styles: ReturnType<typeof createCommercialInventoryItemDetailStyles>
) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;

  return (
    <View key={key} style={styles.kv}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v} selectable>
        {typeof v === "string" ? v : JSON.stringify(v)}
      </Text>
    </View>
  );
}

function draftFromItem(item: AnyRec | null) {
  return {
    name: String(item?.name ?? ""),
    sku: String(item?.sku ?? ""),
    unit: String(item?.unit ?? ""),
    reorderPoint:
      item?.reorderPoint === undefined || item?.reorderPoint === null
        ? ""
        : String(item.reorderPoint),
    vendor: String(item?.vendor ?? ""),
    category: String(item?.category ?? ""),
    authorizedUnitCost:
      item?.authorizedUnitCost === undefined || item?.authorizedUnitCost === null
        ? ""
        : String(item.authorizedUnitCost),
    currency: String(item?.currency ?? ""),
    sourceFreshnessAt: /^\d{4}-\d{2}-\d{2}/.test(String(item?.sourceFreshnessAt ?? ""))
      ? String(item?.sourceFreshnessAt).slice(0, 10)
      : "",
    notes: String(item?.notes ?? "")
  };
}

function inventoryScope(values: unknown[], generation: number) {
  return {
    generation,
    matches: (next: unknown[]) => values.every((value, index) => value === next[index])
  };
}

export default function CommercialInventoryItemDetailRoute() {
  const auth = useAuth();
  const ent = useEntitlements();
  const params = useLocalSearchParams();
  const values = [
    auth.user?.id || auth.user?._id,
    auth.token,
    auth.isAuthed,
    auth.isHydrating,
    ent.ready,
    ent.mode,
    ent.facilityId,
    ent.facilityRole,
    !!ent.can?.(CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE),
    safeId(params)
  ];
  // Keep session identity in a closure, not a rendered React key or URL.
  const [scope, setScope] = useState(() => inventoryScope(values, 0));
  if (!scope.matches(values)) {
    setScope(inventoryScope(values, scope.generation + 1));
    return null;
  }
  if (!auth.isAuthed || auth.isHydrating || !ent.ready) return null;
  return <CommercialInventoryItemDetailContent key={scope.generation} />;
}

function CommercialInventoryItemDetailContent() {
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => createCommercialInventoryItemDetailStyles(palette),
    [palette]
  );
  const router = useRouter();
  const ent = useEntitlements();
  const params = useLocalSearchParams();
  const id = safeId(params as any);

  const mapApiError = useApiErrorHandler();

  const [item, setItem] = useState<AnyRec | null>(null);
  const [lots, setLots] = useState<BusinessInventoryLot[]>([]);
  const [movements, setMovements] = useState<BusinessInventoryMovement[]>([]);
  const [movementPage, setMovementPage] = useState<BusinessInventoryMovementPage | null>(
    null
  );
  const [loadingOlderMovements, setLoadingOlderMovements] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiveError, setArchiveError] = useState<any>(null);
  const [childBusy, setChildBusy] = useState(false);
  const [archivedHere, setArchivedHere] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);
  const [saveError, setSaveError] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [draft, setDraft] = useState(() => draftFromItem(null));
  const loadInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const mounted = useRef(true);
  const draftInitialized = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const canEdit = !!ent?.can?.(CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE);
  const itemArchived = Boolean(
    archivedHere || item?.deletedAt || item?.itemStatus === "archived"
  );
  const readable = !!item && !loadError && !loading && !refreshing;
  const busy =
    loading || refreshing || loadingOlderMovements || saving || archiving || childBusy;
  const canMutate = canEdit && readable && !busy && !itemArchived;
  const canSave = canMutate && !confirmingArchive;
  const fieldsLocked = busy || confirmingArchive || !readable || itemArchived;
  const itemPath = useCallback(
    () =>
      (endpoints as any)?.commercial?.inventoryItem?.(id) ??
      (endpoints as any)?.inventoryItemGlobal?.(id) ??
      `/api/inventory/${encodeURIComponent(id)}`,
    [id]
  );

  const matchingItem = useCallback(
    (response: any) => {
      const record =
        response && Object.prototype.hasOwnProperty.call(response, "item")
          ? response.item
          : response;
      const identity = record?.id ?? record?._id;
      const quantity =
        record?.quantity ?? record?.quantityOnHand ?? record?.qty ?? record?.onHand;
      if (
        !record ||
        typeof record !== "object" ||
        Array.isArray(record) ||
        typeof identity !== "string" ||
        identity !== id ||
        (record.id && record._id && record.id !== record._id) ||
        quantity == null ||
        typeof quantity === "boolean" ||
        String(quantity).trim() === "" ||
        !Number.isFinite(Number(quantity))
      ) {
        throw new Error(
          "The inventory record is unavailable. Retry to load the saved item."
        );
      }
      return record;
    },
    [id]
  );

  const load = useCallback(
    async (opts?: { refresh?: boolean; afterWrite?: boolean }) => {
      if (
        !mounted.current ||
        loadInFlightRef.current ||
        (saveInFlightRef.current && !opts?.afterWrite) ||
        archivedHere
      )
        return;
      if (!id) {
        setLoading(false);
        setLoadError(new Error("This inventory link is missing its record ID."));
        return;
      }
      loadInFlightRef.current = true;
      setConfirmingArchive(false);

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        setLoadError(null);

        const res = await apiRequest(itemPath(), { method: "GET" });
        if (!mounted.current) return;
        const nextItem = matchingItem(res);
        setItem(nextItem);
        setLots(Array.isArray(res?.lots) ? res.lots : []);
        setMovements(Array.isArray(res?.movements) ? res.movements : []);
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
        if (!draftInitialized.current) {
          setDraft(draftFromItem(nextItem));
          draftInitialized.current = true;
        }
      } catch (e) {
        if (mounted.current) setLoadError(mapApiError(e) ?? e);
      } finally {
        loadInFlightRef.current = false;
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [id, mapApiError, itemPath, matchingItem, archivedHere]
  );

  const loadOlderMovements = useCallback(async () => {
    const cursor = String(movementPage?.nextCursor || "").trim();
    if (
      !mounted.current ||
      !id ||
      !readable ||
      !movementPage?.hasMore ||
      !cursor ||
      loadInFlightRef.current ||
      saveInFlightRef.current ||
      confirmingArchive
    )
      return;

    loadInFlightRef.current = true;
    setLoadingOlderMovements(true);
    setLoadError(null);
    try {
      const basePath =
        (endpoints as any)?.commercial?.inventoryItem?.(id) ??
        (endpoints as any)?.inventoryItemGlobal?.(id) ??
        `/api/inventory/${encodeURIComponent(id)}`;
      const res = await apiRequest(
        `${basePath}?movementLimit=50&movementCursor=${encodeURIComponent(cursor)}`,
        { method: "GET" }
      );
      if (!mounted.current) return;
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
      if (mounted.current) setLoadError(mapApiError(caught) ?? caught);
    } finally {
      loadInFlightRef.current = false;
      if (mounted.current) setLoadingOlderMovements(false);
    }
  }, [id, readable, confirmingArchive, mapApiError, movementPage]);

  useEffect(() => {
    if (!ent?.ready) return;
    if (ent.mode !== "commercial") {
      router.replace("/home" as any);
      return;
    }
    void load();
  }, [ent?.ready, ent?.mode, load, router]);

  const keys = useMemo(() => (item ? Object.keys(item).sort() : []), [item]);
  const save = useCallback(async () => {
    if (
      !mounted.current ||
      !id ||
      !item ||
      !canSave ||
      loadInFlightRef.current ||
      saveInFlightRef.current
    )
      return;
    if (!draft.name.trim() || !draft.sku.trim() || !draft.unit.trim()) {
      setSaveError(new Error("Name, SKU, and stock-counting unit are required."));
      setFeedback("");
      return;
    }
    const reorderText = draft.reorderPoint.trim();
    const reorderPoint = reorderText === "" ? null : Number(reorderText);
    if (reorderPoint !== null && (!Number.isFinite(reorderPoint) || reorderPoint < 0)) {
      setSaveError(new Error("Reorder point must be a number that is zero or greater."));
      setFeedback("");
      return;
    }
    const costText = draft.authorizedUnitCost.trim();
    const authorizedUnitCost = costText === "" ? null : Number(costText);
    if (
      authorizedUnitCost !== null &&
      (!Number.isFinite(authorizedUnitCost) || authorizedUnitCost < 0)
    ) {
      setSaveError(
        new Error("Authorized unit cost must be a number that is zero or greater.")
      );
      setFeedback("");
      return;
    }
    const currency = draft.currency.trim().toLowerCase();
    if (currency && !/^[a-z]{3}$/.test(currency)) {
      setSaveError(new Error("Currency must be a three-letter code such as USD."));
      setFeedback("");
      return;
    }
    saveInFlightRef.current = true;
    setSaving(true);
    setSaveError(null);
    setFeedback("");
    try {
      const path =
        (endpoints as any)?.commercial?.inventoryItem?.(id) ??
        (endpoints as any)?.inventoryItemGlobal?.(id) ??
        `/api/inventory/${encodeURIComponent(id)}`;

      const payload: AnyRec = {
        name: draft.name.trim(),
        sku: draft.sku.trim(),
        unit: draft.unit.trim(),
        reorderPoint,
        vendor: draft.vendor.trim(),
        category: draft.category.trim(),
        authorizedUnitCost,
        currency,
        sourceFreshnessAt: draft.sourceFreshnessAt || null,
        notes: draft.notes.trim()
      };

      const res = await apiRequest(path, {
        method: "PATCH",
        data: payload
      });
      if (!mounted.current) return;
      const nextItem = matchingItem(res);
      setItem(nextItem);
      setDraft(draftFromItem(nextItem));
      setFeedback("Inventory support record updated.");
    } catch (e) {
      if (mounted.current) setSaveError(mapApiError(e) ?? e);
    } finally {
      saveInFlightRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [canSave, draft, id, item, mapApiError, matchingItem]);

  const archive = async () => {
    if (
      !mounted.current ||
      !canMutate ||
      !confirmingArchive ||
      loadInFlightRef.current ||
      saveInFlightRef.current
    )
      return;
    saveInFlightRef.current = true;
    setArchiving(true);
    setArchiveError(null);
    try {
      await apiRequest(itemPath(), { method: "DELETE" });
      if (!mounted.current) return;
      setArchivedHere(true);
      setConfirmingArchive(false);
      router.replace("/home/commercial/inventory");
    } catch (error) {
      if (mounted.current) setArchiveError(mapApiError(error) ?? error);
    } finally {
      saveInFlightRef.current = false;
      if (mounted.current) setArchiving(false);
    }
  };

  const beginChildOperation = () => {
    if (
      !mounted.current ||
      !canSave ||
      loadInFlightRef.current ||
      saveInFlightRef.current
    )
      return false;
    saveInFlightRef.current = true;
    setChildBusy(true);
    return true;
  };
  const endChildOperation = () => {
    saveInFlightRef.current = false;
    if (mounted.current) setChildBusy(false);
  };

  if (!ent?.ready) return null;
  if (ent.mode !== "commercial") return null;

  const quantity = Number(
    item?.quantity ?? item?.quantityOnHand ?? item?.qty ?? item?.onHand ?? 0
  );
  const reorderPoint = Number(item?.reorderPoint ?? 0);
  const stockLabel =
    String(item?.status || "").toLowerCase() === "out_of_stock" || quantity <= 0
      ? "out of stock"
      : String(item?.status || "").toLowerCase() === "low_stock" ||
          (Number.isFinite(reorderPoint) &&
            reorderPoint > 0 &&
            Number.isFinite(quantity) &&
            quantity <= reorderPoint)
        ? "low stock"
        : "stock ok";

  return (
    <ScreenBoundary
      title="Inventory Support Record"
      showBack
      backFallbackHref="/home/commercial/inventory"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            colors={[palette.accent]}
            enabled={!busy}
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
            tintColor={palette.accent}
          />
        }
      >
        {loadError ? (
          <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
            <InlineError error={loadError} />
            {id ? (
              <TouchableOpacity
                accessibilityLabel="Retry commercial inventory record"
                accessibilityRole="button"
                disabled={busy}
                onPress={() => load()}
                style={[styles.actionBtn, busy && styles.primaryBtnDisabled]}
              >
                <Text style={styles.actionText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={styles.headerRow}>
          <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
            Inventory Support Record
          </Text>
          <Text style={styles.muted}>id: {id || "(missing)"}</Text>
        </View>

        {item && (loading || refreshing || loadError) ? (
          <Text style={styles.muted}>
            Showing previously loaded inventory. Retry or wait for the read before making
            changes.
          </Text>
        ) : null}
        {itemArchived ? (
          <Text style={styles.muted}>
            This archived item is read-only. Its record and audit history are retained.
          </Text>
        ) : null}

        {loading ? (
          <View
            accessibilityLabel="Loading commercial inventory record"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
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
            {item.vendor || item.category ? (
              <Text style={styles.muted}>
                {[item.vendor ? `Vendor: ${item.vendor}` : "", item.category]
                  .filter(Boolean)
                  .join(" | ")}
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
            {item.itemType || item.location || item.storageLocation ? (
              <Text style={styles.muted}>
                {[item.itemType || item.type, item.location || item.storageLocation]
                  .filter(Boolean)
                  .join(" | ")}
              </Text>
            ) : null}
          </View>
        ) : null}

        {item ? <BusinessInventoryAlerts item={item} /> : null}

        {item ? (
          <BusinessInventoryOperations
            canWrite={canEdit && !itemArchived}
            blocked={!readable || busy || confirmingArchive || itemArchived}
            historyBlocked={!readable || busy || confirmingArchive}
            onBeginOperation={beginChildOperation}
            onEndOperation={endChildOperation}
            itemId={id}
            itemQuantity={Number.isFinite(quantity) ? quantity : 0}
            lots={lots}
            loadingOlderMovements={loadingOlderMovements}
            movements={movements}
            hasMoreMovements={Boolean(movementPage?.hasMore)}
            onLoadOlderMovements={loadOlderMovements}
            onReload={() => load({ refresh: true, afterWrite: true })}
            workspace={{}}
          />
        ) : null}

        {item ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              Connected Workflows
            </Text>
            <Text style={styles.workflowText}>
              Use inventory support as the stock record behind products, product trial
              evidence runs, batches/lots, packaging, plant material, and garden-center
              catalog items.
            </Text>
            <View style={styles.actionGrid}>
              {item.linkedProductId ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Open linked commercial product"
                  onPress={() =>
                    router.push({
                      pathname: "/home/commercial/products/[productId]",
                      params: { productId: String(item.linkedProductId) }
                    })
                  }
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionText}>Linked Product</Text>
                </TouchableOpacity>
              ) : null}
              {item.linkedTrialId || item.linkedGrowId ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Open linked commercial product trial evidence run"
                  onPress={() =>
                    router.push({
                      pathname: "/home/commercial/evidence-runs/[id]",
                      params: { id: String(item.linkedTrialId || item.linkedGrowId) }
                    })
                  }
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionText}>Linked Evidence Run</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open commercial products from inventory"
                onPress={() => router.push("/home/commercial/products" as any)}
                style={styles.actionBtn}
              >
                <Text style={styles.actionText}>Products</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open commercial batch planner from inventory"
                onPress={() => router.push("/home/commercial/batch-planner" as any)}
                style={styles.actionBtn}
              >
                <Text style={styles.actionText}>Batch Planner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open commercial product trials from inventory"
                onPress={() => router.push("/home/commercial/trials" as any)}
                style={styles.actionBtn}
              >
                <Text style={styles.actionText}>Product Trials</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open commercial storefront from inventory"
                onPress={() => router.push("/home/commercial/storefront" as any)}
                style={styles.actionBtn}
              >
                <Text style={styles.actionText}>Storefront</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {item || (!loading && !loadError) ? (
          <View style={styles.card}>
            {item ? (
              <>
                <Text
                  accessibilityRole="header"
                  aria-level={2}
                  style={styles.sectionTitle}
                >
                  Update Item
                </Text>
                {!canEdit ? (
                  <Text style={styles.muted}>
                    You do not have permission to update inventory items.
                  </Text>
                ) : (
                  <View style={styles.form}>
                    <Text style={styles.auditOnlyHelp}>
                      Quantity changes use Inventory movement above so each stock change
                      keeps its reason and audit history.
                    </Text>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      value={draft.name}
                      editable={!fieldsLocked}
                      onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
                      style={styles.input}
                      placeholder="Item name"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail item name"
                    />

                    <Text style={styles.label}>SKU</Text>
                    <TextInput
                      value={draft.sku}
                      editable={!fieldsLocked}
                      onChangeText={(v) => setDraft((d) => ({ ...d, sku: v }))}
                      style={styles.input}
                      placeholder="SKU"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail item SKU"
                    />

                    <Text style={styles.label}>Unit</Text>
                    <TextInput
                      value={draft.unit}
                      editable={!fieldsLocked}
                      onChangeText={(v) => setDraft((d) => ({ ...d, unit: v }))}
                      style={styles.input}
                      placeholder="e.g., lbs"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail item unit"
                    />

                    <Text style={styles.label}>Reorder point</Text>
                    <TextInput
                      value={draft.reorderPoint}
                      editable={!fieldsLocked}
                      onChangeText={(v) => setDraft((d) => ({ ...d, reorderPoint: v }))}
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      accessibilityLabel="Commercial detail reorder point"
                    />

                    <Text style={styles.label}>Vendor</Text>
                    <TextInput
                      value={draft.vendor}
                      editable={!fieldsLocked}
                      onChangeText={(v) => setDraft((d) => ({ ...d, vendor: v }))}
                      style={styles.input}
                      placeholder="Vendor"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail vendor"
                    />

                    <Text style={styles.label}>Category</Text>
                    <TextInput
                      value={draft.category}
                      editable={!fieldsLocked}
                      onChangeText={(v) => setDraft((d) => ({ ...d, category: v }))}
                      style={styles.input}
                      placeholder="Category"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail category"
                    />

                    <Text style={styles.label}>Authorized unit cost</Text>
                    <TextInput
                      value={draft.authorizedUnitCost}
                      editable={!fieldsLocked}
                      onChangeText={(v) =>
                        setDraft((d) => ({ ...d, authorizedUnitCost: v }))
                      }
                      style={styles.input}
                      placeholder="Known reviewed unit cost"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="decimal-pad"
                      accessibilityLabel="Commercial detail authorized unit cost"
                    />

                    <Text style={styles.label}>Currency</Text>
                    <TextInput
                      value={draft.currency}
                      editable={!fieldsLocked}
                      onChangeText={(v) => setDraft((d) => ({ ...d, currency: v }))}
                      style={styles.input}
                      placeholder="e.g., USD"
                      placeholderTextColor={palette.textMuted}
                      autoCapitalize="none"
                      accessibilityLabel="Commercial detail currency"
                    />

                    <CalendarDateField
                      accessibilityLabel="Commercial detail source freshness date"
                      disabled={fieldsLocked}
                      label="Source freshness date"
                      maximumDate={new Date().toISOString().slice(0, 10)}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          sourceFreshnessAt: value
                        }))
                      }
                      optional
                      placeholder="When this source or cost was last verified"
                      value={draft.sourceFreshnessAt}
                    />

                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                      value={draft.notes}
                      editable={!fieldsLocked}
                      onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
                      style={[styles.input, styles.notesInput]}
                      placeholder="Notes"
                      placeholderTextColor={palette.textMuted}
                      multiline
                      accessibilityLabel="Commercial detail notes"
                    />

                    {saving ? (
                      <View
                        accessibilityLabel="Saving commercial inventory record in progress"
                        accessibilityLiveRegion="polite"
                        accessibilityRole="progressbar"
                        style={styles.progressRow}
                      >
                        <ActivityIndicator color={palette.accent} />
                        <Text style={styles.muted}>Saving inventory record...</Text>
                      </View>
                    ) : null}
                    {saveError ? (
                      <View
                        accessible
                        accessibilityLiveRegion="assertive"
                        accessibilityRole="alert"
                      >
                        <InlineError error={saveError} />
                      </View>
                    ) : null}
                    {feedback ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        accessibilityRole="alert"
                        style={styles.success}
                      >
                        {feedback}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      onPress={save}
                      disabled={!canSave}
                      accessibilityRole="button"
                      accessibilityLabel="Save commercial inventory changes"
                      accessibilityState={{ disabled: !canSave, busy: saving }}
                      style={[styles.primaryBtn, !canSave && styles.primaryBtnDisabled]}
                    >
                      <Text style={styles.primaryBtnText}>
                        {saving ? "Saving..." : "Save Changes"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.muted}>
                {id
                  ? "No inventory record returned."
                  : "Missing inventory record id in route params."}
              </Text>
            )}
          </View>
        ) : null}

        {item && canEdit && !itemArchived ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              Archive Item
            </Text>
            <Text style={styles.muted}>
              Archive an unused, duplicate or mistaken item from active inventory. Its
              saved record and audit history remain available.
            </Text>
            {confirmingArchive ? (
              <View style={styles.form}>
                <Text
                  accessibilityRole="header"
                  aria-level={3}
                  style={styles.sectionTitle}
                >
                  {`Archive "${item.name || item.sku || "this inventory item"}"?`}
                </Text>
                <Text style={styles.muted}>
                  This archives the saved item and retains its record and audit history.
                  Unsaved edits are not saved. Items or active lots with stock remaining
                  cannot be archived. This screen has no restore action.
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Cancel commercial inventory archive"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={() => {
                    setConfirmingArchive(false);
                    setArchiveError(null);
                  }}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Confirm archive commercial inventory item"
                  accessibilityState={{ disabled: !canMutate, busy: archiving }}
                  disabled={!canMutate}
                  onPress={archive}
                  style={[styles.actionBtn, !canMutate && styles.primaryBtnDisabled]}
                >
                  <Text style={styles.actionText}>
                    {archiving ? "Archiving..." : "Confirm Archive"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Archive commercial inventory item"
                accessibilityState={{ disabled: !canMutate }}
                disabled={!canMutate}
                onPress={() => {
                  if (
                    !mounted.current ||
                    !canMutate ||
                    loadInFlightRef.current ||
                    saveInFlightRef.current
                  )
                    return;
                  setArchiveError(null);
                  setConfirmingArchive(true);
                }}
                style={[styles.actionBtn, !canMutate && styles.primaryBtnDisabled]}
              >
                <Text style={styles.actionText}>Archive Item</Text>
              </TouchableOpacity>
            )}
            {archiveError ? (
              <View accessibilityRole="alert" accessibilityLiveRegion="assertive">
                <InlineError error={archiveError} />
              </View>
            ) : null}
          </View>
        ) : null}

        {item ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              Details
            </Text>
            <View style={styles.kvWrap}>
              {keys.map((k) => renderKV(item, k, styles))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

export function createCommercialInventoryItemDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { backgroundColor: palette.page, padding: 16, gap: 12 },
    headerRow: { gap: 4 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    muted: { color: palette.textMuted },
    privateCost: { color: palette.text, fontWeight: "800" },
    auditOnlyHelp: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 17
    },
    workflowText: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19
    },

    loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
    progressRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 8
    },
    errorPanel: { alignItems: "flex-start", gap: 8 },

    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surface
    },
    summaryCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surfaceMuted,
      gap: 8
    },
    summaryText: { color: palette.text, fontWeight: "800" },
    stockPill: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderRadius: 999,
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 12,
      fontWeight: "900"
    },
    stockOk: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.success,
      color: palette.success
    },
    stockWarn: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      color: palette.warning
    },
    stockDanger: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      color: palette.danger
    },

    kvWrap: { marginTop: 6 },
    kv: { gap: 4, marginBottom: 10 },
    k: { color: palette.textMuted, fontSize: 12 },
    v: { color: palette.text, fontSize: 14 },

    sectionTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 8
    },
    form: { gap: 8 },
    label: { color: palette.textMuted, fontSize: 12 },
    sectionLabel: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "900",
      marginTop: 6,
      textTransform: "uppercase"
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.surface,
      color: palette.text
    },
    notesInput: { minHeight: 78, textAlignVertical: "top" },
    primaryBtn: {
      marginTop: 8,
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12,
      alignItems: "center"
    },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: palette.accentText, fontWeight: "800" },
    success: {
      color: palette.success,
      fontSize: 13,
      fontWeight: "800"
    },
    actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    actionBtn: {
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: palette.surfaceMuted
    },
    actionText: { color: palette.link, fontSize: 12, fontWeight: "900" }
  });
}
