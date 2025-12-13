import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import TokenBalanceWidget from "../components/TokenBalanceWidget";
import { colors, spacing, radius, typography } from "../theme/theme";
import { useNavigation } from "@react-navigation/native";
import { getPlants } from "../api/growlog";
import { getSubscription } from "../api/subscription";
import { getTrending } from "../api/posts";

const { width } = Dimensions.get("window");

// Helper functions for trending categories
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
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444"];
  return colors[index % colors.length];
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState({ plan: "free" });
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    loadPlants();
    loadSubscription();
    loadTrending();
  }, []);

  async function loadPlants() {
    try {
      const data = await getPlants();
      setPlants(data || []);
    } catch (err) {
      console.error("Failed to load plants:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscription() {
    try {
      const data = await getSubscription();
      setSubscription(data || { plan: "free" });
    } catch (err) {
      console.error("Failed to load subscription:", err);
    }
  }

  async function loadTrending() {
    try {
      const data = await getTrending();
      // Take top 4 trending posts/topics
      setTrending((data || []).slice(0, 4));
    } catch (err) {
      console.error("Failed to load trending:", err);
      // Fallback to static categories if API fails
      setTrending([]);
    }
  }

  const QuickAction = ({ icon, label, onPress, color }) => (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ icon, value, label, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
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

  const TrendingCard = ({ category, icon, color, count, onPress }) => (
    <TouchableOpacity style={styles.trendingCard} onPress={onPress}>
      <View style={[styles.trendingIcon, { backgroundColor: color + "20" }]}>
        <Text style={styles.trendingIconEmoji}>{icon}</Text>
      </View>
      <Text style={styles.trendingCategory}>{category}</Text>
      <Text style={styles.trendingCount}>{count}</Text>
      <View style={[styles.trendingBadge, { backgroundColor: color }]}>
        <Text style={styles.trendingBadgeText}>🔥 Hot</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.subtitle}>Let's check on your garden</Text>
          </View>
        </View>

        {/* AI Token Balance */}
        <View style={styles.section}>
          <TokenBalanceWidget onPress={() => navigation.navigate("Subscription")} />
        </View>

        {/* Pro Upgrade Banner (only show if free user) */}
        {subscription.plan === "free" && (
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
              value={
                plants.length > 0 ? Math.max(...plants.map((p) => p.daysOld || 0)) : 0
              }
              label="Longest Grow"
              color="#10B981"
            />
            <StatCard icon="✅" value="0" label="Tasks Today" color="#F59E0B" />
            <StatCard icon="🏆" value="0" label="Harvests" color="#8B5CF6" />
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
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading...</Text>
            </View>
          ) : plants.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🌱</Text>
              <Text style={styles.emptyStateTitle}>No Plants Yet</Text>
              <Text style={styles.emptyStateText}>
                Start your first grow to see it here
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate("PlantsTab")}
              >
                <Text style={styles.emptyStateButtonText}>Add Your First Plant</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.plantsScroll}
            >
              {plants.slice(0, 5).map((plant) => (
                <PlantCard key={plant._id} plant={plant} />
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
              trending.map((post, idx) => (
                <TrendingCard
                  key={post._id || idx}
                  category={post.title || post.category || "Post"}
                  icon={getCategoryIcon(post.category)}
                  color={getCategoryColor(idx)}
                  count={`${post.likes?.length || 0} likes`}
                  onPress={() => navigation.navigate("ForumTab")}
                />
              ))
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
    backgroundColor: colors.cardBg,
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
  statLabel: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: spacing(0.5)
  },
  plantsScroll: {
    marginHorizontal: -spacing(4),
    paddingHorizontal: spacing(4)
  },
  plantCard: {
    width: 180,
    backgroundColor: colors.cardBg,
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
  emptyState: {
    backgroundColor: colors.cardBg,
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
    backgroundColor: colors.cardBg,
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
  trendingBadge: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: radius.pill,
    alignSelf: "flex-start"
  },
  trendingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF"
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
  }
});
