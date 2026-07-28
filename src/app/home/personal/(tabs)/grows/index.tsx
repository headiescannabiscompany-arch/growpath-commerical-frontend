import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { listPersonalGrows, type PersonalGrow } from "@/api/grows";
import AppCard from "@/components/layout/AppCard";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

function formatDate(value?: string) {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString();
}

function safeText(value?: string | null) {
  return String(value || "").trim();
}

function growName(grow: PersonalGrow) {
  return safeText(grow.name) || "Untitled Grow";
}

function growIdentity(grow: PersonalGrow) {
  const parts = [grow.cropCommonName, grow.scientificName, grow.cultivar || grow.strain]
    .map(safeText)
    .filter(Boolean);
  return parts.length
    ? parts.join(" ? ")
    : "Add species, cultivar, and notes when you know them.";
}

function growSummary(grow: PersonalGrow) {
  const parts = [
    safeText(grow.location),
    grow.startDate ? "Started " + formatDate(grow.startDate) : "",
    grow.updatedAt ? "Updated " + formatDate(grow.updatedAt) : ""
  ].filter(Boolean);
  return parts.length
    ? parts.join(" ? ")
    : "Keep the grow labeled with photos, logs, tasks, and AI runs.";
}

function growPhotoCount(grow: PersonalGrow) {
  return Array.isArray(grow.photos) ? grow.photos.length : 0;
}

function growTimestamp(grow: PersonalGrow) {
  return new Date(grow.updatedAt || grow.startDate || grow.createdAt || 0).getTime();
}

function growStatus(grow: PersonalGrow) {
  return safeText(grow.status) || "active";
}

function isActiveGrow(grow: PersonalGrow) {
  return growStatus(grow).toLowerCase() !== "harvested";
}

function statusTone(status: string) {
  const lower = status.toLowerCase();
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
    styles.metricSlate
  ];
  return tones[index % tones.length];
}

