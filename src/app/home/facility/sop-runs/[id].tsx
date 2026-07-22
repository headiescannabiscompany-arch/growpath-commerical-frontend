import React, { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

type SopRunDetail = {
  title?: string;
  name?: string;
  status?: string;
  startedAt?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  steps?: SopRunStep[];
} & Record<string, unknown>;

type SopRunDetailResponse = { run?: SopRunDetail; data?: SopRunDetail } & SopRunDetail;

type SopRunStep = {
  stepId?: string;
  title?: string;
  status?: "pending" | "done" | "skipped" | string;
  note?: string;
  completedAt?: string | null;
};

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

function stepIdFromTitle(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `step-${Date.now()}`;
}

function formatLabel(value: unknown, fallback = "Not recorded") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function runIsComplete(run: SopRunDetail | null) {
  const status = String(run?.status || "").toLowerCase();
  return (
    Boolean(run?.completedAt) ||
    ["complete", "completed", "done", "finished"].includes(status)
  );
}

function stepStatus(step: SopRunStep) {
  return String(step.status || "pending").toLowerCase();
}

export default function FacilitySopRunDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { selectedId: facilityId } = useFacility();
  const [run, setRun] = useState<SopRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepNote, setStepNote] = useState("");
  const [savingStep, setSavingStep] = useState<string | null>(null);

  const steps = Array.isArray(run?.steps) ? run.steps : [];
  const completedSteps = steps.filter((step) => stepStatus(step) === "done").length;
  const reviewedSteps = steps.filter(
    (step) => stepStatus(step) === "done" || stepStatus(step) === "skipped"
  ).length;
  const runComplete = runIsComplete(run);
  const canComplete = Boolean(
    !runComplete && steps.length > 0 && reviewedSteps === steps.length && !savingStep
  );

  const renderBoundary = (children: React.ReactNode) => (
    <ScreenBoundary
      title="SOP Run Detail"
      showBack
      backFallbackHref="/home/facility/sop-runs"
    >
      {children}
    </ScreenBoundary>
  );

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (!facilityId) {
      setMessage("Select a facility first.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<SopRunDetailResponse>(
        endpoints.sopRun(facilityId, String(id))
      );
      setRun(res?.run ?? res?.data ?? res);
      setMessage(null);
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Failed to load SOP run"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const completeRun = async () => {
    if (!facilityId || !id || !canComplete) return;
    setMessage(null);
    try {
      await apiRequest(endpoints.sopRunComplete(facilityId, String(id)), {
        method: "POST"
      });
      setMessage("Run marked complete.");
      await load();
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Failed to complete run"));
    }
  };

  const updateStep = async (
    stepId: string,
    status: "pending" | "done" | "skipped",
    opts?: { title?: string; note?: string }
  ) => {
    if (!facilityId || !id || !stepId || runComplete) return;
    setSavingStep(stepId);
    setMessage(null);
    try {
      const res = await apiRequest<SopRunDetailResponse>(
        endpoints.sopRunStep(facilityId, String(id), stepId),
        {
          method: "PATCH",
          body: {
            status,
            title: opts?.title,
            note: opts?.note
          }
        }
      );
      setRun(res?.run ?? res?.data ?? res);
      setMessage("Step evidence updated.");
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Failed to update SOP step"));
    } finally {
      setSavingStep(null);
    }
  };

  const addStep = async () => {
    if (runComplete) return;
    const title = stepTitle.trim();
    if (!title) {
      setMessage("Step title is required.");
      return;
    }
    if (
      steps.some(
        (step) =>
          String(step.title || "")
            .trim()
            .toLowerCase() === title.toLowerCase()
      )
    ) {
      setMessage("That checklist step already exists in this run.");
      return;
    }
    const stepId = stepIdFromTitle(title);
    await updateStep(stepId, "pending", {
      title,
      note: stepNote.trim() || undefined
    });
    setStepTitle("");
    setStepNote("");
  };

  if (!id)
    return renderBoundary(
      <ScrollView contentContainerStyle={styles.container}>
        <Text>Missing run id.</Text>
      </ScrollView>
    );
  if (loading)
    return renderBoundary(
      <ScrollView contentContainerStyle={styles.container}>
        <Text>Loading...</Text>
      </ScrollView>
    );

  return renderBoundary(
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>{String(run?.title || run?.name || "SOP Run")}</Text>
      <View style={styles.metaRow}>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Status</Text>
          <Text style={styles.metaValue}>{formatLabel(run?.status, "Active")}</Text>
        </View>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Started</Text>
          <Text style={styles.metaValue}>
            {formatDate(run?.startedAt || run?.createdAt)}
          </Text>
        </View>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Completed</Text>
          <Text style={styles.metaValue}>{formatDate(run?.completedAt)}</Text>
        </View>
      </View>
      <View style={styles.progressCard}>
        <Text style={styles.progressValue}>
          {reviewedSteps}/{steps.length}
        </Text>
        <Text style={styles.progressLabel}>
          reviewed steps, {completedSteps} marked done
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Checklist evidence</Text>
        {steps.length ? (
          steps.map((step, index) => {
            const stepId = String(step.stepId || `step-${index + 1}`);
            const title = String(step.title || `Step ${index + 1}`);
            const status = stepStatus(step);
            const statusStyle =
              status === "done"
                ? styles.status_done
                : status === "skipped"
                  ? styles.status_skipped
                  : styles.status_pending;
            const busy = savingStep === stepId;
            return (
              <View key={stepId} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>{title}</Text>
                  <Text style={[styles.statusPill, statusStyle]}>
                    {formatLabel(status)}
                  </Text>
                </View>
                {step.note ? (
                  <Text style={styles.stepNote}>{String(step.note)}</Text>
                ) : null}
                <View style={styles.stepActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Mark SOP step ${title} done`}
                    accessibilityState={{ disabled: busy || runComplete }}
                    onPress={() => updateStep(stepId, "done", { title })}
                    disabled={busy || runComplete}
                    style={[
                      styles.stepBtn,
                      styles.doneBtn,
                      (busy || runComplete) && styles.disabled
                    ]}
                  >
                    <Text style={styles.stepBtnText}>Done</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reset SOP step ${title} pending`}
                    accessibilityState={{ disabled: busy || runComplete }}
                    onPress={() => updateStep(stepId, "pending", { title })}
                    disabled={busy || runComplete}
                    style={[
                      styles.stepBtn,
                      styles.pendingBtn,
                      (busy || runComplete) && styles.disabled
                    ]}
                  >
                    <Text style={styles.stepBtnText}>Pending</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Skip SOP step ${title}`}
                    accessibilityState={{ disabled: busy || runComplete }}
                    onPress={() => updateStep(stepId, "skipped", { title })}
                    disabled={busy || runComplete}
                    style={[
                      styles.stepBtn,
                      styles.skipBtn,
                      (busy || runComplete) && styles.disabled
                    ]}
                  >
                    <Text style={styles.stepBtnText}>Skip</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.sub}>No checklist steps yet. Add a step below.</Text>
        )}
      </View>

      {!runComplete ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add evidence step</Text>
          <TextInput
            accessibilityLabel="SOP step title"
            placeholder="Step title"
            value={stepTitle}
            onChangeText={setStepTitle}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="SOP step note"
            placeholder="Note, observation, or exception"
            value={stepNote}
            onChangeText={setStepNote}
            style={[styles.input, styles.noteInput]}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add SOP evidence step"
            onPress={addStep}
            disabled={!!savingStep || !stepTitle.trim()}
            style={[
              styles.addBtn,
              (!!savingStep || !stepTitle.trim()) && styles.disabled
            ]}
          >
            <Text style={styles.btnText}>Add Step</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.lockedCopy}>
          This completed run is locked so its checklist remains reliable evidence.
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mark SOP run complete"
        accessibilityState={{ disabled: !canComplete }}
        onPress={completeRun}
        disabled={!canComplete}
        style={[styles.btn, !canComplete && styles.disabled]}
      >
        <Text style={styles.btnText}>
          {runComplete ? "Run Completed" : "Mark Complete"}
        </Text>
      </Pressable>
      {!runComplete && !canComplete ? (
        <Text style={styles.completionHelp}>
          Review every checklist step as Done or Skipped before completing this run.
        </Text>
      ) : null}
      {message ? <Text style={styles.msg}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 180,
    padding: 10
  },
  metaLabel: { color: "#64748b", fontSize: 12, fontWeight: "800" },
  metaValue: { color: "#0f172a", fontWeight: "900", marginTop: 2 },
  progressCard: {
    borderWidth: 1,
    borderColor: "#d1fae5",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#ecfdf5"
  },
  progressValue: { color: "#065f46", fontSize: 24, fontWeight: "900" },
  progressLabel: { color: "#047857", fontWeight: "800" },
  btn: {
    backgroundColor: "#2563eb",
    borderRadius: radius.card,
    padding: 10,
    alignItems: "center"
  },
  btnText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  msg: { fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "#fff",
    gap: 8
  },
  cardTitle: { color: "#111827", fontWeight: "900" },
  stepCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    padding: 10,
    gap: 8,
    backgroundColor: "#f8fafc"
  },
  stepHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  stepTitle: { color: "#111827", flex: 1, fontWeight: "900" },
  statusPill: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: "#334155",
    backgroundColor: "#e2e8f0",
    fontSize: 12,
    fontWeight: "900"
  },
  status_done: { color: "#065f46", backgroundColor: "#d1fae5" },
  status_pending: { color: "#92400e", backgroundColor: "#fef3c7" },
  status_skipped: { color: "#475569", backgroundColor: "#e2e8f0" },
  stepNote: { color: "#475569", fontSize: 12, fontWeight: "700" },
  stepActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stepBtn: { borderRadius: radius.card, paddingHorizontal: 10, paddingVertical: 8 },
  doneBtn: { backgroundColor: "#16a34a" },
  pendingBtn: { backgroundColor: "#ca8a04" },
  skipBtn: { backgroundColor: "#64748b" },
  stepBtnText: { color: "#fff", fontWeight: "900" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "#fff"
  },
  noteInput: { minHeight: 72, textAlignVertical: "top" },
  addBtn: {
    backgroundColor: "#16a34a",
    borderRadius: radius.card,
    padding: 10,
    alignItems: "center"
  },
  lockedCopy: { color: "#475569", fontWeight: "700" },
  completionHelp: { color: "#92400e", fontWeight: "700" }
});
