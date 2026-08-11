import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import { listGrows } from "@/api/grows";
import { isCannabisGrow } from "@/features/grows/routeUtils";
import { useFacility } from "@/state/useFacility";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export type FacilityToolHubItem = {
  actionLabel: string;
  credit: string;
  description: string;
  href: string;
  output: string;
  title: string;
};

export const FACILITY_CORE_TOOLS: readonly FacilityToolHubItem[] = [
  {
    title: "Ask AI",
    description: "Use selected-Facility and grow context in a continuing conversation.",
    href: "/home/facility/ai-ask",
    credit: "Provider-backed text help uses the selected Facility's AI credits.",
    output: "Evidence-aware guidance, limitations, and reviewable draft actions.",
    actionLabel: "Open Ask AI"
  },
  {
    title: "Plant Diagnose",
    description:
      "Review plant media, direct observations, and measured operational evidence together.",
    href: "/home/facility/ai-diagnosis-photo",
    credit: "An image-capable diagnosis uses the selected Facility's AI credits.",
    output:
      "Candidates, counter-evidence, missing information, confidence, and next checks.",
    actionLabel: "Open Plant Diagnose"
  },
  {
    title: "Plant & Crop Identification",
    description:
      "Identify an unknown plant from morphology, habitat, geography, photos, and optional video frames.",
    href: "/home/facility/tools/species-crop-id",
    credit:
      "Provider-backed image identification uses the selected Facility's AI credits.",
    output:
      "Ranked candidates, evidence, counter-evidence, uncertainty, and exact next photos.",
    actionLabel: "Open Plant & Crop Identification"
  },
  {
    title: "IPM Scout",
    description:
      "Separate observed organisms, damage, disease signs, and ranked hypotheses in a repeatable scout.",
    href: "/home/facility/tools/ipm-scout",
    credit: "Photo prefill and GPT review are separate selected-Facility AI actions.",
    output:
      "Direct observations, candidates, counter-evidence, missing checks, and follow-up evidence.",
    actionLabel: "Open IPM Scout"
  },
  {
    title: "Environment Review",
    description: "Review measured environmental readings, risk, and next checks.",
    href: "/home/facility/tools/environment",
    credit:
      "The rules review is free; optional provider-backed telemetry prefill uses Facility AI credits.",
    output: "Calculated risks, assumptions, warnings, and measured follow-up checks.",
    actionLabel: "Open Environment Review"
  },
  {
    title: "Soil & Nutrient Mix Builders",
    description:
      "Choose the science-based soil or nutrient mix workflow from the shared calculation engine.",
    href: "/home/facility/tools/recipe-builder",
    credit:
      "The calculators are free; an optional provider-backed prefill uses Facility AI credits.",
    output:
      "Scaled calculations, source quality, assumptions, release timing, and warnings.",
    actionLabel: "Choose a mix builder"
  }
] as const;

export const FACILITY_RECORD_TOOLS: readonly FacilityToolHubItem[] = [
  {
    title: "Saved AI Runs",
    description:
      "Review prior Facility AI evidence, corrections, confidence, linked records, and outcomes.",
    href: "/home/facility/tools/saved-runs",
    credit: "Reviewing saved results does not use AI credits.",
    output: "Facility-scoped run history, evidence, feedback, and follow-up actions.",
    actionLabel: "Open Saved AI Runs"
  },
  {
    title: "Facility Grows",
    description:
      "Open the selected Facility's grows before running lifecycle work that needs room, plant, or stage context.",
    href: "/home/facility/grows",
    credit: "Opening and updating Facility records does not use AI credits.",
    output: "Facility-scoped grow, room, plant, journal, and lifecycle context.",
    actionLabel: "Open Facility Grows"
  },
  {
    title: "Facility Tasks",
    description:
      "Review confirmed assignments instead of treating an AI suggestion as a completed action.",
    href: "/home/facility/tasks",
    credit: "Task review and updates do not use AI credits.",
    output: "Facility-scoped assignments, owners, due dates, and evidence status.",
    actionLabel: "Open Facility Tasks"
  },
  {
    title: "Facility Reports",
    description:
      "Open record-backed operational summaries and controlled evidence exports.",
    href: "/home/facility/reports",
    credit: "Opening reports and exports does not use AI credits.",
    output: "Facility-scoped summaries, readiness gaps, and export evidence.",
    actionLabel: "Open Facility Reports"
  }
] as const;

export const FACILITY_CANNABIS_TOOLS: readonly FacilityToolHubItem[] = [
  {
    title: "Harvest Readiness",
    description:
      "Estimate a review window from visible flower development, sampled trichomes, timing, aroma, and user observations.",
    href: "/home/facility/tools/harvest-readiness",
    credit: "Image analysis uses the selected Facility's AI credits.",
    output:
      "A planning range, reasons to wait or harvest, sampled percentages, uncertainty, and next evidence.",
    actionLabel: "Open Harvest Readiness"
  }
] as const;

export const FACILITY_LIBRARY = [
  ["Nutrient Mix Builder", "/home/facility/tools/npk"],
  ["Soil Mix Builder", "/home/facility/tools/soil-builder"],
  ["Products & Label Library", "/home/facility/tools/ingredient-library"]
] as const;

