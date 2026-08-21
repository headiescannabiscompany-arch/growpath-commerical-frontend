import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { listLives } from "../api/lives";
import { useAuth } from "../auth/AuthContext";
import FollowButton from "../components/FollowButton";
import { useAppTheme, type ThemePalette } from "../theme/appTheme";
import { radius } from "../theme/theme";

type LiveSession = Record<string, any>;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "campaigns", label: "Campaign-linked" },
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live now" },
  { key: "premieres", label: "Premieres" },
  { key: "replays", label: "Replays" }
] as const;

function rows(payload: any): LiveSession[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.lives)) return payload.lives;
  if (Array.isArray(payload?.sessions)) return payload.sessions;
  if (Array.isArray(payload?.liveEvents)) return payload.liveEvents;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function text(value: any) {
  return String(value || "").trim();
}

function titleOf(item: LiveSession) {
  return text(item?.title || item?.name || item?.label || "Live opportunity");
}

function summaryOf(item: LiveSession) {
  return text(item?.description || item?.summary || item?.body || "");
}

function startsAt(item: LiveSession) {
  return text(
    item?.scheduledStart ||
      item?.startsAt ||
      item?.startTime ||
      item?.startAt ||
      item?.dateTime ||
      ""
  );
}

function visibilityLabel(item: LiveSession) {
  return text(item?.visibility || item?.accessLevel || "").replaceAll("_", " ");
}

function isLiveNow(item: LiveSession) {
  return text(item?.status).toLowerCase() === "live";
}

function isReplay(item: LiveSession) {
  const status = text(item?.status).toLowerCase();
  return status === "replay_available" || Boolean(item?.replayUrl || item?.vodUrl);
}

function isPremiere(item: LiveSession) {
  return text(item?.sessionType).toLowerCase() === "premiere";
}

