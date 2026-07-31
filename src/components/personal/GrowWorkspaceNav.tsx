import React from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/theme/appTheme";

const styles = StyleSheet.create({
  row: {
    marginTop: 10,
    marginBottom: 12
  },
  content: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center"
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    minWidth: 0
  },
  text: { fontWeight: "700", fontSize: 12 }
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

function hrefFor(growId: string, section: Section) {
  if (section === "overview") return `/home/personal/grows/${growId}`;
  return `/home/personal/grows/${growId}/${section}`;
}

export default function GrowWorkspaceNav({
  growId,
  active
}: {
  growId: string;
  active: Section;
}) {
  const { palette } = useAppTheme();
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
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link key={tab.key} href={hrefFor(growId, tab.key)} asChild>
            <Pressable
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? palette.accent : palette.surface,
                  borderColor: isActive ? palette.accent : palette.border
                }
              ]}
            >
              <Text
                style={[
                  styles.text,
                  { color: isActive ? palette.accentText : palette.text }
                ]}
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
