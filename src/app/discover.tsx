import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { listCommercialFeedCampaigns } from "@/api/commercialFeed";
import { searchContent } from "@/api/marketplace";
import { searchPublicStorefronts } from "@/api/storefront";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";

type Result = { id: string; title: string; summary?: string; href: string };
type Section = {
  key: string;
  title: string;
  ranking: string;
  empty: string;
  results: Result[];
  browseHref: string;
};

function rows(payload: any, keys: string[] = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function idOf(row: any) {
  return String(row?.id || row?._id || row?.contentId || row?.slug || row?.title || "");
}

function titleOf(row: any, fallback: string) {
  return String(row?.title || row?.businessName || row?.name || fallback);
}

function summaryOf(row: any) {
  return String(row?.summary || row?.description || row?.bio || row?.body || "");
}

function storeSlug(row: any) {
  return String(
    row?.slug || row?.storefrontSlug || row?.brandSlug || row?.publicSlug || ""
  );
}

function marketplaceRows(payload: any) {
  return rows(payload, ["content", "results", "uploads"]);
}

function courseRows(payload: any) {
  return rows(payload, ["courses", "results"]);
}

export default function DiscoverDirectory() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feed, setFeed] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    setError("");
    const [feedResult, storeResult, marketResult, courseResult] =
      await Promise.allSettled([
        listCommercialFeedCampaigns({ q: q || undefined, sort: "new", limit: 18 }),
        searchPublicStorefronts({ q: q || undefined, limit: 18 }),
        searchContent(q, undefined),
        import("@/api/courses").then((api) =>
          q ? api.searchCourses(q) : api.listCourses(1)
        )
      ]);

    setFeed(feedResult.status === "fulfilled" ? feedResult.value.items : []);
    setStores(
      storeResult.status === "fulfilled"
        ? rows(storeResult.value, ["storefronts", "brands"])
        : []
    );
    setMarketplace(
      marketResult.status === "fulfilled" ? marketplaceRows(marketResult.value) : []
    );
    setCourses(courseResult.status === "fulfilled" ? courseRows(courseResult.value) : []);
    if (
      [feedResult, storeResult, marketResult, courseResult].every(
        (r) => r.status === "rejected"
      )
    ) {
      setError("We couldn't load discovery. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo<Section[]>(() => {
    const ordinaryFeed = feed.filter(
      (row) => !row.linkedProductId && !row.linkedTrialId && !row.linkedLiveId
    );
    const products = feed.filter(
      (row) => row.linkedProductId || row.linkedProductLineId || row.linkedTrialId
    );
    const lives = feed.filter((row) => row.linkedLiveId);
    const feedResults = (source: any[]) =>
      source.map((row) => ({
        id: idOf(row),
        title: titleOf(row, "Feed update"),
        summary: summaryOf(row),
        href: `/feed?campaignId=${encodeURIComponent(idOf(row))}`
      }));
    const storeResults = stores.map((row) => {
      const slug = storeSlug(row);
      return {
        id: idOf(row),
        title: titleOf(row, "Storefront"),
        summary: summaryOf(row),
        href: slug ? `/store/${encodeURIComponent(slug)}` : "/store"
      };
    });

    return [
      {
        key: "feed",
        title: "Feed",
        ranking: "Recent",
        empty: "No matching feed updates.",
        results: feedResults(ordinaryFeed),
        browseHref: "/feed"
      },
      {
        key: "storefronts",
        title: "Storefronts",
        ranking: "Top & relevant",
        empty: "No matching storefronts.",
        results: storeResults,
        browseHref: "/store"
      },
      {
        key: "brands",
        title: "Brands",
        ranking: "Top & relevant",
        empty: "No matching brands.",
        results: storeResults.map((row) => ({
          ...row,
          href: row.href.replace("/store/", "/brands/")
        })),
        browseHref: "/store"
      },
      {
        key: "products",
        title: "Products, Offers & Trials",
        ranking: "Recent & relevant",
        empty: "No matching products, offers, or trials.",
        results: feedResults(products),
        browseHref: "/feed"
      },
      {
        key: "marketplace",
        title: "Marketplace",
        ranking: "Top & relevant",
        empty: "No matching marketplace items.",
        results: marketplace.map((row) => ({
          id: idOf(row),
          title: titleOf(row, "Marketplace item"),
          summary: summaryOf(row),
          href: "/marketplace"
        })),
        browseHref: "/marketplace"
      },
      {
        key: "courses",
        title: "Courses",
        ranking: "Top & relevant",
        empty: "No matching courses.",
        results: courses.map((row) => ({
          id: idOf(row),
          title: titleOf(row, "Course"),
          summary: summaryOf(row),
          href: "/home/personal/courses"
        })),
        browseHref: "/home/personal/courses"
      },
      {
        key: "lives",
        title: "Lives",
        ranking: "Upcoming & recent",
        empty: "No matching live events or replays.",
        results: feedResults(lives),
        browseHref: "/feed"
      }
    ];
  }, [courses, feed, marketplace, stores]);

  function search() {
    const q = query.trim();
    setActiveQuery(q);
    void load(q);
  }

  return (
    <AppPage
      routeKey="discover"
      header={
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            Discover
          </Text>
          <Text style={styles.subtitle}>
            Search once, then scroll through every customer-facing community and
            commercial section.
          </Text>
        </View>
      }
    >
      <AppCard>
        <TextInput
          accessibilityLabel="Search discovery"
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Search brands, products, courses, lives..."
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
        <View style={styles.searchRow}>
          <Pressable accessibilityRole="button" onPress={search} style={styles.button}>
            <Text style={styles.buttonText}>Search Everything</Text>
          </Pressable>
          {activeQuery ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setQuery("");
                setActiveQuery("");
                void load();
              }}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        {activeQuery ? (
          <Text style={styles.meta}>Results for “{activeQuery}”</Text>
        ) : (
          <Text style={styles.meta}>Browse all current discovery sections below.</Text>
        )}
      </AppCard>

      {loading ? <ActivityIndicator accessibilityLabel="Loading discovery" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading &&
        sections.map((section) => (
          <View
            key={section.key}
            nativeID={`discover-${section.key}`}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.ranking}>{section.ranking}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View all ${section.title}`}
                onPress={() => router.push(section.browseHref as any)}
                style={({ pressed }) => [
                  styles.browseButton,
                  pressed && styles.buttonPressed
                ]}
              >
                <Text style={styles.browseButtonText}>View all {section.title}</Text>
              </Pressable>
            </View>
            {section.results.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rail}
              >
                {section.results.slice(0, 12).map((result) => (
                  <Pressable
                    key={`${section.key}-${result.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${result.title}`}
                    onPress={() => router.push(result.href as any)}
                    style={({ pressed }) => [
                      styles.resultCard,
                      pressed && styles.buttonPressed
                    ]}
                  >
                    <Text style={styles.resultTitle} numberOfLines={2}>
                      {result.title}
                    </Text>
                    {result.summary ? (
                      <Text style={styles.resultSummary} numberOfLines={3}>
                        {result.summary}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.empty}>{section.empty}</Text>
            )}
          </View>
        ))}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: { color: "#111827", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#64748B", marginTop: 4 },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  searchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  button: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  clearButton: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  clearText: { color: "#334155", fontWeight: "800" },
  meta: { color: "#64748B", marginTop: 10 },
  error: { color: "#B91C1C" },
  section: { marginVertical: 8 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  sectionTitle: { color: "#111827", fontSize: 20, fontWeight: "800" },
  ranking: { color: "#64748B", fontSize: 12, marginTop: 2 },
  browseButton: {
    backgroundColor: "#ECFDF5",
    borderColor: "#15803D",
    borderRadius: radius.card,
    borderWidth: 1,
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  browseButtonText: { color: "#166534", fontSize: 13, fontWeight: "800" },
  buttonPressed: { opacity: 0.7 },
  rail: { gap: 12, paddingBottom: 6, paddingRight: 16 },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 116,
    padding: 14,
    width: 260
  },
  resultTitle: { color: "#111827", fontSize: 16, fontWeight: "800" },
  resultSummary: { color: "#475569", lineHeight: 19, marginTop: 6 },
  empty: { color: "#64748B", paddingVertical: 12 }
});
