import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import ErrorBoundary from "../../components/ErrorBoundary.js";
import ErrorState from "../../components/ErrorState.js";
import SkeletonLoader from "../../components/SkeletonLoader.js";
import Card from "../../components/Card.js";
import {
  connectSocialAccount,
  disconnectSocialAccount,
  getSocialAccounts,
  schedulePost,
  syncSocialData
} from "../../api/socialMedia.js";
import { Colors, Spacing, Typography, radius } from "../../theme/theme.js";

const CHANNELS = [
  { id: "instagram", name: "Instagram", icon: "instagram", color: "#E4405F" },
  { id: "tiktok", name: "TikTok", icon: "music-note", color: "#111827" },
  { id: "twitter", name: "Twitter/X", icon: "twitter", color: "#1DA1F2" },
  { id: "youtube", name: "YouTube", icon: "youtube", color: "#FF0000" }
];

function mergeAccounts(accounts) {
  return CHANNELS.map((channel) => {
    const connected = accounts.find((account) => account.platform === channel.id);
    return {
      ...channel,
      connected: Boolean(connected),
      apiKey: connected?.apiKey || "",
      accessToken: connected?.accessToken || "",
      username: connected?.username || "",
      followers: Number(connected?.followers || 0),
      engagementRate: Number(connected?.engagementRate || 0),
      autoPost: Boolean(connected?.autoPost)
    };
  });
}

