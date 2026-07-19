import React, { useCallback, useRef, useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import AppShell from "../components/AppShell.js";
import FollowButton from "../components/FollowButton.js";
import ForumFilters from "../components/ForumFilters.js";
import {
  getLatestPosts,
  getTrendingPosts,
  getFollowingPosts,
  listForumCategories,
  listPosts
} from "../api/forum.js";
import useTabPressScrollReset from "../hooks/useTabPressScrollReset.js";
import { resolveImageUrl } from "../utils/images.js";
import { useAuth } from "@/auth/AuthContext";
import PrimaryButton from "../components/PrimaryButton.js";
import CommercialBanner from "../components/CommercialBanner.js";
import { INTEREST_TIERS } from "../config/interests.js";
import {
  flattenGrowInterests,
  filterPostsByInterests,
  getTier1Metadata,
  normalizeInterestList
} from "../utils/growInterests.js";
import { shouldAutoFetchMore } from "../utils/forumFeed.js";
import { radius } from "../theme/theme";

export default function ForumScreen() {
  const auth = useAuth();
  const { user, ctx } = auth;
  const workspaceMode = ctx?.mode || auth.mode || "personal";
  const [mode, setMode] = useState("latest");
  const [category, setCategory] = useState("all");
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const navigation = useNavigation();
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const listRef = useRef(null);
  const pendingScrollToTop = useRef(false);

  const canNavigateByName = useCallback(
    (name) => {
      const routeNames = rootNavigation?.getState?.()?.routeNames;
      return Array.isArray(routeNames) ? routeNames.includes(name) : false;
    },
    [rootNavigation]
  );

  const tierOneConfig = getTier1Metadata();
  const TIER1_TAGS = new Set(tierOneConfig?.options || []);
  const isFacility = workspaceMode === "facility";
  const facilityId = String(
    ctx?.facilityId ||
      user?.selectedFacilityId ||
      user?.facilityId ||
      user?.facility?.id ||
      user?.facility?._id ||
      ""
  );
  const { data: categoryData } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: listForumCategories,
    staleTime: 60_000
  });
  const categories = Array.isArray(categoryData?.categories)
    ? categoryData.categories
    : [];

  const normalizedUserInterests = useMemo(() => {
    if (!user?.growInterests) return {};
    const mapped = {};
    Object.entries(user.growInterests).forEach(([key, value]) => {
      const normalized = normalizeInterestList(value);
      if (normalized.length) {
        mapped[key] = normalized;
      }
    });
    return mapped;
  }, [user?.growInterests]);

  const filterTiers = useMemo(() => {
    return INTEREST_TIERS.map((tier) => {
      const isTierOne = tier.tier === 1;
      const tierSelections = normalizedUserInterests[tier.id] || [];
      const options = isTierOne ? tierSelections : tier.options;
      return {
        id: tier.id,
        label: tier.label,
        tier: tier.tier,
        isTierOne,
        options
      };
    });
  }, [normalizedUserInterests]);

  const { tier1Filters, otherTierFilters } = useMemo(() => {
    const grouped = { tier1Filters: [], otherTierFilters: [] };
    activeFilters.forEach((tag) => {
      if (TIER1_TAGS.has(tag)) grouped.tier1Filters.push(tag);
      else grouped.otherTierFilters.push(tag);
    });
    return grouped;
  }, [activeFilters]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: [
        "forumPosts",
        mode,
        category,
        facilityId,
        tier1Filters,
        otherTierFilters
      ],
      queryFn: ({ pageParam = 1 }) => {
        const page = typeof pageParam === "number" ? pageParam : 1;
        if (category === "facility" && isFacility && facilityId) {
          return listPosts({
            page,
            visibility: "facilityOnly",
            facilityId,
            category: "facility"
          });
        }
        const filters = category === "all" ? {} : { category };
        if (mode === "latest") {
          return getLatestPosts(page, tier1Filters, otherTierFilters, filters);
        } else if (mode === "trending") {
          return getTrendingPosts(page, tier1Filters, otherTierFilters, filters);
        } else {
          return getFollowingPosts(page, tier1Filters, otherTierFilters, filters);
        }
      },
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage?.hasMore) {
          return allPages.length + 1;
        }
        return undefined;
      },
      refetchOnWindowFocus: false,
      initialPageParam: 1
    });

  // Flatten posts for FlatList
  const filteredPosts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => {
      if (Array.isArray(page)) return page;
      return Array.isArray(page?.posts) ? page.posts : [];
    });
  }, [data]);

  // Toggle filter handler
  const toggleFilter = useCallback((tag) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const changeMode = useCallback(
    (nextMode) => {
      if (mode === nextMode) return;
      pendingScrollToTop.current = true;
      setMode(nextMode);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    },
    [mode]
  );

  const handleCreatePost = useCallback(() => {
    pendingScrollToTop.current = true;
    const params = {
      category: category === "all" ? "general" : category,
      postType:
        category === "product_qna"
          ? "product_qna"
          : category === "course"
            ? "course"
            : category === "live_qna"
              ? "live_qna"
              : "discussion",
      ...(category === "facility" && facilityId
        ? { visibility: "facilityOnly", facilityId, workspace: "facility" }
        : {})
    };
    if (canNavigateByName("new-post")) {
      rootNavigation.navigate("new-post", params);
      return;
    }
    if (canNavigateByName("ForumNewPost")) {
      rootNavigation.navigate("ForumNewPost", params);
      return;
    }
  }, [canNavigateByName, category, facilityId, rootNavigation]);

  function renderPost({ item }) {
    const authorType =
      item.authorIdentity?.type || item.authorType || item.user?.type || "user";
    const workspace = item.workspaceContext || item.workspace || "personal";
    const identityLabel =
      authorType === "business" || authorType === "commercial"
        ? "Brand"
        : authorType === "facility"
          ? "Facility"
          : "Member";
    const workspaceLabel =
      workspace === "commercial"
        ? "Commercial"
        : workspace === "facility"
          ? "Facility"
          : "Personal";
    const avatarUri = resolveImageUrl(item.user?.avatar);
    const displayName =
      item.authorIdentity?.displayName ||
      item.author?.displayName ||
      item.user?.displayName ||
      item.user?.name ||
      "Anonymous";
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (canNavigateByName("post/[id]")) {
            rootNavigation.navigate("post/[id]", { id: item._id });
            return;
          }
          if (canNavigateByName("ForumPostDetail")) {
            rootNavigation.navigate("ForumPostDetail", { id: item._id });
            return;
          }
        }}
      >
        <View style={styles.userRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarFallbackText}>
                {displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <View style={styles.identityRow}>
              <View style={styles.identityPill}>
                <Text style={styles.identityText}>{identityLabel}</Text>
              </View>
              <View style={styles.workspacePill}>
                <Text style={styles.workspaceText}>{workspaceLabel}</Text>
              </View>
            </View>
          </View>
          <FollowButton userId={item.user?._id} />
        </View>
        {item.content ? <Text style={styles.content}>{item.content}</Text> : null}
        {item.title && !item.content ? (
          <Text style={styles.title}>{item.title}</Text>
        ) : null}
        {item.photos && item.photos.length > 0 && (
          <Image
            source={{ uri: resolveImageUrl(item.photos[0]) }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.threadType}>
          {(item.category || "general").replace(/_/g, " ")} |{" "}
          {(item.postType || "discussion").replace(/_/g, " ")}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Likes {Array.isArray(item.likes) ? item.likes.length : item.likes || 0}
          </Text>
          <Text style={styles.footerText}>
            Comments {item.commentCount || item.comments?.length || 0}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <AppShell style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <FlatList
          ref={listRef}
          data={filteredPosts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          ListHeaderComponent={
            <View>
              <View
                style={{
                  backgroundColor: "#F0FDF4",
                  borderRadius: radius.card,
                  padding: 12,
                  marginBottom: 12
                }}
              >
                <Text
                  style={{
                    color: "#10B981",
                    fontWeight: "600",
                    fontSize: 15,
                    marginBottom: 2
                  }}
                >
                  Forum / Q&A
                </Text>
                <Text style={{ color: "#222", fontSize: 13 }}>
                  Discussion, grow help, course questions, product Q&A, and live Q&A
                  belong here. Feed / Campaigns is for commercial and facility outreach,
                  ads, products, courses, lives, and storefront promotion.
                </Text>
              </View>
              <View style={styles.guildHeader}>
                <View style={styles.guildTitleRow}>
                  <View style={styles.guildTitleContainer}>
                    <Text style={styles.guildTitle}>The Growers Forum</Text>
                    <Text style={styles.guildSubtitle}>
                      Experience. Observation. Learning.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (canNavigateByName("code")) {
                        rootNavigation.navigate("code");
                        return;
                      }
                      if (canNavigateByName("GuildCode")) {
                        rootNavigation.navigate("GuildCode");
                        return;
                      }
                    }}
                    style={styles.codeButton}
                  >
                    <Text style={styles.codeButtonText}>Forum Code</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.header}>
                <Text style={styles.categoryHeading}>Browse categories</Text>
                <View style={styles.categoryRow}>
                  {[
                    { key: "all", threadCount: null },
                    ...categories.filter((item) => item.key !== "facility"),
                    ...(isFacility ? [{ key: "facility", threadCount: null }] : [])
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      accessibilityLabel={`Browse Forum category ${item.key}`}
                      onPress={() => setCategory(item.key)}
                      style={[
                        styles.categoryChip,
                        category === item.key && styles.categoryChipActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === item.key && styles.categoryChipTextActive
                        ]}
                      >
                        {item.key === "all" ? "All" : item.key.replace(/_/g, " ")}
                        {typeof item.threadCount === "number"
                          ? ` (${item.threadCount})`
                          : ""}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.tabRow}>
                  <TouchableOpacity
                    onPress={() => changeMode("latest")}
                    style={[styles.tab, mode === "latest" && styles.tabActive]}
                  >
                    <Text
                      style={[styles.tabText, mode === "latest" && styles.tabTextActive]}
                    >
                      Latest
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => changeMode("trending")}
                    style={[styles.tab, mode === "trending" && styles.tabActive]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        mode === "trending" && styles.tabTextActive
                      ]}
                    >
                      Trending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => changeMode("following")}
                    style={[styles.tab, mode === "following" && styles.tabActive]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        mode === "following" && styles.tabTextActive
                      ]}
                    >
                      Following
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.filterToggle}
                    onPress={() => setShowFilters(!showFilters)}
                  >
                    <Text style={styles.filterToggleText}>
                      Filters{" "}
                      {activeFilters.length > 0 ? `(${activeFilters.length})` : ""}{" "}
                      {showFilters ? "Up" : "Down"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreatePost} style={styles.createBtn}>
                    <Text style={styles.createBtnText}>+ New Discussion</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ForumFilters
                visible={showFilters}
                tiers={filterTiers}
                activeFilters={activeFilters}
                onToggleFilter={toggleFilter}
              />
            </View>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#2ecc71" />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </AppShell>
    </>
  );
}
// ...existing code ends, styles object follows...

