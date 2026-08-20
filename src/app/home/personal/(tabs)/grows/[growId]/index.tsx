import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams, usePathname } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  getPersonalGrowTimeline,
  listPersonalGrows,
  type PersonalGrow,
  type PersonalGrowTimelineEvent
} from "@/api/grows";
import { listPersonalLogs } from "@/api/logs";
import { listPersonalTasks } from "@/api/tasks";
import { listToolRuns } from "@/api/toolRuns";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import ContextualWorkflowLinks from "@/components/personal/ContextualWorkflowLinks";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import {
  coerceParam,
  findGrowById,
  fmtDate,
  isCannabisGrow
} from "@/features/grows/routeUtils";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { sourceObjectHref } from "@/utils/sourceLinks";

export const createGrowOverviewStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: palette.page },
    title: { fontSize: 24, fontWeight: "700", color: palette.text },
    subtitle: { marginTop: 6, color: palette.textMuted },
    panel: {
      marginTop: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
    stats: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
    stat: {
      minWidth: 100,
      padding: 10,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface
    },
    statLabel: { color: palette.textMuted, fontSize: 12 },
    statValue: { fontSize: 18, fontWeight: "800", color: palette.text },
    quickRow: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" },
    action: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: palette.surface
    },
    actionText: { fontWeight: "700", color: palette.link },
    sectionTitle: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: "800",
      color: palette.text
    },
    detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
    detailItem: {
      minWidth: 150,
      flexGrow: 1,
      flexBasis: "45%",
      padding: 10,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface
    },
    detailLabel: { color: palette.textMuted, fontSize: 12 },
    detailValue: { marginTop: 3, color: palette.text, fontWeight: "700" },
    timelineItem: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: palette.border
    },
    timelineMeta: { marginTop: 3, color: palette.textMuted, fontSize: 12 },
    timelineTitle: { fontWeight: "800", color: palette.text },
    timelineSummary: { marginTop: 3, color: palette.textSoft },
    sourceText: { marginTop: 6, fontWeight: "800", color: palette.link },
    empty: { marginTop: 8, color: palette.textMuted },
    error: { color: palette.danger, marginTop: 8 }
  });

type GrowOverviewStyles = ReturnType<typeof createGrowOverviewStyles>;

function readablePlanningValue(value: unknown, fallback = "Not confirmed") {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "unknown") return fallback;
  const labels: Record<string, string> = {
    annual: "Annual / one season",
    biennial: "Biennial / two seasons",
    short_lived_perennial: "Short-lived perennial",
    long_lived_perennial: "Long-lived perennial / woody",
    continuous_tropical: "Continuous indoor / tropical",
    finite_cycle: "Finite production cycle / non-plant",
    climate_dependent_perennial: "Tender perennial / climate-dependent",
    single_harvest: "One main harvest",
    repeat_harvest: "Repeated picking / flushes",
    seasonal_perennial: "Seasonal harvest each year",
    continuous: "Continuous production",
    non_harvest_observation: "Observation / no harvest",
    cultivar_dependent: "Depends on cultivar / growth habit",
    none: "No planned dormancy",
    seasonal: "Seasonal dormancy",
    climate_dependent: "Depends on climate / location"
  };
  if (labels[normalized]) return labels[normalized];
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function hasExplicitSharedSource(event: PersonalGrowTimelineEvent) {
  const row = event as any;
  return Boolean(
    row?.sourceType ||
    row?.itemType ||
    Object.keys(row || {}).some((key) => key.startsWith("linked"))
  );
}

function timelinePreviewHref(event: PersonalGrowTimelineEvent) {
  if (!hasExplicitSharedSource(event)) return "";
  return sourceObjectHref({ ...(event as any), workspaceType: "personal" });
}

