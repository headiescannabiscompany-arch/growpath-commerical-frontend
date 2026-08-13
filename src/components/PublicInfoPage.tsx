import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import BackButton from "@/components/nav/BackButton";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type Section = {
  title: string;
  body: string;
};

type PublicInfoPageProps = {
  title: string;
  updated?: string;
  intro: string;
  sections: Section[];
};

export default function PublicInfoPage({
  title,
  updated,
  intro,
  sections
}: PublicInfoPageProps) {
  const { palette } = useAppTheme();
  const styles = createPublicInfoPageStyles(palette);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.backRow}>
        <BackButton fallbackHref="/" />
      </View>
      <View style={styles.header}>
        <Text style={styles.brand}>GrowPath</Text>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          {title}
        </Text>
        {updated ? <Text style={styles.updated}>Last updated: {updated}</Text> : null}
        <Text style={styles.intro}>{intro}</Text>
      </View>

      <View style={styles.sections}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              {section.title}
            </Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const createPublicInfoPageStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: palette.page
    },
    content: {
      width: "100%",
      maxWidth: 860,
      alignSelf: "center",
      paddingHorizontal: 24,
      paddingVertical: 40
    },
    header: {
      marginBottom: 28
    },
    backRow: {
      marginBottom: 18
    },
    brand: {
      color: palette.accent,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 10
    },
    title: {
      color: palette.text,
      fontSize: 34,
      fontWeight: "800",
      marginBottom: 10
    },
    updated: {
      color: palette.textMuted,
      fontSize: 14,
      marginBottom: 18
    },
    intro: {
      color: palette.textSoft,
      fontSize: 17,
      lineHeight: 26
    },
    sections: {
      gap: 22
    },
    section: {
      borderTopColor: palette.border,
      borderTopWidth: 1,
      paddingTop: 20
    },
    sectionTitle: {
      color: palette.text,
      fontSize: 20,
      fontWeight: "800",
      marginBottom: 8
    },
    body: {
      color: palette.textSoft,
      fontSize: 16,
      lineHeight: 25
    }
  });
