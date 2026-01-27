import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";

const DEFAULT_CATEGORIES = [
  { key: "inventory", title: "Inventory", subtitle: "Track supplies and stock" },
  { key: "light", title: "Light Tools", subtitle: "PPFD / DLI calculators" },
  { key: "calendar", title: "Calendar", subtitle: "Tasks and events" },
  { key: "courses", title: "Courses", subtitle: "Learn and certify" },
  { key: "certificates", title: "Certificates", subtitle: "View and verify" },
  { key: "campaigns", title: "Campaigns", subtitle: "Testing promos and drops" },
  { key: "live", title: "Live Sessions", subtitle: "Host and join live walkthroughs" }
];

export default function CategoryBrowserScreen({ navigation }) {
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return DEFAULT_CATEGORIES;
    return DEFAULT_CATEGORIES.filter((c) =>
      `${c.title} ${c.subtitle}`.toLowerCase().includes(s)
    );
  }, [q]);

  function go(key) {
    // Map keys to your real routes
    const routeMap = {
      inventory: "Inventory",
      light: "LightCalculator",
      calendar: "Calendar",
      courses: "Courses",
      certificates: "CertificateViewer",
      campaigns: "Campaigns",
      live: "LiveSession"
    };
    const routeName = routeMap[key];
    if (routeName) navigation?.navigate?.(routeName);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Browse</Text>

      <View style={styles.card}>
        <TextInput
          placeholder="Search categories…"
          value={q}
          onChangeText={setQ}
          style={styles.input}
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(it) => it.key}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => go(item.key)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.subtitle}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 14 },
  title: { fontSize: 22, fontWeight: "900" },
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
  item: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  itemTitle: { fontSize: 16, fontWeight: "900" },
  muted: { color: "#6B7280", marginTop: 4 },
  arrow: { fontSize: 28, color: "#111827", paddingHorizontal: 6 }
});