function shareGrowHref(grow: PersonalGrow | null, growId: string, basePath: string) {
  const tags = Array.from(
    new Set([
      ...(Array.isArray(grow?.growTags) ? grow.growTags : []),
      ...Object.values(grow?.growInterests || {}).flat()
    ])
  );
  const photos = Array.isArray(grow?.photos) ? grow.photos : [];
  const query = new URLSearchParams({
    growId,
    title: `Grow update: ${grow?.name || "My grow"}`,
    body: [
      grow?.cultivar ? `Cultivar / variety: ${grow.cultivar}` : "",
      grow?.status ? `Status: ${grow.status}` : "",
      grow?.notes || "Sharing an update from my GrowPath grow workspace."
    ]
      .filter(Boolean)
      .join("\n")
  });
  if (tags.length) query.set("growTags", tags.join(","));
  if (photos.length) query.set("photos", photos.join(","));
  return `${basePath === "/home/commercial" ? "/home/commercial/community" : "/home/personal/forum/new-post"}?${query.toString()}`;
}

function TimelinePreviewItem({
  event,
  styles
}: {
  event: PersonalGrowTimelineEvent;
  styles: GrowOverviewStyles;
}) {
  const href = timelinePreviewHref(event);
  const content = (
    <>
      <Text style={styles.timelineTitle}>{event.title}</Text>
      <Text style={styles.timelineMeta}>
        {event.type.replace(/_/g, " ")} | {fmtDate(event.timestamp)}
      </Text>
      {event.summary ? (
        <Text numberOfLines={2} style={styles.timelineSummary}>
          {event.summary}
        </Text>
      ) : null}
      {href ? <Text style={styles.sourceText}>Open Source</Text> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable
          style={styles.timelineItem}
          accessibilityLabel={`Open source for ${event.title}`}
        >
          {content}
        </Pressable>
      </Link>
    );
  }

  return <View style={styles.timelineItem}>{content}</View>;
}

