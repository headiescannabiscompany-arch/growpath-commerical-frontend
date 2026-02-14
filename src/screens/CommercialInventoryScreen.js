import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { apiRequest } from "@/api/apiRequest";

/**
 * CommercialInventoryScreen
 *
 * Contract:
 * - Drift-free: no direct network calls (apiRequest only)
 * - Network calls go through apiRequest only
 * - No hardcoded hostnames
 * - Envelope-tolerant response parsing
 */

function normalizeInventoryResponse(res) {
  if (!res) return [];

  // direct array
  if (Array.isArray(res)) return res;

  // common envelopes
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.inventory)) return res.inventory;
  if (Array.isArray(res.results)) return res.results;

  // nested shapes
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.inventory)) return res.data.inventory;

  return [];
}

export default function CommercialInventoryScreen() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return (items || []).filter((it) =>
      `${it?.name || ""} ${it?.sku || ""} ${it?.vendor || ""}`.toLowerCase().includes(s)
    );
  }, [items, q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Canonical commercial endpoint (non-facility scoped)
      // If your backend uses a different path, change ONLY this string.
      const res = await apiRequest("/api/commercial/inventory", { method: "GET" });

      const list = normalizeInventoryResponse(res);
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setItems([]);
      Alert.alert("Commercial Inventory", e?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Commercial Inventory</Text>
        <Pressable style={styles.btn} onPress={load}>
          <Text style={styles.btnText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <TextInput
          placeholder="Search SKU, vendor, name…"
          value={q}
          onChangeText={setQ}
          style={styles.input}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it, idx) => String(it?.id || it?._id || idx)}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item?.name || "Unnamed item"}</Text>

                <Text style={styles.muted}>
                  {item?.sku ? `SKU ${item.sku}` : "No SKU"}{" "}
                  {item?.vendor ? `• ${item.vendor}` : ""}
                </Text>

                <Text style={styles.muted}>
                  On hand: {item?.qty ?? 0} {item?.unit || "ea"}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>No inventory items.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "900" },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111827"
  },
  btnText: { color: "#fff", fontWeight: "900" },
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff"
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12
  },
  center: { padding: 20, alignItems: "center", gap: 10 },
  muted: { color: "#6B7280" },
  item: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff"
  },
  itemTitle: { fontSize: 16, fontWeight: "900" }
});
