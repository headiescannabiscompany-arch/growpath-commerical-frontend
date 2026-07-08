import React from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
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
    key: "harvest",
    title: "Harvest Window",
    desc: "Estimate harvest timing from trichome distribution and flower age.",
    href: "/home/facility/ai-ask?preset=harvest"
  }
];

export default function FacilityAiTemplateRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>AI Templates</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: radius.card,
    padding: 12,
    gap: 6,
    backgroundColor: "#fff"
  },
  title: { fontSize: 16, fontWeight: "800" },
  desc: { opacity: 0.75 },
  link: { fontWeight: "800", color: "#2563eb" }
});
