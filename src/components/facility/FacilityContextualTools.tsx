import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius } from "@/theme/theme";

export type FacilityToolKey =
  | "ask-ai"
  | "diagnose"
  | "environment"
  | "recipe-builder"
  | "harvest-readiness"
  | "reports";

const TOOLS: Record<FacilityToolKey, { label: string; path: string }> = {
  "ask-ai": { label: "Ask AI", path: "/home/facility/ai-ask" },
  diagnose: { label: "Photo Diagnosis", path: "/home/facility/ai-diagnosis-photo" },
  environment: {
    label: "Environment Review",
    path: "/home/facility/tools/environment"
  },
  "recipe-builder": {
    label: "Soil & Nutrient Mix Builders",
    path: "/home/facility/tools/recipe-builder"
  },
  "harvest-readiness": {
    label: "Harvest Readiness",
    path: "/home/facility/tools/harvest-readiness"
  },
  reports: { label: "Reports", path: "/home/facility/reports" }
};

type Props = {
  title?: string;
  tools: FacilityToolKey[];
  source: string;
  facilityId?: string;
  roomId?: string;
  growId?: string;
  plantId?: string;
  taskId?: string;
  prompt?: string;
};

export function facilityToolHref(
  tool: FacilityToolKey,
  context: Omit<Props, "title" | "tools">
) {
  const query = new URLSearchParams({ source: context.source, workspace: "facility" });
  Object.entries(context).forEach(([key, value]) => {
    if (key !== "source" && value && String(value).trim()) query.set(key, String(value));
  });
  return `${TOOLS[tool].path}?${query.toString()}`;
}

export default function FacilityContextualTools({
  title = "Tools for this record",
  tools,
  ...context
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.helper}>
        Facility, room, grow, and plant context carries into the shared tool.
      </Text>
      <View style={styles.row}>
        {tools.map((tool) => (
          <Pressable
            key={tool}
            accessibilityRole="link"
            accessibilityLabel={`${TOOLS[tool].label} for ${context.source}`}
            onPress={() => router.push(facilityToolHref(tool, context) as any)}
            style={StyleSheet.flatten(styles.action)}
          >
            <Text style={styles.actionText}>{TOOLS[tool].label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    margin: 16,
    padding: 12
  },
  title: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  helper: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  actionText: { color: "#166534", fontSize: 13, fontWeight: "900" }
});
