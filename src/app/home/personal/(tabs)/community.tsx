import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
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

function rowId(row: any) {
  return String(row?._id || row?.id || "");
}

function postTitle(post: SocialPost) {
  return String(post.title || post.text || post.content || post.body || "Forum post");
}

function postBody(post: SocialPost) {
  return String(post.body || post.content || post.text || "");
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
        const [postRows, guildRows, notificationRows] = await Promise.all([
          listForumPosts(),
          listGuilds(),
          listNotifications()
        ]);
        setPosts(postRows);
        setGuilds(guildRows);
        setNotifications(notificationRows);
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
      <Text style={styles.title}>Forum / Q&A</Text>
      <Text style={styles.subtitle}>
        Discussion, grow help, product questions, course Q&A, memberships, and
        notifications from the shared forum endpoints. Feed placements on this page are
        commercial/facility outreach, not discussion.
      </Text>
      <PersonalFeedPlacement placement="top" routeKey="personal_community" longContent />
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

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
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Forum / Q&A Posts</Text>
              <Link href="/home/personal/forum" asChild>
                <Pressable>
                  <Text style={styles.cta}>Open Forum / Q&A</Text>
                </Pressable>
              </Link>
            </View>
            {canPost ? (
              <Link href="/home/personal/forum/new-post" asChild>
                <Pressable testID="community-new-post" style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>New Discussion</Text>
                </Pressable>
              </Link>
            ) : (
              <Text style={styles.cardText}>Posting requires `FORUM_POST`.</Text>
            )}
            {posts.slice(0, 4).map((post) => {
              const id = postId(post);
              return (
                <Link
                  key={id || postTitle(post)}
                  href={`/forum/post/${encodeURIComponent(id)}`}
                  asChild
                >
                  <Pressable style={styles.row}>
                    <Text style={styles.rowTitle}>{postTitle(post)}</Text>
                    {postBody(post) ? (
                      <Text style={styles.rowMeta} numberOfLines={2}>
                        {postBody(post)}
                      </Text>
                    ) : null}
                    <Text style={styles.rowMeta}>{post.likeCount || 0} likes</Text>
                  </Pressable>
                </Link>
              );
            })}
            {!posts.length ? <Text style={styles.cardText}>No posts yet.</Text> : null}
          </View>
          <PersonalFeedPlacement
            placement="middle"
            routeKey="personal_community"
            longContent
          />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Memberships</Text>
            {guilds.slice(0, 6).map((guild) => {
              const joined = Boolean(guild.joined || guild.isMember);
              return (
                <View key={rowId(guild) || guild.name} style={styles.row}>
                  <Text style={styles.rowTitle}>{guild.name || "Forum group"}</Text>
                  <Text style={styles.rowMeta}>
                    {guild.description || "No description"} | {guild.memberCount || 0}{" "}
                    members
                  </Text>
                  <Pressable
                    disabled={saving}
                    onPress={() => toggleGuild(guild)}
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryText}>{joined ? "Leave" : "Join"}</Text>
                  </Pressable>
                </View>
              );
            })}
            {!guilds.length ? (
              <Text style={styles.cardText}>No forum groups returned.</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Notifications</Text>
              {unreadCount ? (
                <Pressable disabled={saving} onPress={readAll}>
                  <Text style={styles.cta}>Mark all read</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.cardText}>{unreadCount} unread notifications</Text>
            {notifications.slice(0, 5).map((notification) => (
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
        </>
      ) : null}
      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_community"
        longContent
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 36, gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, color: "#475569" },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    gap: 10
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardText: { fontSize: 14, color: "#475569", lineHeight: 20 },
  row: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    gap: 4
  },
  rowTitle: { fontWeight: "800", color: "#0F172A" },
  rowMeta: { color: "#64748B", lineHeight: 19 },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF"
  },
  secondaryText: { color: "#0F172A", fontWeight: "800" },
  cta: { color: "#166534", fontWeight: "800" },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 9,
    padding: 9,
    fontWeight: "700"
  }
});
