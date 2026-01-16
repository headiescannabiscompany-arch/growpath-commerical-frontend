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
  Dimensions
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useInfiniteQuery } from "@tanstack/react-query";

import ScreenContainer from "../components/ScreenContainer";
import FollowButton from "../components/FollowButton";
import ForumFilters from "../components/ForumFilters";
import { getLatestPosts, getTrendingPosts, getFollowingPosts } from "../api/forum";
import useTabPressScrollReset from "../hooks/useTabPressScrollReset";
import { resolveImageUrl } from "../utils/images";
import { useAuth } from "../context/AuthContext";
import { INTEREST_TIERS } from "../config/interests";
import {
  flattenGrowInterests,
  filterPostsByInterests,
  getTier1Metadata,
  normalizeInterestList
} from "../utils/growInterests";
import { shouldAutoFetchMore } from "../utils/forumFeed";

const PAGE_SIZE = 20;
const MIN_POSTS_HEIGHT = (Dimensions.get("window").height || 700) * 0.66;
const tierOneConfig = getTier1Metadata();
const TIER1_ID = tierOneConfig?.id || "crops";
const TIER1_TAGS = new Set(tierOneConfig?.options || []);

export default function ForumScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState("latest");
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const navigation = useNavigation();
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const listRef = useRef(null);
  const pendingScrollToTop = useRef(false);
  const nonFollowingFiltersRef = useRef(null);

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

  const userTier1Selections = normalizedUserInterests[TIER1_ID] || [];

  const { tier1Filters, otherTierFilters } = useMemo(() => {
    const grouped = { tier1Filters: [], otherTierFilters: [] };
    activeFilters.forEach((tag) => {
      if (TIER1_TAGS.has(tag)) grouped.tier1Filters.push(tag);
      else grouped.otherTierFilters.push(tag);
    });
    return grouped;
  }, [activeFilters]);

  const filtersKey = useMemo(() => {
    const tier1Key = [...tier1Filters].sort().join(",");
    const otherKey = [...otherTierFilters].sort().join(",");
    return `${tier1Key}|${otherKey}`;
  }, [tier1Filters, otherTierFilters]);

  // Initialize active filters with user's selections
  useEffect(() => {
    if (user?.growInterests) {
      setActiveFilters(flattenGrowInterests(user.growInterests));
    } else {
      setActiveFilters([]);
    }
  }, [user?.growInterests]);

  useEffect(() => {
    if (mode === "following") {
      if (nonFollowingFiltersRef.current === null) {
        nonFollowingFiltersRef.current = activeFilters;
        setActiveFilters((prev) => {
          const tier1Only = prev.filter((tag) => TIER1_TAGS.has(tag));
          if (tier1Only.length > 0) {
            return Array.from(new Set(tier1Only));
          }
          if (userTier1Selections.length > 0) {
            return Array.from(new Set(userTier1Selections));
          }
          return [];
        });
      }
    } else if (nonFollowingFiltersRef.current !== null) {
      const previousFilters = nonFollowingFiltersRef.current;
      nonFollowingFiltersRef.current = null;
      setActiveFilters(previousFilters);
    }
  }, [mode, activeFilters, userTier1Selections]);

  const toggleFilter = (tag, tierId = null) => {
    setActiveFilters((prev) => {
      const exists = prev.includes(tag);
      let next = exists ? prev.filter((t) => t !== tag) : [...prev, tag];

      if (tierId === TIER1_ID && userTier1Selections.length > 0) {
        const hasTier1Selected = next.some((value) =>
          userTier1Selections.includes(value)
        );
        if (!hasTier1Selected) {
          const withoutTier1 = next.filter(
            (value) => !userTier1Selections.includes(value)
          );
          next = Array.from(new Set([...withoutTier1, ...userTier1Selections]));
        }
      }

      return next;
    });
    // Reset list logic handled by query key change
  };

  useTabPressScrollReset(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefreshing } =
    useInfiniteQuery({
      queryKey: ["forum-feed", mode, filtersKey],
      queryFn: async ({ pageParam = 1 }) => {
        const fn =
          mode === "trending"
            ? getTrendingPosts
            : mode === "following"
              ? getFollowingPosts
              : getLatestPosts;
        return fn(pageParam, tier1Filters, otherTierFilters);
      },
      getNextPageParam: (lastPage, allPages) => {
        return lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined;
      },
      staleTime: 1000 * 60 * 2 // 2 minutes
    });

  const posts = useMemo(() => data?.pages.flat() || [], [data]);
  const tier1FilterSet = useMemo(() => new Set(tier1Filters), [tier1Filters]);
  const otherFilterSet = useMemo(() => new Set(otherTierFilters), [otherTierFilters]);
  const filteredPosts = useMemo(
    () => filterPostsByInterests(posts, tier1FilterSet, otherFilterSet),
    [posts, tier1FilterSet, otherFilterSet]
  );
  const lastFilteredCountRef = useRef(0);

  useEffect(() => {
    const decision = shouldAutoFetchMore({
      filteredCount: filteredPosts.length,
      lastFilteredCount: lastFilteredCountRef.current,
      pageSize: PAGE_SIZE,
      hasNextPage,
      isFetching: isFetchingNextPage
    });
    lastFilteredCountRef.current = decision.nextLastCount;
    if (decision.shouldFetch) {
      fetchNextPage();
    }
  }, [filteredPosts, hasNextPage, isFetchingNextPage, fetchNextPage]);

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
    rootNavigation.navigate("ForumNewPost");
  }, [rootNavigation]);

  function renderPost({ item }) {
    const authorType = item.authorType || item.user?.type || "user";
    const workspace = item.workspaceContext || item.workspace || "personal";
    const identityLabel = authorType === "business" ? "Business" : "Member";
    const workspaceLabel = workspace === "commercial" ? "Commercial" : workspace;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => rootNavigation.navigate("ForumPostDetail", { id: item._id })}
      >
        {/* User */}
        <View style={styles.userRow}>
          <Image
            source={{
              uri: resolveImageUrl(item.user?.avatar) || "https://via.placeholder.com/100"
            }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{item.user?.name || "Anonymous"}</Text>
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

        {/* Text */}
        {item.content ? <Text style={styles.content}>{item.content}</Text> : null}

        {/* Title (legacy) */}
        {item.title && !item.content ? (
          <Text style={styles.title}>{item.title}</Text>
        ) : null}

        {/* First photo thumbnail */}
        {item.photos && item.photos.length > 0 && (
          <Image
            source={{ uri: resolveImageUrl(item.photos[0]) }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ❤️ {Array.isArray(item.likes) ? item.likes.length : item.likes || 0}
          </Text>
          <Text style={styles.footerText}>
            💬 {item.commentCount || item.comments?.length || 0}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  const renderFooter = () => {
    if (!isFetchingNextPage) return <View style={{ height: 40 }} />;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator color="#10B981" />
      </View>
    );
  };

  return (
    <ScreenContainer>
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
                borderRadius: 8,
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
                🌱 Community & Shared Wisdom
              </Text>
              <Text style={{ color: "#222", fontSize: 13 }}>
                The Growers Forum is a space for learning, sharing, and supporting each
                other. There are no experts—only fellow growers on their own journeys. Ask
                questions, offer insights, and remember: every experience helps the
                community grow stronger.
              </Text>
            </View>

            <View style={styles.guildHeader}>
              <View style={styles.guildTitleRow}>
                <View style={styles.guildTitleContainer}>
                  <Text style={styles.guildTitle}>🌱 The Growers Forum</Text>
                  <Text style={styles.guildSubtitle}>
                    Experience. Observation. Learning.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => rootNavigation.navigate("GuildCode")}
                  style={styles.codeButton}
                >
                  <Text style={styles.codeButtonText}>📜 Forum Code</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.header}>
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
                    style={[styles.tabText, mode === "trending" && styles.tabTextActive]}
                  >
                    Trending
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => changeMode("following")}
                  style={[styles.tab, mode === "following" && styles.tabActive]}
                >
                  <Text
                    style={[styles.tabText, mode === "following" && styles.tabTextActive]}
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
                    Filters {activeFilters.length > 0 ? `(${activeFilters.length})` : ""}{" "}
                    {showFilters ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreatePost} style={styles.createBtn}>
                  <Text style={styles.createBtnText}>+ Create Post</Text>
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
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor="#2ecc71"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 6
  },
  codeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600"
  },
  header: {
    marginBottom: 12,
    paddingHorizontal: 4 // Add padding for actions
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 10,
    backgroundColor: "#eee",
    borderRadius: 8,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "transparent"
  },
  tabActive: {
    backgroundColor: "#2ecc71"
  },
  tabText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 13
  },
  tabTextActive: {
    color: "white"
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  filterToggle: {
    padding: 8
  },
  filterToggleText: {
    color: "#2ecc71",
    fontWeight: "600",
    fontSize: 14
  },
  createBtn: {
    backgroundColor: "#2ecc71",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center"
  },
  createBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
    elevation: 1
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  },
  username: {
    fontWeight: "700",
    fontSize: 14
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 2
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#333"
  },
  content: {
    marginBottom: 8,
    color: "#333",
    lineHeight: 20
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 8
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8
  },
  tag: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4
  },
  tagText: {
    fontSize: 11,
    color: "#2ecc71",
    fontWeight: "500"
  },
  footer: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee"
  },
  footerText: {
    marginRight: 20,
    color: "#777",
    fontSize: 12,
    fontWeight: "600"
  }
});
