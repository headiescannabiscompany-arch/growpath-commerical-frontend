import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  joinGuild,
  leaveGuild,
  listForumPosts,
  listGuilds,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  postId,
  type Guild,
  type SocialNotification,
  type SocialPost
} from "@/api/communitySocial";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { flattenGrowInterests, normalizeInterestList } from "@/utils/growInterests";
import { resolveImageUri } from "@/utils/photoUploads";

function rowId(row: any) {
  return String(row?._id || row?.id || "");
}

function postTitle(post: SocialPost) {
  return String(post.title || post.text || post.content || post.body || "Forum post");
}

function postBody(post: SocialPost) {
  return String(post.body || post.content || post.text || "");
}

function postAuthor(post: SocialPost) {
  const author = post.author || post.user || {};
  return String(
    author.displayName ||
      author.name ||
      author.username ||
      author.email ||
      (post as any).authorName ||
      "GrowPath grower"
  );
}

function authorInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "GP"
  );
}

function postTime(post: SocialPost) {
  const raw = post.createdAt || post.updatedAt;
  if (!raw) return "Recently";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: parsed.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  });
}

function postTags(post: SocialPost) {
  const interests = post.growInterests;
  const interestTags =
    interests && !Array.isArray(interests)
      ? flattenGrowInterests(interests)
      : normalizeInterestList(interests);
  return Array.from(
    new Set([
      ...interestTags,
      ...normalizeInterestList(post.growTags),
      ...normalizeInterestList(post.tags)
    ])
  ).slice(0, 5);
}

function mediaUri(value: any) {
  if (typeof value === "string") return value;
  return String(
    value?.url ||
      value?.uri ||
      value?.src ||
      value?.storageUrl ||
      value?.imageUrl ||
      value?.photoUrl ||
      ""
  );
}

function postPhotos(post: SocialPost) {
  const candidates = [
    post.photos,
    post.photoUrls,
    post.images,
    post.media,
    post.attachments,
    post.imageUrl ? [post.imageUrl] : []
  ].find((value) => Array.isArray(value) && value.length);
  return ((candidates || []) as any[])
    .map(mediaUri)
    .map(resolveImageUri)
    .filter(Boolean)
    .slice(0, 3);
}

