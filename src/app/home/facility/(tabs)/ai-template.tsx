import React, { useMemo } from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const TEMPLATES = [
  {
    key: "dew-point",
    title: "Dew Point Alert",
    desc: "Use pulse monitor or room sensor readings to flag condensation risk.",
    href: "/home/facility/ai-ask?preset=dew-point"
  },
  {
    key: "compliance",
    title: "Inspection Readiness",
    desc: "Score verification, SOP, audit, inventory, and task evidence before scrutiny.",
    href: "/home/facility/ai-ask?preset=compliance"
  },
  {
    key: "inventory",
    title: "Inventory Risk",
    desc: "Find low-stock and reorder risks from on-hand counts, par levels, and use rate.",
    href: "/home/facility/ai-ask?preset=inventory"
  },
  {
    key: "deviation",
    title: "Deviation Review",
    desc: "Summarize a recorded deviation, missing evidence, owners, and reviewable follow-up actions.",
    href: "/home/facility/ai-ask?preset=deviation"
  }
];

export default function FacilityAiTemplateRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityAiTemplateStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
        AI Templates
      </Text>
      <Text style={styles.sub}>
        Use predefined workflows for common facility decisions.
      </Text>

      {TEMPLATES.map((template) => (
        <View key={template.key} style={styles.card}>
          <Text style={styles.title}>{template.title}</Text>
          <Text style={styles.desc}>{template.desc}</Text>
          <Link
            accessibilityRole="button"
            accessibilityLabel={`Run ${template.title} AI template`}
            href={template.href as any}
            style={styles.link}
          >
            Run Template
          </Link>
        </View>
      ))}
    </View>
  );
}

export function createFacilityAiTemplateStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 12, backgroundColor: palette.page },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    sub: { color: palette.textMuted },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      gap: 6,
      backgroundColor: palette.card
    },
    title: { color: palette.text, fontSize: 16, fontWeight: "800" },
    desc: { color: palette.textMuted },
    link: { fontWeight: "800", color: palette.link }
  });
}
