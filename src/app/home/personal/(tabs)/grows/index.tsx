import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { type PersonalGrow } from "@/api/grows";
import AppCard from "@/components/layout/AppCard";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { listWorkspaceGrows, type GrowWorkspace } from "@/features/grows/workspaceData";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

function formatDate(value?: string) {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString();
}

export function formatGrowStartDate(value?: string) {
  if (!value) return "n/a";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return formatDate(value);
  const [, year, month, day] = match;
  const localDate = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(localDate.getTime())) return String(value).slice(0, 10);
  return localDate.toLocaleDateString();
}

export function supportsPullToRefresh(platform = Platform.OS) {
  return platform !== "web";
}

function safeText(value: unknown) {
  return String(value || "").trim();
}

function growName(grow?: PersonalGrow | null) {
  return safeText(grow?.name) || "Untitled Grow";
}

function growIdentity(grow?: PersonalGrow | null) {
  const parts = [
    grow?.cropCommonName,
    grow?.scientificName,
    grow?.cultivar || grow?.strain
  ]
    .map(safeText)
    .filter(Boolean);
  return parts.length
    ? parts.join(" • ")
    : "Add species, cultivar, and notes when you know them.";
}

function growSummary(grow?: PersonalGrow | null) {
  const parts = [
    safeText(grow?.location),
    grow?.startDate ? `Started ${formatGrowStartDate(grow.startDate)}` : "",
    grow?.updatedAt ? `Updated ${formatDate(grow.updatedAt)}` : ""
  ].filter(Boolean);
  return parts.length
    ? parts.join(" • ")
    : "Keep the grow labeled with photos, logs, tasks, and AI runs.";
}

function growPhotoCount(grow?: PersonalGrow | null) {
  return Array.isArray(grow?.photos) ? grow.photos.length : 0;
}

function growTimestamp(grow?: PersonalGrow | null) {
  return new Date(grow?.updatedAt || grow?.startDate || grow?.createdAt || 0).getTime();
}

function growStatus(grow?: PersonalGrow | null) {
  return safeText(grow?.status) || "active";
}

function isActiveGrow(grow?: PersonalGrow | null) {
  return growStatus(grow).toLowerCase() !== "harvested";
}

function statusTone(status: string, styles: ReturnType<typeof createStyles>) {
  const lower = String(status || "").toLowerCase();
  if (lower === "vegetating") return styles.statusVegetating;
  if (lower === "flowering") return styles.statusFlowering;
  if (lower === "curing") return styles.statusCuring;
  if (lower === "harvested") return styles.statusHarvested;
  return styles.statusActive;
}

function metricTone(index: number, styles: ReturnType<typeof createStyles>) {
  const tones = [
    styles.metricGreen,
    styles.metricBlue,
    styles.metricAmber,
    styles.metricSlate,
    styles.metricPurple
  ];
  return tones[index % tones.length];
}

function growHref(basePath: string, id: string, section?: string) {
  const encodedId = encodeURIComponent(String(id || "").trim());
  if (!encodedId) return `${basePath}/grows`;
  if (!section) return `${basePath}/grows/${encodedId}`;
  return `${basePath}/grows/${encodedId}/${section}`;
}

