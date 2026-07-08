import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

function safeId(params: Record<string, any>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function renderKV(obj: AnyRec | null, key: string) {
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
  const router = useRouter();
  const ent = useEntitlements();
  const params = useLocalSearchParams();
  const id = safeId(params as any);

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useCallback(
    (err: any) => {
      const handler = apiErr?.handleApiError ?? apiErr?.[1];
      if (handler) handler(err);
    },
    [apiErr]
  );
  const clearError = useCallback(() => {
    const handler = apiErr?.clearError ?? apiErr?.[2];
    if (handler) handler();
  }, [apiErr]);

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => draftFromItem(null));

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!id) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();

        const path =
          (endpoints as any)?.commercial?.inventoryItem?.(id) ??
          (endpoints as any)?.inventoryItemGlobal?.(id) ??
          `/api/inventory/${encodeURIComponent(id)}`;

        const res = await apiRequest(path, { method: "GET" });
        const nextItem = res?.item ?? res ?? null;
        setItem(nextItem);
        setDraft(draftFromItem(nextItem));
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearError, handleApiError, id]
  );

  useEffect(() => {
    if (ent?.ready && ent.mode !== "commercial") {
      router.replace("/home" as any);
      return;
    }
    load();
  }, [ent?.ready, ent?.mode, load, router]);

  const keys = useMemo(() => (item ? Object.keys(item).sort() : []), [item]);
  const canEdit = !!ent?.can?.(CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE);

  const save = useCallback(async () => {
    if (!id) return;
    if (!canEdit) return;
    setSaving(true);
    try {
      clearError();
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

      const q = draft.quantity.trim();
      if (q !== "") {
        const n = Number(q);
        if (!Number.isNaN(n)) payload.quantity = n;
      }

      const reorderPoint = draft.reorderPoint.trim();
      if (reorderPoint !== "") {
        const n = Number(reorderPoint);
        if (!Number.isNaN(n)) payload.reorderPoint = n;
      }

      const res = await apiRequest(path, {
        method: "PATCH",
        data: payload
      });

      const nextItem = res?.item ?? res ?? item;
      setItem(nextItem);
      setDraft(draftFromItem(nextItem));
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }, [canEdit, clearError, draft, handleApiError, id, item]);

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
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Inventory Support Record</Text>
          <Text style={styles.muted}>id: {id || "(missing)"}</Text>
        </View>

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
            <Text style={styles.sectionTitle}>Connected Workflows</Text>
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

        <View style={styles.card}>
          {item ? (
            <>
              <Text style={styles.sectionTitle}>Update Item</Text>
              {!canEdit ? (
                <Text style={styles.muted}>
                  You do not have permission to update inventory items.
                </Text>
              ) : (
                <View style={styles.form}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    value={draft.name}
                    onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
                    style={styles.input}
                    placeholder="Item name"
                    accessibilityLabel="Commercial detail item name"
                  />

                  <Text style={styles.label}>SKU</Text>
                  <TextInput
                    value={draft.sku}
                    onChangeText={(v) => setDraft((d) => ({ ...d, sku: v }))}
                    style={styles.input}
                    placeholder="SKU"
                    accessibilityLabel="Commercial detail item SKU"
                  />

                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    value={draft.quantity}
                    onChangeText={(v) => setDraft((d) => ({ ...d, quantity: v }))}
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    accessibilityLabel="Commercial detail item quantity"
                  />

                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    value={draft.unit}
                    onChangeText={(v) => setDraft((d) => ({ ...d, unit: v }))}
                    style={styles.input}
                    placeholder="e.g., lbs"
                    accessibilityLabel="Commercial detail item unit"
                  />

                  <Text style={styles.label}>Reorder point</Text>
                  <TextInput
                    value={draft.reorderPoint}
                    onChangeText={(v) => setDraft((d) => ({ ...d, reorderPoint: v }))}
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    accessibilityLabel="Commercial detail reorder point"
                  />

                  <Text style={styles.label}>Vendor</Text>
                  <TextInput
                    value={draft.vendor}
                    onChangeText={(v) => setDraft((d) => ({ ...d, vendor: v }))}
                    style={styles.input}
                    placeholder="Vendor"
                    accessibilityLabel="Commercial detail vendor"
                  />

                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    value={draft.category}
                    onChangeText={(v) => setDraft((d) => ({ ...d, category: v }))}
                    style={styles.input}
                    placeholder="Category"
                    accessibilityLabel="Commercial detail category"
                  />

                  <Text style={styles.label}>Item type</Text>
                  <TextInput
                    value={draft.itemType}
                    onChangeText={(v) => setDraft((d) => ({ ...d, itemType: v }))}
                    style={styles.input}
                    placeholder="product, ingredient, packaging, plant, genetics..."
                    accessibilityLabel="Commercial detail item type"
                  />

                  <Text style={styles.label}>Storage location</Text>
                  <TextInput
                    value={draft.location}
                    onChangeText={(v) => setDraft((d) => ({ ...d, location: v }))}
                    style={styles.input}
                    placeholder="Storage location"
                    accessibilityLabel="Commercial detail location"
                  />

                  <Text style={styles.sectionLabel}>Optional links</Text>
                  <TextInput
                    value={draft.linkedProductId}
                    onChangeText={(v) => setDraft((d) => ({ ...d, linkedProductId: v }))}
                    style={styles.input}
                    placeholder="Linked product ID"
                    autoCapitalize="none"
                    accessibilityLabel="Commercial detail linked product"
                  />
                  <TextInput
                    value={draft.linkedIngredientId}
                    onChangeText={(v) =>
                      setDraft((d) => ({ ...d, linkedIngredientId: v }))
                    }
                    style={styles.input}
                    placeholder="Linked ingredient ID"
                    autoCapitalize="none"
                    accessibilityLabel="Commercial detail linked ingredient"
                  />
                  <TextInput
                    value={draft.linkedGeneticsId}
                    onChangeText={(v) => setDraft((d) => ({ ...d, linkedGeneticsId: v }))}
                    style={styles.input}
                    placeholder="Linked genetics ID"
                    autoCapitalize="none"
                    accessibilityLabel="Commercial detail linked genetics"
                  />
                  <TextInput
                    value={draft.linkedGrowId}
                    onChangeText={(v) => setDraft((d) => ({ ...d, linkedGrowId: v }))}
                    style={styles.input}
                    placeholder="Linked product trial evidence run ID"
                    autoCapitalize="none"
                    accessibilityLabel="Commercial detail linked product trial evidence run"
                  />

                  <Text style={styles.label}>Status</Text>
                  <TextInput
                    value={draft.status}
                    onChangeText={(v) => setDraft((d) => ({ ...d, status: v }))}
                    style={styles.input}
                    placeholder="active, low_stock, out_of_stock, archived"
                    accessibilityLabel="Commercial detail status"
                  />

                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    value={draft.notes}
                    onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
                    style={[styles.input, styles.notesInput]}
                    placeholder="Notes"
                    multiline
                    accessibilityLabel="Commercial detail notes"
                  />

                  <TouchableOpacity
                    onPress={save}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel="Save commercial inventory changes"
                    style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
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

        {item ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.kvWrap}>{keys.map((k) => renderKV(item, k))}</View>
          </View>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  headerRow: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7 },
  workflowText: { color: "#475569", fontSize: 13, fontWeight: "700", lineHeight: 19 },

  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "white"
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "white",
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

  kvWrap: { marginTop: 6 },
  kv: { gap: 4, marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  form: { gap: 8 },
  label: { fontSize: 12, opacity: 0.7 },
  sectionLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6,
    textTransform: "uppercase"
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "white"
  },
  notesInput: { minHeight: 78, textAlignVertical: "top" },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderRadius: radius.card,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "white", fontWeight: "800" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#f8fafc"
  },
  actionText: { color: "#0f172a", fontSize: 12, fontWeight: "900" }
});
