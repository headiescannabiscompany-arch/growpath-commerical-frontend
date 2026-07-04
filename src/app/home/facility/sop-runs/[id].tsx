import React, { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

type SopRunDetail = {
  status?: string;
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
  const completedSteps = steps.filter((step) => step.status === "done").length;
  const reviewedSteps = steps.filter(
    (step) => step.status === "done" || step.status === "skipped"
  ).length;

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
    if (!facilityId || !id) return;
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
    if (!facilityId || !id || !stepId) return;
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
    const title = stepTitle.trim();
    if (!title) {
      setMessage("Step title is required.");
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
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text>Missing run id.</Text>
      </ScrollView>
    );
  if (loading)
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text>Loading...</Text>
      </ScrollView>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>SOP Run Detail</Text>
      <Text style={styles.sub}>runId: {String(id)}</Text>
      <Text style={styles.sub}>status: {String(run?.status || "unknown")}</Text>
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
            const status = String(step.status || "pending");
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
                  <Text style={[styles.statusPill, statusStyle]}>{status}</Text>
                </View>
                {step.note ? (
                  <Text style={styles.stepNote}>{String(step.note)}</Text>
                ) : null}
                <View style={styles.stepActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Mark SOP step ${title} done`}
                    onPress={() => updateStep(stepId, "done", { title })}
                    disabled={busy}
                    style={[styles.stepBtn, styles.doneBtn, busy && styles.disabled]}
                  >
                    <Text style={styles.stepBtnText}>Done</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reset SOP step ${title} pending`}
                    onPress={() => updateStep(stepId, "pending", { title })}
                    disabled={busy}
                    style={[styles.stepBtn, styles.pendingBtn, busy && styles.disabled]}
                  >
                    <Text style={styles.stepBtnText}>Pending</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Skip SOP step ${title}`}
                    onPress={() => updateStep(stepId, "skipped", { title })}
                    disabled={busy}
                    style={[styles.stepBtn, styles.skipBtn, busy && styles.disabled]}
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
          style={[styles.addBtn, (!!savingStep || !stepTitle.trim()) && styles.disabled]}
        >
          <Text style={styles.btnText}>Add Step</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mark SOP run complete"
        onPress={completeRun}
        style={styles.btn}
      >
        <Text style={styles.btnText}>Mark Complete</Text>
      </Pressable>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Raw audit envelope</Text>
        <Text selectable style={styles.json}>
          {JSON.stringify(run, null, 2)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75 },
  progressCard: {
    borderWidth: 1,
    borderColor: "#d1fae5",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ecfdf5"
  },
  progressValue: { color: "#065f46", fontSize: 24, fontWeight: "900" },
  progressLabel: { color: "#047857", fontWeight: "800" },
  btn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 10,
    alignItems: "center"
  },
  btnText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  msg: { fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff",
    gap: 8
  },
  cardTitle: { color: "#111827", fontWeight: "900" },
  stepCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
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
  stepBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  doneBtn: { backgroundColor: "#16a34a" },
  pendingBtn: { backgroundColor: "#ca8a04" },
  skipBtn: { backgroundColor: "#64748b" },
  stepBtnText: { color: "#fff", fontWeight: "900" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff"
  },
  noteInput: { minHeight: 72, textAlignVertical: "top" },
  addBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    padding: 10,
    alignItems: "center"
  },
  json: { fontFamily: "monospace", fontSize: 12 }
});
