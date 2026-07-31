import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getDiagnosisHistory } from "@/api/diagnose";
import { listPublicFieldObservations } from "@/api/fieldStudies";
import { listPersonalGrows } from "@/api/grows";
import { listPersonalLogs } from "@/api/logs";
import { listPersonalPlants } from "@/api/plants";
import { listPersonalTasks } from "@/api/tasks";
import { listTelemetrySources } from "@/api/telemetry";
import { listToolRuns } from "@/api/toolRuns";
import { useAuth } from "@/auth/AuthContext";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import PersonalFeaturedFeed from "@/components/home/PersonalFeaturedFeed";
import FieldObservationGlobe from "@/components/fieldStudies/FieldObservationGlobe";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { fmtDate } from "@/features/grows/routeUtils";
import { buildPersonalHomeModel } from "@/features/personal/homeModel";
import { radius } from "@/theme/theme";
import { useAppTheme } from "@/theme/appTheme";

type HomeModel = ReturnType<typeof buildPersonalHomeModel>;
type HomeAlert = HomeModel["alerts"][number];

function ActionLink({ href, label }: { href: string; label: string }) {
  const { palette } = useAppTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        style={[
          styles.action,
          { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
        ]}
        accessibilityRole="button"
      >
        <Text style={[styles.actionText, { color: palette.text }]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function alertSeverityStyle(severity: HomeAlert["severity"], palette: any) {
  if (severity === "critical") {
    return { backgroundColor: palette.surfaceMuted, borderColor: palette.danger };
  }
  if (severity === "warning") {
    return { backgroundColor: palette.surfaceMuted, borderColor: palette.warning };
  }
  return { backgroundColor: palette.surfaceMuted, borderColor: palette.info };
}

export default function PersonalHomeTab() {
  const auth = useAuth();
  const ent = useEntitlements();
  const canCreateGrow = ent.can(CAPABILITY_KEYS.GROWS_PERSONAL_WRITE);
  const canCreateLog = ent.can(CAPABILITY_KEYS.LOGS_PERSONAL_WRITE);
  const canCreateTask = ent.can(CAPABILITY_KEYS.TASK_REMINDERS);
  const { palette } = useAppTheme();
  const [model, setModel] = useState<HomeModel | null>(null);
  const [globeObservations, setGlobeObservations] = useState<any[]>([]);
  const [globeLoading, setGlobeLoading] = useState(true);
  const [globeVisible, setGlobeVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [grows, logs, plants, tasks, toolRuns, diagnosisResponse] = await Promise.all(
        [
          listPersonalGrows(),
          listPersonalLogs(),
          listPersonalPlants(),
          listPersonalTasks(),
          listToolRuns(),
          getDiagnosisHistory()
        ]
      );
      const diagnoses = Array.isArray(diagnosisResponse)
        ? diagnosisResponse
        : diagnosisResponse?.diagnoses || diagnosisResponse?.data || [];
      const baseModel = buildPersonalHomeModel({
        grows,
        logs,
        plants,
        tasks,
        toolRuns,
        diagnoses
      });
      let telemetrySources: Awaited<ReturnType<typeof listTelemetrySources>> = [];
      let telemetryUnavailable = false;
      if (baseModel.activeGrowId) {
        try {
          telemetrySources = await listTelemetrySources(baseModel.activeGrowId);
        } catch {
          telemetryUnavailable = true;
        }
      }
      setModel(
        buildPersonalHomeModel({
          grows,
          logs,
          plants,
          tasks,
          toolRuns,
          diagnoses,
          telemetrySources,
          telemetryUnavailable
        })
      );
    } catch {
      setError("Unable to refresh your grow overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      setGlobeVisible(true);
      return () => {
        setGlobeVisible(false);
      };
    }, [])
  );

  React.useEffect(() => {
    let alive = true;
    async function loadGlobePreview() {
      setGlobeLoading(true);
      try {
        const observations = await listPublicFieldObservations({ limit: 12 });
        if (alive) {
          setGlobeObservations(Array.isArray(observations) ? observations : []);
        }
      } catch {
        if (alive) setGlobeObservations([]);
      } finally {
        if (alive) setGlobeLoading(false);
      }
    }
    void loadGlobePreview();
    return () => {
      alive = false;
    };
  }, []);

  const growId = model?.activeGrowId || "";
  const growHref = growId ? `/home/personal/grows/${growId}` : "/home/personal/grows";

  return (
    <AppPage
      routeKey="home"
      header={
        <View>
          <Text style={[styles.kicker, { color: palette.accent }]}>
            Personal workspace
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.headerTitle, { color: palette.text }]}
          >
            Your Garden
          </Text>
          <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>
            {[auth.user?.email, `${ent.plan || "free"} plan`].filter(Boolean).join(" | ")}
          </Text>
        </View>
      }
    >
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PersonalFeaturedFeed />

      {!loading && !model?.activeGrow ? (
        <View style={styles.section}>
          <AppCard
            style={[
              styles.firstRunCard,
              { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
            ]}
          >
            <Text style={[styles.commandEyebrow, { color: palette.accent }]}>
              First run setup
            </Text>
            <Text style={[styles.commandTitle, { color: palette.text }]}>
              Build your grow workspace
            </Text>
            <Text style={[styles.commandDescription, { color: palette.textMuted }]}>
              Start with one grow, then attach plants, photos, journal notes, tasks, tool
              runs, and diagnosis history to the same record.
            </Text>
            <View style={styles.actions}>
              {canCreateGrow ? (
                <ActionLink href="/home/personal/grows/new" label="Create Grow" />
              ) : null}
              <ActionLink href="/home/personal/tools" label="Explore AI Tools" />
              <ActionLink href="/home/personal/diagnose" label="Run Diagnosis" />
              <ActionLink href="/home/personal/community" label="Ask Forum / Q&A" />
            </View>
            {!canCreateGrow ? (
              <Text style={[styles.upgradeNote, { color: palette.textMuted }]}>
                Upgrade to create and save personal grow records.
              </Text>
            ) : null}
          </AppCard>

          <View style={styles.onboardingGrid}>
            <AppCard
              style={[
                styles.onboardingCard,
                { backgroundColor: palette.surface, borderColor: palette.border }
              ]}
            >
              <Text style={[styles.stepNumber, { color: palette.accent }]}>1</Text>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Create the grow
              </Text>
              <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
                Name the crop, stage, medium, room, and target outcome so every future log
                has context.
              </Text>
              {canCreateGrow ? (
                <ActionLink href="/home/personal/grows/new" label="Start Setup" />
              ) : null}
            </AppCard>
            <AppCard
              style={[
                styles.onboardingCard,
                { backgroundColor: palette.surface, borderColor: palette.border }
              ]}
            >
              <Text style={[styles.stepNumber, { color: palette.accent }]}>2</Text>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Add observations
              </Text>
              <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
                Save photos, watering notes, symptoms, environment readings, and task
                decisions in the journal.
              </Text>
              <ActionLink href="/home/personal/tools" label="Open AI Tools" />
            </AppCard>
            <AppCard
              style={[
                styles.onboardingCard,
                { backgroundColor: palette.surface, borderColor: palette.border }
              ]}
            >
              <Text style={[styles.stepNumber, { color: palette.accent }]}>3</Text>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Turn findings into tasks
              </Text>
              <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
                Use diagnosis and tool results to create reminders that stay linked to the
                grow.
              </Text>
              <ActionLink href="/home/personal/tasks" label="View Tasks" />
            </AppCard>
          </View>
        </View>
      ) : null}

      {model?.activeGrow ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Active Grow</Text>
          <Link href={growHref} asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Open active grow">
              <AppCard
                style={[
                  styles.commandCard,
                  { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
                ]}
              >
                <View style={styles.commandHeader}>
                  <View style={styles.commandCopy}>
                    <Text style={[styles.commandEyebrow, { color: palette.accent }]}>
                      Personal command center
                    </Text>
                    <Text style={[styles.commandTitle, { color: palette.text }]}>
                      {model.activeGrow.name || "Active grow"}
                    </Text>
                    <Text
                      style={[styles.commandDescription, { color: palette.textMuted }]}
                    >
                      {model.activeGrow.status} | Updated{" "}
                      {fmtDate(model.activeGrow.updatedAt)}
                    </Text>
                  </View>
                  <View style={styles.pulseStack}>
                    <View
                      style={[
                        styles.pulse,
                        { backgroundColor: palette.surface, borderColor: palette.border }
                      ]}
                    >
                      <Text style={[styles.pulseValue, { color: palette.text }]}>
                        {model.activeGrow.status || "Active"}
                      </Text>
                      <Text style={[styles.pulseLabel, { color: palette.accent }]}>
                        Stage
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pulse,
                        { backgroundColor: palette.surface, borderColor: palette.border }
                      ]}
                    >
                      <Text style={[styles.pulseValue, { color: palette.text }]}>
                        {model.alerts.length}
                      </Text>
                      <Text style={[styles.pulseLabel, { color: palette.accent }]}>
                        Alerts
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pulse,
                        { backgroundColor: palette.surface, borderColor: palette.border }
                      ]}
                    >
                      <Text style={[styles.pulseValue, { color: palette.text }]}>
                        {model.openTaskCount}
                      </Text>
                      <Text style={[styles.pulseLabel, { color: palette.accent }]}>
                        Open tasks
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.metrics}>
                  <View
                    style={[
                      styles.metric,
                      { backgroundColor: palette.surface, borderColor: palette.border }
                    ]}
                  >
                    <Text style={[styles.metricValue, { color: palette.text }]}>
                      {model.stats.plantCount}
                    </Text>
                    <Text style={[styles.metricLabel, { color: palette.textMuted }]}>
                      Plants
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.metric,
                      { backgroundColor: palette.surface, borderColor: palette.border }
                    ]}
                  >
                    <Text style={[styles.metricValue, { color: palette.text }]}>
                      {model.stats.logCount}
                    </Text>
                    <Text style={[styles.metricLabel, { color: palette.textMuted }]}>
                      Journal entries
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.metric,
                      { backgroundColor: palette.surface, borderColor: palette.border }
                    ]}
                  >
                    <Text style={[styles.metricValue, { color: palette.text }]}>
                      {model.openTaskCount}
                    </Text>
                    <Text style={[styles.metricLabel, { color: palette.textMuted }]}>
                      Open tasks
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.metric,
                      { backgroundColor: palette.surface, borderColor: palette.border }
                    ]}
                  >
                    <Text style={[styles.metricValue, { color: palette.text }]}>
                      {model.latestToolRun?.toolType ||
                        model.latestToolRun?.toolName ||
                        "None"}
                    </Text>
                    <Text style={[styles.metricLabel, { color: palette.textMuted }]}>
                      Latest tool
                    </Text>
                  </View>
                </View>
              </AppCard>
            </Pressable>
          </Link>
          <View style={styles.actions}>
            <ActionLink href={growHref} label="Open Grow" />
            {canCreateLog ? (
              <>
                <ActionLink
                  href={`/home/personal/logs/new?growId=${encodeURIComponent(growId)}`}
                  label="Add Log"
                />
                <ActionLink
                  href={`/home/personal/logs/new?growId=${encodeURIComponent(growId)}&focus=photos`}
                  label="Add Photo"
                />
              </>
            ) : null}
            <ActionLink
              href={`/home/personal/tools?growId=${encodeURIComponent(growId)}`}
              label="Open AI Tools"
            />
            <ActionLink
              href={`/home/personal/diagnose?growId=${encodeURIComponent(growId)}`}
              label="Diagnose"
            />
            {canCreateTask ? (
              <ActionLink href={`${growHref}/tasks`} label="Create Task" />
            ) : null}
          </View>
          {!canCreateLog || !canCreateTask ? (
            <Text style={styles.upgradeNote}>
              Free plan includes basic grow tracking, logs, tasks, and limited AI credits.
              Upgrade for more grows, more storage, advanced tools, exports, and higher AI
              limits.
            </Text>
          ) : null}
        </View>
      ) : null}

      {model?.activeGrow ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Today</Text>
          <AppCard>
            <Text style={[styles.cardTitle, { color: palette.text }]}>Active alerts</Text>
            {model.alerts.length ? (
              <View style={styles.alertList}>
                {model.alerts.map((alert) => (
                  <View
                    key={alert.id}
                    style={[styles.alertRow, alertSeverityStyle(alert.severity, palette)]}
                  >
                    <View style={styles.alertText}>
                      <Text style={[styles.alertTitle, { color: palette.text }]}>
                        {alert.title}
                      </Text>
                      <Text style={[styles.alertMessage, { color: palette.textMuted }]}>
                        {alert.message}
                      </Text>
                    </View>
                    <Link href={alert.href} asChild>
                      <Pressable
                        style={[
                          styles.inlineAction,
                          {
                            backgroundColor: palette.surface,
                            borderColor: palette.border
                          }
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${alert.title}`}
                      >
                        <Text style={[styles.inlineActionText, { color: palette.text }]}>
                          Open
                        </Text>
                      </Pressable>
                    </Link>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
                No active grow alerts are open.
              </Text>
            )}
          </AppCard>
          <AppCard>
            <Text
              style={[styles.cardTitle, { color: palette.text }]}
            >{`Today's tasks`}</Text>
            {model.todayTasks.length ? (
              <View style={styles.taskList}>
                {model.todayTasks.map((task) => (
                  <View
                    key={task.id}
                    style={[
                      styles.taskRow,
                      { backgroundColor: palette.surface, borderColor: palette.border }
                    ]}
                  >
                    <Text style={[styles.taskTitle, { color: palette.text }]}>
                      {task.title}
                    </Text>
                    <Text style={[styles.taskMeta, { color: palette.textMuted }]}>
                      Due {fmtDate(task.dueDate)} | {task.priority || "medium"} | Source:{" "}
                      {task.sourceLabel}
                    </Text>
                    <Link href={task.sourceHref} asChild>
                      <Pressable
                        style={[
                          styles.inlineAction,
                          {
                            backgroundColor: palette.surface,
                            borderColor: palette.border
                          }
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Open source for ${task.title}`}
                      >
                        <Text style={[styles.inlineActionText, { color: palette.text }]}>
                          Open Source
                        </Text>
                      </Pressable>
                    </Link>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
                {model.nextTask
                  ? `Next: ${model.nextTask.title} | ${fmtDate(model.nextTask.dueDate)}`
                  : "No open task is scheduled for this grow."}
              </Text>
            )}
            <ActionLink href={`${growHref}/tasks`} label="View Tasks" />
          </AppCard>
          <AppCard>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              Recent journal activity
            </Text>
            <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
              {model.latestLog
                ? `${model.latestLog.title} | ${fmtDate(model.latestLog.date)}`
                : "No journal entries have been recorded yet."}
            </Text>
            <ActionLink href={`${growHref}/journal`} label="Open Journal" />
          </AppCard>
          <AppCard>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              Latest diagnosis
            </Text>
            <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
              {model.latestDiagnosis
                ? `${model.latestDiagnosis.issueSummary || model.latestDiagnosis.diagnosisClass || "Diagnosis saved"} | ${fmtDate(model.latestDiagnosis.createdAt)}`
                : "No diagnosis has been saved for this grow yet."}
            </Text>
            <ActionLink
              href={`/home/personal/diagnose?growId=${encodeURIComponent(growId)}`}
              label="Run Diagnosis"
            />
          </AppCard>
          <AppCard>
            <Text style={[styles.cardTitle, { color: palette.text }]}>Recent photos</Text>
            <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
              {model.recentPhotos.length
                ? `${model.recentPhotos.length} recent photo${model.recentPhotos.length === 1 ? "" : "s"} attached to this grow. Latest: ${model.recentPhotos[0].title}`
                : "No photos have been attached to this grow yet."}
            </Text>
            {canCreateLog ? (
              <ActionLink
                href={`/home/personal/logs/new?growId=${encodeURIComponent(growId)}&focus=photos`}
                label="Add Photo"
              />
            ) : null}
          </AppCard>
          <AppCard>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              Garden statistics
            </Text>
            <View style={styles.metrics}>
              <View
                style={[
                  styles.metric,
                  { backgroundColor: palette.surface, borderColor: palette.border }
                ]}
              >
                <Text style={[styles.metricValue, { color: palette.text }]}>
                  {model.stats.activeGrowCount}
                </Text>
                <Text style={[styles.metricLabel, { color: palette.textMuted }]}>
                  Active grows
                </Text>
              </View>
              <View
                style={[
                  styles.metric,
                  { backgroundColor: palette.surface, borderColor: palette.border }
                ]}
              >
                <Text style={[styles.metricValue, { color: palette.text }]}>
                  {model.stats.completedTaskCount}
                </Text>
                <Text style={[styles.metricLabel, { color: palette.textMuted }]}>
                  Completed tasks
                </Text>
              </View>
              <View
                style={[
                  styles.metric,
                  { backgroundColor: palette.surface, borderColor: palette.border }
                ]}
              >
                <Text style={[styles.metricValue, { color: palette.text }]}>
                  {model.stats.toolRunCount}
                </Text>
                <Text style={[styles.metricLabel, { color: palette.textMuted }]}>
                  Tool runs
                </Text>
              </View>
              <View
                style={[
                  styles.metric,
                  { backgroundColor: palette.surface, borderColor: palette.border }
                ]}
              >
                <Text style={[styles.metricValue, { color: palette.text }]}>
                  {model.stats.diagnosisCount}
                </Text>
                <Text style={[styles.metricLabel, { color: palette.textMuted }]}>
                  Diagnoses
                </Text>
              </View>
              <View
                style={[
                  styles.metric,
                  { backgroundColor: palette.surface, borderColor: palette.border }
                ]}
              >
                <Text style={[styles.metricValue, { color: palette.text }]}>
                  {model.stats.photoCount}
                </Text>
                <Text style={[styles.metricLabel, { color: palette.textMuted }]}>
                  Photos
                </Text>
              </View>
            </View>
          </AppCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Discovery globe
        </Text>
        <AppCard
          style={[
            styles.globeCard,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.cardTitle, { color: palette.text }]}>
            Shared plant findings
          </Text>
          <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
            Opt-in public observations appear on the globe. Personal details stay excluded
            from this shared view.
          </Text>
          <View style={styles.globeFrame}>
            {globeLoading && globeVisible ? <ActivityIndicator /> : null}
            {globeVisible ? (
              <FieldObservationGlobe
                observations={globeObservations}
                onSelectObservations={() => {}}
                onViewportChange={() => {}}
              />
            ) : null}
          </View>
          <View style={styles.actions}>
            <ActionLink href="/field-observations" label="Open Globe" />
            <ActionLink href="/home/personal/tools/species-crop-id" label="Plant ID" />
          </View>
        </AppCard>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Single-user shortcuts
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/videos?tab=library" label="My Videos" />
          <ActionLink href="/lives" label="Lives" />
          <ActionLink href="/home/notifications" label="Notifications" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Explore</Text>
        <View style={styles.actions}>
          <ActionLink href="/home/personal/community" label="Forum / Q&A" />
          <ActionLink href="/store" label="Discover Storefronts" />
          <ActionLink href="/feed" label="Commercial Feed" />
          <ActionLink href="/field-observations" label="Discovery Globe" />
          <ActionLink href="/home/personal/discover" label="Discover" />
          <ActionLink href="/home/personal/more/analytics" label="Grow Analytics" />
          <ActionLink href="/home/personal/profile" label="Profile" />
        </View>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  headerTitle: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#475569" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  commandCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0"
  },
  firstRunCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1
  },
  onboardingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  onboardingCard: {
    flexBasis: 230,
    flexGrow: 1
  },
  globeCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#D1FAE5"
  },
  globeFrame: {
    minHeight: 280,
    marginBottom: 8
  },
  stepNumber: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 999,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
    minWidth: 26,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: "center"
  },
  commandHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between",
    marginBottom: 12
  },
  commandCopy: { flex: 1, minWidth: 210 },
  commandEyebrow: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 4,
    textTransform: "uppercase"
  },
  commandTitle: { color: "#052E16", fontSize: 24, fontWeight: "900", lineHeight: 29 },
  commandDescription: { color: "#166534", lineHeight: 20, marginTop: 5 },
  pulseStack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end"
  },
  pulse: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF"
  },
  pulseValue: { color: "#052E16", fontSize: 17, fontWeight: "900" },
  pulseLabel: { color: "#166534", fontSize: 11, fontWeight: "800", marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 5 },
  cardDescription: { color: "#475569", lineHeight: 20, marginBottom: 8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  metric: {
    minWidth: 120,
    padding: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card
  },
  metricValue: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  metricLabel: { color: "#64748B", fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  taskList: { gap: 10, marginBottom: 10 },
  alertList: { gap: 10 },
  alertRow: {
    borderWidth: 1,
    borderRadius: radius.card,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 10
  },
  alert_critical: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  alert_warning: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  alert_info: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  alertText: { flex: 1, minWidth: 0 },
  alertTitle: { color: "#0F172A", fontWeight: "900" },
  alertMessage: { color: "#475569", fontSize: 12, lineHeight: 17, marginTop: 3 },
  taskRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "#F8FAFC"
  },
  taskTitle: { color: "#0F172A", fontWeight: "800" },
  taskMeta: { marginTop: 4, color: "#64748B", fontSize: 12, lineHeight: 17 },
  action: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF"
  },
  actionText: { color: "#166534", fontWeight: "800" },
  inlineAction: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF"
  },
  inlineActionText: { color: "#0F172A", fontWeight: "800", fontSize: 12 },
  upgradeNote: { color: "#64748B", fontSize: 12, lineHeight: 17, marginTop: 8 },
  error: { color: "#B91C1C", fontWeight: "700" }
});
