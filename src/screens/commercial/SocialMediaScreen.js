import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Card from "../../components/Card.js";
import { Colors, Typography, Spacing } from "../../theme/theme.js";
import {
  getSocialAccounts,
  connectSocialAccount,
  disconnectSocialAccount,
  syncSocialData
} from "../../api/socialMedia.js";
import SkeletonLoader from "../../components/SkeletonLoader.js";
import EmptyState from "../../components/EmptyState.js";
import ErrorState from "../../components/ErrorState.js";
import ErrorBoundary from "../../components/ErrorBoundary.js";

/**
 * Social Media Integration Screen
 * Connect and manage social media platforms for influencer marketing
 * Supports: Instagram, TikTok, Twitter, YouTube
 */

const SocialMediaScreen = ({ navigation }) => {
  const [platforms, setPlatforms] = useState([
    {
      id: "instagram",
      name: "Instagram",
      icon: "instagram",
      color: "#E4405F",
      connected: false,
      apiKey: "",
      accessToken: "",
      username: "",
      followers: 0,
      engagementRate: 0
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: "tiktok",
      color: "#000000",
      connected: false,
      apiKey: "",
      accessToken: "",
      username: "",
      followers: 0,
      engagementRate: 0
    },
    {
      id: "twitter",
      name: "Twitter/X",
      icon: "twitter",
      color: "#1DA1F2",
      connected: false,
      apiKey: "",
      accessToken: "",
      username: "",
      followers: 0,
      engagementRate: 0
    },
    {
      id: "youtube",
      name: "YouTube",
      icon: "youtube",
      color: "#FF0000",
      connected: false,
      apiKey: "",
      accessToken: "",
      username: "",
      followers: 0,
      engagementRate: 0
    }
  ]);

  const [expandedPlatform, setExpandedPlatform] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load social accounts on mount
  useEffect(() => {
    loadSocialAccounts();
  }, []);

  const loadSocialAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accountsData = await getSocialAccounts();
      if (accountsData?.data) {
        const updatedPlatforms = platforms.map((platform) => {
          const connectedAccount = accountsData.data.find(
            (acc) => acc.platform === platform.id
          );
          return connectedAccount
            ? { ...platform, ...connectedAccount, connected: true }
            : platform;
        });
        setPlatforms(updatedPlatforms);
      }
    } catch (err) {
      console.error("Failed to load social accounts:", err);
      setError(err.message || "Failed to load social accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (platformId) => {
    const platform = platforms.find((p) => p.id === platformId);
    Alert.prompt(`Connect ${platform.name}`, "Enter your API Key:", [
      { text: "Cancel", onPress: () => {}, style: "cancel" },
      {
        text: "Connect",
        onPress: async (apiKey) => {
          if (!apiKey) {
            Alert.alert("Error", "API Key is required");
            return;
          }
          try {
            setIsLoading(true);
            const result = await connectSocialAccount(platformId, "", apiKey);
            if (result?.data) {
              setPlatforms(
                platforms.map((p) =>
                  p.id === platformId ? { ...p, connected: true, ...result.data } : p
                )
              );
              Alert.alert("Success", `${platform.name} connected successfully`);
            }
          } catch (error) {
            Alert.alert("Error", `Failed to connect ${platform.name}: ${error.message}`);
          } finally {
            setIsLoading(false);
          }
        }
      }
    ]);
  };

  const handleDisconnect = async (platformId) => {
    const platform = platforms.find((p) => p.id === platformId);
    Alert.alert("Disconnect", `Remove ${platform.name} connection?`, [
      { text: "Cancel", onPress: () => {}, style: "cancel" },
      {
        text: "Disconnect",
        onPress: async () => {
          try {
            setIsLoading(true);
            await disconnectSocialAccount(platformId);
            setPlatforms(
              platforms.map((p) =>
                p.id === platformId
                  ? {
                      ...p,
                      connected: false,
                      username: "",
                      followers: 0,
                      engagementRate: 0
                    }
                  : p
              )
            );
            Alert.alert("Success", `${platform.name} disconnected`);
          } catch (error) {
            Alert.alert("Error", `Failed to disconnect: ${error.message}`);
          } finally {
            setIsLoading(false);
          }
        }
      }
    ]);
  };

  const updatePlatform = (platformId, field, value) => {
    setPlatforms(
      platforms.map((p) => (p.id === platformId ? { ...p, [field]: value } : p))
    );
  };

  return (
    <ErrorBoundary>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="share-variant" size={40} color={Colors.primary} />
          <Text style={styles.title}>Social Media Integration</Text>
          <Text style={styles.subtitle}>
            Connect your social platforms to track reach and engagement
          </Text>
        </View>

        {/* Error State */}
        {error && (
          <ErrorState
            title="Failed to load accounts"
            message={error}
            icon="alert-circle"
            onRetry={loadSocialAccounts}
            retryLabel="Try Again"
          />
        )}

        {/* Connection Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {platforms.filter((p) => p.connected).length}/{platforms.length}
              </Text>
              <Text style={styles.summaryLabel}>Platforms Connected</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {platforms.reduce((sum, p) => sum + p.followers, 0).toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Total Followers</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {(
                  platforms.reduce((sum, p) => sum + p.engagementRate, 0) /
                    platforms.filter((p) => p.connected).length || 0
                ).toFixed(1)}
                %
              </Text>
              <Text style={styles.summaryLabel}>Avg Engagement</Text>
            </View>
          </View>
        </Card>

        {/* Platforms List */}
        <View style={styles.platformsContainer}>
          {platforms.map((platform) => (
            <View key={platform.id}>
              <TouchableOpacity
                style={[
                  styles.platformCard,
                  { borderLeftColor: platform.color, borderLeftWidth: 4 }
                ]}
                onPress={() =>
                  setExpandedPlatform(
                    expandedPlatform === platform.id ? null : platform.id
                  )
                }
              >
                <View style={styles.platformHeader}>
                  <View style={styles.platformInfo}>
                    <MaterialCommunityIcons
                      name={platform.icon}
                      size={28}
                      color={platform.color}
                    />
                    <View style={styles.platformDetails}>
                      <Text style={styles.platformName}>{platform.name}</Text>
                      {platform.connected ? (
                        <Text style={styles.statusConnected}>
                          ✓ Connected • @{platform.username || "username"}
                        </Text>
                      ) : (
                        <Text style={styles.statusDisconnected}>Not connected</Text>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name={
                      expandedPlatform === platform.id ? "chevron-up" : "chevron-down"
                    }
                    size={24}
                    color={Colors.textSecondary}
                  />
                </View>

                {expandedPlatform === platform.id && (
                  <View style={styles.platformExpanded}>
                    {platform.connected ? (
                      <>
                        <View style={styles.statsGrid}>
                          <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                              {platform.followers.toLocaleString()}
                            </Text>
                            <Text style={styles.statLabel}>Followers</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                              {platform.engagementRate}%
                            </Text>
                            <Text style={styles.statLabel}>Engagement</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[styles.btn, styles.btnSecondary]}
                          onPress={() => handleDisconnect(platform.id)}
                        >
                          <MaterialCommunityIcons
                            name="unlink"
                            size={18}
                            color={Colors.primary}
                          />
                          <Text style={styles.btnTextSecondary}>Disconnect Account</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btn, styles.btnPrimary]}
                          onPress={() =>
                            Alert.alert("Syncing...", `Refreshing ${platform.name} data`)
                          }
                        >
                          <MaterialCommunityIcons name="refresh" size={18} color="#FFF" />
                          <Text style={styles.btnTextPrimary}>Sync Data</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.expandedLabel}>API Configuration</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="API Key"
                          value={platform.apiKey}
                          onChangeText={(val) =>
                            updatePlatform(platform.id, "apiKey", val)
                          }
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Access Token"
                          value={platform.accessToken}
                          onChangeText={(val) =>
                            updatePlatform(platform.id, "accessToken", val)
                          }
                          secureTextEntry
                        />
                        <TouchableOpacity
                          style={[styles.btn, styles.btnPrimary]}
                          onPress={() => handleConnect(platform.id)}
                        >
                          <MaterialCommunityIcons name="link" size={18} color="#FFF" />
                          <Text style={styles.btnTextPrimary}>Connect with OAuth</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Auto-posting Section */}
        <Card style={styles.autoPostCard}>
          <View style={styles.autoPostHeader}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.autoPostTitle}>Auto-Posting</Text>
          </View>
          <Text style={styles.autoPostDescription}>
            Schedule posts across all connected platforms
          </Text>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} disabled>
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            <Text style={styles.btnTextPrimary}>Create Post Schedule</Text>
          </TouchableOpacity>
        </Card>

        {/* Analytics Section */}
        <Card style={styles.analyticsCard}>
          <View style={styles.analyticsHeader}>
            <MaterialCommunityIcons name="chart-line" size={24} color={Colors.primary} />
            <Text style={styles.analyticsTitle}>Social Analytics</Text>
          </View>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} disabled>
            <MaterialCommunityIcons
              name="database-search"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.btnTextSecondary}>View Detailed Analytics</Text>
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
  summaryCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    padding: Spacing.md
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  summaryItem: {
    alignItems: "center"
  },
  summaryValue: {
    fontSize: Typography.size.h2,
    fontWeight: "bold",
    color: Colors.primary
  },
  summaryLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  platformsContainer: {
    paddingHorizontal: Spacing.md
  },
  platformCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  platformHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md
  },
  platformInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  platformDetails: {
    marginLeft: Spacing.md,
    flex: 1
  },
  platformName: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text
  },
  statusConnected: {
    fontSize: Typography.size.caption,
    color: "#10b981",
    marginTop: Spacing.xs
  },
  statusDisconnected: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  platformExpanded: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0"
  },
  expandedLabel: {
    fontSize: Typography.size.caption,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.size.body,
    marginBottom: Spacing.sm
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: "#f9fafb",
    borderRadius: 8
  },
  statItem: {
    alignItems: "center"
  },
  statValue: {
    fontSize: Typography.size.h3,
    fontWeight: "bold",
    color: Colors.primary
  },
  statLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm
  },
  btnPrimary: {
    backgroundColor: Colors.primary
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: "transparent"
  },
  btnTextPrimary: {
    color: "#FFF",
    fontWeight: "600",
    marginLeft: Spacing.xs
  },
  btnTextSecondary: {
    color: Colors.primary,
    fontWeight: "600",
    marginLeft: Spacing.xs
  },
  autoPostCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    padding: Spacing.md
  },
  autoPostHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm
  },
  autoPostTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text,
    marginLeft: Spacing.sm
  },
  autoPostDescription: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md
  },
  analyticsCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    padding: Spacing.md
  },
  analyticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm
  },
  analyticsTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text,
    marginLeft: Spacing.sm
  },
  spacer: {
    height: Spacing.lg * 2
  }
});

export default SocialMediaScreen;
