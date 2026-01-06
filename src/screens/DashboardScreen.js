import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
  ActivityIndicator
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { colors, spacing, radius, typography } from "../theme/theme";
import { useAuth } from "../context/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getPlants } from "../api/plants";
import { listGrows } from "../api/grows";
import { getFeed } from "../api/posts";
import { getTrendingPosts } from "../api/forum";
import { normalizePostList } from "../utils/posts";
import { getTasks } from "../api/tasks";

const { width } = Dimensions.get("window");

function getCategoryIcon(category) {
  const icons = {
    nutrients: "💧",
    lighting: "💡",
    water: "💦",
    substrate: "🌱",
    soil: "🪴",
    hydro: "🌊",
    training: "✂️",
    harvest: "🏆",
    diagnosis: "🔍"
  };
  return icons[category?.toLowerCase()] || "📝";
}

function getCategoryColor(index) {
  const palette = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444"];
  return palette[index % palette.length];
}

function summarizeTasks(tasks = []) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  let dueToday = 0;
  let overdue = 0;
  let completedToday = 0;

  tasks.forEach((task) => {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    if (!task.completed && dueDate instanceof Date && !Number.isNaN(dueDate)) {
      const normalizedDue = new Date(dueDate);
      normalizedDue.setHours(0, 0, 0, 0);
      if (normalizedDue < startOfDay) {
        overdue += 1;
      } else if (normalizedDue.getTime() === startOfDay.getTime()) {
        dueToday += 1;
      }
    }

    if (task.completed && task.completedAt) {
      const completedAt = new Date(task.completedAt);
      if (
        completedAt instanceof Date &&
        !Number.isNaN(completedAt) &&
        completedAt >= startOfDay &&
        completedAt <= endOfDay
      ) {
        completedToday += 1;
      }
    }
  });

  return {
    dueToday,
    overdue,
    completedToday,
    total: dueToday + overdue + completedToday
  };
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const {
    isPro,
    isEntitled,
    isGuildMember,
    logout,
    hasNavigatedAwayFromHome,
    setHasNavigatedAwayFromHome
  } = useAuth();
  const [plants, setPlants] = useState([]);
  const [plantsLoading, setPlantsLoading] = useState(true);
  const [grows, setGrows] = useState([]);
  const [growsLoading, setGrowsLoading] = useState(true);
  const [trending, setTrending] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [taskStats, setTaskStats] = useState({
    dueToday: 0,
    overdue: 0,
    completedToday: 0,
    total: 0
  });
  
  // Feed State
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  
  const heroSubtitle = isGuildMember
    ? "Your guild unlocks specialized cannabis insights alongside the core GrowPath tools."
    : "Track every plant, explore hydroponics, and opt into guilds when you want crop-specific depth.";
  const showWelcomeMessage = !hasNavigatedAwayFromHome;
  const headerTitle = showWelcomeMessage ? "Welcome back" : "GrowPath";

  useEffect(() => {
    loadPlants();
    loadGrows();
    loadTrending();
    loadTaskStats();
    loadFeed(1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlants();
      loadGrows();
      loadTrending();
      loadTaskStats();
      loadFeed(1);
    }, [])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      setHasNavigatedAwayFromHome(true);
    });
    return unsubscribe;
  }, [navigation, setHasNavigatedAwayFromHome]);

  const handleLogout = async () => {
    await logout();
  };

  async function loadPlants() {
    try {
      const data = await getPlants();
      if (Array.isArray(data)) {
        setPlants(data);
      } else if (Array.isArray(data?.plants)) {
        setPlants(data.plants);
      } else {
        setPlants([]);
      }
    } catch (err) {
      console.error("Failed to load plants:", err);
      setPlants([]);
    } finally {
      setPlantsLoading(false);
    }
  }

  async function loadGrows() {
    try {
      const data = await listGrows();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setGrows(list);
    } catch (err) {
      console.error("Failed to load grows:", err);
      setGrows([]);
    } finally {
      setGrowsLoading(false);
    }
  }

  async function loadTaskStats() {
    try {
      const response = await getTasks();
      const tasks = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      setTaskStats(summarizeTasks(tasks));
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setTaskStats({ dueToday: 0, overdue: 0, completedToday: 0, total: 0 });
    } finally {
      setTasksLoading(false);
    }
  }

  async function loadTrending() {
    try {
      const data = await getTrendingPosts(1);
      const list = Array.isArray(data) ? data : Array.isArray(data?.posts) ? data.posts : [];
      setTrending(list.slice(0, 4));
    } catch (err) {
      console.error("Failed to load trending:", err);
      setTrending([]);
    }
  }

  async function loadFeed(page = 1) {
    if (feedLoading && page !== 1) return; // Prevent double load unless initial
    setFeedLoading(true);
    try {
      const response = await getFeed(page);
      const list = normalizePostList(response);
      
      if (page === 1) {
        setFeedPosts(list);
      } else {
        setFeedPosts(prev => [...prev, ...list]);
      }
      
      // Assume page size 15 from api
      if (list.length < 15) {
        setFeedHasMore(false);
      }
      setFeedPage(page);
    } catch (err) {
      console.error("Failed to load dashboard feed:", err);
    } finally {
      setFeedLoading(false);
    }
  }

  const loadMoreFeed = () => {
    if (!feedLoading && feedHasMore) {
      loadFeed(feedPage + 1);
    }
  };

  const QuickAction = ({ icon, label, onPress, color }) => (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ icon, value, label, color, sublabel, disabled = false }) => (
    <View
      style={[
        styles.statCard,
        { borderLeftColor: disabled ? colors.border : color },
        disabled && styles.statCardDisabled
      ]}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, disabled && styles.statValueDisabled]}>{value}</Text>
        <Text style={[styles.statLabel, disabled && styles.statLabelDisabled]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.statSubLabel, disabled && styles.statLabelDisabled]}>{sublabel}</Text>
        ) : null}
      </View>
    </View>
  );

  const PlantCard = ({ plant }) => (
    <TouchableOpacity
      style={styles.plantCard}
      onPress={() => navigation.navigate("PlantDetail", { plantId: plant._id })}
    >
      <View style={styles.plantImagePlaceholder}>
        <Text style={styles.plantImageEmoji}>🌱</Text>
      </View>
      <View style={styles.plantCardContent}>
        <Text style={styles.plantName}>{plant.name || "Unnamed Plant"}</Text>
        <Text style={styles.plantStrain}>{plant.strain || "Unknown Strain"}</Text>
        <View style={styles.plantMeta}>
          <Text style={styles.plantMetaText}>📅 Day {plant.daysOld || 0}</Text>
          <Text style={styles.plantStage}>{plant.stage || "Seedling"}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getGrowDayCount = (grow) => {
    if (!grow) return null;
    if (typeof grow.daysOld === "number") return grow.daysOld;
    const startDate = grow.startDate || grow.startedAt || grow.createdAt;
    if (!startDate) return null;
    const diff = Date.now() - new Date(startDate).getTime();
    if (Number.isNaN(diff) || diff < 0) return null;
    return Math.max(0, Math.floor(diff / 86400000));
  };

  const GrowCard = ({ grow }) => {
    const growDays = getGrowDayCount(grow);
    return (
      <TouchableOpacity
        style={styles.growCard}
        onPress={() => navigation.navigate("GrowJournal", { grow })}
      >
        <View style={styles.growImagePlaceholder}>
          <Text style={styles.growImageEmoji}>🌿</Text>
          {growDays !== null && (
            <View style={styles.growDaysBadge}>
              <Text style={styles.growDaysValue}>{`Day ${growDays}`}</Text>
              <Text style={styles.growDaysLabel}>since start</Text>
            </View>
          )}
        </View>
        <View style={styles.growCardBody}>
          <View style={styles.growCardHeader}>
            <Text style={styles.growCardName} numberOfLines={1}>
              {grow.name || grow.title || "Unnamed Grow"}
            </Text>
            {grow.stage ? (
              <View style={styles.growStageBadge}>
                <Text style={styles.growStageText}>{grow.stage}</Text>
              </View>
            ) : null}
          </View>
          {grow.breeder ? (
            <Text style={styles.growCardMeta} numberOfLines={1}>
              {`Breeder: ${grow.breeder}`}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const longestGrowDays = (() => {
    if (!grows.length) return 0;
    const durations = grows
      .map((grow) => getGrowDayCount(grow))
      .filter((value) => typeof value === "number");
    if (!durations.length) return 0;
    return Math.max(...durations);
  })();

  const TrendingCard = ({ category, icon, color, count, onPress }) => (
    <TouchableOpacity style={styles.trendingCard} onPress={onPress}>
      <View style={[styles.trendingIcon, { backgroundColor: color + "20" }]}>
        <Text style={styles.trendingIconEmoji}>{icon}</Text>
      </View>
      <Text style={styles.trendingCategory}>{category}</Text>
      <Text style={styles.trendingCount}>{count}</Text>
    </TouchableOpacity>
  );

  const FeedItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.feedItem}
      onPress={() => navigation.navigate("PostDetail", { post: item })}
    >
      <View style={styles.feedHeader}>
        {item.user?.avatar ? (
          <Image source={{ uri: item.user.avatar }} style={styles.feedAvatar} />
        ) : (
          <View style={[styles.feedAvatar, { backgroundColor: "#ddd" }]} />
        )}
        <View>
          <Text style={styles.feedUsername}>{item.user?.username || "Grower"}</Text>
          <Text style={styles.feedTime} numberOfLines={1}>
             {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={styles.feedText} numberOfLines={2}>{item.text}</Text>
      {item.photos?.length > 0 && (
        <Image source={{ uri: item.photos[0] }} style={styles.feedImage} />
      )}
    </TouchableOpacity>
  );

  const renderFeedFooter = () => {
    if (!feedLoading || feedPage === 1) return null;
    return <ActivityIndicator style={{ padding: 10 }} color={colors.accent} />;
  };

  return (
    <ScreenContainer testID="dashboard-screen">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        testID="dashboard-scroll"
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {headerTitle}
              {showWelcomeMessage ? " 👋" : ""}
            </Text>
            <Text style={styles.subtitle}>{heroSubtitle}</Text>
          </View>
          {!showWelcomeMessage && (
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutButton}
              testID="logout-button"
            >
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pro Upgrade Banner (only show if not entitled) */}
        {!isEntitled && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.proBanner}
              onPress={() => navigation.navigate("Subscription")}
            >
              <View style={styles.proContent}>
                <Text style={styles.proIcon}>✨</Text>
                <View style={styles.proText}>
                  <Text style={styles.proTitle}>Upgrade to Pro</Text>
                  <Text style={styles.proSubtitle}>
                    Unlimited plants, AI diagnostics & more
                  </Text>
                </View>
                <Text style={styles.proArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickAction
              icon="➕"
              label="Add Plant"
              color={colors.accent}
              onPress={() => navigation.navigate("PlantsTab")}
            />
            <QuickAction
              icon="🔍"
              label="Diagnose"
              color="#10B981"
              onPress={() => navigation.navigate("DiagnoseTab")}
            />
            <QuickAction
              icon="📚"
              label="Learn"
              color="#8B5CF6"
              onPress={() => navigation.navigate("CoursesTab")}
            />
            <QuickAction
              icon="🏛️"
              label="Guild"
              color="#F59E0B"
              onPress={() => navigation.navigate("ForumTab")}
            />
          </View>
        </View>

        {/* Latest Feed (Scrollable Window) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Updates</Text>
          </View>
          <View style={{ height: 400, backgroundColor: "#f9fafb", borderRadius: 12 }}>
            {feedPosts.length === 0 && feedLoading ? (
              <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
            ) : (
              <FlatList
                data={feedPosts}
                keyExtractor={(item, index) => item._id || String(index)}
                renderItem={({ item }) => <FeedItem item={item} />}
                onEndReached={loadMoreFeed}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFeedFooter}
                nestedScrollEnabled={true}
                contentContainerStyle={{ padding: 10 }}
              />
            )}
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="🌱"
              value={plants.length}
              label="Active Plants"
              color={colors.accent}
            />
            <StatCard
              icon="📅"
              value={longestGrowDays}
              label="Longest Grow"
              color="#10B981"
            />
            <StatCard
              icon="✅"
              value={tasksLoading ? "…" : taskStats.total}
              label="Tasks Today"
              color="#F59E0B"
              sublabel={
                tasksLoading
                  ? "Calculating…"
                  : `${taskStats.dueToday} due • ${taskStats.overdue} overdue • ${taskStats.completedToday} done`
              }
            />
            <StatCard icon="🏆" value="Coming Soon" label="Harvests" color="#8B5CF6" disabled />
          </View>
        </View>

        {/* Active Grows */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Grows</Text>
            <TouchableOpacity onPress={() => navigation.navigate("PlantsTab")}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          {growsLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading...</Text>
            </View>
          ) : grows.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🌱</Text>
              <Text style={styles.emptyStateTitle}>No Grows Yet</Text>
              <Text style={styles.emptyStateText}>
                Start your first grow to see it here
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate("PlantsTab")}
              >
                <Text style={styles.emptyStateButtonText}>Add Your First Grow</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.plantsScroll}
            >
              {grows.slice(0, 5).map((grow) => (
                <GrowCard key={grow._id} grow={grow} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Guild Trending Content */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏛️ Trending in the Guild</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ForumTab")}>
              <Text style={styles.seeAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.plantsScroll}
          >
            {trending.length > 0 ? (
              trending.map((post, idx) => {
                const headline =
                  post.content?.trim() ||
                  post.title ||
                  (post.tags && post.tags.length ? `#${post.tags[0]}` : "Post");
                const snippet =
                  post.content && post.content.length > 80
                    ? `${post.content.slice(0, 77)}…`
                    : post.content || "";
                return (
                  <TrendingCard
                    key={post._id || idx}
                    category={headline}
                    icon={getCategoryIcon(post.tags?.[0] || post.category)}
                    color={getCategoryColor(idx)}
                    count={snippet || `${post.likes?.length || 0} likes`}
                    onPress={() =>
                      navigation.navigate("ForumPostDetail", {
                        id: post._id,
                        post
                      })
                    }
                  />
                );
              })
            ) : (
              <>
                <TrendingCard
                  category="Nutrients"
                  icon="💧"
                  color="#3B82F6"
                  count="LAWNS Essential"
                  onPress={() => navigation.navigate("ForumTab")}
                />
                <TrendingCard
                  category="Lighting"
                  icon="💡"
                  color="#F59E0B"
                  count="LAWNS Essential"
                  onPress={() => navigation.navigate("CoursesTab")}
                />
                <TrendingCard
                  category="Substrate"
                  icon="🌱"
                  color="#10B981"
                  count="LAWNS Essential"
                  onPress={() => navigation.navigate("ForumTab")}
                />
                <TrendingCard
                  category="Training"
                  icon="✂️"
                  color="#8B5CF6"
                  count="Learn More"
                  onPress={() => navigation.navigate("CoursesTab")}
                />
              </>
            )}
          </ScrollView>
        </View>

        {/* Bottom Padding for Tab Bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(2)
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(0.5)
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSoft
  },
  logoutButton: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    minWidth: 90,
    alignItems: "center"
  },
  logoutText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14
  },
  section: {
    marginTop: spacing(4),
    paddingHorizontal: spacing(4)
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing(3)
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(3)
  },
  seeAll: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600"
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  quickAction: {
    flex: 1,
    marginHorizontal: spacing(1),
    paddingVertical: spacing(3),
    borderRadius: radius.card,
    alignItems: "center",
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
    elevation: 3
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: spacing(1)
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing(1)
  },
  statCard: {
    width: (width - spacing(4) * 2 - spacing(2)) / 2,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing(3),
    marginHorizontal: spacing(1),
    marginBottom: spacing(2),
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
    elevation: 2
  },
  statCardDisabled: {
    backgroundColor: "#f1f1f1"
  },
  statIcon: {
    fontSize: 32,
    marginRight: spacing(2)
  },
  statContent: {
    flex: 1
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text
  },
  statValueDisabled: {
    color: colors.textSoft
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: spacing(0.5)
  },
  statLabelDisabled: {
    color: "#9CA3AF"
  },
  statSubLabel: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: spacing(0.5)
  },
  plantsScroll: {
    marginHorizontal: -spacing(4),
    paddingHorizontal: spacing(4)
  },
  plantCard: {
    width: 180,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginRight: spacing(3),
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
    elevation: 4
  },
  plantImagePlaceholder: {
    height: 140,
    backgroundColor: colors.accent + "20",
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    alignItems: "center",
    justifyContent: "center"
  },
  plantImageEmoji: {
    fontSize: 64
  },
  plantCardContent: {
    padding: spacing(3)
  },
  plantName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(0.5)
  },
  plantStrain: {
    fontSize: 13,
    color: colors.textSoft,
    marginBottom: spacing(2)
  },
  plantMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  plantMetaText: {
    fontSize: 12,
    color: colors.textSoft
  },
  plantStage: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent,
    backgroundColor: colors.accent + "20",
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: radius.pill
  },
  growCard: {
    width: 210,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginRight: spacing(3),
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
    elevation: 4,
    overflow: "hidden"
  },
  growImagePlaceholder: {
    height: 130,
    backgroundColor: colors.accent + "15",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  growImageEmoji: {
    fontSize: 62
  },
  growDaysBadge: {
    position: "absolute",
    bottom: spacing(2),
    right: spacing(2),
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radius.card
  },
  growDaysValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  growDaysLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    opacity: 0.8
  },
  growCardBody: {
    padding: spacing(3)
  },
  growCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1)
  },
  growCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: spacing(2)
  },
  growStageBadge: {
    backgroundColor: colors.accent + "20",
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: radius.pill
  },
  growStageText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent
  },
  growCardMeta: {
    fontSize: 12,
    color: colors.textSoft
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing(6),
    alignItems: "center"
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing(2)
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(1)
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSoft,
    textAlign: "center",
    marginBottom: spacing(3)
  },
  emptyStateButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radius.pill
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600"
  },
  trendingCard: {
    width: 160,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing(4),
    marginRight: spacing(3),
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
    elevation: 4
  },
  trendingIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(2)
  },
  trendingIconEmoji: {
    fontSize: 32
  },
  trendingCategory: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(0.5)
  },
  trendingCount: {
    fontSize: 12,
    color: colors.textSoft,
    marginBottom: spacing(2)
  },
  proBanner: {
    backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    backgroundColor: "#667eea",
    borderRadius: radius.card,
    padding: spacing(4),
    boxShadow: "0px 8px 16px rgba(102, 126, 234, 0.3)",
    elevation: 6
  },
  proContent: {
    flexDirection: "row",
    alignItems: "center"
  },
  proIcon: {
    fontSize: 32,
    marginRight: spacing(3)
  },
  proText: {
    flex: 1
  },
  proTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: spacing(0.5)
  },
  proSubtitle: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9
  },
  proArrow: {
    fontSize: 24,
    color: "#FFFFFF"
  },
  feedItem: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing(3),
    marginBottom: spacing(3),
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
    elevation: 2
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing(2)
  },
  feedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing(2)
  },
  feedUsername: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text
  },
  feedTime: {
    fontSize: 12,
    color: colors.textSoft
  },
  feedText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing(2)
  },
  feedImage: {
    width: "100%",
    height: 160,
    borderRadius: radius.card,
    backgroundColor: colors.bg
  }
});
