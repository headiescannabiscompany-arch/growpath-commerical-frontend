import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import AppShell from "../components/AppShell.js";
import { useEntitlements, CAPABILITY_KEYS } from "@/entitlements";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import BackButton from "@/components/nav/BackButton";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const SEARCH_SURFACES = [
  {
    key: "courses",
    title: "Courses",
    subtitle: "Lessons, certificates, and training",
    route: "Courses",
    keywords: ["education", "classes", "learning", "lessons", "training"]
  },
  {
    key: "tools",
    title: "Tools",
    subtitle: "NPK, soil builder, IPM, VPD, crop steering, and grow calculators",
    route: "Tools",
    keywords: [
      "npk",
      "soil",
      "dry amendments",
      "recipe",
      "ipm",
      "vpd",
      "dew point",
      "crop steering",
      "pheno",
      "tissue culture",
      "harvest"
    ]
  },
  {
    key: "offers",
    title: "Storefront",
    subtitle: "Public brand storefronts, products, courses, lives, and offers",
    route: "Storefront",
    keywords: ["store", "products", "brands", "commercial", "facility", "buy"]
  },
  {
    key: "feed",
    title: "Feed / Campaigns",
    subtitle: "Commercial and facility outreach, ads, and announcements",
    route: "Feed",
    keywords: ["ads", "advertising", "promotions", "campaigns", "outreach"]
  },
  {
    key: "forum",
    title: "Forum",
    subtitle: "Questions, answers, and Forum/Q&A threads",
    route: "Forum",
    keywords: ["discussion", "q&a", "qa", "questions", "answers", "help"]
  },
  {
    key: "plants",
    title: "Plants",
    subtitle: "Plant records and grow logs",
    route: "Plants",
    keywords: ["grows", "cultivars", "phenos", "grow logs", "notes"]
  },
  {
    key: "calendar",
    title: "Calendar",
    subtitle: "Tasks and scheduled work",
    route: "Calendar",
    keywords: ["schedule", "agenda", "tasks", "reminders", "calendar"]
  },
  {
    key: "certificates",
    title: "Certificates",
    subtitle: "View and verify certificates",
    route: "CertificateVerification",
    keywords: ["badges", "verification", "course completion"]
  }
];

export const createSearchStyles = (palette) => StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: palette.page },
  title: { color: palette.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: palette.textSoft, marginTop: 4, marginBottom: 12 },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    color: palette.text,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  row: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    padding: 12
  },
  rowTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
  rowSubtitle: { color: palette.textSoft, marginTop: 3 },
  arrow: { color: palette.link, fontSize: 20, fontWeight: "900" },
  locked: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 14,
    padding: 12
  },
  lockedText: { color: palette.text, fontWeight: "800" }
});

export default function SearchScreen({ navigation, showBack = false }) {
  const ent = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createSearchStyles(palette), [palette]);
  const searchEnabled = ent.can(CAPABILITY_KEYS.SEARCH);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_SURFACES;
    return SEARCH_SURFACES.filter((item) =>
      `${item.title} ${item.subtitle} ${(item.keywords || []).join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  function openRoute(route) {
    navigation?.navigate?.(route);
  }

  return (
    <AppShell style={{}} contentContainerStyle={{}}>
      {showBack ? <BackButton fallbackHref="/home" /> : null}
      <View style={styles.container}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Search
        </Text>
        <Text style={styles.subtitle}>
          Find storefronts, Feed / Campaigns, courses, Forum/Q&A, and grow records.
        </Text>
        <PersonalFeedPlacement placement="top" routeKey="personal_search" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search GrowPath"
          placeholderTextColor={palette.textMuted}
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
            <Text style={styles.lockedText}>
              Upgrade to unlock full search. Navigation shortcuts remain available.
            </Text>
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
        <PersonalFeedPlacement placement="bottom" routeKey="personal_search" />
      </View>
    </AppShell>
  );
}