function GrowOverviewContent() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGrowOverviewStyles(palette), [palette]);
  const pathname = usePathname?.() || "";
  const basePath = pathname.startsWith("/home/commercial")
    ? "/home/commercial"
    : "/home/personal";
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  const [grow, setGrow] = useState<PersonalGrow | null>(null);
  const [counts, setCounts] = useState({ logs: 0, tasks: 0, runs: 0 });
  const [timeline, setTimeline] = useState<PersonalGrowTimelineEvent[]>([]);
  const [cannabisGrow, setCannabisGrow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!growId) {
      setError("Missing grow id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [grows, logs, tasks, runs, timelineRows] = await Promise.all([
        listPersonalGrows(),
        listPersonalLogs({ growId }),
        listPersonalTasks({ growId }),
        listToolRuns({ growId }),
        getPersonalGrowTimeline(growId)
      ]);
      const current = findGrowById(grows, growId);
      setGrow(current);
      setCannabisGrow(isCannabisGrow(current, runs));
      setCounts({
        logs: Array.isArray(logs) ? logs.length : 0,
        tasks: Array.isArray(tasks) ? tasks.length : 0,
        runs: Array.isArray(runs) ? runs.length : 0
      });
      setTimeline(Array.isArray(timelineRows) ? timelineRows.slice(0, 5) : []);
      if (!current) setError("Grow not found.");
    } catch {
      setError("Failed to load grow workspace.");
      setGrow(null);
      setCannabisGrow(false);
      setCounts({ logs: 0, tasks: 0, runs: 0 });
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      <Text accessibilityRole="header" style={styles.title}>
        {grow?.name || "Grow Workspace"}
      </Text>
      <Text style={styles.subtitle}>
        Status: {grow?.status || "active"} | Updated: {fmtDate(grow?.updatedAt)}
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grow_overview"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="overview" />

      <View style={styles.panel}>
        <Text style={styles.subtitle}>
          Grow is the parent object. Journal entries, tool runs, and personal tasks attach
          here.
        </Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Journal</Text>
            <Text style={styles.statValue}>{counts.logs}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Tasks</Text>
            <Text style={styles.statValue}>{counts.tasks}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Tool Runs</Text>
            <Text style={styles.statValue}>{counts.runs}</Text>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Crop identity and lifecycle</Text>
        <Text style={styles.subtitle}>
          Review the crop context that guides calendars, tasks, AI tools, and seasonal
          expectations for this grow.
        </Text>
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Crop</Text>
            <Text style={styles.detailValue}>
              {grow?.cropCommonName || grow?.cropTypes?.[0] || "Not confirmed"}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Scientific name</Text>
            <Text style={styles.detailValue}>
              {grow?.scientificName || "Not confirmed"}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Cultivar / variety</Text>
            <Text style={styles.detailValue}>
              {grow?.cultivar || grow?.strain || "Not confirmed"}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Lifespan path</Text>
            <Text style={styles.detailValue}>
              {readablePlanningValue(grow?.planning?.lifeSpanPath)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Harvest / observation pattern</Text>
            <Text style={styles.detailValue}>
              {readablePlanningValue(grow?.planning?.productionPattern)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Dormancy</Text>
            <Text style={styles.detailValue}>
              {readablePlanningValue(grow?.planning?.dormancyPattern)}
            </Text>
          </View>
        </View>
        {Array.isArray(grow?.commonNames) && grow.commonNames.length ? (
          <Text style={styles.subtitle}>Other names: {grow.commonNames.join(", ")}</Text>
        ) : null}
        <View style={styles.quickRow}>
          <Link
            href={`${basePath}/tools/auto-grow-calendar?growId=${encodeURIComponent(growId)}`}
            asChild
          >
            <Pressable style={styles.action} accessibilityLabel="Open crop grow calendar">
              <Text style={styles.actionText}>Open Grow Calendar</Text>
            </Pressable>
          </Link>
          <Link href={`${basePath}/grows/${growId}/plants`} asChild>
            <Pressable style={styles.action} accessibilityLabel="Review grow plants">
              <Text style={styles.actionText}>Review Plants</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {cannabisGrow ? (
        <ContextualWorkflowLinks
          title="Pheno / Genetics"
          helper="Compare plants with this grow already selected. Results save through the same shared ToolRun workflow."
          source="grow_detail_pheno"
          growId={growId}
          workflows={["pheno-matrix"]}
        />
      ) : null}

      {cannabisGrow ? (
        <ContextualWorkflowLinks
          title="Harvest / Diagnosis"
          helper="Use maturity observations and photos, then create a harvest recheck task from the saved result."
          source="grow_detail_harvest"
          growId={growId}
          workflows={["harvest-readiness"]}
        />
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Recent timeline</Text>
        {timeline.length ? (
          timeline.map((event) => (
            <TimelinePreviewItem key={event.id} event={event} styles={styles} />
          ))
        ) : (
          <Text style={styles.empty}>
            Logs, photos, tasks, tool runs, diagnoses, and automation events will appear
            here after they are saved to this grow.
          </Text>
        )}
        <Link href={`${basePath}/grows/${growId}/timeline`} asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.action,
              { alignSelf: "flex-start", marginTop: 12 }
            ])}
          >
            <Text style={styles.actionText}>Open Timeline</Text>
          </Pressable>
        </Link>
      </View>

      <PersonalFeedPlacement
        placement="middle"
        routeKey="personal_grow_overview"
        longContent
      />

      <View style={styles.quickRow}>
        <Link href={`${basePath}/logs/new?growId=${encodeURIComponent(growId)}`} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>+ Journal Entry</Text>
          </Pressable>
        </Link>
        <Link href={`${basePath}/grows/${growId}/tools`} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Grow Intelligence</Text>
          </Pressable>
        </Link>
        <Link href={`${basePath}/grows/${growId}/tasks`} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Add Task</Text>
          </Pressable>
        </Link>
        <Link
          href={`${basePath}/tools/integrations?growId=${encodeURIComponent(growId)}`}
          asChild
        >
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Data Integrations</Text>
          </Pressable>
        </Link>
        <Link
          href={`${basePath}/tools/${basePath === "/home/commercial" ? "report" : "pdf-export"}?growId=${encodeURIComponent(growId)}`}
          asChild
        >
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Export Report</Text>
          </Pressable>
        </Link>
        <Link href={shareGrowHref(grow, growId, basePath) as any} asChild>
          <Pressable style={styles.action} accessibilityLabel="Share grow to forum">
            <Text style={styles.actionText}>Share Grow</Text>
          </Pressable>
        </Link>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grow_overview"
        longContent
      />
    </ScrollView>
  );
}

export default function GrowOverviewScreen() {
  const pathname = usePathname?.() || "";
  const basePath = pathname.startsWith("/home/commercial")
    ? "/home/commercial"
    : "/home/personal";
  return (
    <ScreenBoundary title="Grow overview" showBack backFallbackHref={`${basePath}/grows`}>
      <GrowOverviewContent />
    </ScreenBoundary>
  );
}
