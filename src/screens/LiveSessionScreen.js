import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useAuth } from "@/auth/AuthContext";
import { apiRequest } from "../api/apiRequest";
import { listPersonalGrows } from "../api/grows";
import { createPersonalTask } from "../api/tasks";
import LiveSessionTwitchEmbed from "./LiveSessionTwitchEmbed";
import GrowPathHostedLivePlayer from "./GrowPathHostedLivePlayer";
import { useAppTheme } from "../theme/appTheme";
import { radius } from "../theme/theme";
import { recordCommercialAnalyticsEvent } from "../api/commercialAnalytics";
import ReportModal from "../components/ReportModal";
import { currentPublicUrl, sharePublicLink } from "../utils/publicLinks";
import {
  deleteLiveChatMessage,
  getHostedLiveLifecycle,
  getHostedLivePlayback,
  listLiveChat,
  releaseHostedLiveInput,
  rotateLiveOverlayToken,
  sendLiveChat,
  updateLive
} from "../api/lives";

export function buildLiveShareTargets(title, sessionId) {
  const url = currentPublicUrl(
    `/live-session?sessionId=${encodeURIComponent(String(sessionId || ""))}`
  );
  const message = `${String(title || "Watch this GrowPath live")} ${url}`;
  return {
    url,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodeURIComponent(message)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(String(title || "GrowPath live"))}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    email: `mailto:?subject=${encodeURIComponent(String(title || "GrowPath live"))}&body=${encodeURIComponent(message)}`,
    text: `sms:?&body=${encodeURIComponent(message)}`
  };
}

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
  const [shareFeedback, setShareFeedback] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSaving, setChatSaving] = useState(false);
  const [chatError, setChatError] = useState("");
  const [overlayToken, setOverlayToken] = useState("");
  const [reportedChatMessage, setReportedChatMessage] = useState(null);
  const [hostedPlayback, setHostedPlayback] = useState(null);
  const [hostedLifecycle, setHostedLifecycle] = useState("");
  const [endingLive, setEndingLive] = useState(false);

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
  const streamPlatform = String(
    session?.streamPlatform || (twitchChannel ? "twitch" : "other")
  );
  const streamPlatformLabel =
    String(session?.externalPlatformLabel || "") ||
    { twitch: "Twitch", youtube: "YouTube", kick: "Kick", facebook: "Facebook Live" }[
      streamPlatform
    ] ||
    "Streaming service";
  const watchUrl = String(
    session?.externalWatchUrl ||
      (twitchChannel ? `https://www.twitch.tv/${twitchChannel}` : "")
  );
  const isGrowPathHosted = session?.broadcastMode === "growpath";

  useEffect(() => {
    if (!sessionId || !isGrowPathHosted) return undefined;
    let alive = true;
    let timeout;
    async function refreshHostedVideo() {
      try {
        const status = await getHostedLiveLifecycle(sessionId);
        if (!alive) return;
        setHostedLifecycle(String(status?.lifecycle || status?.status || "connecting"));
        if (
          ["connected", "degraded", "ended", "replay"].includes(
            String(status?.lifecycle || status?.status)
          )
        ) {
          const playback = await getHostedLivePlayback(sessionId).catch(() => null);
          if (alive && playback?.playerUrl) setHostedPlayback(playback);
        }
      } catch {
        if (alive) setHostedLifecycle("connecting");
      } finally {
        if (alive) timeout = setTimeout(refreshHostedVideo, 5000);
      }
    }
    void refreshHostedVideo();
    return () => {
      alive = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [isGrowPathHosted, sessionId]);
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
  const shareTargets = buildLiveShareTargets(
    session?.title,
    session?._id || session?.id || sessionId
  );

  async function shareGrowPathSession() {
    try {
      const result = await sharePublicLink(
        String(session?.title || "GrowPath live"),
        `/live-session?sessionId=${encodeURIComponent(String(session?._id || session?.id || sessionId))}`
      );
      setShareFeedback(
        result.method === "web-clipboard"
          ? "GrowPath session link copied."
          : "GrowPath session share options opened."
      );
    } catch {
      setShareFeedback("Unable to open sharing. Use Copy Link instead.");
    }
  }

  async function copyGrowPathSession() {
    const clipboard = globalThis?.navigator?.clipboard;
    if (typeof clipboard?.writeText === "function") {
      await clipboard.writeText(shareTargets.url);
      setShareFeedback("GrowPath session link copied.");
      return;
    }
    await shareGrowPathSession();
  }
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
  const isHost = Boolean(signedInUserId && ownerId === signedInUserId);

  useEffect(() => {
    if (!sessionId || !session?.chatEnabled) return undefined;
    let alive = true;
    let timeout;
    async function refreshChat({ initial = false } = {}) {
      if (initial && alive) setChatLoading(true);
      try {
        const result = await listLiveChat(sessionId);
        if (!alive) return;
        setChatMessages(Array.isArray(result?.messages) ? result.messages : []);
        setChatError("");
      } catch (error) {
        if (alive)
          setChatError(String(error?.message || error || "Chat could not be loaded."));
      } finally {
        if (alive) {
          if (initial) setChatLoading(false);
          timeout = setTimeout(() => void refreshChat(), 3000);
        }
      }
    }
    void refreshChat({ initial: true });
    return () => {
      alive = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [session?.chatEnabled, sessionId]);

  async function postChatMessage() {
    const body = chatText.trim();
    if (!body || chatSaving) return;
    setChatSaving(true);
    setChatError("");
    try {
      const result = await sendLiveChat(sessionId, body);
      if (result?.message) setChatMessages((rows) => [...rows, result.message]);
      setChatText("");
      if (result?.externalPickerRelay?.status === "identity_connection_required") {
        setFeedback(
          "Your giveaway keyword was recorded. Connect the matching streaming identity before a platform-only picker can count it."
        );
      }
    } catch (error) {
      setChatError(String(error?.message || error || "Chat message not sent."));
    } finally {
      setChatSaving(false);
    }
  }

  async function removeChatMessage(messageId) {
    try {
      await deleteLiveChatMessage(sessionId, messageId, isHost ? "Host moderation" : "");
      setChatMessages((rows) =>
        rows.filter((row) => String(row?.id) !== String(messageId))
      );
    } catch (error) {
      setChatError(String(error?.message || error || "Chat message not removed."));
    }
  }

  async function rotateOverlay() {
    try {
      const result = await rotateLiveOverlayToken(sessionId);
      setOverlayToken(String(result?.overlayToken || ""));
    } catch (error) {
      Alert.alert(
        "Overlay link not created",
        String(error?.message || error || "Try again.")
      );
    }
  }

  async function copyText(value, successMessage) {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(value);
      setFeedback(successMessage);
    } catch (error) {
      setChatError(String(error?.message || error || "Unable to copy this link."));
    }
  }

  async function endBroadcast() {
    if (endingLive) return;
    setEndingLive(true);
    try {
      if (isGrowPathHosted) await releaseHostedLiveInput(sessionId);
      const result = await updateLive(sessionId, { status: "ended" });
      setSession(result?.session || result || { ...session, status: "ended" });
      setHostedLifecycle("ended");
      setFeedback(
        isGrowPathHosted
          ? "Broadcast ended. Your OBS channel remains saved for the next live."
          : "Live session ended."
      );
    } catch (error) {
      setFeedback(String(error?.message || error || "The live could not be ended."));
    } finally {
      setEndingLive(false);
    }
  }

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
          {watchUrl ? (
            <Text style={styles.meta}>Streaming on {streamPlatformLabel}</Text>
          ) : null}

          <View style={styles.sharePanel} accessibilityLabel="Share GrowPath session">
            <Text accessibilityRole="header" aria-level={2} style={styles.chatTitle}>
              Share this {session.sessionType === "premiere" ? "premiere" : "stream"}
            </Text>
            <Text style={styles.meta}>
              Share the GrowPath page so people can watch, RSVP, join chat, and return for
              the replay.
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={shareGrowPathSession}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Share</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={copyGrowPathSession}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Copy Link</Text>
              </Pressable>
              {[
                ["Facebook", shareTargets.facebook],
                ["X", shareTargets.x],
                ["Bluesky", shareTargets.bluesky],
                ["Reddit", shareTargets.reddit],
                ["LinkedIn", shareTargets.linkedin],
                ["Email", shareTargets.email],
                ["Text", shareTargets.text]
              ].map(([label, url]) => (
                <Pressable
                  key={label}
                  accessibilityRole="link"
                  onPress={() => Linking.openURL(url).catch(() => {})}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {shareFeedback ? (
              <Text accessibilityLiveRegion="polite" style={styles.meta}>
                {shareFeedback}
              </Text>
            ) : null}
          </View>

          {isGrowPathHosted && hostedPlayback?.playerUrl ? (
            <View style={styles.embedWrap}>
              <GrowPathHostedLivePlayer playerUrl={String(hostedPlayback.playerUrl)} />
            </View>
          ) : isGrowPathHosted ? (
            <View style={styles.premiereNotice}>
              <Text style={styles.premiereTitle}>
                GrowPath video · {hostedLifecycle || "connecting"}
              </Text>
              <Text style={styles.meta}>
                {hostedLifecycle === "ended"
                  ? "This broadcast ended. Its replay will appear here when processing finishes."
                  : "The session page and chat are ready. Video appears when the host connects OBS and the stream becomes available."}
              </Text>
            </View>
          ) : twitchChannel || twitchVodId ? (
            <View style={styles.embedWrap}>
              <LiveSessionTwitchEmbed
                twitchChannel={twitchVodId || twitchChannel}
                embedType={twitchVodId ? "vod" : "live"}
                chatEnabled={!twitchVodId && Boolean(session.chatEnabled)}
              />
            </View>
          ) : (
            <Text style={styles.meta}>
              {watchUrl
                ? `Use the ${streamPlatformLabel} watch button below for video. GrowPath chat remains here.`
                : "No video destination is attached to this live yet."}
            </Text>
          )}

          {isHost && session.status === "live" ? (
            <Pressable
              accessibilityRole="button"
              disabled={endingLive}
              onPress={() => void endBroadcast()}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>
                {endingLive ? "Ending broadcast..." : "End broadcast"}
              </Text>
            </Pressable>
          ) : null}

          {session.sessionType === "premiere" ? (
            <View style={styles.premiereNotice}>
              <Text style={styles.premiereTitle}>GrowPath video premiere</Text>
              <Text style={styles.meta}>
                This scheduled session plays a published GrowPath video with live chat.
              </Text>
              {session.sourceVideoId ? (
                <Link href={`/videos/${String(session.sourceVideoId)}`} asChild>
                  <Pressable accessibilityRole="button" style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>Open Premiere Video</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          ) : null}

          {session.chatEnabled ? (
            <View style={styles.chatPanel}>
              <Text accessibilityRole="header" aria-level={2} style={styles.chatTitle}>
                GrowPath Chat
              </Text>
              <Text style={styles.meta}>
                Messages can appear in the host&apos;s GrowPath OBS overlay. Outside
                giveaway pickers remain controlled by the streamer.
              </Text>
              {chatLoading ? <ActivityIndicator color={palette.accent} /> : null}
              {chatError ? <Text style={styles.error}>{chatError}</Text> : null}
              <View style={styles.chatList}>
                {chatMessages.map((message) => {
                  const mayRemove =
                    isHost || String(message?.author?.id || "") === signedInUserId;
                  return (
                    <View key={String(message?.id)} style={styles.chatMessage}>
                      {message?.author?.avatarUrl ? (
                        <Image
                          accessibilityLabel={`${message.author.displayName} avatar`}
                          source={{ uri: message.author.avatarUrl }}
                          style={styles.chatAvatar}
                        />
                      ) : (
                        <View style={styles.chatAvatarFallback}>
                          <Text style={styles.chatAvatarText}>
                            {String(message?.author?.displayName || "G")
                              .slice(0, 1)
                              .toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.chatCopy}>
                        <Text style={styles.chatAuthor}>
                          {String(message?.author?.displayName || "GrowPath member")}
                          {message?.giveawayEntry ? " · entry recorded" : ""}
                        </Text>
                        <Text style={styles.chatBody}>{String(message?.body || "")}</Text>
                      </View>
                      <View style={styles.chatActions}>
                        {auth.isAuthed &&
                        String(message?.author?.id || "") !== signedInUserId ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setReportedChatMessage(message)}
                          >
                            <Text style={styles.chatActionText}>Report</Text>
                          </Pressable>
                        ) : null}
                        {mayRemove ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void removeChatMessage(message.id)}
                          >
                            <Text style={styles.removeChat}>Remove</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
              {auth.isAuthed ? (
                <View style={styles.chatComposer}>
                  <TextInput
                    accessibilityLabel="Write a GrowPath live chat message"
                    maxLength={500}
                    onChangeText={setChatText}
                    placeholder="Write a message"
                    placeholderTextColor={palette.textMuted}
                    style={styles.chatInput}
                    value={chatText}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={!chatText.trim() || chatSaving}
                    onPress={() => void postChatMessage()}
                    style={[
                      styles.btn,
                      (!chatText.trim() || chatSaving) && styles.disabled
                    ]}
                  >
                    <Text style={styles.btnText}>
                      {chatSaving ? "Sending..." : "Send"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.meta}>Sign in to join GrowPath Chat.</Text>
              )}
            </View>
          ) : null}

          {isHost ? (
            <View style={styles.overlayPanel}>
              <Text accessibilityRole="header" aria-level={2} style={styles.chatTitle}>
                Stream overlay
              </Text>
              <Text style={styles.meta}>
                Create a private Browser Source link for OBS. Rotating it immediately
                invalidates the previous link.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void rotateOverlay()}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>
                  {overlayToken ? "Rotate OBS Overlay Link" : "Create OBS Overlay Link"}
                </Text>
              </Pressable>
              {overlayToken ? (
                <View style={styles.overlayUrlBox}>
                  <Text selectable style={styles.overlayUrl}>
                    {`https://growpathai.com/live-overlay?token=${encodeURIComponent(overlayToken)}`}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      void copyText(
                        `https://growpathai.com/live-overlay?token=${encodeURIComponent(overlayToken)}`,
                        "OBS overlay link copied."
                      )
                    }
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryBtnText}>Copy OBS Overlay Link</Text>
                  </Pressable>
                  <Link
                    href={`/live-overlay?token=${encodeURIComponent(overlayToken)}`}
                    asChild
                  >
                    <Pressable accessibilityRole="button" style={styles.secondaryBtn}>
                      <Text style={styles.secondaryBtnText}>Preview Overlay</Text>
                    </Pressable>
                  </Link>
                  {session?.giveawayRelay?.enabled ? (
                    <View style={styles.externalFeedBox}>
                      <Text style={styles.chatAuthor}>Outside-picker entry feed</Text>
                      <Text style={styles.meta}>
                        GrowPath never chooses the winner. Give these private JSON or CSV
                        feeds only to a compatible outside picker or stream tool.
                      </Text>
                      <Text selectable style={styles.overlayUrl}>
                        {`https://growpathai.com/api/lives/giveaway-feed/${encodeURIComponent(overlayToken)}`}
                      </Text>
                      <Text selectable style={styles.overlayUrl}>
                        {`https://growpathai.com/api/lives/giveaway-feed/${encodeURIComponent(overlayToken)}?format=csv`}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

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
              <Text style={styles.btnText}>Watch on {streamPlatformLabel}</Text>
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
      <ReportModal
        visible={Boolean(reportedChatMessage)}
        onClose={() => setReportedChatMessage(null)}
        contentType="liveChatMessage"
        contentId={String(reportedChatMessage?.id || "")}
        contentTitle={`Chat message in ${String(session?.title || "live session")}`}
        targetUrl={`/live-session?sessionId=${encodeURIComponent(sessionId)}&messageId=${encodeURIComponent(String(reportedChatMessage?.id || ""))}`}
        parentPostId={sessionId}
        onSuccess={() =>
          setFeedback("Chat-message report submitted for administrator review.")
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
    completedBtn: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
    premiereNotice: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 14,
      padding: 12
    },
    premiereTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    chatPanel: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 16,
      padding: 12
    },
    chatTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    chatList: { gap: 8, marginTop: 12 },
    chatMessage: {
      alignItems: "flex-start",
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      flexDirection: "row",
      gap: 8,
      padding: 10
    },
    chatAvatar: { borderRadius: 16, height: 32, width: 32 },
    chatAvatarFallback: {
      alignItems: "center",
      backgroundColor: palette.accentSoft,
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32
    },
    chatAvatarText: { color: palette.link, fontWeight: "900" },
    chatCopy: { flex: 1 },
    chatActions: { alignItems: "flex-end", gap: 7 },
    chatActionText: { color: palette.link, fontSize: 12, fontWeight: "800" },
    chatAuthor: { color: palette.text, fontSize: 12, fontWeight: "900" },
    chatBody: { color: palette.text, lineHeight: 19, marginTop: 3 },
    removeChat: { color: palette.danger, fontSize: 12, fontWeight: "800" },
    chatComposer: { gap: 8, marginTop: 12 },
    chatInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      padding: 11
    },
    overlayPanel: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      marginTop: 16,
      padding: 12
    },
    overlayUrlBox: { gap: 8, marginTop: 10 },
    externalFeedBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    sharePanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: 10,
      marginTop: 14,
      padding: 14
    },
    overlayUrl: {
      backgroundColor: palette.page,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontFamily: "monospace",
      padding: 10
    },
    disabled: { opacity: 0.55 }
  });
}