export default function CommunityTab() {
  const entitlements = useEntitlements();
  const canView = entitlements.can(CAPABILITY_KEYS.FORUM_VIEW);
  const canPost = entitlements.can(CAPABILITY_KEYS.FORUM_POST);

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!canView) {
        setLoading(false);
        return;
      }
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        const [postResult, guildResult, notificationResult] = await Promise.allSettled([
          listForumPosts(),
          listGuilds(),
          listNotifications()
        ]);
        if (postResult.status === "rejected") throw postResult.reason;
        setPosts(postResult.value);
        setGuilds(guildResult.status === "fulfilled" ? guildResult.value : []);
        setNotifications(
          notificationResult.status === "fulfilled" ? notificationResult.value : []
        );
      } catch (error: any) {
        setFeedback(error?.message || "Unable to load Forum/Q&A data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function toggleGuild(guild: Guild) {
    const id = rowId(guild);
    if (!id) return;
    setSaving(true);
    setFeedback("");
    try {
      if (guild.joined || guild.isMember) {
        await leaveGuild(id);
        setFeedback("Left forum group.");
      } else {
        await joinGuild(id);
        setFeedback("Joined forum group.");
      }
      await load({ refresh: true });
    } catch (error: any) {
      setFeedback(error?.message || "Unable to update membership.");
    } finally {
      setSaving(false);
    }
  }

  async function markRead(notification: SocialNotification) {
    const id = rowId(notification);
    if (!id) return;
    setSaving(true);
    setFeedback("");
    try {
      await markNotificationRead(id);
      await load({ refresh: true });
    } catch (error: any) {
      setFeedback(error?.message || "Unable to update notification.");
    } finally {
      setSaving(false);
    }
  }

  async function readAll() {
    setSaving(true);
    setFeedback("");
    try {
      await markAllNotificationsRead();
      await load({ refresh: true });
    } catch (error: any) {
      setFeedback(error?.message || "Unable to mark notifications read.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load({ refresh: true })}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>Grower community</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Forum / Q&A
          </Text>
          <Text style={styles.subtitle}>
            Ask questions, share grow updates, follow useful discussions, and connect with
            groups built around the way you grow.
          </Text>
        </View>
        <View style={styles.pulseRow}>
          <View style={styles.pulse}>
            <Text style={styles.pulseValue}>{posts.length}</Text>
            <Text style={styles.pulseLabel}>Discussions</Text>
          </View>
          <View style={styles.pulse}>
            <Text style={styles.pulseValue}>{guilds.length}</Text>
            <Text style={styles.pulseLabel}>Groups</Text>
          </View>
          <View style={styles.pulse}>
            <Text style={styles.pulseValue}>{unreadCount}</Text>
            <Text style={styles.pulseLabel}>Unread</Text>
          </View>
        </View>
      </View>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {canView ? (
        <View style={styles.composer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>You</Text>
          </View>
          <View style={styles.composerCopy}>
            <Text style={styles.composerTitle}>What do you want to ask or share?</Text>
            <Text style={styles.composerText}>
              Start a grow question, add photos, or share an update with useful context.
            </Text>
            <View style={styles.discoveryActions}>
              {canPost ? (
                <Link href="/forum/new-post" asChild>
                  <Pressable
                    testID="community-new-post"
                    style={styles.primaryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Start a new forum discussion"
                  >
                    <Text style={styles.primaryText}>Start a Discussion</Text>
                  </Pressable>
                </Link>
              ) : null}
              <Link href="/forum" asChild>
                <Pressable
                  style={styles.secondaryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Browse all forum discussions"
                >
                  <Text style={styles.secondaryText}>Browse All</Text>
                </Pressable>
              </Link>
              <Link href="/communities" asChild>
                <Pressable
                  style={styles.secondaryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Find forum groups"
                >
                  <Text style={styles.secondaryText}>Find Groups</Text>
                </Pressable>
              </Link>
            </View>
            {!canPost ? (
              <Text style={styles.cardText}>
                Posting is not available on this account.
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {!canView ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forum unavailable</Text>
          <Text style={styles.cardText}>
            This account does not have the `FORUM_VIEW` capability.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : null}

      {canView ? (
        <>
          <View style={styles.feedHeader}>
            <View>
              <Text style={styles.feedTitle}>Latest discussions</Text>
              <Text style={styles.feedSubtitle}>
                Open a post to like, reply, report, or save useful advice to a grow.
              </Text>
            </View>
            <Link href="/forum" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open complete Forum and Q&A feed"
              >
                <Text style={styles.cta}>See all</Text>
              </Pressable>
            </Link>
          </View>
          {posts.slice(0, 8).map((post, index) => {
            const id = postId(post);
            const author = postAuthor(post);
            const photos = postPhotos(post);
            const tags = postTags(post);
            const body = postBody(post);
            const title = postTitle(post);
            const replyCount = post.commentCount ?? post.comments?.length ?? 0;
            return (
              <React.Fragment key={id || title}>
                <Link href={{ pathname: "/forum/post", params: { id } }} asChild>
                  <Pressable
                    style={styles.postCard}
                    accessibilityRole="link"
                    accessibilityLabel={`Open forum discussion ${title}`}
                  >
                    <View style={styles.authorRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{authorInitials(author)}</Text>
                      </View>
                      <View style={styles.authorCopy}>
                        <Text style={styles.authorName}>{author}</Text>
                        <Text style={styles.rowMeta}>{postTime(post)}</Text>
                      </View>
                    </View>
                    <Text style={styles.postTitle}>{title}</Text>
                    {body && body !== title ? (
                      <Text style={styles.postBody} numberOfLines={4}>
                        {body}
                      </Text>
                    ) : null}
                    {photos.length ? (
                      <View style={styles.mediaGrid}>
                        {photos.map((photo, photoIndex) => (
                          <Image
                            key={`${photo}-${photoIndex}`}
                            source={{ uri: photo }}
                            style={[
                              styles.postImage,
                              photos.length > 1 ? styles.postImageMultiple : null
                            ]}
                            resizeMode="cover"
                            accessibilityLabel={`${title} photo ${photoIndex + 1}`}
                          />
                        ))}
                      </View>
                    ) : null}
                    {tags.length ? (
                      <View style={styles.tagRow}>
                        {tags.map((tag) => (
                          <Text key={tag} style={styles.tag}>
                            {tag}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    <View style={styles.engagementRow}>
                      <Text style={styles.engagementText}>
                        {post.likeCount || post.likes?.length || 0} likes
                      </Text>
                      <Text style={styles.engagementText}>{replyCount} replies</Text>
                      <Text style={styles.openDiscussion}>Open discussion</Text>
                    </View>
                  </Pressable>
                </Link>
                {index === 1 ? (
                  <PersonalFeedPlacement
                    placement="top"
                    routeKey="personal_community"
                    longContent
                    compact
                  />
                ) : null}
              </React.Fragment>
            );
          })}
          {!loading && !posts.length ? (
            <View style={styles.emptyCard}>
              <Text style={styles.cardTitle}>No discussions yet</Text>
              <Text style={styles.cardText}>
                Start the first discussion, ask for grow help, or pull down to refresh.
              </Text>
            </View>
          ) : null}
          {posts.length === 1 ? (
            <PersonalFeedPlacement
              placement="top"
              routeKey="personal_community"
              longContent
              compact
            />
          ) : null}

          <View style={styles.secondaryGrid}>
            <View style={[styles.card, styles.secondaryPanel]}>
              <Text style={styles.cardTitle}>Your groups</Text>
              {guilds.slice(0, 4).map((guild) => {
                const joined = Boolean(guild.joined || guild.isMember);
                const name = guild.name || "Forum group";
                return (
                  <View key={rowId(guild) || guild.name} style={styles.row}>
                    <Text style={styles.rowTitle}>{name}</Text>
                    <Text style={styles.rowMeta}>
                      {guild.description || "No description"} | {guild.memberCount || 0}{" "}
                      members
                    </Text>
                    <Pressable
                      disabled={saving}
                      onPress={() => toggleGuild(guild)}
                      style={styles.secondaryBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`${joined ? "Leave" : "Join"} ${name}`}
                    >
                      <Text style={styles.secondaryText}>
                        {joined ? "Leave" : "Join"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
              {!guilds.length ? (
                <Text style={styles.cardText}>No forum groups returned.</Text>
              ) : null}
              <Link href="/communities" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Browse all groups"
                >
                  <Text style={styles.cta}>Browse all groups</Text>
                </Pressable>
              </Link>
            </View>

            <View style={[styles.card, styles.secondaryPanel]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Notifications</Text>
                {unreadCount ? (
                  <Pressable
                    disabled={saving}
                    onPress={readAll}
                    accessibilityRole="button"
                    accessibilityLabel="Mark all forum notifications read"
                  >
                    <Text style={styles.cta}>Mark all read</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.cardText}>{unreadCount} unread notifications</Text>
              {notifications.slice(0, 4).map((notification) => (
                <View key={rowId(notification) || notification.title} style={styles.row}>
                  <Text style={styles.rowTitle}>
                    {notification.title || "Notification"}
                  </Text>
                  <Text style={styles.rowMeta}>{notification.message || ""}</Text>
                  {!notification.read ? (
                    <Pressable
                      disabled={saving}
                      onPress={() => markRead(notification)}
                      style={styles.secondaryBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${notification.title || "notification"} read`}
                    >
                      <Text style={styles.secondaryText}>Mark read</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {!notifications.length ? (
                <Text style={styles.cardText}>No notifications.</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.discoveryCard}>
            <Text style={styles.cardTitle}>Explore beyond the Forum</Text>
            <Text style={styles.cardText}>
              These links open commercial discovery, campaigns, learning, and offers. They
              stay separate from grower discussions.
            </Text>
            <View style={styles.discoveryActions}>
              {[
                ["Browse Discovery Directory", "/discover"],
                ["Chronological Feed", "/feed"],
                ["Public Storefronts", "/store"],
                ["Marketplace & Offers", "/marketplace"],
                ["Courses", "/home/personal/courses"]
              ].map(([label, href]) => (
                <Link key={href} href={href as any} asChild>
                  <Pressable
                    style={styles.secondaryBtn}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                  >
                    <Text style={styles.secondaryText}>{label}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        </>
      ) : null}
      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_community"
        longContent
        compact
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  content: {
    alignSelf: "center",
    gap: 14,
    maxWidth: 920,
    padding: 20,
    paddingBottom: 40,
    width: "100%"
  },
  hero: {
    alignItems: "flex-start",
    backgroundColor: "#052E16",
    borderRadius: radius.card,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    justifyContent: "space-between",
    padding: 20
  },
  heroCopy: { flex: 1, minWidth: 230 },
  eyebrow: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#D1FAE5", fontSize: 14, lineHeight: 21, marginTop: 6 },
  pulseRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pulse: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    minWidth: 82,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  pulseValue: { color: "#052E16", fontSize: 18, fontWeight: "900" },
  pulseLabel: { color: "#166534", fontSize: 11, fontWeight: "800", marginTop: 2 },
  composer: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16
  },
  composerCopy: { flex: 1, gap: 6, minWidth: 0 },
  composerTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  composerText: { color: "#475569", lineHeight: 20 },
  feedHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 4
  },
  feedTitle: { color: "#0F172A", fontSize: 20, fontWeight: "900" },
  feedSubtitle: { color: "#64748B", lineHeight: 19, marginTop: 2 },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 16
  },
  authorRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  avatar: {
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  avatarText: { color: "#166534", fontSize: 12, fontWeight: "900" },
  authorCopy: { flex: 1, minWidth: 0 },
  authorName: { color: "#0F172A", fontWeight: "900" },
  postTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900", lineHeight: 23 },
  postBody: { color: "#334155", lineHeight: 21 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  postImage: {
    aspectRatio: 16 / 9,
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    width: "100%"
  },
  postImageMultiple: { flexBasis: 220, flexGrow: 1 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderRadius: 999,
    borderWidth: 1,
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  engagementRow: {
    alignItems: "center",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 10
  },
  engagementText: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  openDiscussion: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: "auto"
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 5,
    padding: 18
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC",
    gap: 10
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardText: { fontSize: 14, color: "#475569", lineHeight: 20 },
  secondaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  secondaryPanel: { flexBasis: 320, flexGrow: 1 },
  discoveryCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 9,
    padding: 16
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    gap: 4
  },
  rowTitle: { fontWeight: "800", color: "#0F172A" },
  rowMeta: { color: "#64748B", fontSize: 12, lineHeight: 18 },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF"
  },
  secondaryText: { color: "#0F172A", fontWeight: "800" },
  cta: { color: "#166534", fontWeight: "800" },
  discoveryActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feedback: {
    color: "#334155",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 9,
    fontWeight: "700"
  }
});
