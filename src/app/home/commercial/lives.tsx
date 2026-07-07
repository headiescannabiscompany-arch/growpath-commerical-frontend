import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  CommercialLiveEvent,
  createCommercialLive,
  fetchCommercialLives
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

type LiveForm = {
  title: string;
  description: string;
  thumbnailUrl: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  twitchChannelName: string;
  twitchChannelId: string;
  twitchEmbedUrl: string;
  eventSubStatus: string;
  relatedCourseId: string;
  relatedProductId: string;
  relatedFeedPostId: string;
  forumThreadId: string;
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
  twitchChannelName: "",
  twitchChannelId: "",
  twitchEmbedUrl: "",
  eventSubStatus: "not_connected",
  relatedCourseId: "",
  relatedProductId: "",
  relatedFeedPostId: "",
  forumThreadId: "",
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
  const [lives, setLives] = useState<CommercialLiveEvent[]>([]);
  const [form, setForm] = useState<LiveForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    setError(null);
    setMessage("");
    try {
      await createCommercialLive({
        title: form.title.trim(),
        description: form.description.trim(),
        thumbnailUrl: form.thumbnailUrl.trim() || undefined,
        scheduledStart: form.scheduledStart.trim() || undefined,
        scheduledEnd: form.scheduledEnd.trim() || undefined,
        timezone: form.timezone.trim() || "America/New_York",
        twitchChannelName: form.twitchChannelName.trim() || undefined,
        twitchChannelId: form.twitchChannelId.trim() || undefined,
        twitchEmbedUrl: form.twitchEmbedUrl.trim() || undefined,
        eventSubStatus: form.eventSubStatus.trim() || "not_connected",
        relatedCourseId: form.relatedCourseId.trim() || undefined,
        relatedProductId: form.relatedProductId.trim() || undefined,
        relatedFeedPostId: form.relatedFeedPostId.trim() || undefined,
        forumThreadId: form.forumThreadId.trim() || undefined,
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
        <Text style={styles.cardTitle}>Live workflow status</Text>
        <Text style={styles.body}>
          Twitch connection, embed testing, EventSub status, RSVP tracking, and replay
          conversion should attach to this live record as backend support lands. The
          current workspace captures the schedule, destination links, notification plan,
          and replay URL.
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
          <TextInput
            value={form.scheduledStart}
            onChangeText={(scheduledStart) =>
              setForm((prev) => ({ ...prev, scheduledStart }))
            }
            accessibilityLabel="Commercial live scheduled start"
            placeholder="Start ISO date/time"
            style={styles.input}
          />
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
            value={form.relatedFeedPostId}
            onChangeText={(relatedFeedPostId) =>
              setForm((prev) => ({ ...prev, relatedFeedPostId }))
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
                const warnings = liveSetupWarnings(live);
                return (
                  <View key={liveId(live)} style={styles.liveRow}>
                    <Text style={styles.liveTitle}>{live.title || "Untitled live"}</Text>
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
                        live.relatedFeedPostId && `Feed ${live.relatedFeedPostId}`,
                        live.forumThreadId && `Forum/Q&A ${live.forumThreadId}`,
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
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    padding: 9
  },
  metricValue: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  metricLabel: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textArea: { minHeight: 92, textAlignVertical: "top" },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  label: { color: "#334155", fontSize: 12, fontWeight: "900", marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  action: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
    borderWidth: 1,
    padding: 12
  },
  liveTitle: { color: "#0F172A", fontWeight: "900" },
  liveMeta: { color: "#64748B", fontSize: 12, fontWeight: "700", marginTop: 5 }
});
