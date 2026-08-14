import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { createLive } from "@/api/lives";
import {
  connectDiscordLive,
  disconnectDiscordLive,
  getDiscordLiveConnection,
  testDiscordLiveConnection,
  type DiscordLiveConnection
} from "@/api/discordLive";
import { listVideoLibrary, type GrowPathVideo } from "@/api/videos";
import { useAuth } from "@/auth/AuthContext";
import BackButton from "@/components/nav/BackButton";
import SchedulePicker from "@/components/schedule/SchedulePicker";
import { useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type SessionType = "live" | "premiere";

export default function LiveStudioRoute() {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [sessionType, setSessionType] = useState<SessionType>("live");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [reminder, setReminder] = useState("24 hours before");
  const [sourceVideoId, setSourceVideoId] = useState("");
  const [videos, setVideos] = useState<GrowPathVideo[]>([]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [slowMode, setSlowMode] = useState("5");
  const [isPublished, setIsPublished] = useState(false);
  const [giveawayEnabled, setGiveawayEnabled] = useState(false);
  const [giveawayKeyword, setGiveawayKeyword] = useState("#giveaway");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [discord, setDiscord] = useState<DiscordLiveConnection | null>(null);
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [discordGuild, setDiscordGuild] = useState("");
  const [discordChannel, setDiscordChannel] = useState("");
  const [discordSaving, setDiscordSaving] = useState(false);
  const [discordMessage, setDiscordMessage] = useState("");

  useEffect(() => {
    if (!auth.isAuthed) return;
    listVideoLibrary(
      entitlements.mode,
      entitlements.mode === "facility" ? entitlements.facilityId || undefined : undefined
    )
      .then((result) =>
        setVideos(
          result.videos.filter(
            (video) => video.status === "published" && video.visibility !== "private"
          )
        )
      )
      .catch(() => setVideos([]));
  }, [auth.isAuthed, entitlements.facilityId, entitlements.mode]);

  useEffect(() => {
    if (!auth.isAuthed) return;
    getDiscordLiveConnection()
      .then((result) => setDiscord(result.connection || null))
      .catch(() => setDiscord(null));
  }, [auth.isAuthed]);

  async function saveDiscord() {
    setDiscordSaving(true);
    setDiscordMessage("");
    try {
      const result = await connectDiscordLive({
        webhookUrl: discordWebhook.trim(),
        guildName: discordGuild.trim(),
        channelName: discordChannel.trim()
      });
      setDiscord(result.connection);
      setDiscordWebhook("");
      setDiscordMessage("Discord announcements connected. Send a test to confirm.");
    } catch (cause: any) {
      setDiscordMessage(String(cause?.message || cause || "Unable to connect Discord."));
    } finally {
      setDiscordSaving(false);
    }
  }

  async function testDiscord() {
    setDiscordSaving(true);
    setDiscordMessage("");
    try {
      await testDiscordLiveConnection();
      setDiscordMessage("Test announcement delivered to Discord.");
      const result = await getDiscordLiveConnection();
      setDiscord(result.connection || null);
    } catch (cause: any) {
      setDiscordMessage(String(cause?.message || cause || "Discord test failed."));
    } finally {
      setDiscordSaving(false);
    }
  }

  async function removeDiscord() {
    setDiscordSaving(true);
    try {
      await disconnectDiscordLive();
      setDiscord(null);
      setDiscordMessage("Discord announcements disconnected.");
    } catch (cause: any) {
      setDiscordMessage(
        String(cause?.message || cause || "Unable to disconnect Discord.")
      );
    } finally {
      setDiscordSaving(false);
    }
  }

  async function save() {
    if (!title.trim()) {
      setError("Add a title before saving this session.");
      return;
    }
    if (sessionType === "premiere" && !sourceVideoId) {
      setError("Choose one of your published videos for the premiere.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result: any = await createLive({
        title: title.trim(),
        description: description.trim(),
        sessionType,
        sourceVideoId: sessionType === "premiere" ? sourceVideoId : null,
        startsAt: startsAt || null,
        scheduledStart: startsAt,
        reminderPreference: reminder,
        status: startsAt ? "scheduled" : "draft",
        isPublished,
        visibility: "public",
        chatEnabled,
        chatSlowModeSeconds: Math.max(0, Math.min(300, Number(slowMode) || 0)),
        overlaySettings: {
          position: "bottom_left",
          theme: "dark",
          accentColor: "#58a6ff",
          fontSize: 20,
          messageDurationSeconds: 12,
          maxMessages: 6,
          showAvatars: true,
          showGrowPathBadge: true
        },
        giveawayRelay: {
          enabled: giveawayEnabled,
          keyword: giveawayKeyword.trim() || "#giveaway",
          oneEntryPerUser: true,
          providers: []
        }
      });
      const id = String(result?.session?.id || result?.session?._id || "");
      if (!id) throw new Error("The session was saved but could not be opened.");
      router.replace(`/live-session?sessionId=${encodeURIComponent(id)}` as any);
    } catch (cause: any) {
      setError(String(cause?.message || cause || "Unable to save this session."));
    } finally {
      setSaving(false);
    }
  }

  if (!auth.isAuthed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Sign in to host a live or premiere</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton fallbackHref="/lives" />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Live Studio</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Create a live or video premiere
        </Text>
        <Text style={styles.subtitle}>
          Available to Personal, Commercial, and Facility accounts. GrowPath chat can be
          shown through OBS on Twitch, YouTube, Kick, Facebook Live, and other stream
          destinations; outside services remain responsible for giveaway selection.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Session format</Text>
        <View style={styles.row}>
          {(["live", "premiere"] as SessionType[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: sessionType === value }}
              onPress={() => setSessionType(value)}
              style={[styles.choice, sessionType === value && styles.choiceSelected]}
            >
              <Text
                style={[
                  styles.choiceText,
                  sessionType === value && styles.choiceTextSelected
                ]}
              >
                {value === "live" ? "Live stream" : "Video premiere"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Title</Text>
        <TextInput
          accessibilityLabel="Live session title"
          onChangeText={setTitle}
          placeholder="What are you sharing?"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          value={title}
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          accessibilityLabel="Live session description"
          multiline
          onChangeText={setDescription}
          placeholder="Tell viewers what they will see or learn."
          placeholderTextColor={palette.textMuted}
          style={[styles.input, styles.multiline]}
          value={description}
        />

        {sessionType === "premiere" ? (
          <View style={styles.videoSection}>
            <Text style={styles.label}>Published video</Text>
            {videos.length ? (
              videos.map((video) => (
                <Pressable
                  key={video.id}
                  onPress={() => setSourceVideoId(video.id)}
                  style={[
                    styles.videoChoice,
                    sourceVideoId === video.id && styles.videoChoiceSelected
                  ]}
                >
                  <Text style={styles.videoTitle}>{video.title}</Text>
                  <Text style={styles.muted}>
                    {sourceVideoId === video.id ? "Selected" : "Select this video"}
                  </Text>
                </Pressable>
              ))
            ) : (
              <View style={styles.notice}>
                <Text style={styles.muted}>
                  Publish a video in your Video Library before scheduling a premiere.
                </Text>
                <Pressable onPress={() => router.push("/videos?tab=library" as any)}>
                  <Text style={styles.linkText}>Open Video Library</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        <SchedulePicker
          accessibilityPrefix="Live session"
          allDay={false}
          dateTime
          dueDate={startsAt}
          onAllDayChange={() => undefined}
          onDueDateChange={setStartsAt}
          onRecurrenceChange={() => undefined}
          onReminderChange={setReminder}
          recurrence=""
          reminder={reminder}
          timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
        />

        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>GrowPath chat</Text>
            <Text style={styles.muted}>
              Viewers can chat on GrowPath during the event.
            </Text>
          </View>
          <Switch value={chatEnabled} onValueChange={setChatEnabled} />
        </View>
        {chatEnabled ? (
          <>
            <Text style={styles.label}>Slow mode (seconds)</Text>
            <TextInput
              accessibilityLabel="Live chat slow mode seconds"
              keyboardType="number-pad"
              onChangeText={setSlowMode}
              style={styles.input}
              value={slowMode}
            />
          </>
        ) : null}
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Outside-picker entry feed</Text>
            <Text style={styles.muted}>
              Exports qualifying GrowPath comments. GrowPath does not pick winners.
            </Text>
          </View>
          <Switch value={giveawayEnabled} onValueChange={setGiveawayEnabled} />
        </View>
        {giveawayEnabled ? (
          <>
            <Text style={styles.label}>Entry hashtag or keyword</Text>
            <TextInput
              accessibilityLabel="Outside picker entry keyword"
              onChangeText={setGiveawayKeyword}
              style={styles.input}
              value={giveawayKeyword}
            />
          </>
        ) : null}
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Publish now</Text>
            <Text style={styles.muted}>Otherwise this stays a private draft.</Text>
          </View>
          <Switch value={isPublished} onValueChange={setIsPublished} />
        </View>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Discord live announcements
        </Text>
        <Text style={styles.muted}>
          With permission from the server administrator, GrowPath can announce scheduled
          sessions, premieres, live-now status, and replays in one Discord channel. It
          does not read or copy server chat.
        </Text>
        {discord ? (
          <View style={styles.notice}>
            <Text style={styles.settingTitle}>
              {discord.guildName || "Discord server"}
              {discord.channelName ? ` · #${discord.channelName}` : ""}
            </Text>
            <Text style={styles.muted}>
              {discord.status === "connected" ? "Connected" : "Needs attention"}
              {discord.lastDeliveryStatus
                ? ` · last delivery ${discord.lastDeliveryStatus}`
                : ""}
            </Text>
            {discord.lastError ? (
              <Text style={styles.error}>{discord.lastError}</Text>
            ) : null}
            <View style={styles.row}>
              <Pressable
                disabled={discordSaving}
                onPress={testDiscord}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Send test</Text>
              </Pressable>
              <Pressable
                disabled={discordSaving}
                onPress={removeDiscord}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Disconnect</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Discord incoming webhook URL</Text>
            <TextInput
              accessibilityLabel="Discord incoming webhook URL"
              autoCapitalize="none"
              onChangeText={setDiscordWebhook}
              placeholder="Paste the webhook from the authorized Discord channel"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
              style={styles.input}
              value={discordWebhook}
            />
            <View style={styles.row}>
              <TextInput
                accessibilityLabel="Discord server name"
                onChangeText={setDiscordGuild}
                placeholder="Server name"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.flexInput]}
                value={discordGuild}
              />
              <TextInput
                accessibilityLabel="Discord channel name"
                onChangeText={setDiscordChannel}
                placeholder="Channel name"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.flexInput]}
                value={discordChannel}
              />
            </View>
            <Pressable
              disabled={discordSaving || !discordWebhook.trim()}
              onPress={saveDiscord}
              style={[
                styles.secondaryButton,
                (discordSaving || !discordWebhook.trim()) && styles.disabled
              ]}
            >
              <Text style={styles.secondaryButtonText}>Connect Discord channel</Text>
            </Pressable>
          </>
        )}
        {discordMessage ? <Text style={styles.muted}>{discordMessage}</Text> : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={save}
        style={[styles.primaryButton, saving && styles.disabled]}
      >
        <Text style={styles.primaryButtonText}>
          {saving ? "Saving..." : isPublished ? "Publish session" : "Save draft"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { backgroundColor: palette.page, gap: 14, padding: 16, paddingBottom: 48 },
    centered: {
      alignItems: "center",
      backgroundColor: palette.page,
      flex: 1,
      gap: 16,
      justifyContent: "center",
      padding: 24
    },
    hero: {
      backgroundColor: palette.hero,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 7,
      padding: 18
    },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: { color: palette.heroText, fontSize: 28, fontWeight: "900" },
    subtitle: { color: palette.heroMuted, lineHeight: 21 },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      padding: 16
    },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    choice: {
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    choiceSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    choiceText: { color: palette.text, fontWeight: "800" },
    choiceTextSelected: { color: palette.accentText },
    label: { color: palette.text, fontWeight: "800", marginTop: 4 },
    sectionTitle: { color: palette.text, fontSize: 20, fontWeight: "900" },
    input: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      color: palette.text,
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    multiline: { minHeight: 100, textAlignVertical: "top" },
    videoSection: { gap: 9 },
    videoChoice: {
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      gap: 3,
      padding: 12
    },
    videoChoiceSelected: { borderColor: palette.accent, borderWidth: 2 },
    videoTitle: { color: palette.text, fontWeight: "900" },
    notice: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.pill,
      gap: 8,
      padding: 12
    },
    settingRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between"
    },
    settingCopy: { flex: 1, gap: 3 },
    flexInput: { flex: 1, minWidth: 180 },
    settingTitle: { color: palette.text, fontWeight: "900" },
    muted: { color: palette.textMuted, lineHeight: 20 },
    linkText: { color: palette.accent, fontWeight: "900" },
    error: { color: palette.danger, fontWeight: "800" },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.pill,
      minHeight: 50,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.accent,
      borderRadius: radius.pill,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryButtonText: { color: palette.accent, fontWeight: "900" },
    disabled: { opacity: 0.55 }
  });
}
