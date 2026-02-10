import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

type InventoryItem = {
  _id: string;
  name?: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  updatedAt?: string;
};

function normalizeInventory(res: any): InventoryItem[] {
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.inventory)) return res.inventory;
  if (Array.isArray(res)) return res;
  return [];
}

export default function FacilityInventoryTab() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchItems = useCallback(async () => {
    if (!facilityId) return;
    setError(null);
    const res = await apiRequest(endpoints.inventory(facilityId));
    setItems(normalizeInventory(res));
  }, [facilityId]);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      await fetchItems();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  }, [facilityId, fetchItems, handleApiError]);

  const onRefresh = useCallback(async () => {
    if (!facilityId) return;
    setRefreshing(true);
    setError(null);
    try {
      await fetchItems();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setRefreshing(false);
    }
  }, [facilityId, fetchItems, handleApiError]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const ta = new Date(a.updatedAt || 0).getTime();
      const tb = new Date(b.updatedAt || 0).getTime();
      const aOk = Number.isFinite(ta) ? ta : 0;
      const bOk = Number.isFinite(tb) ? tb : 0;
      return bOk - aOk;
    });
    return copy;
  }, [items]);

  if (!facilityId) {
    return (
      <ScreenBoundary name="facility.inventory.tab">
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "900" }}>Inventory</Text>
          <Text>Select a facility first.</Text>

          <TouchableOpacity
            onPress={() => router.push("/home/facility/select")}
            style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
          >
            <Text style={{ fontWeight: "900" }}>Go to Facility Select</Text>
          </TouchableOpacity>
        </View>
      </ScreenBoundary>
    );
  }

  if (loading) {
    return (
      <ScreenBoundary name="facility.inventory.tab">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary name="facility.inventory.tab">
      <View style={{ flex: 1, padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "900" }}>Inventory</Text>

          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity onPress={() => router.push("/home/facility/select")}>
              \<Text style={{ fontWeight: "900" }}>Change Facility</Text>
            </TouchableOpacity>

            <View style={{ width: 14 }} />

            <TouchableOpacity onPress={load}>
              <Text style={{ fontWeight: "900" }}>Reload</Text>
            </TouchableOpacity>
          </View>
        </View>

        <InlineError error={error} />

        {sorted.length === 0 ? (
          <Text>No inventory items yet.</Text>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(i) => String(i._id)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => {
              const qty =
                typeof item.quantity === "number"
                  ? `${item.quantity}`
                  : item.quantity
                    ? String(item.quantity)
                    : "";
              const unit = item.unit ? ` ${item.unit}` : "";

              return (
                <View
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#e5e7eb"
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>
                    {item.name || item.sku || "Inventory Item"}
                  </Text>
                  <Text style={{ opacity: 0.75, marginTop: 2 }}>
                    {qty ? `Qty: ${qty}${unit}` : "Qty: —"}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </ScreenBoundary>
  );
}
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function FacilityInventoryTab() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="FacilityInventoryTab">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>FacilityInventoryTab</Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : (
          <>
            <Text style={{ opacity: 0.75 }}>
              Stub screen (safe mount). Wire API later.
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import { useEntitlements } from "@/entitlements";

type InventoryItem = {
  id?: string;
  _id?: string;
  name?: string;
  sku?: string;
  category?: string;
  onHand?: number;
  unit?: string;
};

function getItemId(item: any): string {
  return String(item?.id || item?._id || "");
}

function normalizeInventory(res: any): InventoryItem[] {
  const raw =
    res?.items ??
    res?.inventory ??
    res?.data?.items ??
    res?.data?.inventory ??
    res?.result?.items ??
    res?.result?.inventory ??
    res ??
    [];
  return Array.isArray(raw) ? raw : [];
}

export default function InventoryTab() {
  const { selectedId: facilityId } = useFacility();
  const ent = useEntitlements();
  const router = useRouter();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uiError, setUiError] = useState<any | null>(null);

  const canEdit = useMemo(() => ent?.role !== "VIEWER", [ent?.role]);

  async function load() {
    if (!facilityId) return;

    setLoading(true);
    setUiError(null);

    try {
      const res = await apiRequest({
        method: "GET",
        url: endpoints.inventory(facilityId)
      });
      setItems(normalizeInventory(res));
    } catch (err) {
      setUiError(handleApiError(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!facilityId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  async function onRefresh() {
    if (!facilityId) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScreenBoundary name="facility.tabs.inventory">
      <View style={styles.container}>
        {!facilityId ? (
          <View style={styles.centered}>
            <Text style={styles.title}>Inventory</Text>
            <Text style={styles.muted}>Select a facility to view inventory.</Text>
          </View>
        ) : uiError ? (
          <View style={styles.pad}>
            <InlineError
              title={uiError.title || "Couldn’t load inventory"}
              message={uiError.message}
              requestId={uiError.requestId}
            />
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
            <Text style={styles.muted}>Loading inventory…</Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Inventory</Text>
              <Text style={styles.muted}>
                {items.length} item{items.length === 1 ? "" : "s"}
              </Text>
            </View>

            <FlatList
              data={items}
              keyExtractor={(it, idx) => getItemId(it) || String(idx)}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() =>
                    router.push({
                      pathname: "/home/facility/(tabs)/InventoryItemDetailScreen",
                      params: { itemId: getItemId(item) }
                    } as any)
                  }
                >
                  <Text style={styles.itemName}>
                    {item.name ?? item.sku ?? "Untitled item"}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {[
                      item.category ? `Category: ${item.category}` : null,
                      item.onHand !== undefined
                        ? `On hand: ${item.onHand}${item.unit ? ` ${item.unit}` : ""}`
                        : null,
                      item.sku ? `SKU: ${item.sku}` : null
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.pad}>
                  <Text style={styles.muted}>No inventory items yet.</Text>
                </View>
              }
            />

            {canEdit ? (
              <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                  router.push("/home/facility/(tabs)/CreateInventoryItemScreen" as any)
                }
              >
                <Text style={styles.fabText}>+ Add Item</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  pad: { padding: 16, gap: 12 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: "900" },
  muted: { marginTop: 6, opacity: 0.7 },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  itemCard: { padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
  itemName: { fontWeight: "900" },
  itemMeta: { marginTop: 4, opacity: 0.75 },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  fabText: { fontWeight: "900" },
  retryBtn: { borderWidth: 1, borderRadius: 10, padding: 12, alignSelf: "flex-start" },
  retryText: { fontWeight: "900" }
});
