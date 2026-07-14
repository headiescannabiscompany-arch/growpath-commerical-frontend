import { Link, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import {
  CommercialLiveEvent,
  createCommercialLive,
  fetchCommercialLives
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import SchedulePicker from "@/components/schedule/SchedulePicker";
import { radius } from "@/theme/theme";
import { persistImageUri, resolveImageUri } from "@/utils/photoUploads";

type LiveForm = {
  title: string;
  description: string;
  thumbnailUrl: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  scheduleReminder: string;
  scheduleRecurrence: string;
  allDay: boolean;
  twitchChannelName: string;
  twitchChannelId: string;
  twitchEmbedUrl: string;
  eventSubStatus: string;
  relatedCourseId: string;
  relatedProductId: string;
  relatedFeedCampaignId: string;
  forumThreadId: string;
  growInterests: string;
  visibility: NonNullable<CommercialLiveEvent["visibility"]>;
  replayUrl: string;
};

const EMPTY_FORM: LiveForm = {
  title: "",
  description: "",
  thumbnailUrl: "",
  scheduledStart: "",
  scheduledEnd: "",
  timezone: "America/New_York",
  scheduleReminder: "24 hours before",
  scheduleRecurrence: "",
  allDay: false,
  twitchChannelName: "",
  twitchChannelId: "",
  twitchEmbedUrl: "",
  eventSubStatus: "not_connected",
  relatedCourseId: "",
  relatedProductId: "",
  relatedFeedCampaignId: "",
  forumThreadId: "",
  growInterests: "",
  visibility: "public",
  replayUrl: ""
};

const notificationPlan = [
  "new_live_scheduled",
  "24h_before",
  "1h_before",
  "15m_before",
  "live_now",
  "replay_available"
];

function liveId(live: CommercialLiveEvent) {
  return live.id || live._id || live.title || "live";
}

function splitStatus(lives: CommercialLiveEvent[]) {
  return {
    upcoming: lives.filter((live) =>
      ["draft", "scheduled"].includes(String(live.status || "scheduled"))
    ).length,
    liveNow: lives.filter((live) => live.status === "live").length,
    replays: lives.filter((live) => live.status === "replay_available" || live.replayUrl)
      .length
  };
}

function liveSetupWarnings(live: Partial<CommercialLiveEvent>) {
  const warnings: string[] = [];
  if (!live.thumbnailUrl?.trim()) warnings.push("add thumbnail");
  if (!live.description?.trim()) warnings.push("add description");
  if (!live.scheduledStart?.trim()) warnings.push("schedule date/time");
  if (!live.twitchChannelName?.trim() && !live.twitchChannelId?.trim()) {
    warnings.push("connect Twitch channel");
  }
  if (!live.twitchEmbedUrl?.trim()) warnings.push("test Twitch embed");
  if (String(live.eventSubStatus || "not_connected") !== "connected") {
    warnings.push("connect EventSub live status");
  }
  if (!live.notificationPlan?.length) warnings.push("attach reminder plan");
  return warnings;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function liveFeedCampaignId(live: CommercialLiveEvent) {
  return String(
    (live as any).relatedFeedCampaignId ||
      (live as any).linkedFeedCampaignId ||
      live.relatedFeedPostId ||
      ""
  );
}

function liveThumbnail(live: CommercialLiveEvent) {
  return resolveImageUri(
    live.thumbnailUrl ||
      (live as any).imageUrl ||
      (live as any).bannerUrl ||
      (live as any).coverImageUrl ||
      ""
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialLivesRoute() {
  const params = useLocalSearchParams<{ liveId?: string | string[] }>();
  const focusedLiveId = Array.isArray(params.liveId) ? params.liveId[0] : params.liveId;
  const [lives, setLives] = useState<CommercialLiveEvent[]>([]);
  const [form, setForm] = useState<LiveForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTaskForLiveId, setCreatingTaskForLiveId] = useState("");
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const counts = useMemo(() => splitStatus(lives), [lives]);
  const formWarnings = liveSetupWarnings({ ...form, notificationPlan });
  const scheduleBlocked = Boolean(form.scheduledStart.trim() && formWarnings.length);

  async function loadLives() {
    setLoading(true);
    setError(null);
    try {
      setLives(await fetchCommercialLives());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLives();
  }, []);

  async function scheduleLive() {
    if (!form.title.trim()) return;
    if (scheduleBlocked) {
      setMessage(`Live schedule blocked: ${formWarnings.join(", ")}.`);
      return;
    }
    const relatedFeedCampaignId = form.relatedFeedCampaignId.trim() || undefined;
    setSaving(true);
    setError(null);
    setMessage("");
    try {
      const thumbnailUrl = await persistImageUri(form.thumbnailUrl.trim());
      await createCommercialLive({
        title: form.title.trim(),
        description: form.description.trim(),
        thumbnailUrl: thumbnailUrl || undefined,
        scheduledStart: form.scheduledStart.trim() || undefined,
        scheduledEnd: form.scheduledEnd.trim() || undefined,
        timezone: form.timezone.trim() || "America/New_York",
        reminderPreference: form.scheduleReminder.trim() || undefined,
        recurrenceRule: form.scheduleRecurrence.trim() || undefined,
        allDay: form.allDay,
        twitchChannelName: form.twitchChannelName.trim() || undefined,
        twitchChannelId: form.twitchChannelId.trim() || undefined,
        twitchEmbedUrl: form.twitchEmbedUrl.trim() || undefined,
        eventSubStatus: form.eventSubStatus.trim() || "not_connected",
        relatedCourseId: form.relatedCourseId.trim() || undefined,
        relatedProductId: form.relatedProductId.trim() || undefined,
        relatedFeedCampaignId,
        relatedFeedPostId: relatedFeedCampaignId,
        forumThreadId: form.forumThreadId.trim() || undefined,
        growInterests: splitList(form.growInterests),
        visibility: form.visibility,
        replayUrl: form.replayUrl.trim() || undefined,
        notificationPlan,
        status: form.scheduledStart.trim() ? "scheduled" : "draft"
      });
      setForm(EMPTY_FORM);
      setMessage("Live scheduled. Reminder plan attached.");
      await loadLives();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function pickLiveThumbnail() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(new Error("Photo-library permission is required to upload a live image."));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    });
    const uri = result.canceled ? "" : result.assets?.[0]?.uri || "";
    if (uri) setForm((prev) => ({ ...prev, thumbnailUrl: uri }));
  }

  async function createLiveSetupTask(live: CommercialLiveEvent, warnings: string[]) {
    const id = liveId(live);
    if (!id || !warnings.length || creatingTaskForLiveId) return;
    setCreatingTaskForLiveId(String(id));
    setError(null);
    setMessage("");
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: {
          workspaceType: "commercial",
          title: `Complete live setup: ${live.title || "Live"}`,
          description: `Missing setup: ${warnings.join(", ")}.`,
          sourceType: "live",
          sourceId: String(id),
          sourceObjectId: String(id),
          allDay: false,
          calendarType: "live_setup_task",
          sourceStage: "live_setup_review",
          linkedLiveId: String(id),
          linkedCourseId: live.relatedCourseId,
          linkedProductId: live.relatedProductId,
          linkedFeedCampaignId: liveFeedCampaignId(live) || undefined,
          linkedFeedPostId: liveFeedCampaignId(live) || undefined,
          linkedForumThreadId: live.forumThreadId,
          growInterests: live.growInterests,
          liveStartsAt: live.scheduledStart,
          liveEndsAt: live.scheduledEnd,
          liveVisibility: live.visibility || "public",
          twitchChannelName: live.twitchChannelName,
          twitchChannelId: live.twitchChannelId,
          twitchEmbedUrl: live.twitchEmbedUrl,
          eventSubStatus: live.eventSubStatus || "not_connected",
          replayUrl: live.replayUrl,
          notificationPlan: live.notificationPlan,
          recurrenceRule: live.recurrenceRule,
          priority:
            warnings.includes("schedule date/time") ||
            warnings.includes("connect Twitch channel") ||
            warnings.includes("attach reminder plan")
              ? "high"
              : "normal",
          status: "open",
          dueAt: live.scheduledStart
            ? String(live.scheduledStart).slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          reminderPlan: {
            label: live.reminderPreference || "24 hours before",
            channels: ["in_app"]
          }
        }
      });
      setMessage(`Created setup task for ${live.title || "live"}.`);
    } catch (err) {
      setError(err);
    } finally {
      setCreatingTaskForLiveId("");
    }
  }

  return (
    <AppPage
      routeKey="commercial-lives"
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.title}>Lives / Twitch</Text>
            <Text style={styles.subtitle}>
              Schedule live product demos, course sessions, launch events, and Q&A. Link
              lives to courses, products, feed campaigns, storefronts, and Forum/Q&A
              threads.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionLink href="/home/commercial/courses" label="Courses" />
            <ActionLink href="/home/commercial/products" label="Products" />
            <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
            <ActionLink href="/home/commercial/storefront" label="Storefront" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Live session readiness</Text>
        <Text style={styles.body}>
          Live records capture schedule, destination links, Twitch channel/embed fields,
          EventSub status, notification plan, replay URL, setup warnings, and setup task
          creation.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{lives.length}</Text>
            <Text style={styles.metricLabel}>Lives</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{counts.upcoming}</Text>
            <Text style={styles.metricLabel}>Upcoming/draft</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{counts.liveNow}</Text>
            <Text style={styles.metricLabel}>Live now</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{counts.replays}</Text>
            <Text style={styles.metricLabel}>Replays</Text>
          </View>
        </View>
        {loading ? <Text style={styles.muted}>Loading lives...</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Schedule live</Text>
        <TextInput
          value={form.title}
          onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
          accessibilityLabel="Commercial live title"
          placeholder="Live title"
          style={styles.input}
        />
        <TextInput
          value={form.description}
          onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
          accessibilityLabel="Commercial live description"
          multiline
          placeholder="What this live covers"
          style={[styles.input, styles.textArea]}
        />
        <View style={styles.formGrid}>
          <TextInput
            value={form.thumbnailUrl}
            onChangeText={(thumbnailUrl) =>
              setForm((prev) => ({ ...prev, thumbnailUrl }))
            }
            accessibilityLabel="Commercial live thumbnail"
            placeholder="Thumbnail URL"
            style={styles.input}
          />
          <View style={styles.mediaTools}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload commercial live thumbnail"
              disabled={saving}
              onPress={pickLiveThumbnail}
              style={[styles.mediaButton, saving && styles.disabled]}
            >
              <Text style={styles.mediaButtonText}>Upload live image</Text>
            </Pressable>
            {form.thumbnailUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear commercial live thumbnail"
                disabled={saving}
                onPress={() => setForm((prev) => ({ ...prev, thumbnailUrl: "" }))}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear image</Text>
              </Pressable>
            ) : null}
          </View>
          {form.thumbnailUrl ? (
            <Image
              accessibilityLabel="Commercial live thumbnail preview"
              resizeMode="cover"
              source={{ uri: resolveImageUri(form.thumbnailUrl) }}
              style={styles.livePreview}
            />
          ) : null}
          <TextInput
            value={form.twitchChannelName}
            onChangeText={(twitchChannelName) =>
              setForm((prev) => ({ ...prev, twitchChannelName }))
            }
            accessibilityLabel="Commercial live Twitch channel"
            placeholder="Twitch channel"
            style={styles.input}
          />
          <TextInput
            value={form.twitchChannelId}
            onChangeText={(twitchChannelId) =>
              setForm((prev) => ({ ...prev, twitchChannelId }))
            }
            accessibilityLabel="Commercial live Twitch channel ID"
            placeholder="Twitch channel ID"
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            value={form.twitchEmbedUrl}
            onChangeText={(twitchEmbedUrl) =>
              setForm((prev) => ({ ...prev, twitchEmbedUrl }))
            }
            accessibilityLabel="Commercial live Twitch embed URL"
            placeholder="Twitch embed URL"
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            value={form.eventSubStatus}
            onChangeText={(eventSubStatus) =>
              setForm((prev) => ({ ...prev, eventSubStatus }))
            }
            accessibilityLabel="Commercial live Twitch EventSub status"
            placeholder="EventSub status"
            style={styles.input}
            autoCapitalize="none"
          />
          <View style={styles.fullWidth}>
            <SchedulePicker
              dueDate={form.scheduledStart}
              reminder={form.scheduleReminder}
              recurrence={form.scheduleRecurrence}
              allDay={form.allDay}
              timezone={form.timezone}
              onDueDateChange={(scheduledStart) =>
                setForm((prev) => ({ ...prev, scheduledStart }))
              }
              onReminderChange={(scheduleReminder) =>
                setForm((prev) => ({ ...prev, scheduleReminder }))
              }
              onRecurrenceChange={(scheduleRecurrence) =>
                setForm((prev) => ({ ...prev, scheduleRecurrence }))
              }
              onAllDayChange={(allDay) => setForm((prev) => ({ ...prev, allDay }))}
              accessibilityPrefix="Commercial live schedule"
              dueDateAccessibilityLabel="Commercial live scheduled start"
              reminderAccessibilityLabel="Commercial live reminder"
              recurrenceAccessibilityLabel="Commercial live recurrence"
              dueDatePlaceholder="Start ISO date/time"
              reminderPlaceholder="Reminder plan"
              recurrencePlaceholder="Recurring live schedule"
            />
          </View>
          <TextInput
            value={form.scheduledEnd}
            onChangeText={(scheduledEnd) =>
              setForm((prev) => ({ ...prev, scheduledEnd }))
            }
            accessibilityLabel="Commercial live scheduled end"
            placeholder="End ISO date/time"
            style={styles.input}
          />
          <TextInput
            value={form.timezone}
            onChangeText={(timezone) => setForm((prev) => ({ ...prev, timezone }))}
            accessibilityLabel="Commercial live timezone"
            placeholder="Timezone"
            style={styles.input}
          />
          <TextInput
            value={form.relatedCourseId}
            onChangeText={(relatedCourseId) =>
              setForm((prev) => ({ ...prev, relatedCourseId }))
            }
            accessibilityLabel="Commercial live related course"
            placeholder="Related course ID"
            style={styles.input}
          />
          <TextInput
            value={form.relatedProductId}
            onChangeText={(relatedProductId) =>
              setForm((prev) => ({ ...prev, relatedProductId }))
            }
            accessibilityLabel="Commercial live related product"
            placeholder="Related product ID"
            style={styles.input}
          />
          <TextInput
            value={form.relatedFeedCampaignId}
            onChangeText={(relatedFeedCampaignId) =>
              setForm((prev) => ({ ...prev, relatedFeedCampaignId }))
            }
            accessibilityLabel="Commercial live related feed campaign"
            placeholder="Related feed campaign ID"
            style={styles.input}
          />
          <TextInput
            value={form.forumThreadId}
            onChangeText={(forumThreadId) =>
              setForm((prev) => ({ ...prev, forumThreadId }))
            }
            accessibilityLabel="Commercial live Forum Q&A thread"
            placeholder="Forum/Q&A thread ID"
            style={styles.input}
          />
          <TextInput
            value={form.growInterests}
            onChangeText={(growInterests) =>
              setForm((prev) => ({ ...prev, growInterests }))
            }
            accessibilityLabel="Commercial live grow interests"
            placeholder="Grow interests: living soil, IPM, VPD..."
            style={styles.input}
          />
          <TextInput
            value={form.replayUrl}
            onChangeText={(replayUrl) => setForm((prev) => ({ ...prev, replayUrl }))}
            accessibilityLabel="Commercial live replay URL"
            placeholder="Replay URL"
            style={styles.input}
          />
        </View>
        <Text style={styles.label}>Visibility</Text>
        <View style={styles.actions}>
          {(
            ["public", "followers", "enrolled", "paid", "private", "unlisted"] as const
          ).map((visibility) => (
            <Pressable
              key={visibility}
              accessibilityRole="button"
              accessibilityLabel={`Set commercial live visibility ${visibility}`}
              onPress={() => setForm((prev) => ({ ...prev, visibility }))}
              style={[
                styles.action,
                form.visibility === visibility ? styles.actionSelected : null
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  form.visibility === visibility ? styles.actionTextSelected : null
                ]}
              >
                {visibility}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.notice}>
          Default reminders: scheduled, 24h, 1h, 15m, live now, replay available.
        </Text>
        {formWarnings.length ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Live setup checklist</Text>
            <Text style={styles.warningText}>{formWarnings.join(" | ")}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Schedule commercial live"
          disabled={saving || !form.title.trim() || scheduleBlocked}
          onPress={scheduleLive}
          style={[
            styles.primaryAction,
            saving || !form.title.trim() || scheduleBlocked ? styles.disabled : null
          ]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Scheduling..." : "Schedule Live"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Current lives</Text>
        {lives.length ? (
          <View style={styles.list}>
            {lives.map((live) =>
              (() => {
                const id = String(liveId(live));
                const warnings = liveSetupWarnings(live);
                const isFocused = Boolean(focusedLiveId && focusedLiveId === id);
                return (
                  <View
                    key={id}
                    accessibilityLabel={
                      isFocused ? `Selected commercial live ${id}` : undefined
                    }
                    style={[styles.liveRow, isFocused ? styles.liveRowFocused : null]}
                  >
                    <Text style={styles.liveTitle}>{live.title || "Untitled live"}</Text>
                    {liveThumbnail(live) ? (
                      <Image
                        accessibilityLabel={`${live.title || "Commercial live"} thumbnail`}
                        resizeMode="cover"
                        source={{ uri: liveThumbnail(live) }}
                        style={styles.liveThumbnail}
                      />
                    ) : null}
                    <Text style={styles.liveMeta}>
                      {[
                        live.status || "scheduled",
                        live.visibility || "public",
                        live.scheduledStart,
                        live.twitchChannelName && `Twitch: ${live.twitchChannelName}`,
                        live.twitchChannelId && `Channel ID ${live.twitchChannelId}`,
                        live.eventSubStatus && `EventSub ${live.eventSubStatus}`
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </Text>
                    {live.description ? (
                      <Text style={styles.body}>{live.description}</Text>
                    ) : null}
                    <Text style={styles.liveMeta}>
                      {[
                        live.relatedProductId && `Product ${live.relatedProductId}`,
                        live.relatedCourseId && `Course ${live.relatedCourseId}`,
                        liveFeedCampaignId(live) &&
                          `Feed Campaign ${liveFeedCampaignId(live)}`,
                        live.forumThreadId && `Forum/Q&A ${live.forumThreadId}`,
                        live.growInterests?.length &&
                          `Interests ${live.growInterests.join(", ")}`,
                        live.twitchEmbedUrl && `Embed ${live.twitchEmbedUrl}`,
                        live.replayUrl && `Replay ${live.replayUrl}`
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </Text>
                    {warnings.length ? (
                      <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>Missing live setup</Text>
                        <Text style={styles.warningText}>{warnings.join(" | ")}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Create setup task for ${live.title || "live"}`}
                          disabled={creatingTaskForLiveId === String(liveId(live))}
                          onPress={() => createLiveSetupTask(live, warnings)}
                          style={[
                            styles.action,
                            creatingTaskForLiveId === String(liveId(live))
                              ? styles.disabled
                              : null
                          ]}
                        >
                          <Text style={styles.actionText}>
                            {creatingTaskForLiveId === String(liveId(live))
                              ? "Creating..."
                              : "Create Task"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })()
            )}
          </View>
        ) : (
          <Text style={styles.muted}>No lives scheduled yet.</Text>
        )}
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between"
  },
  headerText: { flex: 1, minWidth: 260 },
  headerActions: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: 460
  },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: { color: "#0F172A", fontSize: 28, fontWeight: "900", marginTop: 4 },
  subtitle: { color: "#475569", fontSize: 15, lineHeight: 22, marginTop: 6 },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  body: { color: "#475569", fontSize: 14, lineHeight: 21, marginTop: 8 },
  muted: { color: "#64748B", fontWeight: "700", marginTop: 8 },
  success: { color: "#166534", fontWeight: "900", marginTop: 8 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  metric: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 120,
    padding: 9
  },
  metricValue: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  metricLabel: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#0F172A",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textArea: { minHeight: 92, textAlignVertical: "top" },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fullWidth: { width: "100%" },
  mediaTools: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    width: "100%"
  },
  mediaButton: {
    backgroundColor: "#111827",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  mediaButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  clearButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  clearButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900"
  },
  livePreview: {
    aspectRatio: 16 / 9,
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    marginTop: 10,
    maxWidth: 520,
    width: "100%"
  },
  label: { color: "#334155", fontSize: 12, fontWeight: "900", marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  action: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  actionText: { color: "#0F172A", fontWeight: "800" },
  actionTextSelected: { color: "#FFFFFF" },
  notice: { color: "#475569", fontSize: 12, fontWeight: "700", marginTop: 10 },
  warningBox: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 10,
    padding: 10
  },
  warningTitle: {
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  warningText: { color: "#9A3412", fontSize: 12, fontWeight: "800", marginTop: 4 },
  primaryAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryActionText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  list: { gap: 10, marginTop: 10 },
  liveRow: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 12
  },
  liveRowFocused: {
    backgroundColor: "#ECFDF5",
    borderColor: "#16A34A",
    borderWidth: 2
  },
  liveTitle: { color: "#0F172A", fontWeight: "900" },
  liveThumbnail: {
    aspectRatio: 16 / 9,
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    marginTop: 8,
    width: "100%"
  },
  liveMeta: { color: "#64748B", fontSize: 12, fontWeight: "700", marginTop: 5 }
});
