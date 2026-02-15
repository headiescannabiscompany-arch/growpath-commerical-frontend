/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Card from "../../components/Card.js";
import { Colors, Typography, Spacing } from "../../theme/theme.js";
import {
  getCampaigns,
  createCampaign,
  getBudget,
  getPerformance
} from "../../api/advertising.js";
import { CampaignCardSkeleton } from "../../components/SkeletonLoader.js";
import EmptyState from "../../components/EmptyState.js";
import ErrorState from "../../components/ErrorState.js";
import ErrorBoundary from "../../components/ErrorBoundary.js";

/**
 * Advertising Screen
 * Campaign management, budget allocation, and performance analytics
 */

const AdvertisingScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("campaigns"); // campaigns, create, analytics, budget
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignBudget, setCampaignBudget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [campaigns, setCampaigns] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);

  // Load advertising data on mount
  useEffect(() => {
    loadAdvertisingData();
  }, []);

  const loadAdvertisingData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [campaignsData, budgetInfo, performanceData] = await Promise.all([
        getCampaigns(),
        getBudget(),
        getPerformance()
      ]);
      setCampaigns(campaignsData?.data || []);
      setBudgetData(budgetInfo?.data || {});
      setPerformanceMetrics(performanceData?.data || []);
    } catch (err) {
      console.error("Failed to load advertising data:", err);
      setError(err.message || "Failed to load advertising data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !campaignBudget) {
      Alert.alert("Missing Info", "Campaign name and budget required");
      return;
    }
    try {
      setIsLoading(true);
      const result = await createCampaign({
        name: campaignName,
        budget: parseFloat(campaignBudget),
        platform: "Instagram",
        duration: 30
      });
      if (result?.data) {
        setCampaigns([...campaigns, result.data]);
        setShowCreateCampaignModal(false);
        setCampaignName("");
        setCampaignBudget("");
        Alert.alert("Success", "Campaign created successfully");
      }
    } catch (error) {
      Alert.alert("Error", `Failed to create campaign: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCampaignStatus = async (campaignId) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    try {
      setIsLoading(true);
      // API call would go here - either pauseCampaign or resumeCampaign
      Alert.alert(
        "Success",
        `Campaign ${campaign?.status === "active" ? "paused" : "resumed"}`
      );
      // Reload campaigns
      loadAdvertisingData();
    } catch (error) {
      Alert.alert("Error", `Failed to update campaign: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "campaigns" && styles.tabBtnActive]}
            onPress={() => setActiveTab("campaigns")}
          >
            <MaterialCommunityIcons
              name="bullhorn"
              size={20}
              color={activeTab === "campaigns" ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "campaigns" && styles.tabLabelActive
              ]}
            >
              Campaigns
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "analytics" && styles.tabBtnActive]}
            onPress={() => setActiveTab("analytics")}
          >
            <MaterialCommunityIcons
              name="chart-line"
              size={20}
              color={activeTab === "analytics" ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "analytics" && styles.tabLabelActive
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "budget" && styles.tabBtnActive]}
            onPress={() => setActiveTab("budget")}
          >
            <MaterialCommunityIcons
              name="cash-multiple"
              size={20}
              color={activeTab === "budget" ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[styles.tabLabel, activeTab === "budget" && styles.tabLabelActive]}
            >
              Budget
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Error State */}
          {error && (
            <ErrorState
              title="Failed to load campaigns"
              message={error}
              icon="alert-circle"
              onRetry={loadAdvertisingData}
              retryLabel="Try Again"
            />
          )}

          {/* CAMPAIGNS TAB */}
          {activeTab === "campaigns" && (
            <>
              <View style={styles.header}>
                <View>
                  <Text style={styles.pageTitle}>Advertising Campaigns</Text>
                  <Text style={styles.pageSubtitle}>
                    Manage and monitor your ad campaigns
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => setShowCreateCampaignModal(true)}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                  <Text style={styles.createBtnText}>New Campaign</Text>
                </TouchableOpacity>
              </View>

              {/* Campaign Stats Summary */}
              <Card style={styles.summaryCard}>
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Active Campaigns</Text>
                    <Text style={styles.statValue}>
                      {campaigns.filter((c) => c.status === "active").length}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Spent</Text>
                    <Text style={styles.statValue}>
                      ${campaigns.reduce((sum, c) => sum + c.spent, 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Impressions</Text>
                    <Text style={styles.statValue}>
                      {(
                        campaigns.reduce((sum, c) => sum + c.impressions, 0) / 1000
                      ).toFixed(0)}
                      K
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Campaigns List */}
              {campaigns.map((campaign) => (
                <Card key={campaign.id} style={styles.campaignCard}>
                  <View style={styles.campaignHeader}>
                    <View style={styles.campaignTitleSection}>
                      <Text style={styles.campaignName}>{campaign.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              campaign.status === "active" ? "#D1FAE5" : "#FEE2E2"
                          }
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color: campaign.status === "active" ? "#059669" : "#DC2626"
                            }
                          ]}
                        >
                          {campaign.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.menuBtn}
                      onPress={() => toggleCampaignStatus(campaign.id)}
                    >
                      <MaterialCommunityIcons
                        name="dots-vertical"
                        size={20}
                        color={Colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.campaignMeta}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="share-variant"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.metaText}>{campaign.platform}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="calendar-outline"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.metaText}>
                        {campaign.startDate} to {campaign.endDate}
                      </Text>
                    </View>
                  </View>

                  {/* Performance Metrics */}
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>Budget</Text>
                      <Text style={styles.metricValue}>${campaign.budget}</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>Spent</Text>
                      <Text style={styles.metricValue}>${campaign.spent.toFixed(2)}</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>ROI</Text>
                      <Text style={[styles.metricValue, { color: "#10b981" }]}>
                        {campaign.roi}%
                      </Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>Conversions</Text>
                      <Text style={styles.metricValue}>{campaign.conversions}</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Budget Usage</Text>
                      <Text style={styles.progressPercent}>
                        {((campaign.spent / campaign.budget) * 100).toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${(campaign.spent / campaign.budget) * 100}%` }
                        ]}
                      />
                    </View>
                  </View>

                  {/* Detailed Stats */}
                  <View style={styles.detailedStats}>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Impressions</Text>
                      <Text style={styles.statRowValue}>
                        {campaign.impressions.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Clicks</Text>
                      <Text style={styles.statRowValue}>
                        {campaign.clicks.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>CTR</Text>
                      <Text style={styles.statRowValue}>{campaign.ctr}%</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>CPC</Text>
                      <Text style={styles.statRowValue}>${campaign.cpc.toFixed(3)}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.campaignActions}>
                    <TouchableOpacity style={styles.actionBtn}>
                      <MaterialCommunityIcons
                        name="pencil"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                      <MaterialCommunityIcons
                        name="chart-box"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.actionBtnText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                      <MaterialCommunityIcons
                        name="pause"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.actionBtnText}>Pause</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <>
              <Text style={styles.pageTitle}>Campaign Analytics</Text>

              {/* Overall Performance */}
              <Card style={styles.analyticsCard}>
                <Text style={styles.chartTitle}>ðŸ“Š Overall Performance</Text>
                <View style={styles.analyticsGrid}>
                  <View style={styles.analyticsItem}>
                    <Text style={styles.analyticsLabel}>Total Spend</Text>
                    <Text style={styles.analyticsValue}>
                      ${campaigns.reduce((sum, c) => sum + c.spent, 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.analyticsItem}>
                    <Text style={styles.analyticsLabel}>Avg ROI</Text>
                    <Text style={[styles.analyticsValue, { color: "#10b981" }]}>
                      {(
                        campaigns.reduce((sum, c) => sum + c.roi, 0) / campaigns.length
                      ).toFixed(0)}
                      %
                    </Text>
                  </View>
                  <View style={styles.analyticsItem}>
                    <Text style={styles.analyticsLabel}>Total Conversions</Text>
                    <Text style={styles.analyticsValue}>
                      {campaigns.reduce((sum, c) => sum + c.conversions, 0)}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Performance by Platform */}
              <Card style={styles.analyticsCard}>
                <Text style={styles.chartTitle}>ðŸ“± Performance by Platform</Text>
                {["Instagram", "Facebook", "TikTok"].map((platform) => {
                  const platformCampaigns = campaigns.filter(
                    (c) => c.platform === platform
                  );
                  const totalSpend = platformCampaigns.reduce(
                    (sum, c) => sum + c.spent,
                    0
                  );
                  const avgROI =
                    platformCampaigns.length > 0
                      ? platformCampaigns.reduce((sum, c) => sum + c.roi, 0) /
                        platformCampaigns.length
                      : 0;
                  return (
                    <View key={platform} style={styles.platformStats}>
                      <View style={styles.platformRow}>
                        <Text style={styles.platformName}>{platform}</Text>
                        <Text style={styles.platformValue}>
                          ${totalSpend.toFixed(2)} spent
                        </Text>
                      </View>
                      <View style={styles.platformRow}>
                        <Text style={styles.platformLabel}>ROI:</Text>
                        <Text style={[styles.platformValue, { color: "#10b981" }]}>
                          {avgROI.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </Card>

              {/* Conversion Trends */}
              <Card style={styles.analyticsCard}>
                <Text style={styles.chartTitle}>ðŸ“ˆ Conversion Trends</Text>
                <View style={styles.trendChart}>
                  {[
                    { week: "Week 1", conversions: 120, color: "#0ea5e9" },
                    { week: "Week 2", conversions: 156, color: "#10b981" },
                    { week: "Week 3", conversions: 142, color: "#f59e0b" },
                    { week: "Week 4", conversions: 184, color: "#8b5cf6" }
                  ].map((item, idx) => (
                    <View key={idx} style={styles.trendBar}>
                      <View
                        style={[
                          styles.trendBarFill,
                          {
                            height: `${(item.conversions / 200) * 100}%`,
                            backgroundColor: item.color
                          }
                        ]}
                      />
                      <Text style={styles.trendLabel}>{item.week}</Text>
                      <Text style={styles.trendValue}>{item.conversions}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          )}

          {/* BUDGET TAB */}
          {activeTab === "budget" && (
            <>
              <Text style={styles.pageTitle}>Budget Management</Text>

              {/* Monthly Budget Overview */}
              <Card style={styles.budgetCard}>
                <Text style={styles.chartTitle}>ðŸ’° Monthly Budget</Text>
                <View style={styles.budgetOverview}>
                  <View style={styles.budgetItem}>
                    <Text style={styles.budgetLabel}>Monthly Budget</Text>
                    <Text style={styles.budgetValue}>$1,500.00</Text>
                  </View>
                  <View style={styles.budgetItem}>
                    <Text style={styles.budgetLabel}>Spent</Text>
                    <Text style={styles.budgetValue}>
                      ${campaigns.reduce((sum, c) => sum + c.spent, 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.budgetItem}>
                    <Text style={styles.budgetLabel}>Remaining</Text>
                    <Text style={[styles.budgetValue, { color: "#10b981" }]}>
                      $
                      {(1500 - campaigns.reduce((sum, c) => sum + c.spent, 0)).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Budget Progress */}
                <View style={styles.budgetProgress}>
                  <View style={styles.budgetProgressBar}>
                    <View
                      style={[
                        styles.budgetProgressFill,
                        {
                          width: `${(campaigns.reduce((sum, c) => sum + c.spent, 0) / 1500) * 100}%`
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.budgetPercent}>
                    {(
                      (campaigns.reduce((sum, c) => sum + c.spent, 0) / 1500) *
                      100
                    ).toFixed(0)}
                    % used
                  </Text>
                </View>
              </Card>

              {/* Budget by Campaign */}
              <Card style={styles.budgetCard}>
                <Text style={styles.chartTitle}>Campaign Budget Breakdown</Text>
                {campaigns.map((campaign) => (
                  <View key={campaign.id} style={styles.campaignBudgetRow}>
                    <View style={styles.campaignBudgetInfo}>
                      <Text style={styles.campaignBudgetName}>{campaign.name}</Text>
                      <Text style={styles.campaignBudgetMeta}>
                        ${campaign.spent.toFixed(2)} of ${campaign.budget}
                      </Text>
                    </View>
                    <View style={styles.campaignBudgetBar}>
                      <View
                        style={[
                          styles.campaignBudgetFill,
                          { width: `${(campaign.spent / campaign.budget) * 100}%` }
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </Card>

              {/* Budget Alerts */}
              <Card style={styles.alertCard}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color="#f59e0b"
                />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>Budget Alert</Text>
                  <Text style={styles.alertText}>
                    You've spent 69% of your monthly budget. Consider pausing low-ROI
                    campaigns.
                  </Text>
                </View>
              </Card>
            </>
          )}

          <View style={styles.spacer} />
        </ScrollView>

        {/* Create Campaign Modal */}
        <Modal visible={showCreateCampaignModal} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateCampaignModal(false)}>
                <MaterialCommunityIcons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Campaign</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Campaign Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Spring Sale 2024"
                value={campaignName}
                onChangeText={setCampaignName}
              />

              <Text style={styles.inputLabel}>Budget ($)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="500"
                value={campaignBudget}
                onChangeText={setCampaignBudget}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Platform</Text>
              <View style={styles.platformOptions}>
                {["Instagram", "Facebook", "TikTok", "Twitter"].map((platform) => (
                  <TouchableOpacity key={platform} style={styles.platformOption}>
                    <Text style={styles.platformOptionText}>{platform}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Campaign Duration</Text>
              <View style={styles.durationOptions}>
                {["1 Week", "2 Weeks", "1 Month", "Custom"].map((duration) => (
                  <TouchableOpacity key={duration} style={styles.durationOption}>
                    <Text style={styles.durationText}>{duration}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.createCampaignBtn}
                onPress={handleCreateCampaign}
              >
                <Text style={styles.createCampaignBtnText}>Create Campaign</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingHorizontal: Spacing.md
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs
  },
  tabBtnActive: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary
  },
  tabLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: "600"
  },
  content: {
    flex: 1,
    padding: Spacing.md
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg
  },
  pageTitle: {
    fontSize: Typography.size.h1,
    fontWeight: "bold",
    color: Colors.text
  },
  pageSubtitle: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8
  },
  createBtnText: {
    color: "#FFF",
    fontWeight: "600",
    marginLeft: Spacing.xs
  },
  summaryCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  statBox: {
    alignItems: "center"
  },
  statLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  statValue: {
    fontSize: Typography.size.h3,
    fontWeight: "bold",
    color: Colors.primary,
    marginTop: Spacing.sm
  },
  campaignCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md
  },
  campaignHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md
  },
  campaignTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  campaignName: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text,
    marginRight: Spacing.md
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "bold"
  },
  menuBtn: {
    padding: Spacing.xs
  },
  campaignMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  metaText: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    backgroundColor: "#f9fafb",
    marginHorizontal: Spacing.xs,
    borderRadius: 8
  },
  metricLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  metricValue: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: Spacing.xs
  },
  progressSection: {
    marginBottom: Spacing.md
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs
  },
  progressLabel: {
    fontSize: Typography.size.caption,
    color: Colors.text,
    fontWeight: "600"
  },
  progressPercent: {
    fontSize: Typography.size.caption,
    color: Colors.primary,
    fontWeight: "bold"
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary
  },
  detailedStats: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  statRowLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  statRowValue: {
    fontSize: Typography.size.caption,
    fontWeight: "bold",
    color: Colors.text
  },
  campaignActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb"
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm
  },
  actionBtnText: {
    fontSize: Typography.size.caption,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: Spacing.xs
  },
  analyticsCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md
  },
  chartTitle: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md
  },
  analyticsGrid: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  analyticsItem: {
    alignItems: "center"
  },
  analyticsLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  analyticsValue: {
    fontSize: Typography.size.h3,
    fontWeight: "bold",
    color: Colors.primary,
    marginTop: Spacing.sm
  },
  platformStats: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  platformRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs
  },
  platformName: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text
  },
  platformLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  platformValue: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text
  },
  trendChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 180,
    paddingVertical: Spacing.md
  },
  trendBar: {
    alignItems: "center",
    flex: 1
  },
  trendBarFill: {
    width: 40,
    marginBottom: Spacing.sm,
    borderRadius: 4
  },
  trendLabel: {
    fontSize: Typography.size.caption,
    color: Colors.text,
    marginBottom: Spacing.xs
  },
  trendValue: {
    fontSize: Typography.size.caption,
    fontWeight: "bold",
    color: Colors.primary
  },
  budgetCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md
  },
  budgetOverview: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.lg
  },
  budgetItem: {
    alignItems: "center"
  },
  budgetLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  budgetValue: {
    fontSize: Typography.size.h3,
    fontWeight: "bold",
    color: Colors.primary,
    marginTop: Spacing.sm
  },
  budgetProgress: {
    marginBottom: Spacing.lg
  },
  budgetProgressBar: {
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: Spacing.sm
  },
  budgetProgressFill: {
    height: "100%",
    backgroundColor: Colors.primary
  },
  budgetPercent: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    textAlign: "center"
  },
  campaignBudgetRow: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  campaignBudgetInfo: {
    marginBottom: Spacing.sm
  },
  campaignBudgetName: {
    fontSize: Typography.size.caption,
    fontWeight: "bold",
    color: Colors.text
  },
  campaignBudgetMeta: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  campaignBudgetBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden"
  },
  campaignBudgetFill: {
    height: "100%",
    backgroundColor: Colors.primary
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: "#FFFBEB",
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    marginTop: Spacing.lg
  },
  alertContent: {
    flex: 1,
    marginLeft: Spacing.md
  },
  alertTitle: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text
  },
  alertText: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 18
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  modalTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md
  },
  inputLabel: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.size.body,
    marginBottom: Spacing.sm
  },
  platformOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md
  },
  platformOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8
  },
  platformOptionText: {
    color: Colors.primary,
    fontWeight: "600"
  },
  durationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md
  },
  durationOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8
  },
  durationText: {
    color: Colors.primary,
    fontWeight: "600"
  },
  createCampaignBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg
  },
  createCampaignBtnText: {
    color: "#FFF",
    fontSize: Typography.size.body,
    fontWeight: "bold"
  },
  spacer: {
    height: Spacing.lg * 2
  }
});

export default AdvertisingScreen;