function isUpcoming(item: LiveSession) {
  const status = text(item?.status).toLowerCase();
  if (["draft", "scheduled", "upcoming"].includes(status)) return true;
  const start = startsAt(item);
  if (!start) return false;
  const timestamp = Date.parse(start);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function campaignIdOf(item: LiveSession) {
  return text(
    item?.linkedFeedCampaignId ||
      item?.relatedFeedCampaignId ||
      item?.feedCampaignId ||
      item?.campaignId ||
      item?.linkedFeedPostId ||
      item?.relatedFeedPostId
  );
}

function campaignHref(item: LiveSession) {
  const campaignId = campaignIdOf(item);
  if (!campaignId) return "";
  const workspace = text(
    item?.workspaceType || item?.ownerType || item?.accountType
  ).toLowerCase();
  const base =
    workspace === "commercial"
      ? "/home/commercial/feed"
      : workspace === "facility"
        ? "/home/facility/feed"
        : "/feed";
  return `${base}?campaignId=${encodeURIComponent(campaignId)}`;
}

function sessionIdOf(item: LiveSession) {
  return text(item?.id || item?._id || item?.sessionId || item?.liveId);
}

function sessionMeta(item: LiveSession) {
  const parts: string[] = [];
  const status = text(item?.status).replaceAll("_", " ");
  if (status) parts.push(status);
  const visibility = visibilityLabel(item);
  if (visibility) parts.push(visibility);
  const start = startsAt(item);
  if (start) {
    const date = new Date(start);
    if (!Number.isNaN(date.getTime())) parts.push(date.toLocaleString());
    else parts.push(start);
  }
  const twitch = text(
    item?.twitchChannelName || item?.twitchChannel || item?.channelName
  );
  if (twitch) parts.push(`Twitch ${twitch}`);
  const rsvpCount = Number(item?.rsvpCount || item?.attendeeCount || 0);
  if (Number.isFinite(rsvpCount) && rsvpCount > 0) parts.push(`${rsvpCount} RSVPs`);
  return parts.join(" · ");
}

function sessionThumb(item: LiveSession) {
  return (
    text(
      item?.thumbnailUrl || item?.coverImageUrl || item?.imageUrl || item?.posterUrl
    ) || ""
  );
}

function sessionOwner(item: LiveSession) {
  const owner = item?.owner && typeof item.owner === "object" ? item.owner : {};
  return {
    id: text(owner?.id || owner?._id || item?.ownerId || item?.userId),
    displayName: text(owner?.displayName || owner?.name || "GrowPath member"),
    avatarUrl: text(owner?.avatarUrl || owner?.avatar || owner?.photoUrl)
  };
}

function matchesQuery(item: LiveSession, query: string) {
  if (!query) return true;
  const haystack = [
    titleOf(item),
    summaryOf(item),
    item?.twitchChannelName,
    item?.twitchChannel,
    item?.visibility,
    item?.status,
    item?.relatedCourseId,
    item?.relatedProductId,
    item?.relatedFeedCampaignId,
    item?.linkedFeedCampaignId,
    item?.campaignId
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return haystack.some((value) => value.includes(query));
}

function matchesFilter(item: LiveSession, filterKey: (typeof FILTERS)[number]["key"]) {
  switch (filterKey) {
    case "campaigns":
      return Boolean(campaignIdOf(item));
    case "upcoming":
      return isUpcoming(item);
    case "live":
      return isLiveNow(item);
    case "replays":
      return isReplay(item);
    case "premieres":
      return isPremiere(item);
    default:
      return true;
  }
}

function cardLabelFor(item: LiveSession) {
  if (isLiveNow(item)) return "Live now";
  if (isPremiere(item)) return "Video premiere";
  if (isReplay(item)) return "Replay";
  if (isUpcoming(item)) return "Upcoming";
  if (campaignIdOf(item)) return "Campaign-linked";
  return "Live session";
}

export default function LiveSessionsListScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTERS)[number]["key"]>("all");

  useEffect(() => {
    let alive = true;

    async function fetchSessions() {
      setLoading(true);
      setError("");
      try {
        const data = await listLives();
        if (!alive) return;
        setSessions(rows(data));
      } catch (err: any) {
        if (!alive) return;
        setError(String(err?.message || err || "Failed to load live opportunities."));
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchSessions();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter(
      (item) => matchesFilter(item, activeFilter) && matchesQuery(item, q)
    );
  }, [activeFilter, query, sessions]);

  const counts = useMemo(
    () => ({
      total: sessions.length,
      campaigns: sessions.filter((item) => Boolean(campaignIdOf(item))).length,
      upcoming: sessions.filter((item) => isUpcoming(item)).length,
      live: sessions.filter((item) => isLiveNow(item)).length,
      replays: sessions.filter((item) => isReplay(item)).length,
      premieres: sessions.filter((item) => isPremiere(item)).length
    }),
    [sessions]
  );

  const sections = useMemo(() => {
    const campaignLinked = filteredSessions.filter((item) => Boolean(campaignIdOf(item)));
    const liveNow = filteredSessions.filter((item) => isLiveNow(item));
    const upcoming = filteredSessions.filter((item) => isUpcoming(item));
    const replays = filteredSessions.filter((item) => isReplay(item));
    const premieres = filteredSessions.filter((item) => isPremiere(item));
    const remaining = filteredSessions.filter(
      (item) =>
        !campaignIdOf(item) &&
        !isLiveNow(item) &&
        !isUpcoming(item) &&
        !isReplay(item) &&
        !isPremiere(item)
    );

    return [
      {
        key: "campaigns",
        title: "Campaign-linked opportunities",
        empty: "No campaign-linked live opportunities yet.",
        summary: "Lives that connect back to feed campaigns, launches, or education.",
        items: campaignLinked
      },
      {
        key: "upcoming",
        title: "Upcoming",
        empty: "No upcoming lives found.",
        summary: "Sessions people can review ahead of time for reminders and RSVP.",
        items: upcoming
      },
      {
        key: "live",
        title: "Live now",
        empty: "No live sessions are currently active.",
        summary: "Sessions currently broadcasting or marked live.",
        items: liveNow
      },
      {
        key: "premieres",
        title: "Video premieres",
        empty: "No GrowPath video premieres are scheduled.",
        summary: "Published videos scheduled as shared watch events with live chat.",
        items: premieres
      },
      {
        key: "replays",
        title: "Replays",
        empty: "No replays are available yet.",
        summary: "Archived or replay-ready sessions people can revisit later.",
        items: replays
      },
      {
        key: "all",
        title: "Other sessions",
        empty: "No additional sessions matched your filters.",
        summary: "Everything else that still deserves a browser card.",
        items: remaining
      }
    ];
  }, [filteredSessions]);

  const visibleSections =
    activeFilter === "all"
      ? sections
      : sections.filter((section) => section.key === activeFilter);

  function openSession(item: LiveSession) {
    const id = sessionIdOf(item);
    if (!id) return;
    router.push(`/live-session?sessionId=${encodeURIComponent(id)}`);
  }

  function openCampaign(item: LiveSession) {
    const href = campaignHref(item);
    if (!href) return;
    router.push(href as any);
  }

  function renderSessionCard(item: LiveSession) {
    const sessionId = sessionIdOf(item);
    const campaign = campaignHref(item);
    const thumb = sessionThumb(item);
    const owner = sessionOwner(item);
    const signedInUserId = text(auth?.user?.id || auth?.user?._id);

    return (
      <View key={sessionId || titleOf(item)} style={styles.sessionCard}>
        {thumb ? (
          <Image
            accessibilityLabel={`${titleOf(item)} thumbnail`}
            resizeMode="cover"
            source={{ uri: thumb }}
            style={styles.thumbnail}
          />
        ) : null}
        <View style={styles.cardBody}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cardLabelFor(item)}</Text>
            </View>
            {campaign ? (
              <View style={styles.badgeSecondary}>
                <Text style={styles.badgeSecondaryText}>Campaign-linked</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.sessionTitle} numberOfLines={2}>
            {titleOf(item)}
          </Text>
          {owner.id ? (
            <View style={styles.ownerRow}>
              {owner.avatarUrl ? (
                <Image
                  accessibilityLabel={`${owner.displayName} avatar`}
                  source={{ uri: owner.avatarUrl }}
                  style={styles.ownerAvatar}
                />
              ) : null}
              <Text style={styles.ownerName}>Hosted by {owner.displayName}</Text>
              {signedInUserId && signedInUserId !== owner.id ? (
                <FollowButton userId={owner.id} />
              ) : null}
            </View>
          ) : null}
          {summaryOf(item) ? (
            <Text style={styles.description} numberOfLines={3}>
              {summaryOf(item)}
            </Text>
          ) : null}
          {sessionMeta(item) ? (
            <Text style={styles.meta}>{sessionMeta(item)}</Text>
          ) : null}
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => openSession(item)}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            >
              <Text style={styles.actionButtonText}>Open session</Text>
            </Pressable>
            {campaign ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => openCampaign(item)}
                style={({ pressed }) => [
                  styles.actionButtonSecondary,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.actionButtonSecondaryText}>Open campaign</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Live browser</Text>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Lives
        </Text>
        <Text style={styles.subtitle}>
          Browse campaign-linked live opportunities, upcoming sessions, live broadcasts,
          and replays. The detail screen handles RSVP and playback when you need it.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/live-studio" as any)}
          style={styles.heroAction}
        >
          <Text style={styles.heroActionText}>Create or manage a live</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.total}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.campaigns}</Text>
            <Text style={styles.statLabel}>Campaigns</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.live}</Text>
            <Text style={styles.statLabel}>Live now</Text>
          </View>
        </View>
        <Text style={styles.summaryMeta}>
          Lives are surfaced as opportunities instead of a plain join list.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search live opportunities"
          onChangeText={setQuery}
          placeholder="Search lives, campaigns, channels, products, or courses"
          placeholderTextColor={palette.textMuted}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <View accessibilityRole="toolbar" style={styles.filterRow}>
        {FILTERS.map((filter) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === filter.key }}
            key={filter.key}
            onPress={() => setActiveFilter(filter.key)}
            style={[
              styles.filterChip,
              activeFilter === filter.key && styles.filterChipSelected
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter.key && styles.filterChipTextSelected
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.muted}>Loading live opportunities...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setReloadKey((value) => value + 1)}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>Retry Lives</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error ? (
        visibleSections.some((section) => section.items.length) ? (
          visibleSections.map((section) => (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderCopy}>
                  <Text
                    accessibilityRole="header"
                    aria-level={2}
                    style={styles.sectionTitle}
                  >
                    {section.title}
                  </Text>
                  <Text style={styles.sectionSummary}>{section.summary}</Text>
                </View>
                <Text style={styles.sectionCount}>{section.items.length}</Text>
              </View>
              {section.items.length ? (
                <View style={styles.cardList}>
                  {section.items.map(renderSessionCard)}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.muted}>{section.empty}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>
              No live opportunities matched
            </Text>
            <Text style={styles.muted}>
              Clear the filters or search for a different campaign, session, or replay.
            </Text>
          </View>
        )
      ) : null}
    </ScrollView>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: palette.page,
      gap: 14,
      padding: 16,
      paddingBottom: 40
    },
    hero: {
      backgroundColor: palette.hero,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 6,
      padding: 16
    },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.4,
      textTransform: "uppercase"
    },
    title: { color: palette.heroText, fontSize: 30, fontWeight: "900" },
    subtitle: { color: palette.heroMuted, lineHeight: 21 },
    heroAction: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.pill,
      marginTop: 4,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    heroActionText: { color: palette.accentText, fontWeight: "900" },
    summaryCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    summaryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    statCard: {
      backgroundColor: palette.surface,
      borderColor: palette.borderSoft,
      borderRadius: 12,
      borderWidth: 1,
      minWidth: 92,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    statValue: { color: palette.text, fontSize: 19, fontWeight: "900" },
    statLabel: { color: palette.accent, fontSize: 12, fontWeight: "700" },
    summaryMeta: { color: palette.textSoft, lineHeight: 20 },
    searchRow: { flexDirection: "row", flexWrap: "wrap" },
    searchInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flex: 1,
      minHeight: 46,
      minWidth: 220,
      color: palette.text,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    filterChip: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 38,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    filterChipSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    filterChipText: { color: palette.textSoft, fontSize: 13, fontWeight: "800" },
    filterChipTextSelected: { color: palette.accentText },
    loadingRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      paddingVertical: 6
    },
    muted: { color: palette.textMuted, lineHeight: 20 },
    errorCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 14
    },
    errorText: { color: palette.danger, lineHeight: 20 },
    section: { gap: 10, marginTop: 4 },
    sectionHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between"
    },
    sectionHeaderCopy: { flex: 1, gap: 2 },
    sectionTitle: { color: palette.text, fontSize: 20, fontWeight: "900" },
    sectionSummary: { color: palette.textMuted, lineHeight: 20 },
    sectionCount: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      color: palette.accent,
      fontWeight: "900",
      minWidth: 40,
      paddingHorizontal: 10,
      paddingVertical: 6,
      textAlign: "center"
    },
    cardList: { gap: 12 },
    sessionCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      overflow: "hidden"
    },
    thumbnail: {
      backgroundColor: palette.surfaceStrong,
      height: 168,
      width: "100%"
    },
    cardBody: {
      gap: 8,
      padding: 14
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: palette.accentSoft,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    badgeText: { color: palette.accent, fontSize: 12, fontWeight: "900" },
    badgeSecondary: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceStrong,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    badgeSecondaryText: { color: palette.info, fontSize: 12, fontWeight: "800" },
    sessionTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    ownerRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    ownerAvatar: { borderRadius: 18, height: 36, width: 36 },
    ownerName: { color: palette.textSoft, flexGrow: 1, fontWeight: "800" },
    description: { color: palette.textSoft, lineHeight: 20 },
    meta: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4
    },
    actionButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    actionButtonText: { color: palette.accentText, fontWeight: "900" },
    actionButtonSecondary: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    actionButtonSecondaryText: { color: palette.accent, fontWeight: "900" },
    pressed: { opacity: 0.7 },
    emptyCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 6,
      padding: 14
    },
    emptyTitle: { color: palette.text, fontSize: 16, fontWeight: "900" }
  });
}