export function facilityToolHref(href: string, facilityId: string) {
  if (!href.startsWith("/home/facility/tools/")) return href;
  const query = new URLSearchParams({ workspace: "facility" });
  if (facilityId) query.set("facilityId", facilityId);
  return `${href}?${query.toString()}`;
}

function ToolGrid({
  facilityId,
  items
}: {
  facilityId: string;
  items: readonly FacilityToolHubItem[];
}) {
  const router = useRouter();
  const { palette } = useAppTheme();

  return (
    <View style={styles.grid}>
      {items.map((tool) => {
        const href = facilityToolHref(tool.href, facilityId);
        return (
          <AppCard key={tool.href} style={styles.card}>
            <Text
              accessibilityRole="header"
              aria-level={2}
              style={[styles.cardTitle, { color: palette.text }]}
            >
              {tool.title}
            </Text>
            <Text style={[styles.description, { color: palette.textMuted }]}>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tool.actionLabel}
              style={[styles.button, { backgroundColor: palette.accent }]}
              onPress={() => router.push(href as any)}
            >
              <Text style={[styles.buttonText, { color: palette.accentText }]}>
                {tool.actionLabel}
              </Text>
            </Pressable>
          </AppCard>
        );
      })}
    </View>
  );
}

export default function FacilityAiToolsRoute() {
  const router = useRouter();
  const { selectedId: facilityId, selected: facility } = useFacility();
  const { palette } = useAppTheme();
  const activeFacilityId = String(facilityId || "");
  const [showCannabisTools, setShowCannabisTools] = useState(false);

  useEffect(() => {
    let active = true;
    setShowCannabisTools(false);
    if (!activeFacilityId) return () => void (active = false);
    void listGrows(activeFacilityId)
      .then((grows) => {
        if (active)
          setShowCannabisTools(grows.some((grow) => isCannabisGrow(grow as any)));
      })
      .catch(() => {
        if (active) setShowCannabisTools(false);
      });
    return () => {
      active = false;
    };
  }, [activeFacilityId]);
  return (
    <AppPage
      routeKey="facility-ai-tools"
      railOverride={null}
      header={
        <View>
          <Text
            accessibilityRole="header"
            aria-level={1}
            style={[styles.title, { color: palette.text }]}
          >
            Facility Grow Intelligence
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Shared AI and calculation capabilities. Lifecycle work stays attached to its
            room, grow, batch, or production record.
          </Text>
        </View>
      }
    >
      <TokenBalanceWidget
        workspaceType="facility"
        facilityId={activeFacilityId}
        workspaceName={String(facility?.name || "Selected Facility")}
      />
      <AppCard style={styles.scopeCard}>
        <Text
          accessibilityRole="header"
          aria-level={2}
          style={[styles.scopeTitle, { color: palette.text }]}
        >
          Selected Facility boundary
        </Text>
        <Text style={[styles.scopeText, { color: palette.textMuted }]}>
          {facility?.name || "The selected Facility"} owns the balance above. AI never
          turns a suggestion into an assignment, SOP approval, inventory change, or
          compliance claim without a separate authorized action. Cannabis-only lifecycle
          tools appear from an eligible Facility grow, not from this general hub.
        </Text>
      </AppCard>
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.sectionHeading, { color: palette.text }]}
      >
        Shared grow intelligence
      </Text>
      <ToolGrid facilityId={activeFacilityId} items={FACILITY_CORE_TOOLS} />
      {showCannabisTools ? (
        <>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={[styles.sectionHeading, { color: palette.text }]}
          >
            Cannabis grow intelligence
          </Text>
          <ToolGrid facilityId={activeFacilityId} items={FACILITY_CANNABIS_TOOLS} />
        </>
      ) : null}
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.sectionHeading, { color: palette.text }]}
      >
        Facility records and operations
      </Text>
      <ToolGrid facilityId={activeFacilityId} items={FACILITY_RECORD_TOOLS} />
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.section, { color: palette.textMuted }]}
      >
        Tool Library
      </Text>
      <View style={styles.library}>
        {FACILITY_LIBRARY.map(([title, href]) => (
          <Pressable
            key={href}
            accessibilityRole="button"
            accessibilityLabel={`Open ${title}`}
            style={[styles.libraryButton, { borderColor: palette.accent }]}
            onPress={() => router.push(facilityToolHref(href, activeFacilityId) as any)}
          >
            <Text style={[styles.libraryText, { color: palette.accent }]}>{title}</Text>
          </Pressable>
        ))}
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { lineHeight: 20, maxWidth: 760 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    flexBasis: 280,
    flexGrow: 1,
    gap: 8,
    minWidth: 250
  },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  description: { lineHeight: 19 },
  detail: { fontSize: 12, lineHeight: 18 },
  detailLabel: { fontWeight: "900" },
  button: {
    alignSelf: "flex-start",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  buttonText: { fontWeight: "800" },
  section: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 12,
    textTransform: "uppercase"
  },
  library: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  libraryButton: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  libraryText: { fontWeight: "800" },
  scopeCard: { gap: 6 },
  scopeTitle: { fontSize: 17, fontWeight: "900" },
  scopeText: { lineHeight: 20 },
  sectionHeading: { fontSize: 19, fontWeight: "900", marginTop: 8 }
});
