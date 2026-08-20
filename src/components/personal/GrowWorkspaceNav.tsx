import React, { useMemo } from "react";
import { Link, usePathname } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

export const createGrowWorkspaceNavStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    row: {
      marginTop: 10,
      marginBottom: 12
    },
    content: {
      flexDirection: "row",
      flexWrap: "nowrap",
      gap: 8,
      alignItems: "center"
    },
    pill: {
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      justifyContent: "center",
      minHeight: 44,
      paddingVertical: 7,
      paddingHorizontal: 11,
      backgroundColor: palette.surface
    },
    pillActive: {
      borderColor: palette.accent,
      backgroundColor: palette.accent
    },
    text: { fontWeight: "700", color: palette.text, fontSize: 12 },
    textActive: { color: palette.accentText }
  });

type Section =
  | "overview"
  | "plants"
  | "journal"
  | "tasks"
  | "tools"
  | "automation"
  | "timeline"
  | "compare";

function hrefFor(basePath: string, growId: string, section: Section) {
  if (section === "overview") return `${basePath}/grows/${growId}`;
  return `${basePath}/grows/${growId}/${section}`;
}

export default function GrowWorkspaceNav({
  growId,
  active
}: {
  growId: string;
  active: Section;
}) {
  const { palette } = useAppTheme();
  const pathname = usePathname?.() || "";
  const basePath = pathname.startsWith("/home/commercial")
    ? "/home/commercial"
    : "/home/personal";
  const styles = useMemo(() => createGrowWorkspaceNavStyles(palette), [palette]);
  const tabs: { key: Section; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "plants", label: "Plants" },
    { key: "journal", label: "Journal" },
    { key: "tasks", label: "Tasks" },
    { key: "tools", label: "AI Tools" },
    { key: "automation", label: "Automation" },
    { key: "timeline", label: "Timeline" },
    { key: "compare", label: "Compare" }
  ];

  if (!growId) return null;

  return (
    <ScrollView
      accessibilityRole="tablist"
      accessibilityLabel="Grow workspace sections"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link key={tab.key} href={hrefFor(basePath, growId, tab.key)} asChild>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={`${tab.label} grow section`}
              accessibilityState={{ selected: isActive }}
              style={StyleSheet.flatten([styles.pill, isActive && styles.pillActive])}
            >
              <Text
                style={StyleSheet.flatten([styles.text, isActive && styles.textActive])}
              >
                {tab.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}
