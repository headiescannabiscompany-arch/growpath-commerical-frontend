import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  type TextInputProps,
  View
} from "react-native";

import {
  fetchSoilNutrientBatch,
  SoilNutrientBatch,
  updateSoilNutrientBatch
} from "@/api/commercialWorkflows";
import { apiRequest } from "@/api/apiRequest";
import { InlineError } from "@/components/InlineError";
import CommercialContextualTools from "@/components/commercial/CommercialContextualTools";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

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

function batchTitle(batch: SoilNutrientBatch | null) {
  return batch?.batchName || batch?.name || "Commercial Batch";
}

function DetailRow({ label, value }: { label: string; value?: unknown }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialBatchDetailStyles(palette), [palette]);
  const display =
    value == null || value === ""
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value).trim();
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
  const styles = useMemo(() => createCommercialBatchDetailStyles(palette), [palette]);

  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialBatchDetailRoute({ route }: { route?: any } = {}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialBatchDetailStyles(palette), [palette]);
  const params = useLocalSearchParams<{ batchId?: string }>();
  const batchId = useMemo(
    () => cleanId(params.batchId || route?.params?.batchId || route?.params?.id),
    [params.batchId, route?.params?.batchId, route?.params?.id]
  );
  const [batch, setBatch] = useState<SoilNutrientBatch | null>(null);
  const [status, setStatus] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [releaseTimelineNotes, setReleaseTimelineNotes] = useState("");
  const [guaranteedAnalysisNotes, setGuaranteedAnalysisNotes] = useState("");
  const [ingredientSummary, setIngredientSummary] = useState("");
  const [mixingInstructions, setMixingInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);
  const [actionError, setActionError] = useState<any>(null);
  const [message, setMessage] = useState("");
  const loadInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const taskInFlightRef = useRef(false);
  const operationBusy = saving || creatingTask;
  const canSave = !!batchId && !loading && !operationBusy;

  const hydrate = useCallback((next: SoilNutrientBatch | null) => {
    setBatch(next);
    setStatus(next?.status || "planned");
    setEstimatedCost(next?.estimatedCost != null ? String(next.estimatedCost) : "");
    setReleaseTimelineNotes(next?.releaseTimelineNotes || "");
    setGuaranteedAnalysisNotes(next?.guaranteedAnalysisNotes || "");
    setIngredientSummary(next?.ingredientSummary || "");
    setMixingInstructions(next?.mixingInstructions || "");
    setNotes(next?.notes || "");
  }, []);

  const load = useCallback(async () => {
    if (!batchId || loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      hydrate(await fetchSoilNutrientBatch(batchId));
    } catch (err) {
      setLoadError(err);
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  }, [batchId, hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!batchId || saveInFlightRef.current || creatingTask) return;
    const normalizedCost = estimatedCost.trim();
    const parsedCost = normalizedCost ? Number(normalizedCost) : undefined;
    if (parsedCost !== undefined && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      setActionError(
        new Error("Estimated cost must be a number that is zero or greater.")
      );
      return;
    }
    saveInFlightRef.current = true;
    setSaving(true);
    setMessage("");
    setActionError(null);
    try {
      const updated = await updateSoilNutrientBatch(batchId, {
        status: (status.trim() || "planned") as SoilNutrientBatch["status"],
        estimatedCost: parsedCost,
        releaseTimelineNotes: releaseTimelineNotes.trim(),
        guaranteedAnalysisNotes: guaranteedAnalysisNotes.trim(),
        ingredientSummary: ingredientSummary.trim(),
        mixingInstructions: mixingInstructions.trim(),
        notes: notes.trim()
      });
      hydrate(updated);
      setMessage("Commercial batch updated.");
    } catch (err) {
      setActionError(err);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }

  async function createProductionTask() {
    if (!batchId || !batch || taskInFlightRef.current || saving) return;
    taskInFlightRef.current = true;
    setCreatingTask(true);
    setMessage("");
    setActionError(null);
    const name = batchTitle(batch);
    const evidenceRunId = batch.linkedTrialId || batch.trialGrowId || "";
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: {
          workspaceType: "commercial",
          title: `Run production batch: ${name}`,
          description: [
            `Use the saved ingredient pull sheet, guaranteed analysis notes, release timeline, and mixing instructions for ${name}.`,
            batch.batchCode ? `Batch code: ${batch.batchCode}.` : "",
            batch.formulaVersion ? `Formula version: ${batch.formulaVersion}.` : "",
            batch.ingredientSummary ? `Pull sheet: ${batch.ingredientSummary}` : "",
            batch.mixingInstructions ? `Mixing/QC: ${batch.mixingInstructions}` : ""
          ]
            .filter(Boolean)
            .join("\n"),
          sourceType: "product_batch",
          sourceId: batchId,
          sourceObjectId: batchId,
          allDay: true,
          calendarType: "product_batch_production_task",
          sourceStage: "batch_production_run",
          linkedProductBatchId: batchId,
          linkedBatchId: batchId,
          linkedProductId: batch.productId || "",
          linkedProductLineId: batch.productLineId || "",
          linkedTrialId: evidenceRunId,
          linkedGrowId: evidenceRunId,
          priority: "high",
          status: "open",
          requiresProof: true,
          reminderPlan: { label: "24 hours before", channels: ["in_app"] }
        }
      });
      setMessage(`Created production task for ${name}.`);
    } catch (err) {
      setActionError(err);
    } finally {
      taskInFlightRef.current = false;
      setCreatingTask(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-batch-detail"
      backFallbackHref="/home/commercial/batch-planner"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial formula batch</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {batchTitle(batch)}
          </Text>
          <Text style={styles.subtitle}>
            Manage the private production batch record that links formula version,
            guaranteed analysis, release timing, inventory/cost, products, and trials.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/batch-planner" label="All Batches" />
            <ActionLink href="/home/commercial/products" label="Products" />
            <ActionLink href="/home/commercial/trials" label="Product Trials" />
          </View>
        </View>
      }
    >
      {loading ? (
        <View
          accessibilityLabel="Loading commercial batch detail"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          style={styles.progressRow}
        >
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.muted}>Loading commercial batch...</Text>
        </View>
      ) : null}
      {loadError ? (
        <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
          <InlineError error={loadError} />
          <Pressable
            accessibilityLabel="Retry commercial batch detail"
            accessibilityRole="button"
            disabled={loading}
            onPress={load}
            style={[styles.action, loading && styles.disabled]}
          >
            <Text style={styles.actionText}>Retry</Text>
          </Pressable>
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
      {actionError ? (
        <View accessible accessibilityLiveRegion="assertive" accessibilityRole="alert">
          <InlineError error={actionError} />
        </View>
      ) : null}

      <CommercialContextualTools
        source="commercial_batch_detail"
        batchId={batchId}
        growId={String(batch?.linkedTrialId || batch?.trialGrowId || "")}
        productId={String(batch?.productId || "")}
        productLineId={String(batch?.productLineId || "")}
        prompt={`Review the commercial batch ${batchTitle(batch)} for formula accuracy, release timing, production risks, and trial readiness.`}
        tools={["ask-ai", "recipe-builder", "environment", "report"]}
      />

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Batch Record
        </Text>
        <Text style={styles.body}>
          This record should connect formula math to the real mixed batch and future
          product effectiveness claims.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Batch code" value={batch?.batchCode} />
          <DetailRow label="Purpose" value={batch?.purpose} />
          <DetailRow label="Formula version" value={batch?.formulaVersion} />
          <DetailRow label="Status" value={batch?.status} />
          <DetailRow
            label="Volume"
            value={[batch?.batchVolume, batch?.batchVolumeUnit].filter(Boolean).join(" ")}
          />
          <DetailRow label="Estimated cost" value={batch?.estimatedCost} />
          <DetailRow
            label="Cost evidence"
            value={batch?.costEstimate?.status || "Unknown"}
          />
          <DetailRow label="Bag size" value={batch?.bagSize ?? "Unknown"} />
          <DetailRow label="Bag count" value={batch?.bagCount ?? "Unknown"} />
          <DetailRow
            label="Label estimate"
            value={batch?.guaranteedAnalysisEstimate?.status || "Unknown"}
          />
          <DetailRow label="Linked ToolRun" value={batch?.linkedToolRunId} />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Calculation Evidence & Inventory Review
        </Text>
        <Text style={styles.body}>
          Missing evidence stays unknown. Inventory shown here is a review snapshot; the
          batch calculation did not decrement stock or assign lots.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Label N-P2O5-K2O" value={batch?.guaranteedAnalysisEstimate} />
          <DetailRow label="Known/complete cost" value={batch?.costEstimate} />
          <DetailRow
            label="Ingredient pulls"
            value={batch?.ingredientPullSheet?.length ?? 0}
          />
          <DetailRow
            label="Inventory shortages"
            value={
              batch?.inventoryReview?.filter((row) => row.status === "shortage").length ??
              0
            }
          />
        </View>
        {(batch?.warnings || []).map((warning, index) => (
          <Text key={`warning-${index}`} style={styles.warningText}>
            Warning: {warning}
          </Text>
        ))}
        {(batch?.missingInformation || []).map((item, index) => (
          <Text key={`missing-${index}`} style={styles.muted}>
            Missing: {item}
          </Text>
        ))}
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Connected records
        </Text>
        <Text style={styles.body}>
          Batches should link to products, product lines, evidence runs, feed campaigns,
          and storefront proof only when the evidence is strong enough.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Product ID" value={batch?.productId} />
          <DetailRow label="Product line ID" value={batch?.productLineId} />
          <DetailRow
            label="Evidence run ID"
            value={batch?.linkedTrialId || batch?.trialGrowId}
          />
        </View>
        <View style={styles.actions}>
          {batch?.productId ? (
            <ActionLink
              href={`/home/commercial/products/${encodeURIComponent(batch.productId)}`}
              label="Open Product"
            />
          ) : null}
          {batch?.productLineId ? (
            <ActionLink
              href={`/home/commercial/product-lines/${encodeURIComponent(batch.productLineId)}`}
              label="Open Product Line"
            />
          ) : null}
          {batch?.linkedTrialId || batch?.trialGrowId ? (
            <ActionLink
              href={`/home/commercial/evidence-runs/${encodeURIComponent(
                batch.linkedTrialId || batch.trialGrowId || ""
              )}`}
              label="Open Evidence Run"
            />
          ) : null}
          <ActionLink href="/home/commercial/trials" label="Open Trials" />
          <Pressable
            accessibilityLabel="Create batch production task"
            accessibilityRole="button"
            accessibilityState={{
              disabled: !batchId || !batch || operationBusy,
              busy: creatingTask
            }}
            disabled={!batchId || !batch || operationBusy}
            onPress={createProductionTask}
            style={[
              styles.action,
              !batchId || !batch || operationBusy ? styles.disabled : null
            ]}
          >
            <Text style={styles.actionText}>
              {creatingTask ? "Creating..." : "Create Production Task"}
            </Text>
          </Pressable>
        </View>
        {creatingTask ? (
          <View
            accessibilityLabel="Creating batch production task in progress"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.progressRow}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Creating production task...</Text>
          </View>
        ) : null}
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Formula Evidence
        </Text>
        <Text style={styles.body}>
          Keep guaranteed analysis and release timing visible so public product details
          accurately describe the formula and its expected behavior.
        </Text>
        <TextInput
          accessibilityLabel="Commercial batch detail status"
          editable={!operationBusy}
          onChangeText={setStatus}
          placeholder="planned, mixed, resting, ready, used, archived"
          style={styles.input}
          value={status}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail estimated cost"
          editable={!operationBusy}
          keyboardType="decimal-pad"
          onChangeText={setEstimatedCost}
          placeholder="Estimated cost"
          style={styles.input}
          value={estimatedCost}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail guaranteed analysis notes"
          editable={!operationBusy}
          multiline
          onChangeText={setGuaranteedAnalysisNotes}
          placeholder="Guaranteed analysis, elemental estimate, source confidence"
          style={[styles.input, styles.textArea]}
          value={guaranteedAnalysisNotes}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail release timeline notes"
          editable={!operationBusy}
          multiline
          onChangeText={setReleaseTimelineNotes}
          placeholder="Fast, medium, slow release timing and uncertainty"
          style={[styles.input, styles.textArea]}
          value={releaseTimelineNotes}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail ingredient summary"
          editable={!operationBusy}
          multiline
          onChangeText={setIngredientSummary}
          placeholder="Ingredient pull sheet / ingredient summary"
          style={[styles.input, styles.textArea]}
          value={ingredientSummary}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail mixing instructions"
          editable={!operationBusy}
          multiline
          onChangeText={setMixingInstructions}
          placeholder="Mixing instructions, rest/cook timing, QC checks"
          style={[styles.input, styles.textArea]}
          value={mixingInstructions}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail notes"
          editable={!operationBusy}
          multiline
          onChangeText={setNotes}
          placeholder="Batch notes, cost gaps, inventory shortages, trial plan"
          style={[styles.input, styles.textArea]}
          value={notes}
        />
        {saving ? (
          <View
            accessibilityLabel="Saving commercial batch detail in progress"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.progressRow}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Saving batch detail...</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel="Save commercial batch detail"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave, busy: saving }}
          disabled={!canSave}
          onPress={saveChanges}
          style={[styles.primaryAction, !canSave ? styles.disabled : null]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Saving..." : "Save Batch Detail"}
          </Text>
        </Pressable>
      </AppCard>
    </AppPage>
  );
}

export function createCommercialBatchDetailStyles(palette: ThemePalette) {
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
      minWidth: 170,
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
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontSize: 14,
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 9
    },
    textArea: { minHeight: 90, textAlignVertical: "top" },
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
    progressRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 10
    },
    errorPanel: { alignItems: "flex-start", gap: 8 },
    success: {
      color: palette.success,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 8
    },
    warningText: {
      color: palette.warning,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 19,
      marginTop: 8
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
