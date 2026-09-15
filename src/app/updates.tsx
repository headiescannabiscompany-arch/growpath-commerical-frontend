import React from "react";
import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import BackButton from "@/components/nav/BackButton";
import { PUBLIC_UPDATES_REVIEWED, PUBLIC_UPDATE_SECTIONS } from "@/config/publicUpdates";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export default function UpdatesPage() {
  const { palette } = useAppTheme();
  const styles = createUpdatesStyles(palette);
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.backRow}>
        <BackButton fallbackHref="/support" />
      </View>
      <Text style={styles.brand}>GrowPathAI</Text>
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        Updates
      </Text>
      <Text style={styles.intro}>
        What is new, what is being tested, and what we are planning next.
      </Text>
      <Text style={styles.date}>Last updated {PUBLIC_UPDATES_REVIEWED}</Text>
      {PUBLIC_UPDATE_SECTIONS.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
            {section.title}
          </Text>
          <Text style={styles.body}>{section.description}</Text>
          {section.entries.length === 0 ? (
            <Text style={styles.empty}>{section.emptyMessage}</Text>
          ) : (
            section.entries.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
                  {entry.title}
                </Text>
                <Text style={styles.date}>
                  {entry.dateLabel} {entry.date}
                </Text>
                <Text style={styles.body}>{entry.summary}</Text>
              </View>
            ))
          )}
        </View>
      ))}
      <Text style={styles.body}>Need help with an existing feature?</Text>
      <Link href="/support" style={styles.link}>
        Contact Support
      </Link>
    </ScrollView>
  );
}

export function createUpdatesStyles(palette: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.page },
    content: {
      alignSelf: "center",
      maxWidth: 920,
      width: "100%",
      paddingHorizontal: 24,
      paddingVertical: 40
    },
    backRow: { marginBottom: 18 },
    brand: { color: palette.accent, fontSize: 16, fontWeight: "800", marginBottom: 10 },
    title: { color: palette.text, fontSize: 34, fontWeight: "800", marginBottom: 10 },
    intro: { color: palette.textSoft, fontSize: 17, lineHeight: 26 },
    date: { color: palette.textMuted, fontSize: 14, lineHeight: 22, marginVertical: 8 },
    section: {
      borderTopWidth: 1,
      borderColor: palette.border,
      paddingTop: 24,
      marginTop: 24,
      gap: 12
    },
    sectionTitle: { color: palette.text, fontSize: 22, fontWeight: "800" },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 18
    },
    cardTitle: { color: palette.text, fontSize: 19, fontWeight: "700" },
    body: { color: palette.textSoft, fontSize: 16, lineHeight: 25 },
    empty: { color: palette.textMuted, fontSize: 16, lineHeight: 25, paddingVertical: 8 },
    link: {
      color: palette.link,
      fontSize: 16,
      lineHeight: 25,
      paddingVertical: 12,
      textDecorationLine: "underline"
    }
  });
}
