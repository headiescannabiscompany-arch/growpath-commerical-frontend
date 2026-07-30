import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { listPersonalGrows, type PersonalGrow } from "@/api/grows";
import AppCard from "@/components/layout/AppCard";
import PersonalFeaturedFeed from "@/components/home/PersonalFeaturedFeed";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

function formatDate(value?: string) {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString();
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
    grow?.startDate ? `Started ${formatDate(grow.startDate)}` : "",
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

function statusTone(status: string) {
  const lower = String(status || "").toLowerCase();
  if (lower === "vegetating") return styles.statusVegetating;
  if (lower === "flowering") return styles.statusFlowering;
  if (lower === "curing") return styles.statusCuring;
  if (lower === "harvested") return styles.statusHarvested;
  return styles.statusActive;
}

function metricTone(index: number) {
  const tones = [
    styles.metricGreen,
    styles.metricBlue,
    styles.metricAmber,
    styles.metricSlate,
    styles.metricPurple
  ];
  return tones[index % tones.length];
}

function growHref(id: string, section?: string) {
  const encodedId = encodeURIComponent(String(id || "").trim());
  if (!encodedId) return "/home/personal/grows";
  if (!section) return `/home/personal/grows/${encodedId}`;
  return `/home/personal/grows/${encodedId}/${section}`;
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
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      testID={testID}
      onPress={() => router.push(href as any)}
      style={primary ? [styles.action, styles.actionPrimary] : styles.action}
    >
      <Text
        style={
          primary ? [styles.actionText, styles.actionTextPrimary] : styles.actionText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function PersonalGrowsRoute() {
  const ent = useEntitlements();
  const hasCreateCapability = ent.can(CAPABILITY_KEYS.GROWS_PERSONAL_WRITE);
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
      const res = await listPersonalGrows();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(String((e as any)?.message || e || "Failed to load grows"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
  const id = String(latestGrow?.id || latestGrow?._id || "").trim();
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
        { href: growHref(latestGrow.id), label: "Open Grow", primary: true },
        { href: growHref(latestGrow.id, "journal"), label: "Journal" },
        { href: growHref(latestGrow.id, "tasks"), label: "Tasks" },
        { href: growHref(latestGrow.id, "timeline"), label: "Timeline" },
        { href: growHref(latestGrow.id, "tools"), label: "AI Tools" }
      ]
    : [
        { href: "/home/personal/grows/new", label: "Create Grow", primary: true },
        { href: "/home/personal/tools", label: "Open AI Tools" },
        { href: "/home/personal/diagnose", label: "Run Diagnosis" },
        { href: "/home/personal/tasks", label: "Open Tasks" }
      ];
  const growToolsActions = latestGrow
    ? [
        {
          href: `/home/personal/tools/integrations?growId=${id}`,
          label: "Integrations"
        },
        {
          href: `/home/personal/tools/pdf-export?growId=${id}`,
          label: "PDF Export"
        }
      ]
    : [
        {
          href: "/home/personal/tools/integrations?growId=",
          label: "Integrations"
        },
        {
          href: "/home/personal/tools/pdf-export?growId=",
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
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.stack}>
        <AppCard style={styles.heroCard}>
          <Text style={styles.kicker}>Personal grow workspace</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Grows
          </Text>
          <Text style={styles.subtitle}>
            Keep each grow connected to logs, photos, tasks, AI tools, and exports instead
            of a flat list.
          </Text>
          <View style={styles.heroActions}>
            {canCreateGrow ? (
              <ActionButton
                href="/home/personal/grows/new"
                label="Create Grow"
                primary
                testID="btn-new-grow"
              />
            ) : (
              <ActionButton
                href="/home/personal/profile/billing"
                label="Manage Billing"
                primary
              />
            )}
            <ActionButton href="/home/personal/tools" label="Open AI Tools" />
            <ActionButton href="/home/personal/diagnose" label="Run Diagnosis" />
            <ActionButton href="/home/personal/tasks" label="Open Tasks" />
          </View>
              {!canCreateGrow ? (
                <View>
                  <Text style={styles.limitHeading}>Free grow limit reached</Text>
                  <Text style={styles.limitText}>{limitMessage}</Text>
                </View>
              ) : null}
        </AppCard>

        <AppCard style={styles.roadmapCard}>
          <Text style={styles.cardKicker}>Grow roadmap</Text>
          <Text style={styles.roadmapTitle}>
            {latestGrow
              ? "Keep the current grow moving with a clear next step."
              : "Turn a blank workspace into a real grow record."}
          </Text>
          <Text style={styles.roadmapText}>
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

        <AppCard style={styles.roadmapCard}>
          <Text style={styles.cardKicker}>Grow tools</Text>
          <Text style={styles.roadmapTitle}>
            {latestGrow
              ? "Jump into connected tools and exports for the current grow."
              : "Create a grow first, then connect tools and export records from here."}
          </Text>
          <Text style={styles.roadmapText}>
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

        <PersonalFeaturedFeed />

        {error ? (
          <AppCard style={styles.stateCard}>
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
            <View key={card.label} style={[styles.metricCard, metricTone(index)]}>
              <Text style={styles.metricValue}>{card.value}</Text>
              <Text style={styles.metricLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <AppCard style={styles.featuredCard}>
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
              <View style={[styles.statusChip, statusTone(growStatus(latestGrow))]}>
                <Text style={styles.statusChipValue}>{growStatus(latestGrow)}</Text>
                <Text style={styles.statusChipLabel}>
                  {growPhotoCount(latestGrow)} photos
                </Text>
              </View>
            ) : null}
          </View>
          {latestGrow ? (
            <View style={styles.featuredActions}>
              <ActionButton href={growHref(latestGrow.id)} label="Open Grow" primary />
              <ActionButton href={growHref(latestGrow.id, "journal")} label="Journal" />
              <ActionButton href={growHref(latestGrow.id, "tasks")} label="Tasks" />
              <ActionButton href={growHref(latestGrow.id, "timeline")} label="Timeline" />
              <ActionButton href={growHref(latestGrow.id, "tools")} label="AI Tools" />
            </View>
          ) : (
            <View style={styles.featuredActions}>
              <ActionButton
                href="/home/personal/grows/new"
                label="Start First Grow"
                primary
              />
            </View>
          )}
        </AppCard>

        <AppCard style={styles.searchCard}>
          <Text style={styles.cardKicker}>Search</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search grows"
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
          <AppCard style={styles.stateCard}>
            <ActivityIndicator />
            <Text style={[styles.stateText, { marginTop: 10 }]}>
              Loading grow dashboard...
            </Text>
          </AppCard>
        ) : null}

        {!loading && !filteredGrows.length ? (
          <AppCard style={styles.emptyCard}>
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
                  href="/home/personal/grows/new"
                  label="New Grow"
                  primary
                  testID="btn-create-first-grow"
                />
              ) : (
                <ActionButton
                  href="/home/personal/profile/billing"
                  label="Manage Billing"
                  primary
                />
              )}
              <ActionButton href="/home/personal/tools" label="Open AI Tools" />
              <ActionButton href="/home/personal/diagnose" label="Diagnose" />
            </View>
          </AppCard>
        ) : null}

        <View style={styles.growList}>
          {filteredGrows.map((grow) => {
            const id = String(grow?.id || grow?._id || "").trim();
            if (!id) return null;
            const status = growStatus(grow);
            const growChips = [
              safeText(grow?.location),
              safeText(grow?.cropCommonName || grow?.scientificName),
              safeText(grow?.cultivar || grow?.strain),
              grow?.startDate ? `Started ${formatDate(grow.startDate)}` : "",
              grow?.updatedAt ? `Updated ${formatDate(grow.updatedAt)}` : ""
            ].filter(Boolean);
            const note = safeText(grow?.notes);

            return (
              <AppCard key={id} style={styles.growCard}>
                <View style={styles.growHeader}>
                  <View style={styles.growCopy}>
                    <Text style={styles.growName}>{growName(grow)}</Text>
                    <Text style={styles.growIdentity}>{growIdentity(grow)}</Text>
                    <Text style={styles.growMeta}>{growSummary(grow)}</Text>
                  </View>
                  <View style={[styles.statusChip, statusTone(status)]}>
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
                  <ActionButton href={growHref(id)} label="Open" primary />
                  <ActionButton href={growHref(id, "journal")} label="Journal" />
                  <ActionButton href={growHref(id, "tasks")} label="Tasks" />
                  <ActionButton href={growHref(id, "tools")} label="AI Tools" />
                  <ActionButton href={growHref(id, "timeline")} label="Timeline" />
                </View>
              </AppCard>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F1F5F9"
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
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0"
  },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: "#475569",
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
        color: "#64748B",
        fontSize: 12,
        lineHeight: 17,
        marginTop: 10
      },
      limitHeading: {
        color: "#B45309",
        fontSize: 12,
        fontWeight: "900",
        marginTop: 10,
        textTransform: "uppercase"
      },
  roadmapCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#C7F9CC"
  },
  roadmapTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21
  },
  roadmapText: {
    color: "#475569",
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
    justifyContent: "center"
  },
  stateTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900"
  },
  stateText: {
    color: "#475569",
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center"
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  ctaText: {
    color: "#FFFFFF",
    fontWeight: "900"
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  sectionCount: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#334155",
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
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0"
  },
  metricBlue: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE"
  },
  metricAmber: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D"
  },
  metricSlate: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0"
  },
  metricPurple: {
    backgroundColor: "#FAF5FF",
    borderColor: "#D8B4FE"
  },
  metricValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 1
  },
  featuredCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1FAE5"
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
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  featuredName: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2
  },
  featuredMeta: {
    color: "#475569",
    lineHeight: 19,
    marginTop: 4
  },
  statusChip: {
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 110,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  statusActive: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1"
  },
  statusVegetating: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0"
  },
  statusFlowering: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74"
  },
  statusCuring: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE"
  },
  statusHarvested: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1"
  },
  statusChipValue: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  statusChipLabel: {
    color: "#475569",
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
    backgroundColor: "#FFFFFF"
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#0F172A",
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchHint: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8
  },
  emptyCard: {
    backgroundColor: "#FFFFFF"
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900"
  },
  emptyText: {
    color: "#475569",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
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
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  growIdentity: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  growMeta: {
    color: "#475569",
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
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  chipText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "800"
  },
  note: {
    color: "#334155",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionPrimary: {
    backgroundColor: "#166534",
    borderColor: "#166534"
  },
  actionText: {
    color: "#166534",
    fontWeight: "800"
  },
  actionTextPrimary: {
    color: "#FFFFFF"
  }
});
