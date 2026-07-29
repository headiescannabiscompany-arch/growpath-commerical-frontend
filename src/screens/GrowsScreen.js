import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { Link } from "expo-router";

import { listPersonalGrows } from "@/api/grows";
import AppCard from "@/components/layout/AppCard";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

function formatDate(value) {
  if (!value) return "n/a";
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString();
}

function safeText(value) {
  return String(value || "").trim();
}

function growName(grow) {
  return safeText(grow?.name) || "Untitled Grow";
}

function growIdentity(grow) {
  var parts = [grow?.cropCommonName, grow?.scientificName, grow?.cultivar || grow?.strain]
    .map(safeText)
    .filter(Boolean);
  return parts.length ? parts.join(" • ") : "Add species, cultivar, and notes when you know them.";
}

function growSummary(grow) {
  var parts = [
    safeText(grow?.location),
    grow?.startDate ? "Started " + formatDate(grow.startDate) : "",
    grow?.updatedAt ? "Updated " + formatDate(grow.updatedAt) : ""
  ].filter(Boolean);
  return parts.length ? parts.join(" • ") : "Keep the grow labeled with photos, logs, tasks, and AI runs.";
}

function growPhotoCount(grow) {
  return Array.isArray(grow?.photos) ? grow.photos.length : 0;
}

function growTimestamp(grow) {
  return new Date(grow?.updatedAt || grow?.startDate || grow?.createdAt || 0).getTime();
}

function growStatus(grow) {
  return safeText(grow?.status) || "active";
}

function isActiveGrow(grow) {
  return growStatus(grow).toLowerCase() !== "harvested";
}

function statusTone(status) {
  var lower = String(status || "").toLowerCase();
  if (lower === "vegetating") return styles.statusVegetating;
  if (lower === "flowering") return styles.statusFlowering;
  if (lower === "curing") return styles.statusCuring;
  if (lower === "harvested") return styles.statusHarvested;
  return styles.statusActive;
}

function metricTone(index) {
  var tones = [styles.metricGreen, styles.metricBlue, styles.metricAmber, styles.metricSlate, styles.metricPurple];
  return tones[index % tones.length];
}

function actionHref(id, section) {
  var encodedId = encodeURIComponent(String(id || "").trim());
  if (!encodedId) return "/home/personal/grows";
  if (!section) return "/home/personal/grows/" + encodedId;
  return "/home/personal/grows/" + encodedId + "/" + section;
}

