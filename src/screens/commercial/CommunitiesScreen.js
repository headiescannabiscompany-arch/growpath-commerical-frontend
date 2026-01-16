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
import { browseGuilds, getMyGuilds, createGuild } from "../../api/community.js";
import SkeletonLoader, { GuildCardSkeleton } from "../../components/SkeletonLoader.js";
import EmptyState from "../../components/EmptyState.js";
import ErrorState from "../../components/ErrorState.js";
import ErrorBoundary from "../../components/ErrorBoundary.js";

/**
 * Communities Screen
 * Browse, join, and manage user communities and guilds
 */

const CommunitiesScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("browse"); // browse, joined, messages, create
  const [showCreateGuildModal, setShowCreateGuildModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [guildName, setGuildName] = useState("");
  const [guildDescription, setGuildDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [joinedGuilds, setJoinedGuilds] = useState([]);
  const [availableGuilds, setAvailableGuilds] = useState([]);

  // Load communities on mount
  useEffect(() => {
    loadCommunitiesData();
  }, []);

  const loadCommunitiesData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [myGuilds, browse] = await Promise.all([getMyGuilds(), browseGuilds()]);
      setJoinedGuilds(myGuilds?.data || []);
      setAvailableGuilds(browse?.data || []);
    } catch (err) {
      console.error("Failed to load communities:", err);
      setError(err.message || "Failed to load communities");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGuild = async () => {
    if (!guildName.trim()) {
      Alert.alert("Error", "Guild name is required");
      return;
    }
    try {
      setIsLoading(true);
      const result = await createGuild(guildName, guildDescription, [], true);
      if (result?.data) {
        setJoinedGuilds([...joinedGuilds, result.data]);
        setGuildName("");
        setGuildDescription("");
        setShowCreateGuildModal(false);
        Alert.alert("Success", "Guild created successfully");
      }
    } catch (error) {
      Alert.alert("Error", `Failed to create guild: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const [discussions] = useState([
    {
      id: 1,
      title: "Best practices for seedling stage",
      guild: "Indoor Cultivators",
      author: "GrowMaster_Pro",
      replies: 24,
      views: 892,
      lastReply: "2 hours ago"
    },
    {
      id: 2,
      title: "LED spectrum for flowering - 660nm vs full spectrum?",
      guild: "LED Tech Enthusiasts",
      author: "LEDExplorer",
      replies: 15,
      views: 456,
      lastReply: "4 hours ago"
    },
    {
      id: 3,
      title: "Organic pest management strategies",
      guild: "Organic Growers Network",
      author: "OrganicFarmer",
      replies: 31,
      views: 1240,
      lastReply: "1 hour ago"
    }
  ]);

  // Note: handled by async handleCreateGuild above

  const handleJoinGuild = (guildId, guildName) => {
    Alert.alert("Joined!", `You've joined ${guildName}`);
  };

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "browse" && styles.tabBtnActive]}
            onPress={() => setActiveTab("browse")}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={activeTab === "browse" ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[styles.tabLabel, activeTab === "browse" && styles.tabLabelActive]}
            >
              Browse
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "joined" && styles.tabBtnActive]}
            onPress={() => setActiveTab("joined")}
          >
            <MaterialCommunityIcons
              name="account-multiple"
              size={20}
              color={activeTab === "joined" ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[styles.tabLabel, activeTab === "joined" && styles.tabLabelActive]}
            >
              My Guilds ({joinedGuilds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "messages" && styles.tabBtnActive]}
            onPress={() => setActiveTab("messages")}
          >
            <MaterialCommunityIcons
              name="chat-multiple"
              size={20}
              color={activeTab === "messages" ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[styles.tabLabel, activeTab === "messages" && styles.tabLabelActive]}
            >
              Discussions
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Error State */}
          {error && (
            <ErrorState
              title="Failed to load communities"
              message={error}
              icon="alert-circle"
              onRetry={loadCommunitiesData}
              retryLabel="Try Again"
            />
          )}

          {/* BROWSE TAB */}
          {activeTab === "browse" && (
            <>
              <View style={styles.browseHeader}>
                <Text style={styles.pageTitle}>Discover Communities</Text>
                <Text style={styles.pageSubtitle}>
                  Join guilds to connect with fellow growers
                </Text>
              </View>

              {/* Search */}
              <View style={styles.searchContainer}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color={Colors.textSecondary}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search communities..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Featured Badge */}
              <View style={styles.featuredSection}>
                <Text style={styles.featuredLabel}>✨ Featured Communities</Text>
                {browseGuilds
                  .filter((g) => g.featured)
                  .map((guild) => (
                    <Card
                      key={guild.id}
                      style={[styles.guildCard, { backgroundColor: guild.color }]}
                    >
                      <View style={styles.guildHeader}>
                        <View style={styles.guildIcon}>
                          <Text style={styles.iconEmoji}>{guild.icon}</Text>
                        </View>
                        <View style={styles.guildInfo}>
                          <Text style={styles.guildName}>{guild.name}</Text>
                          <Text style={styles.guildMembers}>
                            👥 {guild.members.toLocaleString()} members
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.joinBtn}
                          onPress={() => handleJoinGuild(guild.id, guild.name)}
                        >
                          <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                          <Text style={styles.joinBtnText}>Join</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.guildDescription}>{guild.description}</Text>
                    </Card>
                  ))}
              </View>

              {/* All Communities */}
              <View style={styles.allSection}>
                <Text style={styles.sectionTitle}>All Communities</Text>
                {availableGuilds.map((guild) => (
                  <Card key={guild.id} style={styles.communityRow}>
                    <View style={styles.communityHeader}>
                      <Text style={styles.communityIcon}>{guild.icon}</Text>
                      <View style={styles.communityInfo}>
                        <Text style={styles.communityName}>{guild.name}</Text>
                        <Text style={styles.communityMeta}>
                          {guild.members?.toLocaleString() || 0} members •{" "}
                          {guild.description}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.joinBtnSmall}
                        onPress={() => handleJoinGuild(guild.id, guild.name)}
                      >
                        <Text style={styles.joinBtnSmallText}>Join</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            </>
          )}

          {/* MY GUILDS TAB */}
          {activeTab === "joined" && (
            <>
              <View style={styles.browseHeader}>
                <Text style={styles.pageTitle}>My Communities</Text>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => setShowCreateGuildModal(true)}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                  <Text style={styles.createBtnText}>Create Guild</Text>
                </TouchableOpacity>
              </View>

              {joinedGuilds.map((guild) => (
                <Card
                  key={guild.id}
                  style={[styles.myGuildCard, { backgroundColor: guild.color }]}
                >
                  <View style={styles.myGuildHeader}>
                    <View style={styles.myGuildInfo}>
                      <Text style={styles.myGuildIcon}>{guild.icon}</Text>
                      <View style={styles.myGuildDetails}>
                        <View style={styles.myGuildTitle}>
                          <Text style={styles.myGuildName}>{guild.name}</Text>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{guild.role}</Text>
                          </View>
                        </View>
                        <Text style={styles.myGuildMeta}>
                          {guild.members.toLocaleString()} members
                        </Text>
                      </View>
                    </View>
                    {guild.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{guild.unread}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.myGuildDescription}>{guild.description}</Text>

                  <View style={styles.guildActions}>
                    <TouchableOpacity style={styles.actionBtn}>
                      <MaterialCommunityIcons
                        name="chat-outline"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.actionBtnText}>Messages</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                      <MaterialCommunityIcons
                        name="account-group"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.actionBtnText}>Members</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                      <MaterialCommunityIcons
                        name="information-outline"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.actionBtnText}>About</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </>
          )}

          {/* DISCUSSIONS TAB */}
          {activeTab === "messages" && (
            <>
              <View style={styles.browseHeader}>
                <Text style={styles.pageTitle}>Recent Discussions</Text>
                <Text style={styles.pageSubtitle}>
                  Browse conversations across all communities
                </Text>
              </View>

              {discussions.map((discussion) => (
                <TouchableOpacity key={discussion.id} activeOpacity={0.7}>
                  <Card style={styles.discussionCard}>
                    <View style={styles.discussionHeader}>
                      <View style={styles.discussionMeta}>
                        <Text style={styles.discussionGuild}>{discussion.guild}</Text>
                        <Text style={styles.discussionAuthor}>
                          by {discussion.author}
                        </Text>
                      </View>
                      <View style={styles.discussionStats}>
                        <View style={styles.stat}>
                          <MaterialCommunityIcons
                            name="comment-multiple-outline"
                            size={16}
                            color={Colors.primary}
                          />
                          <Text style={styles.statText}>{discussion.replies}</Text>
                        </View>
                        <View style={styles.stat}>
                          <MaterialCommunityIcons
                            name="eye-outline"
                            size={16}
                            color={Colors.textSecondary}
                          />
                          <Text style={styles.statText}>{discussion.views}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.discussionTitle}>{discussion.title}</Text>

                    <View style={styles.discussionFooter}>
                      <Text style={styles.discussionTime}>
                        Last reply {discussion.lastReply}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={Colors.textSecondary}
                      />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}

              {/* Start Discussion CTA */}
              <Card style={styles.ctaCard}>
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={24}
                  color={Colors.primary}
                />
                <Text style={styles.ctaTitle}>Start a Discussion</Text>
                <Text style={styles.ctaText}>
                  Share your question or topic with the community
                </Text>
                <TouchableOpacity style={styles.ctaBtn}>
                  <Text style={styles.ctaBtnText}>New Discussion</Text>
                </TouchableOpacity>
              </Card>
            </>
          )}

          <View style={styles.spacer} />
        </ScrollView>

        {/* Create Guild Modal */}
        <Modal visible={showCreateGuildModal} animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateGuildModal(false)}>
                <MaterialCommunityIcons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Community</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Community Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Hydroponics Masters"
                value={guildName}
                onChangeText={setGuildName}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 100 }]}
                placeholder="What's your community about?"
                value={guildDescription}
                onChangeText={setGuildDescription}
                multiline
              />

              <Text style={styles.inputLabel}>Topics</Text>
              <View style={styles.topicOptions}>
                {[
                  "Growing Techniques",
                  "Equipment",
                  "Nutrients",
                  "Genetics",
                  "Business",
                  "Compliance"
                ].map((topic) => (
                  <TouchableOpacity key={topic} style={styles.topicChip}>
                    <Text style={styles.topicText}>{topic}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Privacy</Text>
              <TouchableOpacity style={styles.privacyOption}>
                <MaterialCommunityIcons
                  name="radiobox-marked"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.privacyLabel}>Public - Anyone can join</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.privacyOption}>
                <MaterialCommunityIcons
                  name="radiobox-blank"
                  size={20}
                  color={Colors.textSecondary}
                />
                <Text style={styles.privacyLabel}>Private - Invite only</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.createGuildBtn} onPress={handleCreateGuild}>
                <Text style={styles.createGuildBtnText}>Create Community</Text>
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
  browseHeader: {
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
    color: Colors.textSecondary
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: Typography.size.body
  },
  featuredSection: {
    marginBottom: Spacing.lg
  },
  featuredLabel: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md
  },
  guildCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12
  },
  guildHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md
  },
  guildIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md
  },
  iconEmoji: {
    fontSize: 28
  },
  guildInfo: {
    flex: 1
  },
  guildName: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text
  },
  guildMembers: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 6
  },
  joinBtnText: {
    color: "#FFF",
    fontWeight: "600",
    marginLeft: Spacing.xs
  },
  guildDescription: {
    fontSize: Typography.size.caption,
    color: Colors.text,
    lineHeight: 20
  },
  allSection: {
    marginBottom: Spacing.lg
  },
  sectionTitle: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.md
  },
  communityRow: {
    marginBottom: Spacing.md,
    padding: Spacing.md
  },
  communityHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  communityIcon: {
    fontSize: 32,
    marginRight: Spacing.md
  },
  communityInfo: {
    flex: 1
  },
  communityName: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text
  },
  communityMeta: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  joinBtnSmall: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary
  },
  joinBtnSmallText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: Typography.size.caption
  },
  myGuildCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12
  },
  myGuildHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md
  },
  myGuildInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start"
  },
  myGuildIcon: {
    fontSize: 40,
    marginRight: Spacing.md
  },
  myGuildDetails: {
    flex: 1
  },
  myGuildTitle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs
  },
  myGuildName: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text
  },
  roleBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: Spacing.sm
  },
  roleBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold"
  },
  myGuildMeta: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  unreadBadge: {
    backgroundColor: "#FF6B6B",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center"
  },
  unreadCount: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: Typography.size.caption
  },
  myGuildDescription: {
    fontSize: Typography.size.caption,
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 20
  },
  guildActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopColor: "#rgba(0,0,0,0.1)",
    borderTopWidth: 1,
    paddingTop: Spacing.md
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm
  },
  actionBtnText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: Typography.size.caption,
    marginLeft: Spacing.xs
  },
  discussionCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md
  },
  discussionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm
  },
  discussionMeta: {
    flex: 1
  },
  discussionGuild: {
    fontSize: Typography.size.caption,
    fontWeight: "bold",
    color: Colors.primary
  },
  discussionAuthor: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  discussionStats: {
    flexDirection: "row",
    gap: Spacing.md
  },
  stat: {
    flexDirection: "row",
    alignItems: "center"
  },
  statText: {
    fontSize: Typography.size.caption,
    color: Colors.text,
    fontWeight: "600",
    marginLeft: Spacing.xs
  },
  discussionTitle: {
    fontSize: Typography.size.body,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.sm
  },
  discussionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopColor: "#f0f0f0",
    borderTopWidth: 1,
    paddingTop: Spacing.sm
  },
  discussionTime: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  ctaCard: {
    padding: Spacing.lg,
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    marginTop: Spacing.lg
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
  topicOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md
  },
  topicChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20
  },
  topicText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: Typography.size.caption
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: Spacing.sm
  },
  privacyLabel: {
    marginLeft: Spacing.md,
    fontSize: Typography.size.body,
    color: Colors.text
  },
  createGuildBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg
  },
  createGuildBtnText: {
    color: "#FFF",
    fontSize: Typography.size.body,
    fontWeight: "bold"
  },
  spacer: {
    height: Spacing.lg * 2
  }
});

export default CommunitiesScreen;
