import React, { useEffect, useMemo, useState } from "react";
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

async function safeFetchJson(url, opts) {
  const res = await fetch(url, {
    ...(opts || {}),
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) }
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return json;
}

export default function CommercialInventoryScreen() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) =>
      `${it.name || ""} ${it.sku || ""} ${it.vendor || ""}`.toLowerCase().includes(s)
    );
  }, [items, q]);

  async function load() {
    setLoading(true);
    try {
      // Commercial endpoint (vendor/warehouse aware)
      const data = await safeFetchJson("https://example.com/api/commercial/inventory");
      setItems(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Commercial Inventory", e.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
          keyExtractor={(it, idx) => String(it.id || idx)}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.name || "Unnamed item"}</Text>
                <Text style={styles.muted}>
                  {item.sku ? `SKU ${item.sku}` : "No SKU"}{" "}
                  {item.vendor ? `• ${item.vendor}` : ""}
                </Text>
                <Text style={styles.muted}>
                  On hand: {item.qty ?? 0} {item.unit || "ea"}
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
