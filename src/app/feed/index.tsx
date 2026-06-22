import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Link, Redirect } from "expo-router";

import { InlineError } from "@/components/InlineError";
import { useEntitlements } from "@/entitlements";
import { useCommercialFeed } from "@/features/feed/hooks/useCommercialFeed";
import type { FeedItem } from "@/features/feed/types/feed";
import { useFacility } from "@/facility/FacilityProvider";
import { canAccessRoute } from "@/navigation/routeAccess";

const TYPE_FILTERS = ["all", "task", "alert", "log"] as const;
const STATUS_FILTERS = ["all", "open", "done", "ack", "closed", "info"] as const;

function itemId(item: Partial<FeedItem>, index: number) {
  return String((item as any)?.id ?? `${(item as any)?.type ?? "item"}-${index}`);
}

function itemTitle(item: Partial<FeedItem>) {
  const raw = item as any;
  return String(
    raw?.title ??
      raw?.metadata?.title ??
      raw?.metadata?.name ??
      raw?.metadata?.action ??
      `${raw?.type ?? "Activity"} update`
  );
}

function itemBody(item: Partial<FeedItem>) {
  const raw = item as any;
  return String(raw?.body ?? raw?.metadata?.body ?? raw?.metadata?.message ?? "");
}

function itemMeta(item: Partial<FeedItem>) {
  const raw = item as any;
  const actor = raw?.actor?.name ? `By ${raw.actor.name}` : "";
  const created = raw?.createdAt ? new Date(raw.createdAt).toLocaleString() : "";
  return [actor, created].filter(Boolean).join(" - ");
}

function statusLabel(item: Partial<FeedItem>) {
  return String((item as any)?.status ?? "info");
}

export default function CommercialFeedRoute() {
  const ent = useEntitlements();
  const facility = useFacility();
  const facilityId = facility.selectedId ?? null;
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]>("all");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const filters = useMemo(
    () => ({
      ...(type !== "all" ? { types: type } : {}),
      ...(status !== "all" ? { status } : {})
    }),
    [status, type]
  );

  const access = canAccessRoute("/feed", {
    ready: ent.ready,
    mode: ent.mode,
    capabilities: ent.capabilities
  });

  const {
    items,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    refetch,
    fetchNextPage,
    hasNextPage,
    error
  } = useCommercialFeed({
    facilityId,
    filters
  });

  if (!ent.ready) return null;
  if (!access) return <Redirect href="/home/personal" />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            void refetch();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Commercial Feed</Text>
        <Text style={styles.subtitle}>
          Tasks, alerts, and grow-log activity for the active facility.
        </Text>
      </View>

      {!facilityId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select a facility</Text>
          <Text style={styles.muted}>
            Commercial feed activity is scoped to a facility.
          </Text>
          <Link href="/facilities" asChild>
            <Text style={styles.link}>Choose Facility</Text>
          </Link>
        </View>
      ) : null}

      {error ? <InlineError error={error} /> : null}

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Type</Text>
        <View style={styles.chipRow}>
          {TYPE_FILTERS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setType(option)}
              style={[styles.chip, type === option && styles.chipSelected]}
            >
              <Text style={[styles.chipText, type === option && styles.chipTextSelected]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setStatus(option)}
              style={[styles.chip, status === option && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, status === option && styles.chipTextSelected]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading activity...</Text>
        </View>
      ) : null}

      {!isLoading && facilityId && items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No activity yet</Text>
          <Text style={styles.muted}>
            Facility tasks, alerts, and grow-log updates will appear here as they are
            created.
          </Text>
        </View>
      ) : null}

      {items.map((item, index) => {
        const meta = itemMeta(item);
        const body = itemBody(item);

        return (
          <View key={itemId(item, index)} style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemType}>{String((item as any)?.type ?? "item")}</Text>
              <Text style={styles.itemStatus}>{statusLabel(item)}</Text>
            </View>
            <Text style={styles.itemTitle}>{itemTitle(item)}</Text>
            {body ? <Text style={styles.itemBody}>{body}</Text> : null}
            {meta ? <Text style={styles.itemMeta}>{meta}</Text> : null}
          </View>
        );
      })}

      {hasNextPage ? (
        <Pressable
          onPress={() => {
            void fetchNextPage();
          }}
          disabled={isFetchingNextPage}
          style={[styles.loadMore, isFetchingNextPage && styles.disabled]}
        >
          <Text style={styles.loadMoreText}>
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    backgroundColor: "#F8FAFC"
  },
  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  subtitle: { color: "#475569", lineHeight: 20 },
  card: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 14,
    backgroundColor: "white",
    gap: 8
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  muted: { color: "#64748B", lineHeight: 20 },
  link: { color: "#2563EB", fontWeight: "800" },
  filters: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "white",
    gap: 8
  },
  filterLabel: { fontSize: 12, fontWeight: "900", color: "#475569" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "white"
  },
  chipSelected: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  chipText: { color: "#0F172A", fontWeight: "800", textTransform: "capitalize" },
  chipTextSelected: { color: "white" },
  loading: { alignItems: "center", paddingVertical: 24, gap: 8 },
  item: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 14,
    backgroundColor: "white",
    gap: 6
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  itemType: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  itemStatus: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  itemTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  itemBody: { color: "#334155", lineHeight: 20 },
  itemMeta: { color: "#64748B", fontSize: 12 },
  loadMore: {
    alignSelf: "center",
    borderRadius: 8,
    backgroundColor: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  loadMoreText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.6 }
});
