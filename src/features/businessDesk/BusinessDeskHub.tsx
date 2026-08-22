import { Link } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export type BusinessDeskToolId =
  | "price-margin-break-even"
  | "quote-estimate"
  | "lead-follow-up"
  | "job-notes"
  | "expense-receipt"
  | "vendor-compare"
  | "cash-flow-snapshot"
  | "business-ask-ai";

export type BusinessDeskToolDefinition = {
  id: BusinessDeskToolId;
  title: string;
  description: string;
  engine: "money" | "records" | "documents" | "assistant";
  path: string;
  availability: "available" | "construction";
};

export const BUSINESS_DESK_TOOLS: BusinessDeskToolDefinition[] = [
  {
    id: "price-margin-break-even",
    title: "Price & Margin",
    description:
      "Test a price, direct cost, discounts, fees, shipping, tax, and break-even without hiding unknown costs.",
    engine: "money",
    path: "price-margin",
    availability: "available"
  },
  {
    id: "quote-estimate",
    title: "Quote / Estimate",
    description:
      "Build a reviewed, revision-safe quote and prepare an export or optional payment-provider draft handoff.",
    engine: "money",
    path: "quotes",
    availability: "available"
  },
  {
    id: "lead-follow-up",
    title: "Lead Follow-up",
    description:
      "Keep the next contact, consent-aware notes, owner, and outcome visible without becoming a full CRM.",
    engine: "records",
    path: "leads",
    availability: "available"
  },
  {
    id: "job-notes",
    title: "Job Notes",
    description:
      "Capture scope, visits, evidence, decisions, customer-ready summaries, and follow-up work.",
    engine: "records",
    path: "jobs",
    availability: "available"
  },
  {
    id: "expense-receipt",
    title: "Expense / Receipt Helper",
    description:
      "Extract a private draft from a receipt, then require human review before saving any business record.",
    engine: "documents",
    path: "expenses",
    availability: "available"
  },
  {
    id: "vendor-compare",
    title: "Vendor Compare",
    description:
      "Compare reviewed landed costs and produce a purchase request without changing inventory.",
    engine: "money",
    path: "vendors",
    availability: "available"
  },
  {
    id: "cash-flow-snapshot",
    title: "Cash-Flow Snapshot",
    description:
      "Separate recorded and expected inflows and outflows across practical planning horizons.",
    engine: "money",
    path: "cash-flow",
    availability: "available"
  },
  {
    id: "business-ask-ai",
    title: "Business Ask AI",
    description:
      "Ask questions across selected, authorized Business Desk records with citations, limits, and draft-only actions.",
    engine: "assistant",
    path: "ask-ai",
    availability: "construction"
  }
];

export type BusinessDeskHubProps = {
  basePath: string;
  workspaceLabel: "Commercial" | "Facility";
};

export default function BusinessDeskHub({
  basePath,
  workspaceLabel
}: BusinessDeskHubProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <AppPage
      routeKey="business-desk"
      railOverride={null}
      longContent
      backFallbackHref={
        workspaceLabel === "Facility" ? "/home/facility/more" : "/home/commercial/more"
      }
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>{workspaceLabel} workspace</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Business Desk
          </Text>
          <Text style={styles.subtitle}>
            Eight focused tools for ordinary business work. Calculations stay explicit,
            saved work is revisioned, and drafts never send, charge, or change inventory
            without a separate reviewed action.
          </Text>
        </View>
      }
    >
      <AppCard
        title="Shared business foundation"
        titleLevel={2}
        subtitle="One workspace boundary, four reusable engines, and no parallel inventory system."
      >
        <View style={styles.foundationGrid}>
          <Text style={styles.foundationItem}>Money: integer minor units</Text>
          <Text style={styles.foundationItem}>Records: revisions and audit history</Text>
          <Text style={styles.foundationItem}>Documents: private review staging</Text>
          <Text style={styles.foundationItem}>AI: cited, scoped, draft-only help</Text>
        </View>
      </AppCard>

      <View style={styles.toolGrid}>
        {BUSINESS_DESK_TOOLS.map((tool, index) => {
          const available = tool.availability === "available";
          const content = (
            <View
              style={[
                styles.toolCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
                !available && styles.toolCardMuted
              ]}
            >
              <View style={styles.toolHeading}>
                <Text style={styles.toolNumber}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Text style={styles.engineLabel}>{tool.engine}</Text>
              </View>
              <Text accessibilityRole="header" aria-level={2} style={styles.toolTitle}>
                {tool.title}
              </Text>
              <Text style={styles.toolDescription}>{tool.description}</Text>
              <Text style={available ? styles.openLabel : styles.constructionLabel}>
                {available ? "Open tool" : "In the current construction sequence"}
              </Text>
            </View>
          );

          if (!available) {
            return (
              <View key={tool.id} style={styles.toolCell}>
                {content}
              </View>
            );
          }
          return (
            <Link key={tool.id} href={`${basePath}/${tool.path}` as any} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open ${tool.title}`}
                style={styles.toolCell}
              >
                {content}
              </Pressable>
            </Link>
          );
        })}
      </View>
    </AppPage>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    constructionLabel: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 12
    },
    engineLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    foundationGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    foundationItem: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      flexBasis: 220,
      flexGrow: 1,
      fontSize: 13,
      lineHeight: 19,
      padding: 10
    },
    header: { gap: 6 },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    openLabel: {
      color: palette.link,
      fontSize: 13,
      fontWeight: "900",
      marginTop: 12
    },
    subtitle: {
      color: palette.textMuted,
      fontSize: 15,
      lineHeight: 22,
      maxWidth: 820
    },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" },
    toolCard: {
      borderRadius: radius.card,
      borderWidth: 1,
      flex: 1,
      minHeight: 210,
      padding: 16
    },
    toolCardMuted: { opacity: 0.78 },
    toolCell: {
      flexBasis: 260,
      flexGrow: 1,
      flexShrink: 1,
      maxWidth: "100%",
      minWidth: 240
    },
    toolDescription: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 7
    },
    toolGrid: {
      alignItems: "stretch",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12
    },
    toolHeading: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    toolNumber: { color: palette.accent, fontSize: 13, fontWeight: "900" },
    toolTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 14
    }
  });
}
