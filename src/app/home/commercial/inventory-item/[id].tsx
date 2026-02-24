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

export default function CommercialInventoryItemDetailRoute() {
  const router = useRouter();
  const ent = useEntitlements();
  const params = useLocalSearchParams();
  const id = safeId(params as any);

  const apiErr: any = useApiErrorHandler();
  const resolved = useMemo(() => {
    const error = apiErr?.error ?? apiErr?.[0] ?? null;
    const handleApiError = apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {});
    const clearError = apiErr?.clearError ?? apiErr?.[2] ?? (() => {});
    return { error, handleApiError, clearError };
  }, [apiErr]);

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    sku: "",
    quantity: "",
    unit: ""
  });

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!id) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        resolved.clearError();

        const path =
          (endpoints as any)?.commercial?.inventoryItem?.(id) ??
          (endpoints as any)?.inventoryItemGlobal?.(id) ??
          `/api/inventory/${encodeURIComponent(id)}`;

        const res = await apiRequest(path, { method: "GET" });
        setItem(res ?? null);
      } catch (e) {
        resolved.handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, resolved]
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

  useEffect(() => {
    if (!item) return;
    setDraft({
      name: String(item.name ?? ""),
      sku: String(item.sku ?? ""),
      quantity:
        item.quantity === undefined || item.quantity === null
          ? ""
          : String(item.quantity),
      unit: String(item.unit ?? "")
    });
  }, [item]);

  const save = useCallback(async () => {
    if (!id) return;
    if (!canEdit) return;
    setSaving(true);
    try {
      resolved.clearError();
      const path =
        (endpoints as any)?.commercial?.inventoryItem?.(id) ??
        (endpoints as any)?.inventoryItemGlobal?.(id) ??
        `/api/inventory/${encodeURIComponent(id)}`;

      const payload: AnyRec = {
        name: draft.name.trim() || undefined,
        sku: draft.sku.trim() || undefined,
        unit: draft.unit.trim() || undefined
      };

      const q = draft.quantity.trim();
      if (q !== "") {
        const n = Number(q);
        if (!Number.isNaN(n)) payload.quantity = n;
      }

      const res = await apiRequest(path, {
        method: "PATCH",
        data: payload
      });

      setItem(res ?? item);
    } catch (e) {
      resolved.handleApiError(e);
    } finally {
      setSaving(false);
    }
  }, [id, canEdit, draft, item, resolved]);

  if (!ent?.ready) return null;
  if (ent.mode !== "commercial") return null;

  return (
    <ScreenBoundary title="Inventory Item">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {resolved.error ? <InlineError error={resolved.error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Inventory Item</Text>
          <Text style={styles.muted}>id: {id || "(missing)"}</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading itemâ€¦</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {item ? (
            <View style={styles.kvWrap}>{keys.map((k) => renderKV(item, k))}</View>
          ) : (
            <Text style={styles.muted}>
              {id
                ? "No inventory item returned."
                : "Missing inventory item id in route params."}
            </Text>
          )}
        </View>\n        {item ? (
          <View style={styles.card}>
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
                />

                <Text style={styles.label}>SKU</Text>
                <TextInput
                  value={draft.sku}
                  onChangeText={(v) => setDraft((d) => ({ ...d, sku: v }))}
                  style={styles.input}
                  placeholder="SKU"
                />

                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  value={draft.quantity}
                  onChangeText={(v) => setDraft((d) => ({ ...d, quantity: v }))}
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Unit</Text>
                <TextInput
                  value={draft.unit}
                  onChangeText={(v) => setDraft((d) => ({ ...d, unit: v }))}
                  style={styles.input}
                  placeholder="e.g., lbs"
                />

                <TouchableOpacity
                  onPress={save}
                  disabled={saving}
                  style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                >
                  <Text style={styles.primaryBtnText}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

          â€¹ Back
        </Text>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  headerRow: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7 },

  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white"
  },

  kvWrap: { marginTop: 6 },
  kv: { gap: 4, marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  form: { gap: 8 },
  label: { fontSize: 12, opacity: 0.7 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white"
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "white", fontWeight: "800" },

  backLink: { fontWeight: "800", marginTop: 6 }
});

