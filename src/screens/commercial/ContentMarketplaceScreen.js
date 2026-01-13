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
import { browseMarketplace, getMyUploads, getSalesData } from "../../api/marketplace.js";
import {
  ContentCardSkeleton,
  UploadCardSkeleton
} from "../../components/SkeletonLoader.js";
import EmptyState from "../../components/EmptyState.js";
import ErrorState from "../../components/ErrorState.js";
import ErrorBoundary from "../../components/ErrorBoundary.js";

/**
 * Content Marketplace Screen
 * Browse, upload, and sell grow guides, photos, and educational content
 */

const ContentMarketplaceScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("browse"); // browse, uploads, sales, analytics
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("guides");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [uploads, setUploads] = useState([]);
  const [marketplaceContent, setMarketplaceContent] = useState([]);
  const [salesData, setSalesData] = useState(null);

  // Load marketplace content and uploads on mount
  useEffect(() => {
    loadMarketplaceData();
  }, [selectedCategory]);

  const loadMarketplaceData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [contentData, uploadsData, salesMetrics] = await Promise.all([
        browseMarketplace(selectedCategory),
        getMyUploads(),
        getSalesData("monthly")
      ]);

      setMarketplaceContent(contentData?.data || []);
      setUploads(uploadsData?.data || []);
      setSalesData(salesMetrics?.data || {});
    } catch (err) {
      console.error("Error loading marketplace:", err);
      setError(err.message || "Failed to load marketplace data");
      Alert.alert("Error", "Failed to load marketplace data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { id: "all", label: "All Content", icon: "view-grid" },
    { id: "guides", label: "Guides", icon: "book-open-variant" },
    { id: "photos", label: "Photos", icon: "image-multiple" },
    { id: "templates", label: "Templates", icon: "file-document" },
    { id: "bundles", label: "Bundles", icon: "package-variant" }
  ];

  const tabButtons = [
    { id: "browse", label: "Browse", icon: "magnify" },
    { id: "uploads", label: "My Uploads", icon: "cloud-upload" },
    { id: "sales", label: "Sales", icon: "cash-multiple" },
    { id: "analytics", label: "Analytics", icon: "chart-line" }
  ];

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          {tabButtons.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={20}
                color={activeTab === tab.id ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* BROWSE TAB */}
          {activeTab === "browse" && (
            <>
              {/* Search & Filter */}
              <View style={styles.searchContainer}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color={Colors.textSecondary}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search marketplace..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Category Filter */}
              <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                style={styles.categoriesContainer}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      selectedCategory === item.id && styles.categoryChipActive
                    ]}
                    onPress={() => setSelectedCategory(item.id)}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={16}
                      color={selectedCategory === item.id ? "#FFF" : Colors.text}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        selectedCategory === item.id && styles.categoryLabelActive
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />

              {/* Error State */}
              {error && (
                <ErrorState
                  title="Failed to load content"
                  message={error}
                  icon="alert-circle"
                  onRetry={loadMarketplaceData}
                  retryLabel="Try Again"
                />
              )}

              {/* Marketplace Grid */}
              <View style={styles.marketplaceGrid}>
                {isLoading ? (
                  <>
                    <ContentCardSkeleton />
                    <ContentCardSkeleton />
                    <ContentCardSkeleton />
                    <ContentCardSkeleton />
                  </>
                ) : marketplaceContent.length > 0 ? (
                  marketplaceContent.map((item) => (
                    <Card key={item.id} style={styles.contentCard}>
                      <View style={styles.cardThumbnail}>
                        <Text style={styles.thumbnailEmoji}>{item.thumbnail}</Text>
                      </View>
                      <Text style={styles.contentTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.creatorName}>by {item.creator}</Text>
                      <View style={styles.ratingRow}>
                        <View style={styles.ratingStars}>
                          <MaterialCommunityIcons name="star" size={14} color="#FFB800" />
                          <Text style={styles.ratingValue}>{item.rating}</Text>
                        </View>
                        <Text style={styles.downloadCount}>
                          {(item.downloads / 1000).toFixed(1)}K
                        </Text>
                      </View>
                      <View style={styles.cardFooter}>
                        <Text style={styles.price}>${item.price}</Text>
                        <TouchableOpacity style={styles.buyBtn}>
                          <MaterialCommunityIcons
                            name="shopping-outline"
                            size={16}
                            color="#FFF"
                          />
                          <Text style={styles.buyBtnText}>Buy</Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ))
                ) : (
                  <EmptyState
                    icon="inbox-multiple"
                    title="No content found"
                    subtitle="Try a different category"
                  />
                )}
              </View>
            </>
          )}

          {/* MY UPLOADS TAB */}
          {activeTab === "uploads" && (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>My Uploaded Content</Text>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => setShowUploadModal(true)}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                  <Text style={styles.uploadBtnText}>Upload</Text>
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <>
                  <UploadCardSkeleton />
                  <UploadCardSkeleton />
                  <UploadCardSkeleton />
                </>
              ) : uploads.length > 0 ? (
                uploads.map((item) => (
                  <Card key={item.id} style={styles.uploadCard}>
                    <View style={styles.uploadHeader}>
                      <View style={styles.uploadInfo}>
                        <Text style={styles.uploadThumbnail}>{item.thumbnail}</Text>
                        <View style={styles.uploadDetails}>
                          <Text style={styles.uploadTitle}>{item.title}</Text>
                          <Text style={styles.uploadMeta}>
                            {item.downloads} downloads • Uploaded {item.uploadDate}
                          </Text>
                        </View>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color={Colors.textSecondary}
                      />
                    </View>

                    <View style={styles.uploadStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Views</Text>
                        <Text style={styles.statValue}>
                          {item.views.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Rating</Text>
                        <Text style={styles.statValue}>{item.rating} ★</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Earnings</Text>
                        <Text style={styles.statValue}>
                          ${item.earnings.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.uploadActions}>
                      <TouchableOpacity style={styles.actionBtn}>
                        <Text style={styles.actionBtnText}>📊 View Analytics</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn}>
                        <Text style={styles.actionBtnText}>✏️ Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon="cloud-upload-outline"
                  title="No uploads yet"
                  subtitle="Share your content and start earning"
                  actionLabel="Upload Content"
                  onAction={() => setShowUploadModal(true)}
                />
              )}
            </>
          )}

          {/* SALES TAB */}
          {activeTab === "sales" && (
            <>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Earnings</Text>
                    <Text style={styles.summaryValue}>$32,063.10</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Downloads</Text>
                    <Text style={styles.summaryValue}>5,550</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Avg Rating</Text>
                    <Text style={styles.summaryValue}>4.7 ★</Text>
                  </View>
                </View>
              </Card>

              <Card style={styles.chartCard}>
                <Text style={styles.chartTitle}>💰 Earnings by Month</Text>
                <View style={styles.mockChart}>
                  {[
                    { month: "Dec", earnings: 4200, bar: 40 },
                    { month: "Jan", earnings: 5800, bar: 55 }
                  ].map((item, idx) => (
                    <View key={idx} style={styles.monthRow}>
                      <Text style={styles.monthLabel}>{item.month}</Text>
                      <View style={[styles.monthBar, { width: `${item.bar}%` }]} />
                      <Text style={styles.monthValue}>${item.earnings}</Text>
                    </View>
                  ))}
                </View>
              </Card>

              <Text style={styles.sectionTitle}>Recent Sales</Text>
              {[
                {
                  id: 1,
                  title: "Complete Hydroponic Setup Guide",
                  buyer: "GrowEnthusiast_22",
                  amount: 9.99,
                  date: "2024-01-10"
                },
                {
                  id: 2,
                  title: "LED Grow Light Comparison 2024",
                  buyer: "IndoorFarmer",
                  amount: 4.99,
                  date: "2024-01-09"
                }
              ].map((sale) => (
                <Card key={sale.id} style={styles.saleRow}>
                  <View style={styles.saleContent}>
                    <Text style={styles.saleTitle}>{sale.title}</Text>
                    <Text style={styles.saleDate}>
                      Sold to {sale.buyer} on {sale.date}
                    </Text>
                  </View>
                  <Text style={styles.saleAmount}>${sale.amount.toFixed(2)}</Text>
                </Card>
              ))}
            </>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <>
              <Card style={styles.analyticsCard}>
                <Text style={styles.analyticsTitle}>📊 Content Performance</Text>
                {uploads.map((item) => (
                  <View key={item.id} style={styles.analyticsRow}>
                    <View style={styles.analyticsInfo}>
                      <Text style={styles.analyticsName}>{item.title}</Text>
                      <Text style={styles.analyticsMeta}>
                        ${item.price} • {item.downloads} downloads
                      </Text>
                    </View>
                    <View style={styles.analyticsMetrics}>
                      <View style={styles.metricBadge}>
                        <Text style={styles.metricValue}>{item.views}</Text>
                        <Text style={styles.metricLabel}>views</Text>
                      </View>
                      <View style={styles.metricBadge}>
                        <Text style={styles.metricValue}>
                          ${item.earnings.toLocaleString()}
                        </Text>
                        <Text style={styles.metricLabel}>earned</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}

          <View style={styles.spacer} />
        </ScrollView>

        {/* Upload Modal */}
        <Modal visible={showUploadModal} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <MaterialCommunityIcons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Upload Content</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput style={styles.modalInput} placeholder="Content title" />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 100 }]}
                placeholder="Describe your content"
                multiline
              />

              <Text style={styles.inputLabel}>Price</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="$0.00"
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryOptions}>
                {["Guide", "Photos", "Template", "Bundle"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.categoryOption}
                    onPress={() => Alert.alert("Selected", cat)}
                  >
                    <Text style={styles.categoryOptionText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.selectFilesBtn}>
                <MaterialCommunityIcons name="folder-upload" size={24} color="#FFF" />
                <Text style={styles.selectFilesText}>Select Files</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.publishBtn}
                onPress={() => {
                  setShowUploadModal(false);
                  Alert.alert("Success", "Content uploaded successfully!");
                }}
              >
                <Text style={styles.publishBtnText}>Publish Content</Text>
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
    paddingHorizontal: Spacing.sm
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: Typography.size.body
  },
  categoriesContainer: {
    marginBottom: Spacing.md
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm
  },
  categoryChipActive: {
    backgroundColor: Colors.primary
  },
  categoryLabel: {
    marginLeft: Spacing.xs,
    fontSize: Typography.size.caption,
    color: Colors.text
  },
  categoryLabelActive: {
    color: "#FFF"
  },
  marketplaceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  contentCard: {
    width: "48%",
    marginBottom: Spacing.md,
    padding: Spacing.md
  },
  cardThumbnail: {
    height: 100,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm
  },
  thumbnailEmoji: {
    fontSize: 40
  },
  contentTitle: {
    fontSize: Typography.size.caption,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.xs
  },
  creatorName: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm
  },
  ratingStars: {
    flexDirection: "row",
    alignItems: "center"
  },
  ratingValue: {
    fontSize: Typography.size.caption,
    fontWeight: "bold",
    color: Colors.text,
    marginLeft: Spacing.xs
  },
  downloadCount: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopColor: "#f0f0f0",
    borderTopWidth: 1,
    paddingTop: Spacing.sm
  },
  price: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.primary
  },
  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6
  },
  buyBtnText: {
    color: "#FFF",
    fontSize: Typography.size.caption,
    fontWeight: "600",
    marginLeft: Spacing.xs
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md
  },
  sectionTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8
  },
  uploadBtnText: {
    color: "#FFF",
    fontWeight: "600",
    marginLeft: Spacing.xs
  },
  uploadCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md
  },
  uploadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md
  },
  uploadInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  uploadThumbnail: {
    fontSize: 32,
    marginRight: Spacing.md
  },
  uploadDetails: {
    flex: 1
  },
  uploadTitle: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text
  },
  uploadMeta: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  uploadStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md
  },
  statItem: {
    alignItems: "center"
  },
  statLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  statValue: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: Spacing.xs
  },
  uploadActions: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    marginHorizontal: Spacing.xs,
    alignItems: "center"
  },
  actionBtnText: {
    color: Colors.primary,
    fontSize: Typography.size.caption,
    fontWeight: "600"
  },
  summaryCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  summaryItem: {
    alignItems: "center"
  },
  summaryLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  summaryValue: {
    fontSize: Typography.size.h3,
    fontWeight: "bold",
    color: Colors.primary,
    marginTop: Spacing.sm
  },
  chartCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.md
  },
  chartTitle: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md
  },
  mockChart: {
    paddingVertical: Spacing.md
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md
  },
  monthLabel: {
    width: 40,
    fontSize: Typography.size.caption,
    fontWeight: "bold"
  },
  monthBar: {
    flex: 1,
    height: 30,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    marginHorizontal: Spacing.sm
  },
  monthValue: {
    width: 70,
    textAlign: "right",
    fontWeight: "bold",
    color: Colors.text
  },
  saleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    padding: Spacing.md
  },
  saleContent: {
    flex: 1
  },
  saleTitle: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text
  },
  saleDate: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  saleAmount: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.primary
  },
  analyticsCard: {
    padding: Spacing.md
  },
  analyticsTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md
  },
  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  analyticsInfo: {
    flex: 1
  },
  analyticsName: {
    fontSize: Typography.size.caption,
    fontWeight: "600",
    color: Colors.text
  },
  analyticsMeta: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  analyticsMetrics: {
    flexDirection: "row",
    gap: Spacing.sm
  },
  metricBadge: {
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: "#f0f0f0",
    borderRadius: 6
  },
  metricValue: {
    fontSize: Typography.size.caption,
    fontWeight: "bold",
    color: Colors.primary
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.textSecondary
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
  categoryOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md
  },
  categoryOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8
  },
  categoryOptionText: {
    color: Colors.primary,
    fontWeight: "600"
  },
  selectFilesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: 8,
    marginVertical: Spacing.md
  },
  selectFilesText: {
    color: "#FFF",
    fontSize: Typography.size.body,
    fontWeight: "bold",
    marginLeft: Spacing.sm
  },
  publishBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: Spacing.lg
  },
  publishBtnText: {
    color: "#FFF",
    fontSize: Typography.size.body,
    fontWeight: "bold"
  },
  spacer: {
    height: Spacing.lg * 2
  }
});

export default ContentMarketplaceScreen;
