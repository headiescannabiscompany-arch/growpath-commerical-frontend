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
  postId,
  type Guild,
  type SocialPost
} from "@/api/communitySocial";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import InlineForumDiscussion from "@/components/forum/InlineForumDiscussion";
import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createPersonalCommunityStyles(palette), [palette]);
  const canView = entitlements.can(CAPABILITY_KEYS.FORUM_VIEW);
  const canPost = entitlements.can(CAPABILITY_KEYS.FORUM_POST);

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const pageSurface = { backgroundColor: palette.surface, borderColor: palette.border };
  const mutedSurface = {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border
  };
  const heroSurface = { backgroundColor: palette.hero, borderColor: palette.border };

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
        const [postResult, guildResult] = await Promise.allSettled([
          listForumPosts(),
          listGuilds()
        ]);
        if (postResult.status === "rejected") throw postResult.reason;
        setPosts(postResult.value);
        setGuilds(guildResult.status === "fulfilled" ? guildResult.value : []);
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.page }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load({ refresh: true })}
          tintColor={palette.accent}
          colors={[palette.accent]}
          progressBackgroundColor={palette.surface}
        />
      }
    >
      <BackButton fallbackHref="/home/personal" />
      <View style={[styles.hero, heroSurface]}>
        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { color: palette.heroMuted }]}>
            Grower community
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.heroText }]}
          >
            Forum / Q&A
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Ask questions, share grow updates, follow useful discussions, and connect with
            groups built around the way you grow.
          </Text>
        </View>
        <View style={styles.pulseRow}>
          <View style={[styles.pulse, mutedSurface]}>
            <Text style={[styles.pulseValue, { color: palette.text }]}>
              {posts.length}
            </Text>
            <Text style={[styles.pulseLabel, { color: palette.accent }]}>
              Discussions
            </Text>
          </View>
          <View style={[styles.pulse, mutedSurface]}>
            <Text style={[styles.pulseValue, { color: palette.text }]}>
              {guilds.length}
            </Text>
            <Text style={[styles.pulseLabel, { color: palette.accent }]}>Groups</Text>
          </View>
        </View>
      </View>
      {feedback ? (
        <Text style={[styles.feedback, pageSurface, { color: palette.text }]}>
          {feedback}
        </Text>
      ) : null}

      {canView ? (
        <View style={[styles.composer, pageSurface]}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: palette.accentSoft, borderColor: palette.border }
            ]}
          >
            <Text style={[styles.avatarText, { color: palette.accent }]}>You</Text>
          </View>
          <View style={styles.composerCopy}>
            <Text style={[styles.composerTitle, { color: palette.text }]}>
              What do you want to ask or share?
            </Text>
            <Text style={[styles.composerText, { color: palette.textMuted }]}>
              Start a grow question, add photos, or share an update with useful context.
            </Text>
            <View style={styles.discoveryActions}>
              {canPost ? (
                <Link href="/forum/new-post" asChild>
                  <Pressable
                    testID="community-new-post"
                    style={StyleSheet.flatten([
                      styles.primaryBtn,
                      { backgroundColor: palette.accent }
                    ])}
                    accessibilityRole="button"
                    accessibilityLabel="Start a new forum discussion"
                  >
                    <Text style={[styles.primaryText, { color: palette.accentText }]}>
                      Start a Discussion
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
              <Link href="/forum" asChild>
                <Pressable
                  style={StyleSheet.flatten([styles.secondaryBtn, mutedSurface])}
                  accessibilityRole="button"
                  accessibilityLabel="Browse all forum discussions"
                >
                  <Text style={[styles.secondaryText, { color: palette.text }]}>
                    Browse All
                  </Text>
                </Pressable>
              </Link>
              <Link href="/communities" asChild>
                <Pressable
                  style={StyleSheet.flatten([styles.secondaryBtn, mutedSurface])}
                  accessibilityRole="button"
                  accessibilityLabel="Find forum groups"
                >
                  <Text style={[styles.secondaryText, { color: palette.text }]}>
                    Find Groups
                  </Text>
                </Pressable>
              </Link>
            </View>
            {canPost ? (
              <View style={styles.quickComposerGrid}>
                <Link
                  href={{
                    pathname: "/forum/new-post",
                    params: {
                      purpose: "diagnosis",
                      title: "Diagnosis help: ",
                      body: "What I am seeing:\n\nWhat changed recently:\n\nEnvironment / feeding details:\n"
                    }
                  }}
                  asChild
                >
                  <Pressable
                    style={StyleSheet.flatten([styles.quickComposer, pageSurface])}
                    accessibilityRole="button"
                    accessibilityLabel="Ask forum for diagnosis help"
                  >
                    <Text style={[styles.quickComposerTitle, { color: palette.text }]}>
                      Ask for Diagnosis Help
                    </Text>
                    <Text style={[styles.cardText, { color: palette.textMuted }]}>
                      Start with a useful issue template and add photos.
                    </Text>
                  </Pressable>
                </Link>
                <Link
                  href={{
                    pathname: "/forum/new-post",
                    params: { purpose: "grow_update", title: "Grow update: " }
                  }}
                  asChild
                >
                  <Pressable
                    style={StyleSheet.flatten([styles.quickComposer, pageSurface])}
                    accessibilityRole="button"
                    accessibilityLabel="Share a grow update to forum"
                  >
                    <Text style={[styles.quickComposerTitle, { color: palette.text }]}>
                      Share a Grow Update
                    </Text>
                    <Text style={[styles.cardText, { color: palette.textMuted }]}>
                      Attach the grow from its dashboard for full context.
                    </Text>
                  </Pressable>
                </Link>
              </View>
            ) : null}
            {!canPost ? (
              <Text style={[styles.cardText, { color: palette.textMuted }]}>
                Posting is not available on this account.
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={[styles.card, pageSurface]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>Forum videos</Text>
        <Text style={[styles.cardText, { color: palette.textMuted }]}>
          Videos belong in Forum/Q&A, not only through Discover. Open the shared library
          to upload clips, review storage, and browse public or followed videos.
        </Text>
        <View style={styles.discoveryActions}>
          <Link href="/videos?tab=library" asChild>
            <Pressable
              style={StyleSheet.flatten([styles.secondaryBtn, mutedSurface])}
              accessibilityRole="button"
              accessibilityLabel="Open video library"
            >
              <Text style={[styles.secondaryText, { color: palette.text }]}>
                Open Video Library
              </Text>
            </Pressable>
          </Link>
          <Link href="/videos?tab=discover" asChild>
            <Pressable
              style={StyleSheet.flatten([styles.secondaryBtn, mutedSurface])}
              accessibilityRole="button"
              accessibilityLabel="Browse videos"
            >
              <Text style={[styles.secondaryText, { color: palette.text }]}>
                Browse Videos
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={[styles.card, pageSurface]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>Forum lives</Text>
        <Text style={[styles.cardText, { color: palette.textMuted }]}>
          Live sessions stay campaign-linked and replay-friendly. Browse them here instead
          of treating Lives like a generic join list.
        </Text>
        <View style={styles.discoveryActions}>
          <Link href="/lives" asChild>
            <Pressable
              style={StyleSheet.flatten([styles.secondaryBtn, mutedSurface])}
              accessibilityRole="button"
              accessibilityLabel="Open lives browser"
            >
              <Text style={[styles.secondaryText, { color: palette.text }]}>
                Open Lives
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {!canView ? (
        <View style={[styles.card, pageSurface]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            Forum unavailable
          </Text>
          <Text style={[styles.cardText, { color: palette.textMuted }]}>
            This account does not have the `FORUM_VIEW` capability.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={[styles.card, pageSurface]}>
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : null}

      {canView ? (
        <>
          <View style={styles.feedHeader}>
            <View>
              <Text style={[styles.feedTitle, { color: palette.text }]}>
                Latest discussions
              </Text>
              <Text style={[styles.feedSubtitle, { color: palette.textMuted }]}>
                Expand replies below a post, or open its full page for likes, reports,
                media replies, and grow actions.
              </Text>
            </View>
            <Link href="/forum" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open complete Forum and Q&A feed"
              >
                <Text style={[styles.cta, { color: palette.link }]}>See all</Text>
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
                <View style={[styles.postCard, pageSurface]}>
                  <View style={styles.authorRow}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: palette.accentSoft,
                          borderColor: palette.border
                        }
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: palette.accent }]}>
                        {authorInitials(author)}
                      </Text>
                    </View>
                    <View style={styles.authorCopy}>
                      <Text style={[styles.authorName, { color: palette.text }]}>
                        {author}
                      </Text>
                      <Text style={[styles.rowMeta, { color: palette.textMuted }]}>
                        {postTime(post)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.postTitle, { color: palette.text }]}>{title}</Text>
                  {body && body !== title ? (
                    <Text
                      style={[styles.postBody, { color: palette.textSoft }]}
                      numberOfLines={4}
                    >
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
                            {
                              backgroundColor: palette.surfaceMuted,
                              borderColor: palette.border
                            },
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
                        <Text
                          key={tag}
                          style={[
                            styles.tag,
                            {
                              backgroundColor: palette.accentSoft,
                              borderColor: palette.border,
                              color: palette.accent
                            }
                          ]}
                        >
                          {tag}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.engagementRow}>
                    <Text style={[styles.engagementText, { color: palette.textMuted }]}>
                      {post.likeCount || post.likes?.length || 0} likes
                    </Text>
                  </View>
                  <InlineForumDiscussion
                    canReply={canPost}
                    replyCount={replyCount}
                    threadId={id}
                    title={title}
                  />
                </View>
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
            <View style={[styles.emptyCard, pageSurface]}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                No discussions yet
              </Text>
              <Text style={[styles.cardText, { color: palette.textMuted }]}>
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
            <View style={[styles.card, styles.secondaryPanel, pageSurface]}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>Your groups</Text>
              {guilds.slice(0, 4).map((guild) => {
                const joined = Boolean(guild.joined || guild.isMember);
                const name = guild.name || "Forum group";
                return (
                  <View key={rowId(guild) || guild.name} style={styles.row}>
                    <Text style={[styles.rowTitle, { color: palette.text }]}>{name}</Text>
                    <Text style={[styles.rowMeta, { color: palette.textMuted }]}>
                      {guild.description || "No description"} | {guild.memberCount || 0}{" "}
                      members
                    </Text>
                    <Pressable
                      disabled={saving}
                      onPress={() => toggleGuild(guild)}
                      style={[styles.secondaryBtn, mutedSurface]}
                      accessibilityRole="button"
                      accessibilityLabel={`${joined ? "Leave" : "Join"} ${name}`}
                    >
                      <Text style={[styles.secondaryText, { color: palette.text }]}>
                        {joined ? "Leave" : "Join"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
              {!guilds.length ? (
                <Text style={[styles.cardText, { color: palette.textMuted }]}>
                  No forum groups returned.
                </Text>
              ) : null}
              <Link href="/communities" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Browse all groups"
                >
                  <Text style={[styles.cta, { color: palette.link }]}>
                    Browse all groups
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <View style={[styles.discoveryCard, mutedSurface]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              Explore beyond the Forum
            </Text>
            <Text style={[styles.cardText, { color: palette.textMuted }]}>
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
                    style={StyleSheet.flatten([styles.secondaryBtn, mutedSurface])}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.secondaryText, { color: palette.text }]}>
                      {label}
                    </Text>
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

export function createPersonalCommunityStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
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
      backgroundColor: palette.hero,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 18,
      justifyContent: "space-between",
      padding: 20
    },
    heroCopy: { flex: 1, minWidth: 230 },
    eyebrow: {
      color: palette.heroMuted,
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 4,
      textTransform: "uppercase"
    },
    title: { color: palette.heroText, fontSize: 28, fontWeight: "900" },
    subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 21, marginTop: 6 },
    pulseRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pulse: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 82,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    pulseValue: { color: palette.text, fontSize: 18, fontWeight: "900" },
    pulseLabel: { color: palette.accent, fontSize: 11, fontWeight: "800", marginTop: 2 },
    composer: {
      alignItems: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      padding: 16
    },
    composerCopy: { flex: 1, gap: 6, minWidth: 0 },
    composerTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    composerText: { color: palette.textMuted, lineHeight: 20 },
    quickComposerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    quickComposer: {
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: 220,
      flexGrow: 1,
      gap: 4,
      padding: 12
    },
    quickComposerTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    feedHeader: {
      alignItems: "flex-end",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      marginTop: 4
    },
    feedTitle: { color: palette.text, fontSize: 20, fontWeight: "900" },
    feedSubtitle: { color: palette.textMuted, lineHeight: 19, marginTop: 2 },
    postCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 16
    },
    authorRow: { alignItems: "center", flexDirection: "row", gap: 10 },
    avatar: {
      alignItems: "center",
      backgroundColor: palette.accentSoft,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42
    },
    avatarText: { color: palette.accent, fontSize: 12, fontWeight: "900" },
    authorCopy: { flex: 1, minWidth: 0 },
    authorName: { color: palette.text, fontWeight: "900" },
    postTitle: { color: palette.text, fontSize: 18, fontWeight: "900", lineHeight: 23 },
    postBody: { color: palette.textSoft, lineHeight: 21 },
    mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    postImage: {
      aspectRatio: 16 / 9,
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      width: "100%"
    },
    postImageMultiple: { flexBasis: 220, flexGrow: 1 },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      color: palette.accent,
      fontSize: 12,
      fontWeight: "800",
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    engagementRow: {
      alignItems: "center",
      borderTopColor: palette.border,
      borderTopWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      paddingTop: 10
    },
    engagementText: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    emptyCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderStyle: "dashed",
      borderWidth: 1,
      gap: 5,
      padding: 18
    },
    card: {
      padding: 16,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      gap: 10
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    cardText: { fontSize: 14, color: palette.textMuted, lineHeight: 20 },
    secondaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
    secondaryPanel: { flexBasis: 320, flexGrow: 1 },
    discoveryCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      padding: 16
    },
    row: {
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingTop: 10,
      gap: 4
    },
    rowTitle: { fontWeight: "800", color: palette.text },
    rowMeta: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    primaryBtn: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    secondaryBtn: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surfaceMuted
    },
    secondaryText: { color: palette.text, fontWeight: "800" },
    cta: { color: palette.link, fontWeight: "800" },
    discoveryActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    feedback: {
      color: palette.text,
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 9,
      fontWeight: "700"
    }
  });
}