export default function SocialMediaScreen() {
  const [channels, setChannels] = useState(() => mergeAccounts([]));
  const [expandedChannel, setExpandedChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadAccounts() {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await getSocialAccounts();
      const accounts = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : payload?.accounts || [];
      setChannels(mergeAccounts(accounts));
    } catch (err) {
      setError(err.message || "Failed to load external channel accounts");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function updateChannel(channelId, field, value) {
    setChannels((current) =>
      current.map((channel) =>
        channel.id === channelId ? { ...channel, [field]: value } : channel
      )
    );
  }

  async function handleConnect(channelId) {
    const channel = channels.find((item) => item.id === channelId);
    if (!channel?.apiKey) {
      Alert.alert("API key required", "Enter an API key before connecting.");
      return;
    }

    try {
      setIsLoading(true);
      await connectSocialAccount(channelId, channel.accessToken || "", channel.apiKey);
      await loadAccounts();
      Alert.alert("Connected", `${channel.name} is connected as an external channel.`);
    } catch (err) {
      Alert.alert("Connection failed", err.message || `Failed to connect ${channel.name}.`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisconnect(channelId) {
    const channel = channels.find((item) => item.id === channelId);
    try {
      setIsLoading(true);
      await disconnectSocialAccount(channelId);
      await loadAccounts();
      Alert.alert("Disconnected", `${channel?.name || "Channel"} was disconnected.`);
    } catch (err) {
      Alert.alert("Disconnect failed", err.message || "Failed to disconnect channel.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateExternalSchedule() {
    const connected = channels.filter((channel) => channel.connected).map((channel) => channel.id);
    if (!connected.length) {
      Alert.alert("No connected channels", "Connect at least one external channel first.");
      return;
    }

    try {
      setIsLoading(true);
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await schedulePost(
        connected,
        "Scheduled external channel post from GrowPath",
        scheduledTime
      );
      Alert.alert("Scheduled", "External channel post schedule was created.");
    } catch (err) {
      Alert.alert("Schedule failed", err.message || "Failed to create external schedule.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefreshAnalytics() {
    const connected = channels.filter((channel) => channel.connected).map((channel) => channel.id);
    if (!connected.length) {
      Alert.alert("No connected channels", "Connect at least one external channel first.");
      return;
    }

    try {
      setIsLoading(true);
      await Promise.all(connected.map((channelId) => syncSocialData(channelId)));
      await loadAccounts();
      Alert.alert("Analytics updated", "Latest external channel analytics have been synced.");
    } catch (err) {
      Alert.alert("Sync failed", err.message || "Failed to refresh channel analytics.");
    } finally {
      setIsLoading(false);
    }
  }

  const connectedCount = channels.filter((channel) => channel.connected).length;
  const totalFollowers = channels.reduce((sum, channel) => sum + channel.followers, 0);
  const avgEngagement =
    channels.reduce((sum, channel) => sum + channel.engagementRate, 0) /
    (connectedCount || 1);

  return (
    <ErrorBoundary>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="share-variant" size={40} color={Colors.primary} />
          <Text style={styles.title}>External Channel Integration</Text>
          <Text style={styles.subtitle}>
            Connect off-platform channels to track reach and engagement. Use Feed /
            Campaigns for in-app ads and outreach, and Forum/Q&A for discussion.
          </Text>
        </View>

        {error ? (
          <ErrorState
            title="Failed to load channels"
            message={error}
            icon="alert-circle"
            onRetry={loadAccounts}
            retryLabel="Try Again"
          />
        ) : null}

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {connectedCount}/{channels.length}
              </Text>
              <Text style={styles.summaryLabel}>Channels Connected</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalFollowers.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Followers</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{avgEngagement.toFixed(1)}%</Text>
              <Text style={styles.summaryLabel}>Avg Engagement</Text>
            </View>
          </View>
        </Card>

        {isLoading ? <SkeletonLoader type="campaign" count={2} /> : null}

        <View style={styles.platformsContainer}>
          {channels.map((channel) => {
            const expanded = expandedChannel === channel.id;
            return (
              <TouchableOpacity
                key={channel.id}
                style={[
                  styles.platformCard,
                  { borderLeftColor: channel.color, borderLeftWidth: 4 }
                ]}
                onPress={() => setExpandedChannel(expanded ? null : channel.id)}
              >
                <View style={styles.platformHeader}>
                  <View style={styles.platformInfo}>
                    <MaterialCommunityIcons
                      name={channel.icon}
                      size={28}
                      color={channel.color}
                    />
                    <View style={styles.platformDetails}>
                      <Text style={styles.platformName}>{channel.name}</Text>
                      {channel.connected ? (
                        <Text style={styles.statusConnected}>
                          Connected - @{channel.username || "username"}
                        </Text>
                      ) : (
                        <Text style={styles.statusDisconnected}>Not connected</Text>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={24}
                    color={Colors.textSecondary}
                  />
                </View>

                {expanded ? (
                  <View style={styles.platformExpanded}>
                    {channel.connected ? (
                      <>
                        <View style={styles.statsGrid}>
                          <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                              {channel.followers.toLocaleString()}
                            </Text>
                            <Text style={styles.statLabel}>Followers</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                              {channel.engagementRate}%
                            </Text>
                            <Text style={styles.statLabel}>Engagement</Text>
                          </View>
                        </View>
                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>Allow external auto-posting</Text>
                          <Switch
                            value={channel.autoPost}
                            onValueChange={(value) =>
                              updateChannel(channel.id, "autoPost", value)
                            }
                            trackColor={{ false: "#E5E7EB", true: Colors.primary }}
                          />
                        </View>
                        <TouchableOpacity
                          style={[styles.btn, styles.btnSecondary]}
                          onPress={() => handleDisconnect(channel.id)}
                        >
                          <Text style={styles.btnTextSecondary}>Disconnect Account</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btn, styles.btnPrimary]}
                          onPress={() => syncSocialData(channel.id)}
                        >
                          <Text style={styles.btnTextPrimary}>Sync Channel Data</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.expandedLabel}>API Configuration</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="API Key"
                          value={channel.apiKey}
                          onChangeText={(value) => updateChannel(channel.id, "apiKey", value)}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Access Token"
                          value={channel.accessToken}
                          onChangeText={(value) =>
                            updateChannel(channel.id, "accessToken", value)
                          }
                          secureTextEntry
                        />
                        <TouchableOpacity
                          style={[styles.btn, styles.btnPrimary]}
                          onPress={() => handleConnect(channel.id)}
                        >
                          <Text style={styles.btnTextPrimary}>Connect Channel</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>External Posting</Text>
          <Text style={styles.actionDescription}>
            Schedule posts across connected external channels. This does not create a
            GrowPath Feed campaign.
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleCreateExternalSchedule}
          >
            <Text style={styles.btnTextPrimary}>Create External Schedule</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>External Channel Analytics</Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={handleRefreshAnalytics}
          >
            <Text style={styles.btnTextSecondary}>Refresh Channel Analytics</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.spacer} />
      </ScrollView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md
  },
  title: {
    color: Colors.text,
    fontSize: Typography.size.h1,
    fontWeight: "bold",
    marginTop: Spacing.sm,
    textAlign: "center"
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.size.body,
    marginTop: Spacing.xs,
    maxWidth: 720,
    textAlign: "center"
  },
  summaryCard: { marginHorizontal: Spacing.md, marginVertical: Spacing.md, padding: Spacing.md },
  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryValue: { color: Colors.primary, fontSize: Typography.size.h2, fontWeight: "bold" },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.size.caption,
    marginTop: Spacing.xs,
    textAlign: "center"
  },
  platformsContainer: { paddingHorizontal: Spacing.md },
  platformCard: {
    backgroundColor: Colors.surface,
    borderRadius: radius.card,
    marginBottom: Spacing.md,
    padding: Spacing.md
  },
  platformHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  platformInfo: { alignItems: "center", flex: 1, flexDirection: "row" },
  platformDetails: { flex: 1, marginLeft: Spacing.sm },
  platformName: { color: Colors.text, fontSize: Typography.size.body, fontWeight: "bold" },
  statusConnected: { color: Colors.success || Colors.primary, fontSize: Typography.size.caption },
  statusDisconnected: { color: Colors.textSecondary, fontSize: Typography.size.caption },
  platformExpanded: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.md
  },
  statsGrid: { flexDirection: "row", justifyContent: "space-around", marginBottom: Spacing.md },
  statItem: { alignItems: "center" },
  statValue: { color: Colors.primary, fontSize: Typography.size.h3, fontWeight: "bold" },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.size.caption },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md
  },
  switchLabel: { color: Colors.text, flex: 1, fontSize: Typography.size.body },
  expandedLabel: {
    color: Colors.text,
    fontSize: Typography.size.body,
    fontWeight: "bold",
    marginBottom: Spacing.sm
  },
  input: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    fontSize: Typography.size.body,
    marginBottom: Spacing.sm,
    padding: Spacing.sm
  },
  actionCard: { marginHorizontal: Spacing.md, marginTop: Spacing.md, padding: Spacing.md },
  actionTitle: { color: Colors.text, fontSize: Typography.size.h3, fontWeight: "bold" },
  actionDescription: {
    color: Colors.textSecondary,
    fontSize: Typography.size.body,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs
  },
  btn: {
    alignItems: "center",
    borderRadius: radius.card,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnSecondary: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1
  },
  btnTextPrimary: { color: "#FFF", fontSize: Typography.size.body, fontWeight: "bold" },
  btnTextSecondary: { color: Colors.primary, fontSize: Typography.size.body, fontWeight: "bold" },
  spacer: { height: Spacing.xl }
});
