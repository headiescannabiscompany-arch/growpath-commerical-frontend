import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import AppShell from "../components/AppShell.js";
import { useEntitlements, CAPABILITY_KEYS } from "@/entitlements";
import { radius } from "@/theme/theme";

const SEARCH_SURFACES = [
  {
    key: "courses",
    title: "Courses",
    subtitle: "Lessons, certificates, and training",
    route: "Courses"
  },
  {
    key: "offers",
    title: "Storefront",
    subtitle: "Public brand storefronts, products, courses, lives, and offers",
    route: "Storefront"
  },
  {
    key: "feed",
    title: "Feed / Campaigns",
    subtitle: "Commercial and facility outreach, ads, and announcements",
    route: "Feed"
  },
  {
    key: "forum",
    title: "Forum",
    subtitle: "Questions, answers, and Forum/Q&A threads",
    route: "Forum"
  },
  {
    key: "plants",
    title: "Plants",
    subtitle: "Plant records and grow logs",
    route: "Plants"
  },
  {
    key: "calendar",
    title: "Calendar",
    subtitle: "Tasks and scheduled work",
    route: "Calendar"
  },
  {
    key: "certificates",
    title: "Certificates",
    subtitle: "View and verify certificates",
    route: "CertificateVerification"
  }
];

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F8FAFC" },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#64748B", marginTop: 4, marginBottom: 12 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  row: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    padding: 12
  },
  rowTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  rowSubtitle: { color: "#64748B", marginTop: 3 },
  arrow: { color: "#166534", fontSize: 20, fontWeight: "900" },
  locked: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 14,
    padding: 12
  },
  lockedText: { color: "#9A3412", fontWeight: "800" }
});

export default function SearchScreen({ navigation }) {
  const ent = useEntitlements();
  const searchEnabled = ent.can(CAPABILITY_KEYS.SEARCH);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_SURFACES;
    return SEARCH_SURFACES.filter((item) =>
      `${item.title} ${item.subtitle}`.toLowerCase().includes(q)
    );
  }, [query]);

  function openRoute(route) {
    if (!searchEnabled) {
      navigation?.navigate?.("Subscription");
      return;
    }
    navigation?.navigate?.(route);
  }

  return (
    <AppShell style={{}} contentContainerStyle={{}}>
      <View style={styles.container}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>
          Find storefronts, Feed / Campaigns, courses, Forum/Q&A, and grow records.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search GrowPath"
          accessibilityLabel="Search GrowPath"
          style={styles.input}
        />
        {!searchEnabled ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upgrade to unlock search"
            onPress={() => navigation?.navigate?.("Subscription")}
            style={styles.locked}
          >
            <Text style={styles.lockedText}>Upgrade to unlock search.</Text>
          </Pressable>
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPress={() => openRoute(item.route)}
              style={styles.row}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.arrow}>{">"}</Text>
            </Pressable>
          )}
        />
      </View>
    </AppShell>
  );
}
