import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer.js";
import ForumFilters from "../components/ForumFilters";
import { getFeed, likePost, unlikePost } from "../api/posts.js";
import { useAuth } from "@/auth/AuthContext";
import { applyLikeMetadata, normalizePostList, userHasLiked } from "../utils/posts.js";
import useTabPressScrollReset from "../hooks/useTabPressScrollReset";
import {
  flattenGrowInterests,
  filterPostsByInterests,
  getTier1Metadata,
  normalizeInterestList
} from "../utils/growInterests";
import { INTEREST_TIERS } from "../config/interests";

const PAGE_SIZE = 15;
const tierOneConfig = getTier1Metadata();
const TIER1_ID = tierOneConfig?.id || "crops";
const TIER1_TAGS = new Set(tierOneConfig?.options || []);

export default function FeedScreen() {
  const navigation = useNavigation();
  const { isPro, user } = useAuth();
  const flatListRef = useRef(null);
  const userId = user?._id || null;
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const filtersInitializedRef = useRef(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
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
  const userTier1Selections = normalizedUserInterests[TIER1_ID] || [];
  const flattenedInterests = useMemo(
    () => flattenGrowInterests(user?.growInterests || {}),
    [user?.growInterests]
  );
  const tier1Filters = useMemo(
    () => activeFilters.filter((tag) => TIER1_TAGS.has(tag)),
    [activeFilters]
  );
  const otherFilters = useMemo(
    () => activeFilters.filter((tag) => !TIER1_TAGS.has(tag)),
    [activeFilters]
  );
  const tier1FilterSet = useMemo(() => new Set(tier1Filters), [tier1Filters]);
  const otherFilterSet = useMemo(() => new Set(otherFilters), [otherFilters]);
  const filterTiers = useMemo(() => {
    return INTEREST_TIERS.map((tier) => {
      const isTierOne = tier.tier === 1;
      const tierSelections = normalizedUserInterests[tier.id] || [];
      const options = isTierOne ? tierSelections : tier.options;
      if (isTierOne && options.length === 0) return null;
      return {
        id: tier.id,
        label: tier.label,
        tier: tier.tier,
        isTierOne,
        options
      };
    }).filter(Boolean);
  }, [normalizedUserInterests]);
  useTabPressScrollReset(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  });

  useEffect(() => {
    if (user?.growInterests) {
      setActiveFilters(flattenGrowInterests(user.growInterests));
    } else {
      setActiveFilters([]);
    }
  }, [user?.growInterests]);

  const toggleFilter = (tag, tierId = null) => {
    setActiveFilters((prev) => {
      const exists = prev.includes(tag);
      let next = exists ? prev.filter((t) => t !== tag) : [...prev, tag];

      if (tierId === TIER1_ID && userTier1Selections.length > 0) {
        const hasTier1Selected = next.some((value) => userTier1Selections.includes(value));
        if (!hasTier1Selected) {
          const withoutTier1 = next.filter((value) => !userTier1Selections.includes(value));
          next = Array.from(new Set([...withoutTier1, ...userTier1Selections]));
        }
      }

      return next;
    });
  };

  const fetchPage = useCallback(
    async (pageNumber) => {
      const response = await getFeed(pageNumber, {
        tier1: tier1Filters,
        tags: otherFilters
      });
      const list = normalizePostList(response);
      return filterPostsByInterests(list, tier1FilterSet, otherFilterSet);
    },
    [tier1Filters, otherFilters, tier1FilterSet, otherFilterSet]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchPage(1);
      setPosts(list);
      setPage(1);
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load feed:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useFocusEffect(
    useCallback(() => {
      loadInitial();
    }, [loadInitial])
  );

  useEffect(() => {
    if (filtersInitializedRef.current) {
      loadInitial();
    } else {
      filtersInitializedRef.current = true;
    }
  }, [loadInitial]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const list = await fetchPage(1);
      setPosts(list);
      setPage(1);
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to refresh feed:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage, refreshing]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const list = await fetchPage(nextPage);
      setPosts((prev) => [...prev, ...list]);
      setPage(nextPage);
      if (list.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load additional posts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  const handlePostCreated = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const openCreatePost = useCallback(() => {
    navigation.navigate("CreatePost", { onPostCreated: handlePostCreated });
  }, [handlePostCreated, navigation]);

  const toggleLike = useCallback(
    async (post) => {
      if (!isPro || !userId) return;
      const liked = userHasLiked(post, userId);
      try {
        const apiFn = liked ? unlikePost : likePost;
        const result = await apiFn(post._id);
        const nextCount = typeof result?.likeCount === "number" ? result.likeCount : undefined;
        setPosts((prev) =>
          prev.map((item) =>
            item._id === post._id
              ? applyLikeMetadata(item, userId, nextCount, !liked)
              : item
          )
        );
      } catch (err) {
        console.error("Failed to toggle like:", err);
      }
    },
    [isPro, userId]
  );

  const renderHeader = () => (
    <View>
      <View style={styles.listHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedTitle}>Community Feed</Text>
          <Text style={styles.feedSubtitle}>
            Share grow updates and see what other cultivators are working on.
          </Text>
        </View>
        <TouchableOpacity
          testID="feed-create-post"
          accessibilityRole="button"
          style={[
            styles.createBtn,
            { backgroundColor: isPro ? "#10B981" : "#d1d5db" }
          ]}
          onPress={isPro ? openCreatePost : () => navigation.navigate("Subscription")}
        >
          <Text style={[styles.createBtnText, !isPro && { color: "#666" }]}>
            {isPro ? "+ New Post" : "Go Pro to Post"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.feedHeaderActions}>
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters((prev) => !prev)}
        >
          <Text style={styles.filterToggleText}>
            Filters {activeFilters.length > 0 ? `(${activeFilters.length})` : ""}{" "}
            {showFilters ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>
      </View>
      <ForumFilters
        visible={showFilters}
        tiers={filterTiers}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
      />
    </View>
  );

  const renderItem = ({ item, index }) => {
    const likedByMe = userHasLiked(item, userId);

    const navigateToDetail = () => {
      navigation.navigate("PostDetail", {
        post: item,
        refreshFeed: handleRefresh
      });
    };

    return (
      <View style={styles.card} testID={`feed-card-${item._id || index}`}>
        <View style={styles.header}>
          {item.user?.avatar ? (
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: "#ddd" }]} />
          )}
          <Text style={styles.username}>{item.user?.username || "Grower"}</Text>
        </View>

        <TouchableOpacity onPress={navigateToDetail} activeOpacity={0.8}>
          {item.text ? (
            <Text style={styles.text} numberOfLines={7} ellipsizeMode="tail">
              {item.text}
            </Text>
          ) : null}

          {item.photos?.length > 0 && (
            <Image source={{ uri: item.photos[0] }} style={styles.mainImage} />
          )}
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={isPro ? () => toggleLike(item) : undefined}
            disabled={!isPro}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.like,
                likedByMe && { color: "#ef4444" },
                !isPro && { color: "#bbb" }
              ]}
            >
              ❤️ {item.likeCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={
              isPro
                ? () => navigation.navigate("Comments", { postId: item._id })
                : undefined
            }
            disabled={!isPro}
            accessibilityRole="button"
          >
            <Text style={[styles.comment, !isPro && { color: "#bbb" }]}>💬 Comments</Text>
          </TouchableOpacity>
        </View>

        {!isPro && (
          <View style={styles.proUpsell}>
            <Text style={styles.proUpsellText}>
              Liking, commenting, and posting are Pro features.
            </Text>
            <TouchableOpacity
              style={styles.upsellButton}
              onPress={() => navigation.navigate("Subscription")}
              accessibilityRole="button"
            >
              <Text style={styles.upsellButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const listFooter = loadingMore ? (
    <View style={styles.footerLoading}>
      <ActivityIndicator color="#10B981" />
    </View>
  ) : (
    <View style={{ height: 40 }} />
  );

  if (loading && posts.length === 0) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color="#10B981" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item, index) => item._id || `post-${index}`}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No posts match these interests.</Text>
              <Text style={styles.emptyText}>
                Try expanding the filters or check back later for new updates.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={listFooter}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", padding: 14, borderRadius: 10, marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  username: { fontWeight: "700" },
  text: { marginBottom: 8 },
  mainImage: { width: "100%", height: 240, borderRadius: 8 },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  like: { fontSize: 16 },
  comment: { fontSize: 16 },
  listHeader: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 10
  },
  feedHeaderActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 12
  },
  filterToggle: {
    paddingVertical: 6
  },
  filterToggleText: {
    color: "#10B981",
    fontWeight: "600"
  },
  feedTitle: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  feedSubtitle: { color: "#4b5563", fontSize: 14 },
  createBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  createBtnText: { color: "white", fontWeight: "700" },
  proUpsell: {
    marginTop: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 10
  },
  proUpsellText: { color: "#92400E", textAlign: "center", fontSize: 15 },
  upsellButton: {
    marginTop: 8,
    backgroundColor: "#10B981",
    padding: 8,
    borderRadius: 8
  },
  upsellButtonText: { color: "white", textAlign: "center", fontWeight: "700" },
  footerLoading: { paddingVertical: 16 },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    marginTop: 8,
    color: "#4b5563"
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6
  },
  emptyText: {
    color: "#6b7280",
    textAlign: "center"
  },
  gateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  gateTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center"
  },
  gateCopy: {
    textAlign: "center",
    color: "#4b5563",
    marginBottom: 16
  }
});
