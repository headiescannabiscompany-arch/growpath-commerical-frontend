import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius } from "@/theme/theme";

export type CommercialToolKey =
  | "ask-ai"
  | "diagnose"
  | "environment"
  | "recipe-builder"
  | "harvest-readiness"
  | "report";

const TOOLS: Record<CommercialToolKey, { label: string; path: string }> = {
  "ask-ai": { label: "Ask AI", path: "/home/commercial/tools/ask-ai" },
  diagnose: { label: "Plant Diagnose", path: "/home/commercial/tools/diagnose" },
  environment: {
    label: "Environment Review",
    path: "/home/commercial/tools/environment"
  },
  "recipe-builder": {
    label: "Recipe Builder",
    path: "/home/commercial/tools/recipe-builder"
  },
  "harvest-readiness": {
    label: "Harvest Readiness",
    path: "/home/commercial/tools/harvest-readiness"
  },
  report: { label: "Export Report", path: "/home/commercial/tools/report" }
};

type Props = {
  title?: string;
  tools: CommercialToolKey[];
  source: string;
  growId?: string;
  productId?: string;
  productLineId?: string;
  batchId?: string;
  trialId?: string;
  prompt?: string;
};

export function commercialToolHref(
  tool: CommercialToolKey,
  context: Omit<Props, "title" | "tools">
) {
  const query = new URLSearchParams({ source: context.source, workspace: "commercial" });
  Object.entries(context).forEach(([key, value]) => {
    if (key !== "source" && value && String(value).trim()) query.set(key, String(value));
  });
  return `${TOOLS[tool].path}?${query.toString()}`;
}

export default function CommercialContextualTools({
  title = "Tools for this record",
  tools,
  ...context
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.helper}>
        Context is carried into the shared tool and saved results stay connected to this
        commercial record.
      </Text>
      <View style={styles.row}>
        {tools.map((tool) => (
          <Link key={tool} href={commercialToolHref(tool, context) as any} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${TOOLS[tool].label} for ${context.source}`}
              style={StyleSheet.flatten(styles.action)}
            >
              <Text style={styles.actionText}>{TOOLS[tool].label}</Text>
            </Pressable>
          </Link>
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
    marginTop: 12,
    padding: 12
  },
  title: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  helper: { color: "#64748B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
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
