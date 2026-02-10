import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function FacilitySopRunDetail() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="FacilitySopRunDetail">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>FacilitySopRunDetail</Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : (
          <>
            <Text style={{ opacity: 0.75 }}>
              Stub screen (safe mount). Wire API later.
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { TextInput } from "react-native";
import { RoleGate } from "@/components/RoleGate";
import { runBulkAction } from "@/utils/runBulkAction";
import { bulkErrorToInline } from "@/utils/bulkErrorToInline";

import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

// Types
// SOPRunStep, SOPRun
function normalizeRun(res: any) {
  if (!res) return null;
  if (res.run) return res.run;
  if (res.sopRun) return res.sopRun;
  return res;
}

function formatDate(x?: string) {
  if (!x) return "";
  const t = new Date(x).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(x).toLocaleString();
}

function statusColor(status?: string) {
  const s = String(status || "pending").toLowerCase();
  if (s === "done" || s === "completed") return "#10b981";
  if (s === "skipped") return "#6b7280";
  if (s === "active") return "#2563eb";
  return "#f59e0b";
}

export default function SOPRunDetailScreen({ route, navigation }: any) {
  const closeLinkedTaskForStep = async (stepId: string) => {
    if (!facilityId || !runId) return;
    try {
      const res = await apiRequest(endpoints.tasks(facilityId));
      const tasks = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.tasks)
          ? res.tasks
          : Array.isArray(res)
            ? res
            : [];
      const linked = tasks.find((t: any) => {
        return (
          String(t?.sopRunId || "") === String(runId) &&
          String(t?.sopStepId || "") === String(stepId)
        );
      });
      if (!linked) return;
      const currentStatus = String(linked?.status || "").toLowerCase();
      if (currentStatus === "completed") return;
      await apiRequest(endpoints.task(facilityId, String(linked?._id || linked?.id)), {
        method: "PUT",
        body: { status: "completed" }
      });
    } catch (e) {
      setError(handleApiError(e));
    }
  };
  const runId = route?.params?.id || route?.params?._id;
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [mutatingStepId, setMutatingStepId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [linking, setLinking] = useState(false);
  const generateTasksForPendingSteps = async () => {
    if (!facilityId || !runId || !run) return;
    setLinking(true);
    setError(null);
    const pending = steps.filter(
      (s) => String(s.status || "pending").toLowerCase() === "pending"
    );
    if (pending.length === 0) {
      setError({
        code: "NO_PENDING_STEPS",
        message: "No pending steps to generate tasks for."
      });
      setLinking(false);
      return;
    }
    const titleBase = run.sopTemplateTitleSnapshot || run.sopTemplateId || "SOP";
    const result = await runBulkAction(
      pending.map((s) => String(s.id)),
      async (stepId) => {
        const step = pending.find((p) => String(p.id) === String(stepId));
        await apiRequest(endpoints.tasks(facilityId), {
          method: "POST",
          body: {
            title: `SOP: ${titleBase} — ${step?.title || "Step"}`,
            description: "Generated from SOP run",
            status: "open",
            sopRunId: String(runId),
            sopStepId: String(stepId),
            sopTemplateId: run.sopTemplateId ? String(run.sopTemplateId) : undefined,
            sopTemplateTitle: titleBase
          }
        });
      }
    );
    const inline = bulkErrorToInline(result.failed);
    if (inline) setError(inline);
    await load();
    setLinking(false);
    // navigation.navigate("Tasks"); // optional
  };
  const hasPendingSteps = useMemo(() => {
    return steps.some((s) => String(s.status || "pending").toLowerCase() === "pending");
  }, [steps]);

  const canComplete = useMemo(() => {
    const status = String(run?.status || "active").toLowerCase();
    return status === "active" && !hasPendingSteps && steps.length > 0;
  }, [run, hasPendingSteps, steps.length]);
  const completeRun = async () => {
    if (!facilityId || !runId) return;
    setCompleting(true);
    setError(null);
    try {
      await apiRequest(endpoints.sopRunComplete(facilityId, String(runId)), {
        method: "PUT",
        body: {}
      });
      await load();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setCompleting(false);
    }
  };

  const load = async () => {
    if (!facilityId || !runId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(endpoints.sopRun(facilityId, String(runId)));
      setRun(normalizeRun(res));
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const updateStep = async (stepId: string, status: "done" | "skipped") => {
    if (!facilityId || !runId) return;
    setMutatingStepId(stepId);
    setError(null);
    try {
      const note = noteDrafts[stepId];
      await apiRequest(endpoints.sopRunStep(facilityId, String(runId), String(stepId)), {
        method: "PUT",
        body: {
          status,
          ...(note ? { note } : {})
        }
      });
      // Reverse sync: if step is resolved, auto-close linked task
      await closeLinkedTaskForStep(String(stepId));
      await load();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setMutatingStepId(null);
    }
  };
  useEffect(() => {
    load();
  }, [facilityId, runId]);

  const steps = useMemo(() => {
    const list = Array.isArray(run?.steps) ? run!.steps! : [];
    return list.map((s, idx) => ({ ...s, id: s.id || String(idx + 1) }));
  }, [run]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 40 }}>
        <ActivityIndicator />
      </View>
    );
  }

  const title = run?.sopTemplateTitleSnapshot || run?.sopTemplateId || "SOP Run";

  const runStatus = String(run?.status || "active");

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <RoleGate minRole="STAFF">
        <TouchableOpacity
          onPress={generateTasksForPendingSteps}
          disabled={linking}
          style={{
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: "#111827",
            opacity: linking ? 0.7 : 1,
            marginBottom: 12
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>
            {linking ? "Generating..." : "Generate Tasks from Pending Steps"}
          </Text>
        </TouchableOpacity>
      </RoleGate>
      <RoleGate minRole="STAFF">
        <View style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={completeRun}
            disabled={!canComplete || completing}
            style={{
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor: canComplete ? "#2563eb" : "#e5e7eb",
              opacity: completing ? 0.7 : 1
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                color: canComplete ? "#fff" : "#6b7280"
              }}
            >
              {completing
                ? "Completing..."
                : canComplete
                  ? "Complete Run"
                  : hasPendingSteps
                    ? "Complete Run (finish all steps)"
                    : "Complete Run"}
            </Text>
          </TouchableOpacity>
          {!canComplete && steps.length > 0 ? (
            <Text style={{ marginTop: 6, opacity: 0.75 }}>
              Completion is enabled once all steps are marked Done or Skipped.
            </Text>
          ) : null}
        </View>
      </RoleGate>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "800" }}>{title}</Text>
        <Text style={{ marginTop: 4, opacity: 0.8 }}>
          Status:{" "}
          <Text style={{ color: statusColor(runStatus), fontWeight: "800" }}>
            {runStatus.toUpperCase()}
          </Text>
        </Text>
        <Text style={{ marginTop: 4, opacity: 0.8 }}>
          Created: {formatDate(run?.createdAt)}
        </Text>
        {run?.completedAt ? (
          <Text style={{ marginTop: 4, opacity: 0.8 }}>
            Completed: {formatDate(run.completedAt)}
          </Text>
        ) : null}
        {typeof run?.sopTemplateVersionSnapshot === "number" ? (
          <Text style={{ marginTop: 4, opacity: 0.8 }}>
            Template Version: {run.sopTemplateVersionSnapshot}
          </Text>
        ) : null}
      </View>
      <InlineError error={error} />
      {/* Audit timeline link (no embed yet) */}
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("AuditEntityTimeline", {
            entity: "sopRun",
            entityId: String(runId)
          })
        }
        style={{ marginBottom: 12 }}
      >
        <Text style={{ fontWeight: "800" }}>View Audit Timeline →</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 8 }}>Steps</Text>
      {steps.length === 0 ? (
        <Text>No steps found on this run</Text>
      ) : (
        <FlatList
          data={steps}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item, index }) => {
            const st = String(item.status || "pending");
            return (
              <View
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e5e7eb"
                }}
              >
                <Text style={{ fontWeight: "800" }}>
                  {index + 1}. {item.title || "Untitled step"}
                </Text>
                <Text style={{ marginTop: 4, color: statusColor(st), fontWeight: "800" }}>
                  {st.toUpperCase()}
                </Text>
                {item.description ? (
                  <Text style={{ marginTop: 4, opacity: 0.8 }}>{item.description}</Text>
                ) : null}
                {item.completedAt ? (
                  <Text style={{ marginTop: 4, opacity: 0.7 }}>
                    Completed: {formatDate(item.completedAt)}
                    {item.completedBy?.name ? ` · ${item.completedBy.name}` : ""}
                  </Text>
                ) : null}
                {item.note ? (
                  <Text style={{ marginTop: 4, opacity: 0.8 }}>Note: {item.note}</Text>
                ) : null}
                <RoleGate minRole="STAFF">
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontWeight: "800", marginBottom: 6 }}>
                      Note (optional)
                    </Text>
                    <TextInput
                      value={noteDrafts[item.id] || ""}
                      onChangeText={(txt) =>
                        setNoteDrafts((prev) => ({ ...prev, [item.id]: txt }))
                      }
                      placeholder="Add a note..."
                      multiline
                      style={{
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 8,
                        padding: 10,
                        minHeight: 44
                      }}
                      editable={!mutatingStepId}
                    />
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        onPress={() => updateStep(String(item.id), "done")}
                        disabled={!!mutatingStepId}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: "center",
                          backgroundColor: "#d1fae5",
                          opacity: mutatingStepId ? 0.6 : 1
                        }}
                      >
                        <Text style={{ fontWeight: "800", color: "#065f46" }}>
                          {mutatingStepId === String(item.id) ? "Saving..." : "Mark Done"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => updateStep(String(item.id), "skipped")}
                        disabled={!!mutatingStepId}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: "center",
                          backgroundColor: "#e5e7eb",
                          opacity: mutatingStepId ? 0.6 : 1
                        }}
                      >
                        <Text style={{ fontWeight: "800", color: "#374151" }}>
                          {mutatingStepId === String(item.id) ? "Saving..." : "Skip"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </RoleGate>
              </View>
            );
          }}
        />
      )}
      <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: "800" }}>Reload</Text>
      </TouchableOpacity>
    </View>
  );
}