function ActionButton({
  href,
  label,
  primary = false,
  testID
}: {
  href: string;
  label: string;
  primary?: boolean;
  testID?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  // Expo Router's web Link can pass a child style through to React DOM. Keep this
  // boundary as one flat object so a native style array never becomes indexed CSS.
  const buttonStyle = StyleSheet.flatten([
    styles.action,
    primary
      ? {
          backgroundColor: palette.accent,
          borderColor: palette.accent
        }
      : {
          backgroundColor: palette.surface,
          borderColor: palette.border
        }
  ]);
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="link" testID={testID} style={buttonStyle}>
        <Text
          style={[
            styles.actionText,
            { color: primary ? palette.accentText : palette.link }
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function PersonalGrowsRoute({
  workspace = "personal"
}: {
  workspace?: GrowWorkspace;
} = {}) {
  const ent = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const basePath = `/home/${workspace}`;
  const workspaceLabel = workspace === "commercial" ? "Commercial" : "Personal";
  const hasCreateCapability =
    workspace === "commercial" || ent.can(CAPABILITY_KEYS.GROWS_PERSONAL_WRITE);
  const [items, setItems] = useState<PersonalGrow[]>([]);
  const grows = items;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const maxGrows = Number(ent.limits?.maxGrows ?? 0);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await listWorkspaceGrows(workspace);
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(String((e as any)?.message || e || "Failed to load grows"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspace]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedGrows = useMemo(
    () => [...items].sort((left, right) => growTimestamp(right) - growTimestamp(left)),
    [items]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGrows = useMemo(() => {
    if (!normalizedQuery) return sortedGrows;
    return sortedGrows.filter((grow) => {
      const hay = [
        grow?.name,
        grow?.strain,
        grow?.cultivar,
        grow?.status,
        grow?.location,
        grow?.cropCommonName,
        grow?.scientificName
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return hay.includes(normalizedQuery);
    });
  }, [normalizedQuery, sortedGrows]);

  const activeGrows = useMemo(() => sortedGrows.filter(isActiveGrow), [sortedGrows]);
  const latestGrow = sortedGrows[0];
  const id = String(latestGrow?.id || (latestGrow as any)?._id || "").trim();
  const integrationToolHref = (growId: string) =>
    workspace === "commercial"
      ? `${basePath}/tools/integrations?growId=${growId}`
      : `/home/personal/tools/integrations?growId=${growId}`;
  const exportToolHref = (growId: string) =>
    workspace === "commercial"
      ? `${basePath}/tools/report?growId=${growId}`
      : `/home/personal/tools/pdf-export?growId=${growId}`;
  const totalPhotos = useMemo(
    () => sortedGrows.reduce((sum, grow) => sum + growPhotoCount(grow), 0),
    [sortedGrows]
  );

  const statusCounts = useMemo(
    () =>
      sortedGrows.reduce(
        (counts, grow) => {
          const status = growStatus(grow).toLowerCase();
          if (status === "vegetating") counts.vegetating += 1;
          else if (status === "flowering") counts.flowering += 1;
          else if (status === "curing") counts.curing += 1;
          else if (status === "harvested") counts.harvested += 1;
          else counts.active += 1;
          return counts;
        },
        { active: 0, vegetating: 0, flowering: 0, curing: 0, harvested: 0 }
      ),
    [sortedGrows]
  );

  const canCreateGrow = hasCreateCapability && (maxGrows <= 0 || grows.length < maxGrows);
  const limitMessage =
    maxGrows === 1
      ? "Free includes one active grow. Upgrade to Pro to create up to 10 active grows."
      : `This plan includes up to ${maxGrows} active grows. Upgrade to create more.`;

  const summaryCards = [
    { label: "Saved grows", value: sortedGrows.length },
    { label: "Active grows", value: activeGrows.length },
    { label: "Photos", value: totalPhotos },
    { label: "Flowering", value: statusCounts.flowering },
    { label: "Harvested", value: statusCounts.harvested }
  ];
  const roadmapActions = latestGrow
    ? [
        { href: growHref(basePath, id), label: "Open Grow", primary: true },
        { href: growHref(basePath, id, "journal"), label: "Journal" },
        { href: growHref(basePath, id, "tasks"), label: "Tasks" },
        { href: growHref(basePath, id, "timeline"), label: "Timeline" },
        { href: growHref(basePath, id, "tools"), label: "AI Tools" }
      ]
    : [
        { href: `${basePath}/grows/new`, label: "Create Grow", primary: true },
        { href: `${basePath}/tools`, label: "Open AI Tools" },
        {
          href:
            workspace === "commercial"
              ? `${basePath}/tools/diagnose`
              : `${basePath}/diagnose`,
          label: "Run Diagnosis"
        },
        { href: `${basePath}/tasks`, label: "Open Tasks" }
      ];
  const growToolsActions: Array<{ href: string; label: string; primary?: boolean }> =
    latestGrow
      ? [
          {
            href: integrationToolHref(id),
            label: "Integrations"
          },
          {
            href: exportToolHref(id),
            label: "PDF Export"
          }
        ]
      : [
          {
            href: integrationToolHref(""),
            label: "Integrations"
          },
          {
            href: exportToolHref(""),
            label: "PDF Export"
          }
        ];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  return (
    <ScrollView
      testID="screen-personal-grows"
      style={[styles.page, { backgroundColor: palette.page }]}
      contentContainerStyle={styles.pageContent}
      refreshControl={
        supportsPullToRefresh() ? (
          <RefreshControl
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        ) : undefined
      }
    >
      <View style={styles.stack}>
        <BackButton fallbackHref={basePath} />
        <AppCard
          style={[
            styles.heroCard,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.kicker, { color: palette.accent }]}>
            {workspaceLabel} grow workspace
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.text }]}
          >
            Grows
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Keep each grow connected to logs, photos, tasks, AI tools, and exports instead
            of a flat list.
          </Text>
          <View style={styles.heroActions}>
            {canCreateGrow ? (
              <ActionButton
                href={`${basePath}/grows/new`}
                label="Create Grow"
                primary
                testID="btn-new-grow"
              />
            ) : (
              <ActionButton href={`${basePath}/profile`} label="Manage Billing" primary />
            )}
            <ActionButton href={`${basePath}/tools`} label="Open AI Tools" />
            <ActionButton
              href={
                workspace === "commercial"
                  ? `${basePath}/tools/diagnose`
                  : `${basePath}/diagnose`
              }
              label="Run Diagnosis"
            />
            <ActionButton href={`${basePath}/tasks`} label="Open Tasks" />
          </View>
          {!canCreateGrow ? (
            <View>
              <Text style={[styles.limitHeading, { color: palette.warning }]}>
                Free grow limit reached
              </Text>
              <Text style={[styles.limitText, { color: palette.textMuted }]}>
                {limitMessage}
              </Text>
            </View>
          ) : null}
        </AppCard>

        <AppCard
          style={[
            styles.roadmapCard,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.cardKicker, { color: palette.accent }]}>Grow roadmap</Text>
          <Text style={[styles.roadmapTitle, { color: palette.text }]}>
            {latestGrow
              ? "Keep the current grow moving with a clear next step."
              : "Turn a blank workspace into a real grow record."}
          </Text>
          <Text style={[styles.roadmapText, { color: palette.textMuted }]}>
            {latestGrow
              ? "Open the grow, then move through journal entries, tasks, timeline events, and AI tools as the plant changes."
              : "Create the grow, add crop identity and photos, then use diagnosis, tasks, and AI tools to keep the record usable."}
          </Text>
          <View style={styles.roadmapActions}>
            {roadmapActions.map((action) => (
              <ActionButton
                key={`roadmap-${action.label}-${action.href}`}
                href={action.href}
                label={action.label}
                primary={Boolean(action.primary)}
              />
            ))}
          </View>
        </AppCard>

        <AppCard
          style={[
            styles.roadmapCard,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.cardKicker, { color: palette.accent }]}>Grow tools</Text>
          <Text style={[styles.roadmapTitle, { color: palette.text }]}>
            {latestGrow
              ? "Jump into connected tools and exports for the current grow."
              : "Create a grow first, then connect tools and export records from here."}
          </Text>
          <Text style={[styles.roadmapText, { color: palette.textMuted }]}>
            {latestGrow
              ? "Use the grow-specific integrations and PDF export links to keep the record connected to sensors, spreadsheets, and printable reports."
              : "The tools are ready once a grow exists so the links can carry the right grow context."}
          </Text>
          <View style={styles.roadmapActions}>
            {growToolsActions.map((action) => (
              <ActionButton
                key={`grow-tools-${action.label}-${action.href}`}
                href={action.href}
                label={action.label}
                primary={Boolean(action.primary)}
              />
            ))}
          </View>
        </AppCard>

        <PersonalFeedPlacement placement="top" routeKey="personal_grows" longContent />

        {error ? (
          <AppCard
            style={[
              styles.stateCard,
              { backgroundColor: palette.surface, borderColor: palette.border }
            ]}
          >
            <Text style={styles.stateTitle}>Unable to load grows</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try loading grows again"
              onPress={() => {
                void load();
              }}
              style={styles.retryButton}
            >
              <Text style={styles.ctaText}>Try again</Text>
            </Pressable>
          </AppCard>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Workspace summary</Text>
          <Text style={styles.sectionCount}>{sortedGrows.length} total</Text>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map((card, index) => (
            <View key={card.label} style={[styles.metricCard, metricTone(index, styles)]}>
              <Text style={styles.metricValue}>{card.value}</Text>
              <Text style={styles.metricLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <AppCard
          style={[
            styles.featuredCard,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <View style={styles.featuredTopRow}>
            <View style={styles.featuredCopy}>
              <Text style={styles.cardKicker}>Latest grow</Text>
              <Text style={styles.featuredName}>
                {latestGrow ? growName(latestGrow) : "No grow yet"}
              </Text>
              <Text style={styles.featuredMeta}>
                {latestGrow
                  ? growIdentity(latestGrow)
                  : "Create a grow to start connecting logs, photos, tasks, and AI runs."}
              </Text>
              {latestGrow ? (
                <Text style={styles.featuredMeta}>{growSummary(latestGrow)}</Text>
              ) : null}
            </View>
            {latestGrow ? (
              <View
                style={[styles.statusChip, statusTone(growStatus(latestGrow), styles)]}
              >
                <Text style={styles.statusChipValue}>{growStatus(latestGrow)}</Text>
                <Text style={styles.statusChipLabel}>
                  {growPhotoCount(latestGrow)} photos
                </Text>
              </View>
            ) : null}
          </View>
          {latestGrow && Array.isArray(latestGrow.photos) && latestGrow.photos.length ? (
            <View
              style={styles.timelinePreview}
              accessibilityLabel="Latest grow visual timeline preview"
            >
              <View style={styles.timelinePreviewHeader}>
                <View>
                  <Text style={styles.cardKicker}>Visual timeline</Text>
                  <Text style={styles.timelinePreviewText}>
                    Photos and important notes across this grow
                  </Text>
                </View>
                <ActionButton
                  href={growHref(basePath, id, "timeline")}
                  label="Explore Timeline"
                  primary
                />
              </View>
              <View style={styles.timelinePhotos}>
                {latestGrow.photos.slice(0, 4).map((photo, index) => (
                  <Image
                    key={`${photo}-${index}`}
                    source={{ uri: photo }}
                    style={styles.timelinePhoto}
                    resizeMode="cover"
                    accessibilityLabel={`Grow timeline preview photo ${index + 1}`}
                  />
                ))}
              </View>
            </View>
          ) : null}
          {latestGrow ? (
            <View style={styles.featuredActions}>
              <ActionButton href={growHref(basePath, id)} label="Open Grow" primary />
              <ActionButton href={growHref(basePath, id, "journal")} label="Journal" />
              <ActionButton href={growHref(basePath, id, "tasks")} label="Tasks" />
              <ActionButton
                href={growHref(basePath, id, "timeline")}
                label="Visual Timeline"
              />
              <ActionButton href={growHref(basePath, id, "tools")} label="AI Tools" />
            </View>
          ) : (
            <View style={styles.featuredActions}>
              <ActionButton
                href={`${basePath}/grows/new`}
                label="Start First Grow"
                primary
              />
            </View>
          )}
        </AppCard>

        <PersonalFeedPlacement placement="middle" routeKey="personal_grows" longContent />

        <AppCard
          style={[
            styles.searchCard,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={styles.cardKicker}>Search</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search grows"
            placeholderTextColor={palette.textMuted}
            style={styles.searchInput}
          />
          <Text style={styles.searchHint}>
            Filter by grow name, cultivar, strain, status, location, or crop identity.
          </Text>
        </AppCard>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your grows</Text>
          <Text style={styles.sectionCount}>{filteredGrows.length} shown</Text>
        </View>

        {loading && !sortedGrows.length ? (
          <AppCard
            style={[
              styles.stateCard,
              { backgroundColor: palette.surface, borderColor: palette.border }
            ]}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={[styles.stateText, { marginTop: 10 }]}>
              Loading grow dashboard...
            </Text>
          </AppCard>
        ) : null}

        {!loading && !filteredGrows.length ? (
          <AppCard
            style={[
              styles.emptyCard,
              { backgroundColor: palette.surface, borderColor: palette.border }
            ]}
          >
            <Text style={styles.emptyTitle}>
              {sortedGrows.length ? "No grows match your search" : "No grows yet"}
            </Text>
            <Text style={styles.emptyText}>
              {sortedGrows.length
                ? "Try a different search term or clear the filter to see every grow."
                : "Create a grow to connect photos, journal entries, tasks, tools, crop ID, and exportable records in one place."}
            </Text>
            <View style={styles.emptyActions}>
              {canCreateGrow ? (
                <ActionButton
                  href={`${basePath}/grows/new`}
                  label="New Grow"
                  primary
                  testID="btn-create-first-grow"
                />
              ) : (
                <ActionButton
                  href={`${basePath}/profile`}
                  label="Manage Billing"
                  primary
                />
              )}
              <ActionButton href={`${basePath}/tools`} label="Open AI Tools" />
              <ActionButton
                href={
                  workspace === "commercial"
                    ? `${basePath}/tools/diagnose`
                    : `${basePath}/diagnose`
                }
                label="Diagnose"
              />
            </View>
          </AppCard>
        ) : null}

        <View style={styles.growList}>
          {filteredGrows.map((grow) => {
            const id = String(grow?.id || (grow as any)?._id || "").trim();
            if (!id) return null;
            const status = growStatus(grow);
            const growChips = [
              safeText(grow?.location),
              safeText(grow?.cropCommonName || grow?.scientificName),
              safeText(grow?.cultivar || grow?.strain),
              grow?.startDate ? `Started ${formatGrowStartDate(grow.startDate)}` : "",
              grow?.updatedAt ? `Updated ${formatDate(grow.updatedAt)}` : ""
            ].filter(Boolean);
            const note = safeText(grow?.notes);

            return (
              <AppCard
                key={id}
                style={[
                  styles.growCard,
                  { backgroundColor: palette.surface, borderColor: palette.border }
                ]}
              >
                <View style={styles.growHeader}>
                  <View style={styles.growCopy}>
                    <Text style={styles.growName}>{growName(grow)}</Text>
                    <Text style={styles.growIdentity}>{growIdentity(grow)}</Text>
                    <Text style={styles.growMeta}>{growSummary(grow)}</Text>
                  </View>
                  <View style={[styles.statusChip, statusTone(status, styles)]}>
                    <Text style={styles.statusChipValue}>{status}</Text>
                    <Text style={styles.statusChipLabel}>
                      {growPhotoCount(grow)} photos
                    </Text>
                  </View>
                </View>

                {growChips.length ? (
                  <View style={styles.chipRow}>
                    {growChips.slice(0, 4).map((chip) => (
                      <View key={chip} style={styles.chip}>
                        <Text style={styles.chipText}>{chip}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {note ? <Text style={styles.note}>{note}</Text> : null}

                <View style={styles.growActions}>
                  <ActionButton href={growHref(basePath, id)} label="Open" primary />
                  <ActionButton
                    href={growHref(basePath, id, "journal")}
                    label="Journal"
                  />
                  <ActionButton href={growHref(basePath, id, "tasks")} label="Tasks" />
                  <ActionButton href={growHref(basePath, id, "tools")} label="AI Tools" />
                  <ActionButton
                    href={growHref(basePath, id, "timeline")}
                    label="Timeline"
                  />
                </View>
              </AppCard>
            );
          })}
        </View>

        <PersonalFeedPlacement placement="bottom" routeKey="personal_grows" longContent />
      </View>
    </ScrollView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: palette.page
    },
    pageContent: {
      alignSelf: "center",
      maxWidth: 1200,
      padding: 20,
      width: "100%"
    },
    stack: {
      gap: 14
    },
    heroCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border
    },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 4,
      textTransform: "uppercase"
    },
    title: {
      color: palette.text,
      fontSize: 28,
      fontWeight: "900"
    },
    subtitle: {
      color: palette.textMuted,
      fontWeight: "700",
      lineHeight: 20,
      marginTop: 4
    },
    heroActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    limitText: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 10
    },
    limitHeading: {
      color: palette.warning,
      fontSize: 12,
      fontWeight: "900",
      marginTop: 10,
      textTransform: "uppercase"
    },
    roadmapCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border
    },
    roadmapTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "900",
      lineHeight: 21
    },
    roadmapText: {
      color: palette.textMuted,
      lineHeight: 20,
      marginTop: 4
    },
    roadmapActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    stateCard: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      justifyContent: "center"
    },
    stateTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "900"
    },
    stateText: {
      color: palette.textMuted,
      lineHeight: 19,
      marginTop: 6,
      textAlign: "center"
    },
    retryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    ctaText: {
      color: palette.accentText,
      fontWeight: "900"
    },
    sectionHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 4
    },
    sectionTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "900"
    },
    sectionCount: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: 999,
      color: palette.textSoft,
      fontWeight: "900",
      paddingHorizontal: 10,
      paddingVertical: 4
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    metricCard: {
      borderWidth: 1,
      borderRadius: radius.card,
      flexGrow: 1,
      minWidth: 110,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    metricGreen: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.success
    },
    metricBlue: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.info
    },
    metricAmber: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.warning
    },
    metricSlate: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border
    },
    metricPurple: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent
    },
    metricValue: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "900"
    },
    metricLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "900",
      marginTop: 1
    },
    featuredCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border
    },
    featuredTopRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between"
    },
    featuredCopy: {
      flex: 1,
      minWidth: 220
    },
    cardKicker: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    featuredName: {
      color: palette.text,
      fontSize: 20,
      fontWeight: "900",
      marginTop: 2
    },
    featuredMeta: {
      color: palette.textMuted,
      lineHeight: 19,
      marginTop: 4
    },
    timelinePreview: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      marginTop: 12,
      padding: 12
    },
    timelinePreviewHeader: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between"
    },
    timelinePreviewText: { color: palette.textMuted, marginTop: 3 },
    timelinePhotos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    timelinePhoto: {
      backgroundColor: palette.surface,
      borderRadius: radius.card,
      height: 100,
      minWidth: 130,
      flexGrow: 1,
      flexBasis: 150
    },
    statusChip: {
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 110,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    statusActive: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border
    },
    statusVegetating: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.success
    },
    statusFlowering: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.warning
    },
    statusCuring: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.info
    },
    statusHarvested: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border
    },
    statusChipValue: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "900",
      textTransform: "capitalize"
    },
    statusChipLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 2
    },
    featuredActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    searchCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border
    },
    searchInput: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      marginTop: 8,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    searchHint: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 8
    },
    emptyCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border
    },
    emptyTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "900"
    },
    emptyText: {
      color: palette.textMuted,
      lineHeight: 20,
      marginTop: 5
    },
    emptyActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    growList: {
      gap: 12
    },
    growCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1
    },
    growHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between"
    },
    growCopy: {
      flex: 1,
      minWidth: 220
    },
    growName: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "900"
    },
    growIdentity: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 4
    },
    growMeta: {
      color: palette.textMuted,
      lineHeight: 19,
      marginTop: 4
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    chip: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    chipText: {
      color: palette.textSoft,
      fontSize: 11,
      fontWeight: "800"
    },
    note: {
      color: palette.textSoft,
      lineHeight: 20,
      marginTop: 10
    },
    growActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    action: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    actionPrimary: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    actionText: {
      color: palette.link,
      fontWeight: "800"
    },
    actionTextPrimary: {
      color: palette.accentText
    }
  });
}
