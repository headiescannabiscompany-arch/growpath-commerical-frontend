import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import {
  createLive,
  getHostedLiveStatus,
  listHostedLiveChannels,
  provisionHostedLiveInput
} from "@/api/lives";
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
type BroadcastMode = "external" | "growpath";
type StreamPlatform = "twitch" | "youtube" | "kick" | "facebook" | "instagram" | "other";

type HostedChannel = { id: string; label: string; lifecycle?: string };
type HostedCredentials = { rtmpsUrl?: string; streamKey?: string };

const STREAM_DESTINATIONS: Array<{ value: StreamPlatform; label: string }> = [
  { value: "twitch", label: "Twitch" },
  { value: "youtube", label: "YouTube" },
  { value: "kick", label: "Kick" },
  { value: "facebook", label: "Facebook Live" },
  { value: "instagram", label: "Instagram Live" },
  { value: "other", label: "Another service" }
];

export default function LiveStudioRoute() {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [sessionType, setSessionType] = useState<SessionType>("live");
  const [broadcastMode, setBroadcastMode] = useState<BroadcastMode>("external");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamPlatform, setStreamPlatform] = useState<StreamPlatform>("twitch");
  const [twitchChannel, setTwitchChannel] = useState("");
  const [externalWatchUrl, setExternalWatchUrl] = useState("");
  const [externalPlatformLabel, setExternalPlatformLabel] = useState("");
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
  const [hostedStatus, setHostedStatus] = useState<any>(null);
  const [hostedChannels, setHostedChannels] = useState<HostedChannel[]>([]);
  const [hostedChannelId, setHostedChannelId] = useState("");
  const [hostedChannelLabel, setHostedChannelLabel] = useState("My OBS channel");
  const [hostedCredentials, setHostedCredentials] = useState<HostedCredentials | null>(
    null
  );
  const [savedSessionId, setSavedSessionId] = useState("");

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

  useEffect(() => {
    if (!auth.isAuthed) return;
    Promise.all([getHostedLiveStatus(), listHostedLiveChannels()])
      .then(([status, channels]) => {
        const availableChannels = Array.isArray(channels) ? channels : [];
        setHostedStatus(status);
        setHostedChannels(availableChannels);
        setHostedChannelId((current) => current || availableChannels[0]?.id || "");
      })
      .catch(() => {
        setHostedStatus({ enabled: false });
        setHostedChannels([]);
      });
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
    if (
      sessionType === "live" &&
      broadcastMode === "growpath" &&
      !hostedStatus?.enabled
    ) {
      setError(
        "GrowPath-hosted broadcasting is not activated yet. Use an outside live URL for now."
      );
      return;
    }
    if (
      sessionType === "live" &&
      broadcastMode === "external" &&
      streamPlatform === "twitch" &&
      !twitchChannel.trim()
    ) {
      setError("Add the Twitch channel viewers should watch.");
      return;
    }
    if (
      sessionType === "live" &&
      broadcastMode === "external" &&
      streamPlatform !== "twitch" &&
      !/^https:\/\//i.test(externalWatchUrl.trim())
    ) {
      setError("Add the secure https watch URL for this stream.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result: any = await createLive({
        title: title.trim(),
        description: description.trim(),
        sessionType,
        streamPlatform:
          sessionType === "premiere" || broadcastMode === "growpath"
            ? "growpath"
            : streamPlatform,
        broadcastMode: sessionType === "live" ? broadcastMode : "external",
        twitchChannel:
          sessionType === "live" &&
          broadcastMode === "external" &&
          streamPlatform === "twitch"
            ? twitchChannel.trim()
            : "",
        externalWatchUrl:
          sessionType === "live" &&
          broadcastMode === "external" &&
          streamPlatform !== "twitch"
            ? externalWatchUrl.trim()
            : "",
        externalPlatformLabel:
          sessionType === "live" && streamPlatform === "other"
            ? externalPlatformLabel.trim()
            : "",
        sourceVideoId: sessionType === "premiere" ? sourceVideoId : null,
        startsAt: startsAt || null,
        scheduledStart: startsAt,
        reminderPreference: reminder,
        status: startsAt ? "scheduled" : isPublished ? "live" : "draft",
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
      if (sessionType === "live" && broadcastMode === "growpath") {
        const provisioned: any = await provisionHostedLiveInput(
          id,
          hostedChannelId
            ? { channelId: hostedChannelId }
            : { channelLabel: hostedChannelLabel.trim() || "My OBS channel" }
        );
        setSavedSessionId(id);
        setHostedCredentials(provisioned?.credentials || null);
        if (!provisioned?.credentials) {
          router.replace(`/live-session?sessionId=${encodeURIComponent(id)}` as any);
        }
        return;
      }
      router.replace(`/live-session?sessionId=${encodeURIComponent(id)}` as any);
    } catch (cause: any) {
      setError(String(cause?.message || cause || "Unable to save this session."));
    } finally {
      setSaving(false);
    }
  }

  async function copyCredential(value: string, label: string) {
    try {
      if (Platform.OS !== "web" || !globalThis.navigator?.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await globalThis.navigator.clipboard.writeText(value);
      setError(
        `${label} copied. Save it in OBS now; GrowPath will not show the stream key again.`
      );
    } catch {
      setError(`Select and copy the ${label.toLowerCase()} shown below.`);
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
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Create a live or video premiere
        </Text>
        <Text style={styles.subtitle}>
          Available to Personal, Commercial, and Facility accounts. GrowPath chat can be
          shown through OBS on Twitch, YouTube, Kick, Facebook Live, and other stream
          destinations; outside services remain responsible for giveaway selection.
        </Text>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
          Playback and broadcast controls
        </Text>
        <Text style={styles.muted}>
          People watching inside GrowPath use the player controls for play, pause, volume,
          mute, fullscreen, captions, and replay seeking when the source supports them.
        </Text>
        <Text style={styles.muted}>
          Broadcasters use OBS, Streamlabs, or their destination to control cameras,
          microphones, scenes, screen sharing, bitrate, and the outgoing audio mix.
          GrowPath organizes the session, chat, premiere, replay, and viewer experience.
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

        {sessionType === "live" ? (
          <View style={styles.videoSection}>
            <Text accessibilityRole="header" aria-level={3} style={styles.sectionTitle}>
              Choose how you broadcast
            </Text>
            <Text style={styles.muted}>
              Both choices keep the same GrowPath session page, chat, reminders, sharing,
              and replay history.
            </Text>
            <View style={styles.row}>
              {(
                [
                  { value: "external", label: "Use an outside live URL" },
                  { value: "growpath", label: "Broadcast live in GrowPath" }
                ] as Array<{ value: BroadcastMode; label: string }>
              ).map((mode) => (
                <Pressable
                  key={mode.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: broadcastMode === mode.value }}
                  onPress={() => setBroadcastMode(mode.value)}
                  style={[
                    styles.choice,
                    broadcastMode === mode.value && styles.choiceSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      broadcastMode === mode.value && styles.choiceTextSelected
                    ]}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {broadcastMode === "external" ? (
              <>
                <Text style={styles.label}>Outside service</Text>
                <View style={styles.row}>
                  {STREAM_DESTINATIONS.map((destination) => (
                    <Pressable
                      key={destination.value}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: streamPlatform === destination.value
                      }}
                      onPress={() => setStreamPlatform(destination.value)}
                      style={[
                        styles.choice,
                        streamPlatform === destination.value && styles.choiceSelected
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          streamPlatform === destination.value &&
                            styles.choiceTextSelected
                        ]}
                      >
                        {destination.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {streamPlatform === "twitch" ? (
                  <>
                    <Text style={styles.label}>Twitch channel</Text>
                    <TextInput
                      accessibilityLabel="Twitch channel viewers will watch"
                      autoCapitalize="none"
                      onChangeText={setTwitchChannel}
                      placeholder="channel name"
                      placeholderTextColor={palette.textMuted}
                      style={styles.input}
                      value={twitchChannel}
                    />
                  </>
                ) : (
                  <>
                    {streamPlatform === "other" ? (
                      <>
                        <Text style={styles.label}>Service name</Text>
                        <TextInput
                          accessibilityLabel="Other streaming service name"
                          onChangeText={setExternalPlatformLabel}
                          placeholder="Streaming service"
                          placeholderTextColor={palette.textMuted}
                          style={styles.input}
                          value={externalPlatformLabel}
                        />
                      </>
                    ) : null}
                    <Text style={styles.label}>Viewer watch URL</Text>
                    <TextInput
                      accessibilityLabel={`${streamPlatform} viewer watch URL`}
                      autoCapitalize="none"
                      keyboardType="url"
                      onChangeText={setExternalWatchUrl}
                      placeholder="https://..."
                      placeholderTextColor={palette.textMuted}
                      style={styles.input}
                      value={externalWatchUrl}
                    />
                  </>
                )}
              </>
            ) : hostedStatus?.enabled ? (
              <View style={styles.hostedPanel}>
                <Text style={styles.settingTitle}>Your reusable OBS connection</Text>
                <Text style={styles.muted}>
                  Save one GrowPath channel in OBS and reuse it for future broadcasts.
                  Ending a live keeps the connection; rotating or removing it changes the
                  key.
                </Text>
                {hostedChannels.length ? (
                  <>
                    <Text style={styles.label}>Saved channel</Text>
                    <View style={styles.row}>
                      {hostedChannels.map((channel) => (
                        <Pressable
                          key={channel.id}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: hostedChannelId === channel.id }}
                          onPress={() => setHostedChannelId(channel.id)}
                          style={[
                            styles.choice,
                            hostedChannelId === channel.id && styles.choiceSelected
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              hostedChannelId === channel.id && styles.choiceTextSelected
                            ]}
                          >
                            {channel.label}
                          </Text>
                        </Pressable>
                      ))}
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: !hostedChannelId }}
                        onPress={() => setHostedChannelId("")}
                        style={[styles.choice, !hostedChannelId && styles.choiceSelected]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            !hostedChannelId && styles.choiceTextSelected
                          ]}
                        >
                          New channel
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}
                {!hostedChannelId ? (
                  <>
                    <Text style={styles.label}>Channel name</Text>
                    <TextInput
                      accessibilityLabel="Reusable OBS channel name"
                      onChangeText={setHostedChannelLabel}
                      style={styles.input}
                      value={hostedChannelLabel}
                    />
                  </>
                ) : null}
                <Text style={styles.muted}>
                  {hostedStatus.remainingMonthlyMinutes} of{" "}
                  {hostedStatus.limits?.monthlyMinutes} hosted stream minutes remain this
                  month. Maximum session: {hostedStatus.limits?.sessionMinutes} minutes.
                </Text>
              </View>
            ) : (
              <View style={styles.notice}>
                <Text style={styles.settingTitle}>
                  GrowPath-hosted broadcasting is not activated yet
                </Text>
                <Text style={styles.muted}>
                  Outside live URLs and premieres still work. Hosted OBS broadcasting will
                  appear here after the streaming provider is activated.
                </Text>
              </View>
            )}
          </View>
        ) : null}

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
            <Text style={styles.settingTitle}>Go live now</Text>
            <Text style={styles.muted}>
              Publishes this session now. Leave off to save a private draft or scheduled
              session.
            </Text>
          </View>
          <Switch value={isPublished} onValueChange={setIsPublished} />
        </View>
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
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
                accessibilityRole="button"
                disabled={discordSaving}
                onPress={testDiscord}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Send test</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
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
              accessibilityRole="button"
              accessibilityLabel="Connect Discord channel"
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

      {hostedCredentials && savedSessionId ? (
        <View style={styles.secretCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
            Save this GrowPath channel in OBS now
          </Text>
          <Text style={styles.secretWarning}>
            The stream key is shown once. Do not share it. OBS can retain both fields so
            this account can reuse the same channel for later lives.
          </Text>
          <Text style={styles.label}>OBS server</Text>
          <Text selectable style={styles.secretValue}>
            {hostedCredentials.rtmpsUrl}
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              void copyCredential(String(hostedCredentials.rtmpsUrl || ""), "OBS server")
            }
          >
            <Text style={styles.secondaryButtonText}>Copy OBS server</Text>
          </Pressable>
          <Text style={styles.label}>Stream key</Text>
          <Text selectable style={styles.secretValue}>
            {hostedCredentials.streamKey}
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              void copyCredential(String(hostedCredentials.streamKey || ""), "Stream key")
            }
          >
            <Text style={styles.secondaryButtonText}>Copy stream key</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.replace(
                `/live-session?sessionId=${encodeURIComponent(savedSessionId)}` as any
              )
            }
          >
            <Text style={styles.primaryButtonText}>I saved it in OBS · Open session</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={saving || Boolean(hostedCredentials)}
        onPress={save}
        style={[
          styles.primaryButton,
          (saving || Boolean(hostedCredentials)) && styles.disabled
        ]}
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
    hostedPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    secretCard: {
      backgroundColor: palette.surface,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 2,
      gap: 10,
      padding: 16
    },
    secretWarning: { color: palette.warning, fontWeight: "900", lineHeight: 20 },
    secretValue: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      color: palette.text,
      fontFamily: "monospace",
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
