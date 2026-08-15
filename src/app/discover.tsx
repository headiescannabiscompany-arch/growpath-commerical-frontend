import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { searchVideos } from "@/api/videos";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

type Result = {
  id: string;
  title: string;
  summary?: string;
  href: string;
  thumbnailUrl?: string;
  meta?: string;
};
type Section = {
  key: string;
  title: string;
  ranking: string;
  empty: string;
  results: Result[];
  browseHref: string;
};

export const createDiscoverVideoFilterStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    selectedButton: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    selectedText: { color: palette.accentText }
  });

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

export function discoverImageOf(row: any) {
  return resolveImageUri(
    row?.coverImageUrl ||
      row?.coverImage ||
      row?.thumbnailUrl ||
      row?.thumbnail ||
      row?.bannerImageUrl ||
      row?.bannerUrl ||
      row?.creativeImageUrl ||
      row?.imageUrl ||
      row?.logoUrl ||
      row?.profileImageUrl ||
      row?.mediaSource?.thumbnailUrl ||
      ""
  );
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
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const videoFilterStyles = useMemo(
    () => createDiscoverVideoFilterStyles(palette),
    [palette]
  );
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feed, setFeed] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [videoFollowingOnly, setVideoFollowingOnly] = useState(false);

  const load = useCallback(async (q = "", followingOnly = false) => {
    setLoading(true);
    setError("");
    const [feedResult, storeResult, marketResult, courseResult, videoResult] =
      await Promise.allSettled([
        listCommercialFeedCampaigns({ q: q || undefined, sort: "new", limit: 18 }),
        searchPublicStorefronts({ q: q || undefined, limit: 18 }),
        searchContent(q, undefined),
        import("@/api/courses").then((api) =>
          q ? api.searchCourses(q) : api.listCourses(1)
        ),
        searchVideos({
          q: q || undefined,
          sort: "new",
          limit: 18,
          followingOnly: followingOnly || undefined
        })
      ]);

    setFeed(
      feedResult.status === "fulfilled"
        ? rows(feedResult.value, ["campaigns", "results"])
        : []
    );
    setStores(
      storeResult.status === "fulfilled"
        ? rows(storeResult.value, ["storefronts", "brands"])
        : []
    );
    setMarketplace(
      marketResult.status === "fulfilled" ? marketplaceRows(marketResult.value) : []
    );
    setCourses(courseResult.status === "fulfilled" ? courseRows(courseResult.value) : []);
    setVideos(videoResult.status === "fulfilled" ? videoResult.value : []);
    if (
      [feedResult, storeResult, marketResult, courseResult, videoResult].every(
        (r) => r.status === "rejected"
      )
    ) {
      setError("We couldn't load discovery. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(activeQuery, videoFollowingOnly);
  }, [activeQuery, load, videoFollowingOnly]);

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
        href: `/feed?campaignId=${encodeURIComponent(idOf(row))}`,
        thumbnailUrl: discoverImageOf(row)
      }));
    const storeResults = stores.map((row) => {
      const slug = storeSlug(row);
      return {
        id: idOf(row),
        title: titleOf(row, "Storefront"),
        summary: summaryOf(row),
        href: slug ? `/store/${encodeURIComponent(slug)}` : "/store",
        thumbnailUrl: discoverImageOf(row)
      };
    });

    return [
      {
        key: "field-observations",
        title: "Discovery Nature",
        ranking: "Shared, opt-in plant findings",
        empty: "Open Discovery Nature to see opted-in observations.",
        results: [
          {
            id: "identify-plant",
            title:
              entitlements.mode === "personal"
                ? "Identify a Plant"
                : "Switch to Personal for Plant ID",
            summary:
              "Upload plant photos, review the AI candidate, add field context, and choose whether to save it privately or share an approximate map pin.",
            href:
              entitlements.mode === "personal"
                ? "/home/personal/tools/species-crop-id"
                : "/account/mode",
            meta: "Grow optional"
          },
          {
            id: "field-observations",
            title: "Explore Mapped Plant Findings",
            summary:
              "Share/view opted-in plant findings. Discover species of mapped areas and find invasive species.",
            href: "/field-observations",
            meta: "Opt-in locations only"
          }
        ],
        browseHref: "/field-observations"
      },
      {
        key: "feed",
        title: "Feed",
        ranking: "Recent",
        empty: "No matching feed updates.",
        results: feedResults(ordinaryFeed),
        browseHref: "/feed"
      },
      {
        key: "videos",
        title: "Videos",
        ranking: activeQuery ? "Relevant & accessible" : "Newest & accessible",
        empty: "No matching videos are available to you.",
        results: videos.map((row) => ({
          id: idOf(row),
          title: titleOf(row, "Video"),
          summary: summaryOf(row),
          href: `/videos/${encodeURIComponent(idOf(row))}`,
          thumbnailUrl: discoverImageOf(row),
          meta: [
            row.owner?.displayName,
            row.visibility ? String(row.visibility).replace(/_/g, " ") : ""
          ]
            .filter(Boolean)
            .join(" · ")
        })),
        browseHref: "/videos?tab=discover"
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
          href: "/marketplace",
          thumbnailUrl: discoverImageOf(row)
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
          href: `/courses?courseId=${encodeURIComponent(idOf(row))}`,
          thumbnailUrl: discoverImageOf(row)
        })),
        browseHref: "/home/personal/courses"
      },
      {
        key: "lives",
        title: "Live opportunities",
        ranking: "Campaign-linked, upcoming, and replay content",
        empty: "No matching live opportunities.",
        results: lives.map((row) => ({
          id: idOf(row),
          title: titleOf(row, "Live session"),
          summary: summaryOf(row),
          href: `/live-session?sessionId=${encodeURIComponent(
            String(row.linkedLiveId)
          )}`,
          thumbnailUrl: discoverImageOf(row)
        })),
        browseHref: "/lives"
      }
    ];
  }, [activeQuery, courses, entitlements.mode, feed, marketplace, stores, videos]);

  function search() {
    const q = query.trim();
    setActiveQuery(q);
  }

  return (
    <AppPage
      routeKey="discover"
      railOverride={null}
      header={
        <View>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.heroText }]}
          >
            Discover
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Search once, then scroll through videos and every customer-facing community
            and commercial section.
          </Text>
        </View>
      }
    >
      <AppCard
        style={[
          styles.searchCard,
          { backgroundColor: palette.surface, borderColor: palette.border }
        ]}
      >
        <TextInput
          accessibilityLabel="Search discovery"
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Search videos, accounts, brands, products, courses, lives..."
          returnKeyType="search"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
          value={query}
        />
        <View style={styles.searchRow}>
          <Pressable
            accessibilityRole="button"
            onPress={search}
            style={[styles.button, { backgroundColor: palette.accent }]}
          >
            <Text style={[styles.buttonText, { color: palette.accentText }]}>
              Search Everything
            </Text>
          </Pressable>
          {activeQuery ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setQuery("");
                setActiveQuery("");
                void load();
              }}
              style={[
                styles.clearButton,
                { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
              ]}
            >
              <Text style={[styles.clearText, { color: palette.text }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        {activeQuery ? (
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            Results for “{activeQuery}”
          </Text>
        ) : (
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            Browse all current discovery sections below.
          </Text>
        )}
      </AppCard>

      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading discovery"
          color={palette.accent}
        />
      ) : null}
      {error ? (
        <Text style={[styles.error, { color: palette.danger }]}>{error}</Text>
      ) : null}
      {!loading &&
        sections.map((section) => (
          <View
            key={section.key}
            nativeID={`discover-${section.key}`}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>
                  {section.title}
                </Text>
                <Text style={[styles.ranking, { color: palette.textMuted }]}>
                  {section.ranking}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View all ${section.title}`}
                onPress={() => router.push(section.browseHref as any)}
                style={({ pressed }) => [
                  styles.browseButton,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border
                  },
                  pressed && styles.buttonPressed
                ]}
              >
                <Text style={[styles.browseButtonText, { color: palette.link }]}>
                  View all {section.title}
                </Text>
              </Pressable>
            </View>
            {section.key === "videos" ? (
              <View style={styles.sectionFilterRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Show all discover videos"
                  onPress={() => {
                    setVideoFollowingOnly(false);
                  }}
                  style={({ pressed }) => [
                    styles.filterButton,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border
                    },
                    !videoFollowingOnly && videoFilterStyles.selectedButton,
                    pressed && styles.buttonPressed
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: palette.textMuted },
                      !videoFollowingOnly && videoFilterStyles.selectedText
                    ]}
                  >
                    All videos
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Show videos from people you follow"
                  onPress={() => {
                    setVideoFollowingOnly(true);
                  }}
                  style={({ pressed }) => [
                    styles.filterButton,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border
                    },
                    videoFollowingOnly && videoFilterStyles.selectedButton,
                    pressed && styles.buttonPressed
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: palette.textMuted },
                      videoFollowingOnly && videoFilterStyles.selectedText
                    ]}
                  >
                    Following only
                  </Text>
                </Pressable>
              </View>
            ) : null}
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
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.border
                      },
                      pressed && styles.buttonPressed
                    ]}
                  >
                    {result.thumbnailUrl ? (
                      <Image
                        accessibilityLabel={`${result.title} thumbnail`}
                        resizeMode="cover"
                        source={{ uri: result.thumbnailUrl }}
                        style={styles.resultImage}
                      />
                    ) : null}
                    <Text
                      style={[styles.resultTitle, { color: palette.text }]}
                      numberOfLines={2}
                    >
                      {result.title}
                    </Text>
                    {result.meta ? (
                      <Text
                        style={[styles.resultMeta, { color: palette.textMuted }]}
                        numberOfLines={2}
                      >
                        {result.meta}
                      </Text>
                    ) : null}
                    {result.summary ? (
                      <Text
                        style={[styles.resultSummary, { color: palette.textMuted }]}
                        numberOfLines={3}
                      >
                        {result.summary}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.empty, { color: palette.textMuted }]}>
                {section.empty}
              </Text>
            )}
          </View>
        ))}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: { color: "#111827", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#64748B", marginTop: 4 },
  searchCard: { marginBottom: 8 },
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
  sectionFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10
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
  filterButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  filterText: { color: "#334155", fontSize: 13, fontWeight: "800" },
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
  resultImage: {
    borderRadius: radius.card,
    height: 112,
    marginBottom: 10,
    width: "100%"
  },
  resultMeta: { color: "#64748B", fontSize: 11, marginTop: 4 },
  resultSummary: { color: "#475569", lineHeight: 19, marginTop: 6 },
  empty: { color: "#64748B", paddingVertical: 12 }
});
