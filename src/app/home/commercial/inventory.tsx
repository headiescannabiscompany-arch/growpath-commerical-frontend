import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";

type UiError = { title?: string; message?: string; requestId?: string };

function normalizeError(e: any): UiError {
  const env = e?.error || e;
  return {
    title: env?.code ? String(env.code) : "REQUEST_FAILED",
    message: String(env?.message || e?.message || e || "Unknown error"),
    requestId: env?.requestId ? String(env.requestId) : undefined
  };
}

function getId(x: any): string {
  return String(x?.id || x?._id || x?.itemId || x?.sku || "");
}

function getLabel(x: any): string {
  return String(x?.name || x?.title || x?.sku || getId(x) || "Inventory Item");
}

export default function CommercialInventoryRoute() {
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const fetchItems = useCallback(async () => {
    setError(null);
    const raw = await apiRequest("/api/commercial/inventory", { method: "GET" });

    const list =
      (Array.isArray(raw) && raw) ||
      (Array.isArray((raw as any)?.items) && (raw as any).items) ||
      (Array.isArray((raw as any)?.data?.items) && (raw as any).data.items) ||
      [];

    setItems(list);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetchItems();
      } catch (e) {
        if (!alive) return;
        setError(normalizeError(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchItems();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setRefreshing(false);
    }
  }, [fetchItems]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      const hay =
        `${getLabel(x)} ${getId(x)} ${x?.vendor || ""} ${x?.category || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  return (
    <ScreenBoundary name="home.commercial.inventory">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Commercial Inventory</Text>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search name, SKU, vendor…"
          style={{
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10
          }}
        />

        <InlineError
          title={error?.title}
          message={error?.message}
          requestId={error?.requestId}
        />

        {loading ? (
          <>
            <ActivityIndicator />
            <Text style={{ opacity: 0.75 }}>Loading…</Text>
          </>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(x, idx) => getId(x) || String(idx)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <Text style={{ opacity: 0.75 }}>No inventory items found.</Text>
            }
            renderItem={({ item }) => {
              const id = getId(item);
              const label = getLabel(item);

              return (
                <TouchableOpacity
                  onPress={() =>
                    id
                      ? router.push(
                          `/home/commercial/inventory-item/${encodeURIComponent(id)}`
                        )
                      : undefined
                  }
                  disabled={!id}
                  style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    opacity: id ? 1 : 0.5
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>{label}</Text>
                  <Text style={{ opacity: 0.75 }}>{id || "missing id"}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </ScreenBoundary>
  );
}
