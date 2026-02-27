import React from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 12 },
  pill: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    backgroundColor: "#FFFFFF"
  },
  pillActive: {
    borderColor: "#166534",
    backgroundColor: "#166534"
  },
  text: { fontWeight: "700", color: "#0F172A", fontSize: 12 },
  textActive: { color: "#FFFFFF" }
});

type Section = "overview" | "journal" | "tasks" | "tools" | "compare";

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
  const tabs: { key: Section; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "journal", label: "Journal" },
    { key: "tasks", label: "Tasks" },
    { key: "tools", label: "Tools" },
    { key: "compare", label: "Compare" }
  ];

  if (!growId) return null;

  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link key={tab.key} href={hrefFor(growId, tab.key)} asChild>
            <Pressable style={[styles.pill, isActive && styles.pillActive]}>
              <Text style={[styles.text, isActive && styles.textActive]}>{tab.label}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}