function ActionLink({ href, label, primary = false }) {
  var buttonStyle = primary
    ? StyleSheet.flatten([styles.action, styles.actionPrimary])
    : styles.action;
  var textStyle = primary
    ? StyleSheet.flatten([styles.actionText, styles.actionTextPrimary])
    : styles.actionText;

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" style={buttonStyle}>
        <Text style={textStyle}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function SummaryMetric({ label, value, tone }) {
  var cardStyle = StyleSheet.flatten([styles.metricCard, tone]);
  return (
    <View style={cardStyle}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function GrowsScreen() {
  var entitlements = useEntitlements();
  var hasCreateCapability = entitlements.can(CAPABILITY_KEYS.GROWS_PERSONAL_WRITE);
  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);
  var [query, setQuery] = useState("");
  var [error, setError] = useState("");

  var maxGrows = Number(entitlements.limits?.maxGrows ?? 0);

  var load = useCallback(async function loadGrows() {
    setError("");
    try {
      var res = await listPersonalGrows();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(String(e?.message || e || "Failed to load grows"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(function onFocus() {
      void load();
    }, [load])
  );

  var sortedGrows = useMemo(function () {
    return [...items].sort(function (left, right) {
      return growTimestamp(right) - growTimestamp(left);
    });
  }, [items]);

  var normalizedQuery = query.trim().toLowerCase();
  var filteredGrows = useMemo(function () {
    if (!normalizedQuery) return sortedGrows;
    return sortedGrows.filter(function (grow) {
      var hay = [
        grow?.name,
        grow?.strain,
        grow?.cultivar,
        grow?.status,
        grow?.location,
        grow?.cropCommonName,
        grow?.scientificName
      ]
        .map(function (value) {
          return String(value || "").toLowerCase();
        })
        .join(" ");
      return hay.includes(normalizedQuery);
    });
  }, [normalizedQuery, sortedGrows]);

  var activeGrows = useMemo(function () {
    return sortedGrows.filter(isActiveGrow);
  }, [sortedGrows]);

  var latestGrow = sortedGrows[0];
  var totalPhotos = useMemo(function () {
    return sortedGrows.reduce(function (sum, grow) {
      return sum + growPhotoCount(grow);
    }, 0);
  }, [sortedGrows]);

  var statusCounts = useMemo(function () {
    return sortedGrows.reduce(
      function (counts, grow) {
        var status = growStatus(grow).toLowerCase();
        if (status === "vegetating") counts.vegetating += 1;
        else if (status === "flowering") counts.flowering += 1;
        else if (status === "curing") counts.curing += 1;
        else if (status === "harvested") counts.harvested += 1;
        else counts.active += 1;
        return counts;
      },
      { active: 0, vegetating: 0, flowering: 0, curing: 0, harvested: 0 }
    );
  }, [sortedGrows]);

  var canCreateGrow = hasCreateCapability && (maxGrows <= 0 || items.length < maxGrows);
  var limitTitle = maxGrows === 1 ? "Free grow limit reached" : "Grow limit reached";
  var limitMessage =
    maxGrows === 1
      ? "Free includes one active grow. Upgrade to Pro to create up to 10 active grows."
      : "This plan includes up to " + maxGrows + " active grows. Upgrade to create more.";

  var summaryCards = [
    { label: "Saved grows", value: sortedGrows.length },
    { label: "Active grows", value: activeGrows.length },
    { label: "Photos", value: totalPhotos },
    { label: "Flowering", value: statusCounts.flowering },
    { label: "Harvested", value: statusCounts.harvested }
  ];

  var onRefresh = useCallback(function onRefresh() {
    setRefreshing(true);
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.stack}>
        <AppCard style={styles.heroCard}>
          <Text style={styles.kicker}>Personal grow workspace</Text>
          <Text style={styles.title}>Grows</Text>
          <Text style={styles.subtitle}>
            Keep each grow connected to logs, photos, tasks, AI tools, and exports instead of
            a flat list.
          </Text>
          <View style={styles.heroActions}>
            {canCreateGrow ? (
              <ActionLink href="/home/personal/grows/new" label="Create Grow" primary />
            ) : (
              <ActionLink href="/home/personal/profile/billing" label="Manage Billing" primary />
            )}
            <ActionLink href="/home/personal/tools" label="Open AI Tools" />
            <ActionLink href="/home/personal/diagnose" label="Run Diagnosis" />
            <ActionLink href="/home/personal/tasks" label="Open Tasks" />
          </View>
          {!canCreateGrow ? <Text style={styles.limitText}>{limitMessage}</Text> : null}
        </AppCard>

        {error ? (
          <AppCard style={styles.stateCard}>
            <Text style={styles.stateTitle}>Unable to load grows</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={function () { void load(); }} style={styles.retryButton}>
              <Text style={styles.ctaText}>Try again</Text>
            </Pressable>
          </AppCard>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Workspace summary</Text>
          <Text style={styles.sectionCount}>{sortedGrows.length} total</Text>
        </View>

        <View style={styles.summaryGrid}>
          {summaryCards.map(function (card, index) {
            return <SummaryMetric key={card.label} label={card.label} value={card.value} tone={metricTone(index)} />;
          })}
        </View>

        <AppCard style={styles.featuredCard}>
          <View style={styles.featuredTopRow}>
            <View style={styles.featuredCopy}>
              <Text style={styles.cardKicker}>Latest grow</Text>
              <Text style={styles.featuredName}>{latestGrow ? growName(latestGrow) : "No grow yet"}</Text>
              <Text style={styles.featuredMeta}>
                {latestGrow
                  ? growIdentity(latestGrow)
                  : "Create a grow to start connecting logs, photos, tasks, and AI runs."}
              </Text>
              {latestGrow ? <Text style={styles.featuredMeta}>{growSummary(latestGrow)}</Text> : null}
            </View>
            {latestGrow ? (
              <View style={StyleSheet.flatten([styles.statusChip, statusTone(growStatus(latestGrow))])}>
                <Text style={styles.statusChipValue}>{growStatus(latestGrow)}</Text>
                <Text style={styles.statusChipLabel}>{growPhotoCount(latestGrow)} photos</Text>
              </View>
            ) : null}
          </View>
          {latestGrow ? (
            <View style={styles.featuredActions}>
              <ActionLink href={actionHref(latestGrow.id)} label="Open Grow" primary />
              <ActionLink href={actionHref(latestGrow.id, "journal")} label="Journal" />
              <ActionLink href={actionHref(latestGrow.id, "tasks")} label="Tasks" />
              <ActionLink href={actionHref(latestGrow.id, "timeline")} label="Timeline" />
              <ActionLink href={actionHref(latestGrow.id, "tools")} label="AI Tools" />
            </View>
          ) : (
            <View style={styles.featuredActions}>
              <ActionLink href="/home/personal/grows/new" label="Start First Grow" primary />
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
            <Text style={StyleSheet.flatten([styles.stateText, { marginTop: 10 }])}>
              Loading grow dashboard...
            </Text>
          </AppCard>
        ) : null}

        {!loading && !filteredGrows.length ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{sortedGrows.length ? "No grows match your search" : "No grows yet"}</Text>
            <Text style={styles.emptyText}>
              {sortedGrows.length
                ? "Try a different search term or clear the filter to see every grow."
                : "Create a grow to connect photos, journal entries, tasks, tools, crop ID, and exportable records in one place."}
            </Text>
            <View style={styles.emptyActions}>
              {canCreateGrow ? (
                <ActionLink href="/home/personal/grows/new" label="New Grow" primary />
              ) : (
                <ActionLink href="/home/personal/profile/billing" label="Manage Billing" primary />
              )}
              <ActionLink href="/home/personal/tools" label="Open AI Tools" />
              <ActionLink href="/home/personal/diagnose" label="Diagnose" />
            </View>
          </AppCard>
        ) : null}

        <View style={styles.growList}>
          {filteredGrows.map(function (grow) {
            var id = String(grow?.id || grow?._id || "").trim();
            if (!id) return null;
            var status = growStatus(grow);
            var growChips = [
              safeText(grow?.location),
              safeText(grow?.cropCommonName || grow?.scientificName),
              safeText(grow?.cultivar || grow?.strain),
              grow?.startDate ? "Started " + formatDate(grow.startDate) : "",
              grow?.updatedAt ? "Updated " + formatDate(grow.updatedAt) : ""
            ].filter(Boolean);
            var note = safeText(grow?.notes);

            return (
              <AppCard key={id} style={styles.growCard}>
                <View style={styles.growHeader}>
                  <View style={styles.growCopy}>
                    <Text style={styles.growName}>{growName(grow)}</Text>
                    <Text style={styles.growIdentity}>{growIdentity(grow)}</Text>
                    <Text style={styles.growMeta}>{growSummary(grow)}</Text>
                  </View>
                  <View style={StyleSheet.flatten([styles.statusChip, statusTone(status)])}>
                    <Text style={styles.statusChipValue}>{status}</Text>
                    <Text style={styles.statusChipLabel}>{growPhotoCount(grow)} photos</Text>
                  </View>
                </View>

                {growChips.length ? (
                  <View style={styles.chipRow}>
                    {growChips.slice(0, 4).map(function (chip) {
                      return (
                        <View key={chip} style={styles.chip}>
                          <Text style={styles.chipText}>{chip}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {note ? <Text style={styles.note}>{note}</Text> : null}

                <View style={styles.growActions}>
                  <ActionLink href={actionHref(id)} label="Open" primary />
                  <ActionLink href={actionHref(id, "journal")} label="Journal" />
                  <ActionLink href={actionHref(id, "tasks")} label="Tasks" />
                  <ActionLink href={actionHref(id, "tools")} label="AI Tools" />
                  <ActionLink href={actionHref(id, "timeline")} label="Timeline" />
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
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#0F172A",
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
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
  actionText: {
    color: "#166534",
    fontWeight: "800"
  },
  actionTextPrimary: {
    color: "#FFFFFF"
  }
});
