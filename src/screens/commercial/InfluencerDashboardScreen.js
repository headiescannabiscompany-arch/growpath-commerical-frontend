import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Card from "../../components/Card.js";
import { Colors, Typography, Spacing } from "../../theme/theme.js";
import { getSocialMetrics } from "../../api/socialMedia.js";
import SkeletonLoader from "../../components/SkeletonLoader.js";
import EmptyState from "../../components/EmptyState.js";
import ErrorState from "../../components/ErrorState.js";
import ErrorBoundary from "../../components/ErrorBoundary.js";

/**
 * Influencer Dashboard Screen
 * Track metrics, reach, engagement, and audience demographics
 */

const InfluencerDashboardScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalFollowers: 0,
    totalEngagement: 0,
    monthlyReach: 0,
    growthRate: 0,
    avgPostLikes: 0,
    avgPostComments: 0,
    avgPostShares: 0,
    postFrequency: 0
  });

  const [audienceDemographics, setAudienceDemographics] = useState({
    age: [],
    gender: [],
    locations: []
  });

  const [recentPosts, setRecentPosts] = useState([]);

  // Load influencer metrics on mount
  useEffect(() => {
    loadInfluencerData();
  }, []);

  const loadInfluencerData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load metrics from all connected platforms
      const platforms = ["instagram", "tiktok", "youtube", "twitter"];
      const metricsPromises = platforms.map((p) => getSocialMetrics(p).catch(() => null));
      const results = await Promise.all(metricsPromises);

      // Aggregate metrics
      const aggregated = results.filter(Boolean).reduce(
        (acc, platform) => ({
          totalFollowers: (acc.totalFollowers || 0) + (platform?.followers || 0),
          totalEngagement: (acc.totalEngagement || 0) + (platform?.engagementRate || 0),
          monthlyReach: (acc.monthlyReach || 0) + (platform?.monthlyReach || 0)
        }),
        {}
      );

      if (aggregated.totalFollowers) {
        setMetrics((prev) => ({ ...prev, ...aggregated }));
      }

      // Load recent posts
      if (results[0]?.recentPosts) {
        setRecentPosts(results[0].recentPosts);
      }
    } catch (err) {
      console.error("Failed to load influencer data:", err);
      setError(err.message || "Failed to load influencer data");
    } finally {
      setIsLoading(false);
    }
  };

  const platformMetrics = [
    {
      name: "Instagram",
      icon: "instagram",
      color: "#E4405F",
      followers: 45000,
      engagement: 7.2,
      posts: 256
    },
    {
      name: "TikTok",
      icon: "tiktok",
      color: "#000000",
      followers: 78000,
      engagement: 9.8,
      posts: 342
    },
    {
      name: "YouTube",
      icon: "youtube",
      color: "#FF0000",
      followers: 23800,
      engagement: 6.5,
      posts: 45
    },
    {
      name: "Twitter",
      icon: "twitter",
      color: "#1DA1F2",
      followers: 10000,
      engagement: 4.2,
      posts: 890
    }
  ];

  const DemoChart = ({ data, label, colors }) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartLabel}>{label}</Text>
      {data.map((item, index) => (
        <View key={index} style={styles.chartRow}>
          <Text style={styles.chartItemLabel}>
            {item.range || item.label || item.country}
          </Text>
          <View style={styles.chartBarContainer}>
            <View
              style={[
                styles.chartBar,
                {
                  width: `${item.percentage}%`,
                  backgroundColor: colors[index] || Colors.primary
                }
              ]}
            />
          </View>
          <Text style={styles.chartValue}>
            {item.percentage}% ({item.count?.toLocaleString()})
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <ErrorBoundary>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="star" size={40} color={Colors.primary} />
          <Text style={styles.title}>Influencer Dashboard</Text>
          <Text style={styles.subtitle}>
            Track your reach, engagement, and audience growth
          </Text>
        </View>

        {/* Error State */}
        {error && (
          <ErrorState
            title="Failed to load metrics"
            message={error}
            icon="alert-circle"
            onRetry={loadInfluencerData}
            retryLabel="Try Again"
          />
        )}

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <MaterialCommunityIcons
              name="account-multiple"
              size={28}
              color={Colors.primary}
            />
            <Text style={styles.metricValue}>
              {metrics.totalFollowers.toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Total Followers</Text>
            <Text style={styles.metricGrowth}>↑ {metrics.growthRate}% this month</Text>
          </Card>

          <Card style={styles.metricCard}>
            <MaterialCommunityIcons name="heart" size={28} color="#FF6B6B" />
            <Text style={styles.metricValue}>{metrics.totalEngagement.toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Avg Engagement</Text>
            <Text style={styles.metricGrowth}>Strong performance</Text>
          </Card>

          <Card style={styles.metricCard}>
            <MaterialCommunityIcons name="eye" size={28} color="#4ECDC4" />
            <Text style={styles.metricValue}>
              {(metrics.monthlyReach / 1000).toFixed(0)}K
            </Text>
            <Text style={styles.metricLabel}>Monthly Reach</Text>
            <Text style={styles.metricGrowth}>Highly visible</Text>
          </Card>

          <Card style={styles.metricCard}>
            <MaterialCommunityIcons name="arrow-up-bold" size={28} color="#95E1D3" />
            <Text style={styles.metricValue}>{metrics.postFrequency}</Text>
            <Text style={styles.metricLabel}>Posts/Week</Text>
            <Text style={styles.metricGrowth}>Consistent schedule</Text>
          </Card>
        </View>

        {/* Platform Breakdown */}
        <Card style={styles.platformsCard}>
          <Text style={styles.sectionTitle}>📱 Platform Performance</Text>
          <FlatList
            data={platformMetrics}
            scrollEnabled={false}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <View style={styles.platformRow}>
                <View style={styles.platformInfo}>
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                  <View style={styles.platformData}>
                    <Text style={styles.platformName}>{item.name}</Text>
                    <Text style={styles.platformMeta}>
                      {item.followers.toLocaleString()} followers • {item.posts} posts
                    </Text>
                  </View>
                </View>
                <View style={styles.platformScore}>
                  <Text style={styles.platformEngagement}>
                    {item.engagement.toFixed(1)}%
                  </Text>
                  <Text style={styles.platformScoreLabel}>engagement</Text>
                </View>
              </View>
            )}
          />
        </Card>

        {/* Audience Demographics */}
        <Card style={styles.demographicsCard}>
          <Text style={styles.sectionTitle}>👥 Audience Demographics</Text>

          <DemoChart
            data={audienceDemographics.age}
            label="Age Distribution"
            colors={["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]}
          />

          <DemoChart
            data={audienceDemographics.gender}
            label="Gender"
            colors={["#FF6B6B", "#4ECDC4", "#95E1D3"]}
          />

          <DemoChart
            data={audienceDemographics.locations}
            label="Top Locations"
            colors={["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]}
          />
        </Card>

        {/* Recent Posts Performance */}
        <Card style={styles.postsCard}>
          <Text style={styles.sectionTitle}>📊 Recent Posts Performance</Text>
          <FlatList
            data={recentPosts}
            scrollEnabled={false}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.postItem}>
                <View style={styles.postHeader}>
                  <View>
                    <Text style={styles.postTitle}>{item.title}</Text>
                    <Text style={styles.postDate}>
                      {item.platform} • {new Date(item.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.postEngagementBadge}>
                    <Text style={styles.postEngagementValue}>
                      {item.engagement.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.postMetrics}>
                  <View style={styles.postMetric}>
                    <MaterialCommunityIcons name="heart" size={16} color="#FF6B6B" />
                    <Text style={styles.postMetricValue}>
                      {item.likes.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.postMetric}>
                    <MaterialCommunityIcons name="comment" size={16} color="#4ECDC4" />
                    <Text style={styles.postMetricValue}>
                      {item.comments.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.postMetric}>
                    <MaterialCommunityIcons
                      name="share-variant"
                      size={16}
                      color="#45B7D1"
                    />
                    <Text style={styles.postMetricValue}>
                      {item.shares.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.postMetric}>
                    <MaterialCommunityIcons name="eye" size={16} color="#96CEB4" />
                    <Text style={styles.postMetricValue}>
                      {(item.reach / 1000).toFixed(0)}K
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        </Card>

        {/* Call to Action */}
        <Card style={styles.ctaCard}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={24}
            color={Colors.primary}
          />
          <Text style={styles.ctaTitle}>Ready to Grow Your Influence?</Text>
          <Text style={styles.ctaText}>
            Use our content marketplace to sell guides and exclusive content to your
            followers.
          </Text>
          <TouchableOpacity style={styles.ctaBtn}>
            <Text style={styles.ctaBtnText}>Upload Content →</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.spacer} />
      </ScrollView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md
  },
  title: {
    fontSize: Typography.size.h1,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: Spacing.sm
  },
  subtitle: {
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: "center"
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.md
  },
  metricCard: {
    width: "48%",
    padding: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.md
  },
  metricValue: {
    fontSize: Typography.size.h2,
    fontWeight: "bold",
    color: Colors.primary,
    marginTop: Spacing.sm
  },
  metricLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: "center"
  },
  metricGrowth: {
    fontSize: Typography.size.caption,
    color: "#10b981",
    marginTop: Spacing.xs
  },
  platformsCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    padding: Spacing.md
  },
  sectionTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md
  },
  platformRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  platformInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  platformData: {
    marginLeft: Spacing.md,
    flex: 1
  },
  platformName: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text
  },
  platformMeta: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  platformScore: {
    alignItems: "center"
  },
  platformEngagement: {
    fontSize: Typography.size.h3,
    fontWeight: "bold",
    color: Colors.primary
  },
  platformScoreLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  demographicsCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    padding: Spacing.md
  },
  chartContainer: {
    marginBottom: Spacing.lg
  },
  chartLabel: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm
  },
  chartItemLabel: {
    width: 60,
    fontSize: Typography.size.caption,
    color: Colors.text
  },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginHorizontal: Spacing.sm,
    overflow: "hidden"
  },
  chartBar: {
    height: "100%",
    borderRadius: 4
  },
  chartValue: {
    width: 100,
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    textAlign: "right"
  },
  postsCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    padding: Spacing.md
  },
  postItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm
  },
  postTitle: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text,
    flex: 1
  },
  postDate: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  postEngagementBadge: {
    backgroundColor: "#FFE5E5",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    marginLeft: Spacing.sm
  },
  postEngagementValue: {
    fontSize: Typography.size.caption,
    fontWeight: "bold",
    color: "#FF6B6B"
  },
  postMetrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.sm,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingHorizontal: Spacing.sm
  },
  postMetric: {
    flexDirection: "row",
    alignItems: "center"
  },
  postMetricValue: {
    fontSize: Typography.size.caption,
    color: Colors.text,
    fontWeight: "600",
    marginLeft: Spacing.xs
  },
  ctaCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    padding: Spacing.lg,
    alignItems: "center",
    backgroundColor: "#F0F4FF"
  },
  ctaTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: Spacing.md
  },
  ctaText: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center"
  },
  ctaBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 8
  },
  ctaBtnText: {
    color: "#FFF",
    fontWeight: "bold"
  },
  spacer: {
    height: Spacing.lg * 2
  }
});

export default InfluencerDashboardScreen;
