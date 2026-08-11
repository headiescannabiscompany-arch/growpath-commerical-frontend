import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    quantity:
      item?.quantity === undefined || item?.quantity === null
        ? ""
        : String(item.quantity),
    unit: String(item?.unit ?? ""),
    reorderPoint:
      item?.reorderPoint === undefined || item?.reorderPoint === null
        ? ""
        : String(item.reorderPoint),
    vendor: String(item?.vendor ?? ""),
    category: String(item?.category ?? ""),
    itemType: String(item?.itemType ?? item?.type ?? ""),
    location: String(item?.location ?? item?.storageLocation ?? ""),
    linkedProductId: String(item?.linkedProductId ?? ""),
    linkedIngredientId: String(item?.linkedIngredientId ?? ""),
    linkedGeneticsId: String(item?.linkedGeneticsId ?? ""),
    linkedGrowId: String(item?.linkedTrialId ?? item?.linkedGrowId ?? ""),
    status: String(item?.status ?? "active"),
    notes: String(item?.notes ?? "")
  };
}

export default function CommercialInventoryItemDetailRoute() {
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);
  const [saveError, setSaveError] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [draft, setDraft] = useState(() => draftFromItem(null));
  const loadInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (loadInFlightRef.current || saveInFlightRef.current) return;
      if (!id) {
        setLoading(false);
        setLoadError(new Error("This inventory link is missing its record ID."));
        return;
      }
      loadInFlightRef.current = true;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        setLoadError(null);

        const path =
          (endpoints as any)?.commercial?.inventoryItem?.(id) ??
          (endpoints as any)?.inventoryItemGlobal?.(id) ??
          `/api/inventory/${encodeURIComponent(id)}`;

        const res = await apiRequest(path, { method: "GET" });
        const nextItem = res?.item ?? res ?? null;
        setItem(nextItem);
        setDraft(draftFromItem(nextItem));
      } catch (e) {
        setLoadError(mapApiError(e) ?? e);
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, mapApiError]
  );

  useEffect(() => {
    if (!ent?.ready) return;
    if (ent.mode !== "commercial") {
      router.replace("/home" as any);
      return;
    }
    void load();
  }, [ent?.ready, ent?.mode, load, router]);

  const keys = useMemo(() => (item ? Object.keys(item).sort() : []), [item]);
  const canEdit = !!ent?.can?.(CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE);
  const canSave = canEdit && !!item && !!id && !saving;

  const save = useCallback(async () => {
    if (!id || !item || !canEdit || saveInFlightRef.current) return;
    const quantityText = draft.quantity.trim();
    const quantity = quantityText === "" ? undefined : Number(quantityText);
    if (quantity !== undefined && (!Number.isFinite(quantity) || quantity < 0)) {
      setSaveError(new Error("Quantity must be a number that is zero or greater."));
      setFeedback("");
      return;
    }
    const reorderText = draft.reorderPoint.trim();
    const reorderPoint = reorderText === "" ? undefined : Number(reorderText);
    if (
      reorderPoint !== undefined &&
      (!Number.isFinite(reorderPoint) || reorderPoint < 0)
    ) {
      setSaveError(new Error("Reorder point must be a number that is zero or greater."));
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
        name: draft.name.trim() || undefined,
        sku: draft.sku.trim() || undefined,
        unit: draft.unit.trim() || undefined,
        vendor: draft.vendor.trim() || undefined,
        category: draft.category.trim() || undefined,
        itemType: draft.itemType.trim() || undefined,
        location: draft.location.trim() || undefined,
        linkedProductId: draft.linkedProductId.trim() || undefined,
        linkedIngredientId: draft.linkedIngredientId.trim() || undefined,
        linkedGeneticsId: draft.linkedGeneticsId.trim() || undefined,
        linkedTrialId: draft.linkedGrowId.trim() || undefined,
        linkedGrowId: draft.linkedGrowId.trim() || undefined,
        status: draft.status.trim() || "active",
        notes: draft.notes.trim() || undefined
      };

      if (quantity !== undefined) payload.quantity = quantity;
      if (reorderPoint !== undefined) payload.reorderPoint = reorderPoint;

      const res = await apiRequest(path, {
        method: "PATCH",
        data: payload
      });

      const nextItem = res?.item ?? res ?? item;
      setItem(nextItem);
      setDraft(draftFromItem(nextItem));
      setFeedback("Inventory support record updated.");
    } catch (e) {
      setSaveError(mapApiError(e) ?? e);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }, [canEdit, draft, id, item, mapApiError]);

  if (!ent?.ready) return null;
  if (ent.mode !== "commercial") return null;

  const quantity = Number(item?.quantity ?? item?.qty ?? item?.onHand ?? 0);
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
            enabled={!saving}
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
                disabled={loading || saving}
                onPress={() => load()}
                style={[
                  styles.actionBtn,
                  (loading || saving) && styles.primaryBtnDisabled
                ]}
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
                {[item.vendor, item.category].filter(Boolean).join(" | ")}
              </Text>
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
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      value={draft.name}
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
                      style={styles.input}
                      placeholder="Item name"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail item name"
                    />

                    <Text style={styles.label}>SKU</Text>
                    <TextInput
                      value={draft.sku}
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, sku: v }))}
                      style={styles.input}
                      placeholder="SKU"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail item SKU"
                    />

                    <Text style={styles.label}>Quantity</Text>
                    <TextInput
                      value={draft.quantity}
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, quantity: v }))}
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      accessibilityLabel="Commercial detail item quantity"
                    />

                    <Text style={styles.label}>Unit</Text>
                    <TextInput
                      value={draft.unit}
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, unit: v }))}
                      style={styles.input}
                      placeholder="e.g., lbs"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail item unit"
                    />

                    <Text style={styles.label}>Reorder point</Text>
                    <TextInput
                      value={draft.reorderPoint}
                      editable={!saving}
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
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, vendor: v }))}
                      style={styles.input}
                      placeholder="Vendor"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail vendor"
                    />

                    <Text style={styles.label}>Category</Text>
                    <TextInput
                      value={draft.category}
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, category: v }))}
                      style={styles.input}
                      placeholder="Category"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail category"
                    />

                    <Text style={styles.label}>Item type</Text>
                    <TextInput
                      value={draft.itemType}
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, itemType: v }))}
                      style={styles.input}
                      placeholder="product, ingredient, packaging, plant, genetics..."
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail item type"
                    />

                    <Text style={styles.label}>Storage location</Text>
                    <TextInput
                      value={draft.location}
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, location: v }))}
                      style={styles.input}
                      placeholder="Storage location"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail location"
                    />

                    <Text style={styles.sectionLabel}>Optional links</Text>
                    <TextInput
                      value={draft.linkedProductId}
                      editable={!saving}
                      onChangeText={(v) =>
                        setDraft((d) => ({ ...d, linkedProductId: v }))
                      }
                      style={styles.input}
                      placeholder="Linked product ID"
                      placeholderTextColor={palette.textMuted}
                      autoCapitalize="none"
                      accessibilityLabel="Commercial detail linked product"
                    />
                    <TextInput
                      value={draft.linkedIngredientId}
                      editable={!saving}
                      onChangeText={(v) =>
                        setDraft((d) => ({ ...d, linkedIngredientId: v }))
                      }
                      style={styles.input}
                      placeholder="Linked ingredient ID"
                      placeholderTextColor={palette.textMuted}
                      autoCapitalize="none"
                      accessibilityLabel="Commercial detail linked ingredient"
                    />
                    <TextInput
                      value={draft.linkedGeneticsId}
                      editable={!saving}
                      onChangeText={(v) =>
                        setDraft((d) => ({ ...d, linkedGeneticsId: v }))
                      }
                      style={styles.input}
                      placeholder="Linked genetics ID"
                      placeholderTextColor={palette.textMuted}
                      autoCapitalize="none"
                      accessibilityLabel="Commercial detail linked genetics"
                    />
                    <TextInput
                      value={draft.linkedGrowId}
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, linkedGrowId: v }))}
                      style={styles.input}
                      placeholder="Linked product trial evidence run ID"
                      placeholderTextColor={palette.textMuted}
                      autoCapitalize="none"
                      accessibilityLabel="Commercial detail linked product trial evidence run"
                    />

                    <Text style={styles.label}>Status</Text>
                    <TextInput
                      value={draft.status}
                      editable={!saving}
                      onChangeText={(v) => setDraft((d) => ({ ...d, status: v }))}
                      style={styles.input}
                      placeholder="active, low_stock, out_of_stock, archived"
                      placeholderTextColor={palette.textMuted}
                      accessibilityLabel="Commercial detail status"
                    />

                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                      value={draft.notes}
                      editable={!saving}
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