const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
    paddingHorizontal: 4
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 10,
    backgroundColor: "#eee",
    borderRadius: radius.card,
    padding: 4
  },
  createBtn: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.card,
    alignItems: "center"
  },
  createBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16
  },
  guildHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 2,
    borderBottomColor: "#27ae60",
    marginBottom: 12
  },
  guildTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  guildTitleContainer: {
    flex: 1
  },
  guildTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4
  },
  guildSubtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    fontStyle: "italic"
  },
  codeButton: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.card
  },
  codeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 12,
    elevation: 2,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 2px 8px rgba(0,0,0,0.12)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6
        })
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    marginRight: 12
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1fae5"
  },
  avatarFallbackText: {
    color: "#047857",
    fontSize: 18,
    fontWeight: "700"
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222"
  },
  timestamp: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4
  },
  identityText: {
    color: "#00796b",
    fontSize: 12,
    fontWeight: "bold"
  },
  workspacePill: {
    backgroundColor: "#f9e0b7",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6
  },
  workspaceText: {
    color: "#b26a00",
    fontSize: 12,
    fontWeight: "bold"
  },
  content: {
    fontSize: 15,
    color: "#333",
    marginVertical: 8
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    marginVertical: 8
  },
  postImage: {
    width: "100%",
    height: 180,
    borderRadius: radius.card,
    marginVertical: 8
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 6
  },
  tag: {
    backgroundColor: "#e0f7fa",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4
  },
  tagText: {
    color: "#00796b",
    fontSize: 12,
    fontWeight: "bold"
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 8
  },
  footerText: {
    fontSize: 13,
    color: "#888",
    marginRight: 16
  },
  threadType: { color: "#64748B", fontSize: 12, fontWeight: "700", marginTop: 6 },
  categoryHeading: { color: "#334155", fontSize: 13, fontWeight: "800" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 8 },
  categoryChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  categoryChipActive: { backgroundColor: "#166534" },
  categoryChipText: { color: "#334155", fontSize: 12, fontWeight: "700" },
  categoryChipTextActive: { color: "#FFFFFF" },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.card,
    backgroundColor: "transparent"
  },
  tabActive: {
    backgroundColor: "#2ecc71"
  },
  tabText: {
    fontSize: 16,
    color: "#333"
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "bold"
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  identityPill: {
    backgroundColor: "#e0f7fa",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6
  },
  filterToggle: {
    padding: 8,
    backgroundColor: "#e0f7fa",
    borderRadius: radius.card
  },
  filterToggleText: {
    color: "#00796b",
    fontWeight: "bold"
  }
});