function ActionLink({
  href,
  label,
  primary = false
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        style={[styles.action, primary ? styles.actionPrimary : null]}
      >
        <Text style={[styles.actionText, primary ? styles.actionTextPrimary : null]}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function GrowsListScreen() {
  const entitlements = useEntitlements();
  const hasCreateCapability = entitlements.can(CAPABILITY_KEYS.GROWS_PERSONAL_WRITE);
  const [grows, setGrows] = useState<PersonalGrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const maxGrows = Number(entitlements.limits?.maxGrows ?? 0);

  const sortedGrows = useMemo(() => {
    return [...grows].sort((left, right) => growTimestamp(right) - growTimestamp(left));
  }, [grows]);

  const activeGrows = useMemo(() => sortedGrows.filter(isActiveGrow), [sortedGrows]);
  const latestGrow = sortedGrows[0];
  const totalPhotos = useMemo(
    () => grows.reduce((sum, grow) => sum + growPhotoCount(grow), 0),
    [grows]
  );
  const statusCounts = useMemo(
    () =>
      grows.reduce(
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
    [grows]
  );

  const canCreateGrow = hasCreateCapability && (maxGrows <= 0 || grows.length < maxGrows);
  const limitTitle = maxGrows === 1 ? "Free grow limit reached" : "Grow limit reached";
  const limitMessage =
    maxGrows === 1
      ? "Free includes one active grow. Upgrade to Pro to create up to 10 active grows."
      : "This plan includes up to " + maxGrows + " active grows. Upgrade to create more.";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listPersonalGrows();
      setGrows(Array.isArray(res) ? res : []);
    } catch {
      setGrows([]);
      setError("Failed to load grows.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const header = (
    <View>
      <Text style={styles.kicker}>Personal grow workspace</Text>
      <Text accessibilityRole="header" style={styles.title}>
        Grows
      </Text>
      <Text style={styles.subtitle}>
        Turn each grow into a working dashboard with photos, logs, tasks, AI runs, and
        field-study links instead of a flat list.
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View testID="screen-personal-grows" style={styles.stack}>
        {header}
        {error ? (
          <AppCard style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load grows</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try loading grows again"
              onPress={() => void load()}
              style={styles.retryButton}
            >
              <Text style={styles.ctaText}>Try again</Text>
            </Pressable>
          </AppCard>
        ) : null}

        {loading && !grows.length ? (
          <AppCard style={styles.stateCard}>
            <ActivityIndicator />
            <Text style={[styles.stateText, { marginTop: 10 }]}>
              Loading grow dashboard...
            </Text>
          </AppCard>
        ) : null}

        <AppCard style={styles.commandCard}>
          <View style={styles.commandHeader}>
            <View style={styles.commandCopy}>
              <Text style={styles.commandEyebrow}>Grow command center</Text>
              <Text style={styles.commandTitle}>
                {latestGrow ? growName(latestGrow) : "No grow selected yet"}
              </Text>
              <Text style={styles.commandDescription}>
                {latestGrow
                  ? growIdentity(latestGrow)
                  : "Create one grow, then keep the work connected through logs, photos, tasks, AI tools, and exports."}
              </Text>
            </View>
            <View style={styles.commandPills}>
              <View style={[styles.pulse, styles.metricGreen]}>
                <Text style={styles.pulseValue}>{grows.length}</Text>
                <Text style={styles.pulseLabel}>Saved</Text>
              </View>
              <View style={[styles.pulse, styles.metricBlue]}>
                <Text style={styles.pulseValue}>{activeGrows.length}</Text>
                <Text style={styles.pulseLabel}>Active</Text>
              </View>
              <View style={[styles.pulse, styles.metricAmber]}>
                <Text style={styles.pulseValue}>{totalPhotos}</Text>
                <Text style={styles.pulseLabel}>Photos</Text>
              </View>
              <View style={[styles.pulse, styles.metricSlate]}>
                <Text style={styles.pulseValue}>{statusCounts.flowering}</Text>
                <Text style={styles.pulseLabel}>Flowering</Text>
              </View>
            </View>
          </View>

          <View style={styles.featuredGrowCard}>
            <View style={styles.featuredGrowTopRow}>
              <View style={styles.featuredGrowCopy}>
                <Text style={styles.featuredGrowEyebrow}>Latest grow</Text>
                <Text style={styles.featuredGrowName}>
                  {latestGrow ? growName(latestGrow) : "No grow yet"}
                </Text>
                <Text style={styles.featuredGrowMeta}>
                  {latestGrow ? growSummary(latestGrow) : limitMessage}
                </Text>
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

            <View style={styles.featuredMetricGrid}>
              {[
                { label: "Vegetating", value: statusCounts.vegetating },
                { label: "Flowering", value: statusCounts.flowering },
                { label: "Curing", value: statusCounts.curing },
                { label: "Harvested", value: statusCounts.harvested }
              ].map((item, index) => (
                <View key={item.label} style={[styles.featuredMetric, metricTone(index)]}>
                  <Text style={styles.featuredMetricValue}>{item.value}</Text>
                  <Text style={styles.featuredMetricLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.featuredActions}>
              {latestGrow ? (
                <ActionLink
                  href={
                    "/home/personal/grows/" + encodeURIComponent(String(latestGrow.id))
                  }
                  label="Open Grow"
                  primary
                />
              ) : null}
              {canCreateGrow ? (
                <ActionLink href="/home/personal/grows/new" label="New Grow" />
              ) : (
                <ActionLink
                  href="/home/personal/profile/billing"
                  label="Manage Billing"
                />
              )}
              <ActionLink href="/home/personal/tools" label="AI Tools" />
              <ActionLink href="/home/personal/field-studies" label="Field Studies" />
            </View>
          </View>
        </AppCard>

        <AppCard style={styles.quickCard}>
          <Text style={styles.cardKicker}>Quick actions</Text>
          <View style={styles.quickActions}>
            {canCreateGrow ? (
              <ActionLink href="/home/personal/grows/new" label="Create Grow" primary />
            ) : null}
            <ActionLink href="/home/personal/logs/new" label="Add Log" />
            <ActionLink href="/home/personal/tools" label="Open AI Tools" />
            <ActionLink href="/home/personal/tasks" label="Open Tasks" />
            <ActionLink href="/field-observations" label="Discovery Globe" />
          </View>
          {!canCreateGrow ? (
            <Text style={styles.limitText}>
              {limitTitle}: {limitMessage}
            </Text>
          ) : null}
        </AppCard>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your grows</Text>
          <Text style={styles.sectionCount}>{sortedGrows.length} total</Text>
        </View>

        {!loading && !sortedGrows.length ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No grows yet</Text>
            <Text style={styles.emptyText}>
              Create a grow to connect photos, journal entries, tasks, tools, crop ID, and
              exportable records in one place.
            </Text>
            {canCreateGrow ? (
              <Link href="/home/personal/grows/new" asChild>
                <Pressable testID="btn-create-first-grow" style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>+ New Grow</Text>
                </Pressable>
              </Link>
            ) : (
              <View style={styles.limitPanel}>
                <Text style={styles.emptyTitle}>{limitTitle}</Text>
                <Text style={styles.emptyText}>{limitMessage}</Text>
              </View>
            )}
          </AppCard>
        ) : null}

        <View style={styles.growList}>
          {sortedGrows.map((grow) => {
            const id = String(grow.id || "").trim();
            if (!id) return null;
            const status = growStatus(grow);
            const photoCount = growPhotoCount(grow);
            const growChips = [
              safeText(grow.location),
              safeText(grow.cropCommonName || grow.scientificName),
              safeText(grow.cultivar || grow.strain),
              grow.startDate ? "Started " + formatDate(grow.startDate) : "",
              grow.updatedAt ? "Updated " + formatDate(grow.updatedAt) : ""
            ].filter(Boolean);
            const note = safeText(grow.notes);

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
                    <Text style={styles.statusChipLabel}>{photoCount} photos</Text>
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
                  <ActionLink href={"/home/personal/grows/" + id} label="Open" primary />
                  <ActionLink
                    href={"/home/personal/logs/new?growId=" + encodeURIComponent(id)}
                    label="Log"
                  />
                  <ActionLink
                    href={`/home/personal/tools?growId=${encodeURIComponent(id)}`}
                    label="AI Tools"
                  />
                  <ActionLink
                    href={`/home/personal/tools/integrations?growId=${id}`}
                    label="Data Integrations"
                  />
                  <ActionLink
                    href={`/home/personal/grows/${encodeURIComponent(id)}/timeline`}
                    label="Timeline"
                  />
                  <ActionLink
                    href={`/home/personal/grows/${encodeURIComponent(id)}/tasks`}
                    label="Tasks"
                  />
                  <ActionLink
                    href={`/home/personal/tools/pdf-export?growId=${id}`}
                    label="Export Report"
                  />
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
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  title: { color: "#0F172A", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#475569", fontWeight: "700", lineHeight: 20, marginTop: 4 },
  stateCard: {
    alignItems: "center",
    justifyContent: "center"
  },
  stateTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  stateText: { color: "#475569", lineHeight: 19, marginTop: 6, textAlign: "center" },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  ctaText: { color: "#FFFFFF", fontWeight: "900" },
  commandCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0"
  },
  commandHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between"
  },
  commandCopy: {
    flex: 1,
    minWidth: 220
  },
  commandEyebrow: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  commandTitle: { color: "#052E16", fontSize: 24, fontWeight: "900", lineHeight: 29 },
  commandDescription: { color: "#166534", lineHeight: 20, marginTop: 6 },
  commandPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end"
  },
  pulse: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF"
  },
  pulseValue: { color: "#052E16", fontSize: 17, fontWeight: "900" },
  pulseLabel: { color: "#166534", fontSize: 11, fontWeight: "800", marginTop: 2 },
  featuredGrowCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1FAE5",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  featuredGrowTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between"
  },
  featuredGrowCopy: {
    flex: 1,
    minWidth: 220
  },
  featuredGrowEyebrow: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  featuredGrowName: { color: "#0F172A", fontSize: 18, fontWeight: "900", marginTop: 2 },
  featuredGrowMeta: { color: "#475569", lineHeight: 19, marginTop: 4 },
  statusChip: {
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 110,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  statusActive: { backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" },
  statusVegetating: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  statusFlowering: { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" },
  statusCuring: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  statusHarvested: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
  statusChipValue: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  statusChipLabel: { color: "#475569", fontSize: 11, fontWeight: "800", marginTop: 2 },
  featuredMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  featuredMetric: {
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 110,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  metricGreen: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  metricBlue: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  metricAmber: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  metricSlate: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  featuredMetricValue: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  featuredMetricLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 1
  },
  featuredActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  quickCard: {
    backgroundColor: "#FFFFFF"
  },
  cardKicker: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 10,
    textTransform: "uppercase"
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  limitText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4
  },
  sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  sectionCount: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#334155",
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  emptyCard: {
    backgroundColor: "#FFFFFF"
  },
  emptyTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  emptyText: { color: "#475569", lineHeight: 20, marginTop: 5 },
  emptyButton: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  emptyButtonText: { color: "#FFFFFF", fontWeight: "900" },
  limitPanel: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 12,
    padding: 12
  },
  growList: {
    gap: 12
  },
  growCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#E2E8F0"
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
  growName: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  growIdentity: { color: "#166534", fontSize: 13, fontWeight: "800", marginTop: 4 },
  growMeta: { color: "#475569", lineHeight: 19, marginTop: 4 },
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
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF"
  },
  actionPrimary: {
    backgroundColor: "#166534",
    borderColor: "#166534"
  },
  actionText: { color: "#166534", fontWeight: "800" },
  actionTextPrimary: { color: "#FFFFFF" }
});
