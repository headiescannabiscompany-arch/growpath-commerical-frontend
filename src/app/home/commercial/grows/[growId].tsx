import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  type TextInputProps,
  View
} from "react-native";

import {
  CommercialGrow,
  fetchCommercialGrow,
  updateCommercialGrow
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import CommercialContextualTools from "@/components/commercial/CommercialContextualTools";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import GrowIntegrationBuildPanel from "@/components/integrations/GrowIntegrationBuildPanel";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  buildCommercialGrowTimeline,
  timelineEventPhotos
} from "@/features/grows/timeline";
import { exportVisualTimeline } from "@/utils/exportVisualTimeline";

function TextInput(props: TextInputProps) {
  const { palette } = useAppTheme();
  return (
    <NativeTextInput
      {...props}
      placeholderTextColor={palette.textMuted}
      selectionColor={palette.accent}
    />
  );
}

function cleanId(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function titleFor(grow: CommercialGrow | null) {
  return grow?.name || grow?.growName || "Product Trial Evidence Run";
}

function DetailRow({ label, value }: { label: string; value?: unknown }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialGrowDetailStyles(palette), [palette]);
  const display = String(value || "").trim();
  if (!display) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{display}</Text>
    </View>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialGrowDetailStyles(palette), [palette]);

  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const RUN_STATUS_CHOICES: Array<{
  id: NonNullable<CommercialGrow["status"]>;
  label: string;
}> = [
  { id: "planned", label: "Planned" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" }
];

const PUBLIC_SHARE_CHOICES: Array<{
  id: NonNullable<CommercialGrow["publicShareStatus"]>;
  label: string;
  help: string;
}> = [
  {
    id: "private",
    label: "Private",
    help: "Keep this run inside the Commercial workspace."
  },
  {
    id: "evidence_building",
    label: "Evidence building",
    help: "Continue collecting and reviewing evidence before public use."
  },
  {
    id: "public_ready",
    label: "Public ready",
    help: "Mark the reviewed run ready to support public material; this does not publish it."
  }
];

export default function CommercialGrowDetailRoute({
  route,
  routeKey = "commercial-grow-detail"
}: {
  route?: any;
  routeKey?: string;
} = {}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialGrowDetailStyles(palette), [palette]);
  const params = useLocalSearchParams<{ growId?: string; id?: string }>();
  const growId = useMemo(
    () =>
      cleanId(params.growId || params.id || route?.params?.growId || route?.params?.id),
    [params.growId, params.id, route?.params?.growId, route?.params?.id]
  );
  const [grow, setGrow] = useState<CommercialGrow | null>(null);
  const [status, setStatus] = useState<NonNullable<CommercialGrow["status"]>>("active");
  const [publicShareStatus, setPublicShareStatus] =
    useState<NonNullable<CommercialGrow["publicShareStatus"]>>("evidence_building");
  const [harvestQualityNotes, setHarvestQualityNotes] = useState("");
  const [commercialCropSummary, setCommercialCropSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);
  const [saveError, setSaveError] = useState<any>(null);
  const [message, setMessage] = useState("");
  const loadInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const canSave = !!growId && !!grow && !loading && !saving;
  const timeline = useMemo(() => (grow ? buildCommercialGrowTimeline(grow) : []), [grow]);
  const shareReady = grow?.publicShareStatus === "public_ready";
  const shareHref = useMemo(() => {
    const query = new URLSearchParams({
      compose: "timeline",
      linkedGrowId: growId,
      title: `Grow timeline: ${titleFor(grow)}`,
      body: timeline
        .map(
          (event) =>
            `${new Date(event.timestamp).toLocaleDateString()} — ${event.title}${event.summary ? `: ${event.summary}` : ""}`
        )
        .join("\n"),
      tags: "grow-timeline,evidence"
    });
    return `/home/commercial/community?${query.toString()}`;
  }, [grow, growId, timeline]);

  const hydrate = useCallback((next: CommercialGrow | null) => {
    setGrow(next);
    setStatus(next?.status || "active");
    setPublicShareStatus(next?.publicShareStatus || "evidence_building");
    setHarvestQualityNotes(next?.harvestQualityNotes || "");
    setCommercialCropSummary(next?.commercialCropSummary || "");
    setNotes(next?.notes || "");
  }, []);

  const load = useCallback(async () => {
    if (loadInFlightRef.current) return;
    if (!growId) {
      setLoading(false);
      setLoadError(new Error("This evidence run link is missing its record ID."));
      return;
    }
    loadInFlightRef.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      hydrate(await fetchCommercialGrow(growId));
    } catch (err) {
      setLoadError(err);
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  }, [growId, hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!canSave || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaving(true);
    setMessage("");
    setSaveError(null);
    try {
      const updated = await updateCommercialGrow(growId, {
        status,
        publicShareStatus,
        harvestQualityNotes: harvestQualityNotes.trim(),
        commercialCropSummary: commercialCropSummary.trim(),
        notes: notes.trim()
      });
      hydrate(updated);
      setMessage("Product trial evidence run updated.");
    } catch (err) {
      setSaveError(err);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey={routeKey}
      backFallbackHref="/home/commercial/evidence-runs"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Product trial evidence run</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {titleFor(grow)}
          </Text>
          <Text style={styles.subtitle}>
            Keep this private run as the evidence source, then connect product, batch,
            formula, trial, public-share, feed campaign, and report workflows around it.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/evidence-runs" label="All Evidence Runs" />
            <ActionLink href="/home/commercial/products" label="Products" />
            <ActionLink href="/home/commercial/trials" label="Product Trials" />
          </View>
        </View>
      }
    >
      {loading ? (
        <View
          accessibilityLabel="Loading product trial evidence run"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          style={styles.progressRow}
        >
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.muted}>Loading product trial evidence run...</Text>
        </View>
      ) : null}
      {loadError ? (
        <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
          <InlineError error={loadError} />
          {growId ? (
            <Pressable
              accessibilityLabel="Retry product trial evidence run"
              accessibilityRole="button"
              disabled={loading}
              onPress={load}
              style={[styles.action, loading && styles.disabled]}
            >
              <Text style={styles.actionText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {grow ? (
        <CommercialContextualTools
          title="Analyze this evidence run"
          source="commercial_evidence_run_detail"
          growId={growId}
          productId={String(grow.productId || "")}
          productLineId={String(grow.productLineId || "")}
          batchId={String(grow.batchId || "")}
          prompt={`Review the evidence run ${titleFor(grow)} using its crop, measurements, observations, and commercial claim context.`}
          tools={[
            "ask-ai",
            "diagnose",
            "environment",
            "recipe-builder",
            "harvest-readiness",
            "report"
          ]}
        />
      ) : null}

      {grow ? (
        <>
          <GrowIntegrationBuildPanel mode="commercial" targetRef={growId} />
          <AppCard>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Import controller history
            </Text>
            <Text style={styles.body}>
              Import an AC Infinity or other supported CSV into this evidence run. Review
              timestamps, units, and columns before any readings are saved.
            </Text>
            <ActionLink
              href={`/home/commercial/tools/history-import?growId=${encodeURIComponent(growId)}&growName=${encodeURIComponent(titleFor(grow))}`}
              label="Import grow history"
            />
          </AppCard>
        </>
      ) : null}

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Commercial Context
        </Text>
        <Text style={styles.body}>
          This layer tracks why the run exists commercially: product trial, soil trial,
          demo trial, genetics test, plant inventory evidence, or private brand proof.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Purpose" value={grow?.purpose} />
          <DetailRow label="Crop" value={grow?.cropType} />
          <DetailRow label="Cultivar / line" value={grow?.cultivar} />
          <DetailRow label="Medium" value={grow?.medium} />
          <DetailRow label="Plant count" value={grow?.plantCount} />
          <DetailRow label="Status" value={grow?.status} />
          <DetailRow label="Public-share status" value={grow?.publicShareStatus} />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Linked Evidence
        </Text>
        <Text style={styles.body}>
          Product claims should be tied back to saved evidence-run records, formula
          versions, batches, measurements, and final outcomes.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Product ID" value={grow?.productId} />
          <DetailRow label="Product line ID" value={grow?.productLineId} />
          <DetailRow label="Batch ID" value={grow?.batchId} />
          <DetailRow label="Formula version" value={grow?.formulaVersion} />
        </View>
        <View style={styles.actions}>
          {grow?.productId ? (
            <ActionLink
              href={`/home/commercial/products/${encodeURIComponent(grow.productId)}`}
              label="Open Product"
            />
          ) : null}
          {grow?.productLineId ? (
            <ActionLink
              href={`/home/commercial/product-lines/${encodeURIComponent(grow.productLineId)}`}
              label="Open Product Line"
            />
          ) : null}
          {grow?.batchId ? (
            <ActionLink
              href={`/home/commercial/batch-planner/${encodeURIComponent(grow.batchId)}`}
              label="Open Batch"
            />
          ) : null}
          <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
          <ActionLink href="/home/commercial/analytics" label="Analytics" />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Measurement Plan
        </Text>
        <Text style={styles.body}>
          {grow?.measurementPlan ||
            "No measurement plan saved yet. Add pH/EC checks, vigor scoring, diagnosis, steering, harvest, dry/cure, and final quality notes before using this evidence run as public proof."}
        </Text>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Harvest Quality Notes
        </Text>
        <Text style={styles.body}>
          Capture the final quality evidence that matters commercially: yield, flower
          structure, aroma, flavor, resin, dry/cure result, defects, and what can be used
          publicly.
        </Text>
        <TextInput
          accessibilityLabel="Product trial evidence run harvest quality notes"
          editable={!!grow && !saving}
          multiline
          onChangeText={setHarvestQualityNotes}
          placeholder="Aroma, flavor, resin, yield, trim quality, dry/cure notes, defects, customer-facing quality notes..."
          style={[styles.input, styles.textArea]}
          value={harvestQualityNotes}
        />
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Product Trial Crop Summary
        </Text>
        <Text style={styles.body}>
          Use this as the report-ready summary for the product trial evidence run. Keep it
          evidence-backed and cautious enough for storefront, feed, trial, or course use.
        </Text>
        <TextInput
          accessibilityLabel="Product trial evidence run crop summary"
          editable={!!grow && !saving}
          multiline
          onChangeText={setCommercialCropSummary}
          placeholder="Product trial summary: product/batch used, crop outcome, quality result, limitations, next run changes..."
          style={[styles.input, styles.textArea]}
          value={commercialCropSummary}
        />
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Update Evidence Run Status
        </Text>
        <View
          accessibilityLabel="Product trial evidence run detail status"
          accessibilityRole="radiogroup"
          style={styles.choiceGroup}
        >
          <Text style={styles.detailLabel}>Run status</Text>
          <View style={styles.choiceRow}>
            {RUN_STATUS_CHOICES.map((choice) => (
              <Pressable
                key={choice.id}
                accessibilityLabel={`Evidence run status: ${choice.label}`}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: status === choice.id,
                  disabled: !grow || saving
                }}
                disabled={!grow || saving}
                onPress={() => setStatus(choice.id)}
                style={[
                  styles.choice,
                  status === choice.id && styles.selectedChoice,
                  (!grow || saving) && styles.disabled
                ]}
              >
                <Text style={styles.actionText}>{choice.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View
          accessibilityLabel="Product trial evidence run detail public share status"
          accessibilityRole="radiogroup"
          style={styles.choiceGroup}
        >
          <Text style={styles.detailLabel}>Public-share readiness</Text>
          <View style={styles.choiceRow}>
            {PUBLIC_SHARE_CHOICES.map((choice) => (
              <Pressable
                key={choice.id}
                accessibilityLabel={`Evidence run public share status: ${choice.label}`}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: publicShareStatus === choice.id,
                  disabled: !grow || saving
                }}
                disabled={!grow || saving}
                onPress={() => setPublicShareStatus(choice.id)}
                style={[
                  styles.shareChoice,
                  publicShareStatus === choice.id && styles.selectedChoice,
                  (!grow || saving) && styles.disabled
                ]}
              >
                <Text style={styles.actionText}>{choice.label}</Text>
                <Text style={styles.choiceHelp}>{choice.help}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <TextInput
          accessibilityLabel="Product trial evidence run detail notes"
          editable={!!grow && !saving}
          multiline
          onChangeText={setNotes}
          placeholder="Evidence notes, publishability, gaps, or next checks"
          style={[styles.input, styles.textArea]}
          value={notes}
        />
        {saving ? (
          <View
            accessibilityLabel="Saving product trial evidence run detail in progress"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.progressRow}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Saving evidence run detail...</Text>
          </View>
        ) : null}
        {saveError ? (
          <View accessible accessibilityLiveRegion="assertive" accessibilityRole="alert">
            <InlineError error={saveError} />
          </View>
        ) : null}
        {message ? (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.success}
          >
            {message}
          </Text>
        ) : null}
        <Pressable
          accessibilityLabel="Save product trial evidence run detail"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave, busy: saving }}
          disabled={!canSave}
          onPress={saveChanges}
          style={[styles.primaryAction, !canSave && styles.disabled]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Saving..." : "Save Evidence Run Detail"}
          </Text>
        </Pressable>
      </AppCard>

      {grow ? (
        <AppCard>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Visual Grow Timeline
          </Text>
          <Text style={styles.body}>
            A viewer-friendly history of this evidence run&apos;s photos, plan, important
            notes, quality observations, and reviewed summary. This is separate from
            compliance reporting.
          </Text>
          <View style={styles.timelineRail}>
            {timeline.map((event) => {
              const photos = timelineEventPhotos(event);
              return (
                <View key={event.id} style={styles.timelineEvent}>
                  <Text style={styles.detailLabel}>
                    {new Date(event.timestamp).toLocaleDateString()}
                  </Text>
                  <Text style={styles.timelineTitle}>{event.title}</Text>
                  {event.summary ? (
                    <Text style={styles.body}>{event.summary}</Text>
                  ) : null}
                  {photos.length ? (
                    <View style={styles.timelinePhotos}>
                      {photos.slice(0, 4).map((photo, index) => (
                        <Image
                          key={`${photo}-${index}`}
                          source={{ uri: photo }}
                          style={styles.timelinePhoto}
                          resizeMode="cover"
                          accessibilityLabel={`Evidence timeline photo for ${event.title}`}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export commercial visual grow timeline"
              disabled={!timeline.length}
              onPress={async () => {
                const method = await exportVisualTimeline(
                  `${titleFor(grow)} — Visual Grow Timeline`,
                  timeline as any
                );
                setMessage(
                  method === "web-download"
                    ? "Visual timeline download prepared."
                    : "Visual timeline share sheet opened."
                );
              }}
              style={[styles.action, !timeline.length && styles.disabled]}
            >
              <Text style={styles.actionText}>Export Visual Timeline</Text>
            </Pressable>
            {shareReady ? (
              <ActionLink href={shareHref} label="Review & Share Timeline" />
            ) : (
              <View style={styles.shareBlocked}>
                <Text style={styles.muted}>
                  Set Public-share readiness to Public ready, save, then review the public
                  copy before publishing.
                </Text>
              </View>
            )}
          </View>
        </AppCard>
      ) : null}

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Next Commercial Actions
        </Text>
        <Text style={styles.bullet}>
          Log evidence-run observations and photos in the connected run workspace.
        </Text>
        <Text style={styles.bullet}>
          Attach product, batch, and formula context before publishing claims.
        </Text>
        <Text style={styles.bullet}>
          Use product trials and run comparisons to summarize effectiveness.
        </Text>
        <Text style={styles.bullet}>
          Publish only evidence-backed updates to feed, courses, or storefront proof.
        </Text>
      </AppCard>
    </AppPage>
  );
}

export function createCommercialGrowDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    header: { gap: 8 },
    kicker: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 28, fontWeight: "900" },
    subtitle: { color: palette.textSoft, lineHeight: 21 },
    cardTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    body: { color: palette.textSoft, fontSize: 14, lineHeight: 21, marginTop: 8 },
    muted: { color: palette.textMuted, fontSize: 13 },
    detailGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    detailRow: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 180,
      padding: 10
    },
    detailLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    detailValue: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "800",
      marginTop: 4
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    action: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    actionText: { color: palette.link, fontSize: 13, fontWeight: "900" },
    timelineRail: { gap: 10, marginTop: 12 },
    timelineEvent: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    timelineTitle: { color: palette.text, fontSize: 15, fontWeight: "900", marginTop: 4 },
    timelinePhotos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    timelinePhoto: {
      backgroundColor: palette.surface,
      borderRadius: radius.card,
      height: 110,
      width: 150
    },
    shareBlocked: { flexBasis: 280, flexGrow: 1, justifyContent: "center" },
    choiceGroup: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      marginTop: 12,
      padding: 10
    },
    choiceRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    choice: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    shareChoice: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: 220,
      flexGrow: 1,
      padding: 10
    },
    selectedChoice: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent
    },
    choiceHelp: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      flexGrow: 1,
      fontSize: 14,
      minWidth: 220,
      paddingHorizontal: 10,
      paddingVertical: 9
    },
    textArea: { minHeight: 90, marginTop: 8, textAlignVertical: "top" },
    primaryAction: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryActionText: {
      color: palette.accentText,
      fontSize: 13,
      fontWeight: "900"
    },
    disabled: { opacity: 0.55 },
    success: {
      color: palette.success,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 8
    },
    progressRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 10
    },
    errorPanel: {
      alignItems: "flex-start",
      gap: 8
    },
    bullet: {
      color: palette.textSoft,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      marginTop: 6
    }
  });
}
