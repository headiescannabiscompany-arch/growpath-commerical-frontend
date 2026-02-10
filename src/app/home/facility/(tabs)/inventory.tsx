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
            <TouchableOpacity onPress={() => router.push("/home/facility/select")}>\n              <Text style={{ fontWeight: "900" }}>Change Facility</Text>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => {
              const qty = typeof item.quantity === "number" ? String(item.quantity) : "—";
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
                    Qty: {qty}
                    {unit}
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
