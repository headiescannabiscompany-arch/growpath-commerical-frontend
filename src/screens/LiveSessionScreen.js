import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useAuth } from "@/auth/AuthContext";
import { apiRequest } from "../api/apiRequest";
import { listPersonalGrows } from "../api/grows";
import { createPersonalTask } from "../api/tasks";
import LiveSessionTwitchEmbed from "./LiveSessionTwitchEmbed";
import { useAppTheme } from "../theme/appTheme";
import { radius } from "../theme/theme";
import { recordCommercialAnalyticsEvent } from "../api/commercialAnalytics";
import ReportModal from "../components/ReportModal";

export default function LiveSessionScreen({ route }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const routerParams = (useLocalSearchParams && useLocalSearchParams()) || {};
  const routeParams = route?.params || {};
  const params = { ...routerParams, ...routeParams };

  const sessionId = useMemo(() => {
    const raw = params.sessionId ?? params.id ?? "";
    return String(raw || "").trim();
  }, [params.sessionId, params.id]);

  const entitlements = useEntitlements();
  const auth = useAuth();
  const canModerate = entitlements.can(CAPABILITY_KEYS.LIVE_SESSION_MODERATE);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [err, setErr] = useState("");
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderCreated, setReminderCreated] = useState(false);
  const [rsvped, setRsvped] = useState(false);
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!sessionId) {
        setLoading(false);
        setErr("Choose a live session from Lives.");
        setSession(null);
        return;
      }
      setLoading(true);
      setErr("");
      setSession(null);

      try {
        const res = await apiRequest(`/api/lives/${encodeURIComponent(sessionId)}`, {
          method: "GET"
        });
        if (!alive) return;
        setSession(res || null);
      } catch (e) {
        const msg = String(e?.message || e || "No session found");
        if (!alive) return;
        if (/no session found|not found|objectid|cast to/i.test(msg)) {
          setErr("This live session is unavailable.");
        } else {
          setErr("Unable to load this live session. Try again from Lives.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return undefined;
    let alive = true;
    apiRequest(`/api/lives/${encodeURIComponent(sessionId)}/rsvp`, { method: "GET" })
      .then((result) => {
        if (alive) setRsvped(Boolean(result?.rsvped));
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const twitchChannel = session?.twitchChannel ? String(session.twitchChannel) : "";
  const watchUrl = twitchChannel ? `https://www.twitch.tv/${twitchChannel}` : "";
  const moderationUrl = session?.twitchModerationUrl || session?.moderationUrl || "";
  const replayUrl = session?.replayUrl || session?.vodUrl || "";
  const twitchVodId = String(replayUrl).match(/twitch\.tv\/videos\/(\d+)/i)?.[1] || "";
  const relatedCourseId = session?.relatedCourseId || session?.courseId || "";
  const relatedProductId = session?.relatedProductId || session?.productId || "";
  const forumThreadId = session?.forumThreadId || session?.linkedForumThreadId || "";
  const feedCampaignId =
    session?.linkedFeedCampaignId ||
    session?.feedCampaignId ||
    session?.campaignId ||
    session?.linkedFeedPostId ||
    "";
  const campaignWorkspace = String(
    session?.workspaceType || session?.ownerType || session?.accountType || ""
  ).toLowerCase();
  const storefrontSlug =
    session?.storefrontSlug ||
    session?.linkedStorefrontSlug ||
    session?.brandSlug ||
    session?.publicSlug ||
    "";
  const startsAt =
    session?.scheduledStart || session?.startsAt || session?.startTime || "";
  const productHref =
    relatedProductId && storefrontSlug
      ? `/store/${encodeURIComponent(String(storefrontSlug))}/products/${encodeURIComponent(
          String(relatedProductId)
        )}`
      : relatedProductId
        ? `/store?q=${encodeURIComponent(String(relatedProductId))}`
        : "";
  const courseHref =
    relatedCourseId && storefrontSlug
      ? `/store/${encodeURIComponent(String(storefrontSlug))}/courses/${encodeURIComponent(
          String(relatedCourseId)
        )}`
      : relatedCourseId
        ? `/courses?courseId=${encodeURIComponent(String(relatedCourseId))}`
        : "";
  const forumHref = forumThreadId
    ? `/forum/post?id=${encodeURIComponent(String(forumThreadId))}`
    : "";
  const campaignBaseHref =
    campaignWorkspace === "commercial"
      ? "/home/commercial/feed"
      : campaignWorkspace === "facility"
        ? "/home/facility/feed"
        : "/feed";
  const feedHref = feedCampaignId
    ? `${campaignBaseHref}?campaignId=${encodeURIComponent(String(feedCampaignId))}`
    : "";
  const ownerId = String(
    session?.owner?.id || session?.owner?._id || session?.ownerId || session?.userId || ""
  );
  const signedInUserId = String(auth?.user?.id || auth?.user?._id || "");
  const canReport = Boolean(signedInUserId) && (!ownerId || ownerId !== signedInUserId);

  useEffect(() => {
    if (!session || !storefrontSlug) return;
    void recordCommercialAnalyticsEvent({
      eventType: "live_view",
      objectType: "live",
      objectId: String(session?._id || session?.id || sessionId),
      storefrontSlug: String(storefrontSlug),
      metadata: { growInterests: session?.growInterests || [] }
    });
  }, [session, sessionId, storefrontSlug]);

  async function createAttendanceReminder() {
    if (!startsAt || savingReminder || reminderCreated) return;
    setSavingReminder(true);
    try {
      const grows = await listPersonalGrows();
      const linkedGrowId = String(session?.linkedGrowId || session?.growId || "");
      const grow =
        grows.find((item) => String(item?.id || item?._id) === linkedGrowId) ||
        grows.find(
          (item) => String(item?.status || "active").toLowerCase() === "active"
        ) ||
        grows[0];
      const growId = String(grow?.id || grow?._id || "");
      if (!growId) {
        Alert.alert(
          "Build a grow first",
          "Create a grow so GrowPath has a workspace for this live-session reminder."
        );
        return;
      }

      const task = await createPersonalTask({
        growId,
        linkedGrowId: growId,
        linkedLiveId: String(session?._id || session?.id || sessionId),
        actionUrl: watchUrl || null,
        title: `Attend live: ${String(session?.title || "GrowPath session")}`,
        description: String(session?.description || "Open the GrowPath live session."),
        dueDate: String(startsAt),
        allDay: false,
        priority: "high",
        calendarType: "live_session",
        sourceType: "live_reminder",
        sourceObjectId: String(session?._id || session?.id || sessionId),
        reminderPlan: { label: "1 hour before", channels: ["in_app"] }
      });
      if (!task) throw new Error("The reminder could not be saved.");
      setReminderCreated(true);
    } catch (error) {
      Alert.alert(
        "Reminder not saved",
        String(error?.message || error || "Please try again.")
      );
    } finally {
      setSavingReminder(false);
    }
  }

  async function toggleRsvp() {
    if (savingRsvp) return;
    setSavingRsvp(true);
    try {
      const result = await apiRequest(
        `/api/lives/${encodeURIComponent(sessionId)}/rsvp`,
        { method: rsvped ? "DELETE" : "POST", body: rsvped ? undefined : {} }
      );
      setRsvped(Boolean(result?.rsvped));
      if (!rsvped && storefrontSlug) {
        void recordCommercialAnalyticsEvent({
          eventType: "live_rsvp",
          objectType: "live",
          objectId: String(session?._id || session?.id || sessionId),
          storefrontSlug: String(storefrontSlug),
          metadata: { growInterests: session?.growInterests || [] }
        });
      }
    } catch (error) {
      Alert.alert("RSVP not saved", String(error?.message || error || "Try again."));
    } finally {
      setSavingRsvp(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>GrowPath live</Text>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Live Session
        </Text>
        <Text style={styles.subtitle}>
          Watch the stream, open replay links, and keep related product, course, and
          Forum/Q&A context in one place.
        </Text>
      </View>

      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.meta}>Loading...</Text>
        </View>
      ) : null}

      {err ? (
        <View style={styles.errorCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.errorTitle}>
            Live session unavailable
          </Text>
          <Text style={styles.error}>{err}</Text>
          <Link href="/lives" asChild>
            <Pressable accessibilityRole="button" style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Browse Lives</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {session ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            {String(session.title || "Untitled Session")}
          </Text>
          {session.description ? (
            <Text style={styles.description}>{String(session.description)}</Text>
          ) : null}
          <View style={styles.badgeRow}>
            {session.status ? (
              <Text style={styles.badge}>{String(session.status)}</Text>
            ) : null}
            {startsAt ? (
              <Text style={styles.badge}>Starts {String(startsAt)}</Text>
            ) : null}
            {session.visibility ? (
              <Text style={styles.badge}>{String(session.visibility)}</Text>
            ) : null}
          </View>
          {session.twitchChannel ? (
            <Text style={styles.meta}>Channel: {String(session.twitchChannel)}</Text>
          ) : null}

          {twitchChannel || twitchVodId ? (
            <View style={styles.embedWrap}>
              <LiveSessionTwitchEmbed
                twitchChannel={twitchVodId || twitchChannel}
                embedType={twitchVodId ? "vod" : "live"}
                chatEnabled={!twitchVodId && Boolean(session.chatEnabled)}
              />
            </View>
          ) : (
            <Text style={styles.meta}>
              No Twitch channel is attached to this live yet.
            </Text>
          )}

          <View style={styles.linkGrid}>
            {relatedProductId ? (
              <Text style={styles.contextPill}>Product {String(relatedProductId)}</Text>
            ) : null}
            {relatedCourseId ? (
              <Text style={styles.contextPill}>Course {String(relatedCourseId)}</Text>
            ) : null}
            {forumThreadId ? (
              <Text style={styles.contextPill}>Forum/Q&A {String(forumThreadId)}</Text>
            ) : null}
            {feedCampaignId ? (
              <Text style={styles.contextPill}>
                Feed Campaign {String(feedCampaignId)}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            {productHref ? (
              <Link href={productHref} asChild>
                <Pressable accessibilityRole="button" style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Open Product</Text>
                </Pressable>
              </Link>
            ) : null}
            {courseHref ? (
              <Link href={courseHref} asChild>
                <Pressable accessibilityRole="button" style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Open Course</Text>
                </Pressable>
              </Link>
            ) : null}
            {forumHref ? (
              <Link href={forumHref} asChild>
                <Pressable accessibilityRole="button" style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Open Q&A</Text>
                </Pressable>
              </Link>
            ) : null}
            {feedHref ? (
              <Link href={feedHref} asChild>
                <Pressable accessibilityRole="button" style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Open Campaign</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>

          {watchUrl ? (
            <Pressable
              accessibilityRole="button"
              style={styles.btn}
              onPress={() => {
                if (storefrontSlug) {
                  void recordCommercialAnalyticsEvent({
                    eventType: "live_watch_click",
                    objectType: "live",
                    objectId: String(session?._id || session?.id || sessionId),
                    storefrontSlug: String(storefrontSlug)
                  });
                }
                Linking.openURL(watchUrl).catch(() => {});
              }}
            >
              <Text style={styles.btnText}>Watch on Twitch</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rsvped ? "Cancel live RSVP" : "RSVP to live"}
            disabled={savingRsvp}
            style={rsvped ? styles.secondaryBtn : styles.btn}
            onPress={toggleRsvp}
          >
            <Text style={rsvped ? styles.secondaryBtnText : styles.btnText}>
              {savingRsvp
                ? "Saving RSVP..."
                : rsvped
                  ? "Going · Cancel RSVP"
                  : "RSVP / Remind Me"}
            </Text>
          </Pressable>

          {startsAt ? (
            <Pressable
              accessibilityRole="button"
              disabled={savingReminder || reminderCreated}
              style={[styles.secondaryBtn, reminderCreated && styles.completedBtn]}
              onPress={createAttendanceReminder}
            >
              <Text style={styles.secondaryBtnText}>
                {reminderCreated
                  ? "Reminder task created"
                  : savingReminder
                    ? "Creating reminder..."
                    : "Add live reminder to My Tasks"}
              </Text>
            </Pressable>
          ) : null}

          {canReport ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Report ${String(session.title || "live session")}`}
              style={styles.secondaryBtn}
              onPress={() => setReportVisible(true)}
            >
              <Text style={styles.secondaryBtnText}>Report Live Session</Text>
            </Pressable>
          ) : null}

          {replayUrl ? (
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryBtn}
              onPress={() => {
                if (storefrontSlug) {
                  void recordCommercialAnalyticsEvent({
                    eventType: "live_replay_view",
                    objectType: "live",
                    objectId: String(session?._id || session?.id || sessionId),
                    storefrontSlug: String(storefrontSlug)
                  });
                }
                Linking.openURL(String(replayUrl)).catch(() => {});
              }}
            >
              <Text style={styles.secondaryBtnText}>Open Replay</Text>
            </Pressable>
          ) : null}

          {canModerate && moderationUrl ? (
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryBtn}
              onPress={() => {
                try {
                  Linking.openURL(moderationUrl);
                } catch {}
              }}
            >
              <Text style={styles.secondaryBtnText}>Open Twitch Moderation</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        contentType="liveSession"
        contentId={sessionId}
        contentTitle={String(session?.title || "Live session")}
        targetUrl={`/live-session?sessionId=${encodeURIComponent(sessionId)}`}
        onSuccess={() =>
          setFeedback("Live-session report submitted for administrator review.")
        }
      />
    </ScrollView>
  );
}

export function createStyles(palette) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 18, backgroundColor: palette.page },
    hero: {
      backgroundColor: palette.hero,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 18,
      marginBottom: 14
    },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0,
      textTransform: "uppercase"
    },
    title: { color: palette.heroText, fontSize: 26, fontWeight: "900", marginTop: 6 },
    subtitle: {
      color: palette.heroMuted,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 8
    },
    row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    meta: { color: palette.textMuted, marginTop: 6, fontSize: 13 },
    errorCard: {
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 14
    },
    errorTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    error: { color: palette.danger },
    feedback: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      color: palette.textSoft,
      fontWeight: "700",
      marginBottom: 10,
      padding: 10
    },
    card: {
      backgroundColor: palette.surface,
      borderRadius: radius.card,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.border
    },
    cardTitle: { color: palette.text, fontSize: 22, fontWeight: "900" },
    description: {
      color: palette.textSoft,
      fontSize: 14,
      fontWeight: "600",
      marginTop: 8
    },
    badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    badge: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: 999,
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    embedWrap: {
      minHeight: 360,
      overflow: "hidden",
      borderRadius: radius.card,
      marginTop: 14,
      backgroundColor: palette.surfaceStrong
    },
    linkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    contextPill: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.pill,
      color: palette.info,
      fontSize: 12,
      fontWeight: "900",
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    btn: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      alignItems: "center",
      marginTop: 14,
      paddingVertical: 12
    },
    btnText: { color: palette.accentText, fontWeight: "900" },
    secondaryBtn: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      alignItems: "center",
      marginTop: 10,
      paddingVertical: 11
    },
    secondaryBtnText: { color: palette.link, fontWeight: "900" },
    completedBtn: { backgroundColor: palette.accentSoft, borderColor: palette.accent }
  });
}
