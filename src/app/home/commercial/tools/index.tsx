import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";
import { useAppTheme } from "@/theme/appTheme";

export type CommercialToolHubItem = {
  actionLabel: string;
  credit: string;
  description: string;
  href: string;
  output: string;
  title: string;
};

export const COMMERCIAL_CORE_TOOLS: readonly CommercialToolHubItem[] = [
  {
    title: "Ask AI",
    description:
      "Ask cultivation and commercial workflow questions with the current Commercial workspace selected.",
    href: "/home/commercial/tools/ask-ai",
    credit: "Provider-backed text help uses Commercial AI credits.",
    output: "Evidence-aware guidance, limitations, and reviewable draft actions.",
    actionLabel: "Open Ask AI"
  },
  {
    title: "Plant Diagnose",
    description:
      "Run cautious plant-health triage from photos, symptoms, and measured conditions.",
    href: "/home/commercial/tools/diagnose",
    credit: "An image-capable diagnosis uses Commercial AI credits.",
    output:
      "Candidates, counter-evidence, missing information, confidence, and next checks.",
    actionLabel: "Open Plant Diagnose"
  },
  {
    title: "Environment Review",
    description: "Review temperature, humidity, VPD, and environmental conditions.",
    href: "/home/commercial/tools/environment",
    credit:
      "The rules review is free; optional provider-backed telemetry prefill uses Commercial AI credits.",
    output: "Calculated risks, assumptions, warnings, and measured follow-up checks.",
    actionLabel: "Open Environment Review"
  },
  {
    title: "Soil & Nutrient Mix Builders",
    description:
      "Use the science-based soil or nutrient mix workflow with visible evidence and uncertainty.",
    href: "/home/commercial/tools/recipe-builder?workspace=commercial",
    credit:
      "The calculators are free; an optional provider-backed prefill uses Commercial AI credits.",
    output:
      "Scaled calculations, source quality, assumptions, release timing, and warnings.",
    actionLabel: "Choose a mix builder"
  }
] as const;

export const COMMERCIAL_PRODUCTION_TOOLS: readonly CommercialToolHubItem[] = [
  {
    title: "Product Trial Evidence Runs",
    description:
      "Open the Commercial records that connect products, formulas, batches, measurements, and reviewed outcomes.",
    href: "/home/commercial/evidence-runs",
    credit: "Opening and editing records does not use AI credits.",
    output: "Commercial-scoped trial evidence and its explicit public-review state.",
    actionLabel: "Open evidence runs"
  },
  {
    title: "Soil & Nutrient Batch Planner",
    description:
      "Estimate production batch costs, bag counts, pull sheets, labor, packaging, and margin.",
    href: "/home/commercial/tools/soil-nutrient-batch",
    credit: "The reviewed batch calculation does not require an AI credit.",
    output: "A Commercial batch calculation; inventory changes remain separate actions.",
    actionLabel: "Open batch planner"
  },
  {
    title: "Commercial Tasks",
    description:
      "Review confirmed follow-up work instead of treating an AI suggestion as a completed action.",
    href: "/home/commercial/tasks",
    credit: "Task review and updates do not use AI credits.",
    output: "Commercial-scoped action items and their saved status.",
    actionLabel: "Open Commercial Tasks"
  },
  {
    title: "Tool Library",
    description:
      "Open reusable nutrient, media, ingredient, and environment calculators.",
    href: "/home/commercial/tools/library",
    credit: "Library lookup and deterministic calculators do not use AI credits.",
    output: "Reusable inputs and calculations for reviewed Commercial workflows.",
    actionLabel: "Open Tool Library"
  }
] as const;

function ToolGrid({ items }: { items: readonly CommercialToolHubItem[] }) {
  const { palette } = useAppTheme();

  return (
    <View style={styles.grid}>
      {items.map((tool) => (
        <AppCard key={tool.href} style={styles.card}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={[styles.cardTitle, { color: palette.text }]}
          >
            {tool.title}
          </Text>
          <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
            {tool.description}
          </Text>
          <Text style={[styles.detail, { color: palette.textMuted }]}>
            <Text style={[styles.detailLabel, { color: palette.text }]}>Credits: </Text>
            {tool.credit}
          </Text>
          <Text style={[styles.detail, { color: palette.textMuted }]}>
            <Text style={[styles.detailLabel, { color: palette.text }]}>You get: </Text>
            {tool.output}
          </Text>
          <Link
            href={tool.href as any}
            asChild
            target={
              tool.href === "/home/commercial/tools/soil-nutrient-batch"
                ? "_top"
                : undefined
            }
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={tool.actionLabel}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: palette.accent },
                pressed && styles.buttonPressed
              ]}
            >
              <Text style={[styles.buttonText, { color: palette.accentText }]}>
                {tool.actionLabel}
              </Text>
            </Pressable>
          </Link>
        </AppCard>
      ))}
    </View>
  );
}

export default function CommercialToolsIndex() {
  const { palette } = useAppTheme();
  return (
    <AppPage
      routeKey="commercial-tools"
      header={
        <View>
          <Text style={[styles.title, { color: palette.text }]}>Commercial Tools</Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Start with grow intelligence here. Harvest, scheduling, and lifecycle
            workflows live inside the grow, trial, or batch they affect.
          </Text>
        </View>
      }
    >
      <TokenBalanceWidget workspaceType="commercial" />
      <AppCard style={styles.scopeCard}>
        <Text
          accessibilityRole="header"
          aria-level={2}
          style={[styles.scopeTitle, { color: palette.text }]}
        >
          Commercial workspace boundary
        </Text>
        <Text style={[styles.scopeText, { color: palette.textMuted }]}>
          The balance above is the allowance for the signed-in Commercial account. AI
          never turns a suggestion into a task, batch, inventory change, or public claim
          without a separate reviewed action. Cannabis-only lifecycle tools are shown from
          an eligible grow or evidence run, not from this general hub.
        </Text>
      </AppCard>
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.sectionTitle, { color: palette.text }]}
      >
        Shared grow intelligence
      </Text>
      <ToolGrid items={COMMERCIAL_CORE_TOOLS} />
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.sectionTitle, { color: palette.text }]}
      >
        Commercial production and records
      </Text>
      <ToolGrid items={COMMERCIAL_PRODUCTION_TOOLS} />
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { lineHeight: 20, marginTop: 6, maxWidth: 760 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { flexBasis: 280, flexGrow: 1, gap: 8, minWidth: 250 },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  cardDescription: { flexGrow: 1, lineHeight: 19 },
  detail: { fontSize: 12, lineHeight: 18 },
  detailLabel: { fontWeight: "900" },
  button: {
    alignSelf: "flex-start",
    borderRadius: radius.card,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { fontWeight: "800" },
  scopeCard: { gap: 6 },
  scopeTitle: { fontSize: 17, fontWeight: "900" },
  scopeText: { lineHeight: 20 },
  sectionTitle: { fontSize: 19, fontWeight: "900", marginTop: 8 }
});
