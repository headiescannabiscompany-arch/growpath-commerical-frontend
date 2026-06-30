import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { runTool } from "@/ai/toolRegistry";
import { listPersonalGrows } from "@/api/grows";
import { createPersonalLog, listPersonalLogs } from "@/api/logs";
import { createPersonalTask, listPersonalTasks } from "@/api/tasks";
import { getDiagnosisHistory } from "@/api/diagnose";
import { listToolRuns } from "@/api/toolRuns";
import {
  askPersonalAssistant,
  type AssistantProposedWrite,
  type AssistantReference
} from "@/api/personalAssistant";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  body: { flex: 1, padding: 16 },
  contextCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#F8FAFC"
  },
  actionCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#F0FDF4"
  },
  referenceCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#EFF6FF"
  },
  draftCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#FFF7ED"
  },
  actionButton: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 8,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  actionButtonText: { color: "white", fontWeight: "800" },
  contextText: { fontSize: 12, color: "#64748B", marginBottom: 4 },
  contextTitle: { fontWeight: "700", color: "#0F172A" },
  growPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  growChip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  growChipOn: { backgroundColor: "#166534", borderColor: "#166534" },
  growChipText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  growChipTextOn: { color: "#FFFFFF" },
  msg: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 10
  },
  msgRole: { fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: "700" },
  msgText: { fontSize: 14, color: "#0F172A" },
  composer: { padding: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  input: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 12 },
  send: {
    marginTop: 10,
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  sendText: { color: "#fff", fontWeight: "800" },
  hint: { marginTop: 8, fontSize: 12, color: "#64748B" }
});

type Msg = { role: "user" | "assistant"; text: string };
type AssistantAction = { label: string; href: string };

interface ContextData {
  growCount: number;
  logCount: number;
  taskCount: number;
  loadedAt: string;
  grows: any[];
  logs: any[];
  tasks: any[];
  toolRuns: any[];
  diagnoses: any[];
  photosMetadata: any[];
}

function parseVpdCommand(
  text: string
): { temp: number; unit: "F" | "C"; rh: number } | null {
  // Accept: "vpd 78f 60" or "vpd 25c 60"
  const t = text.trim().toLowerCase();
  if (!t.startsWith("vpd ")) return null;

  const parts = t.split(/\s+/).slice(1); // after "vpd"
  if (parts.length < 2) return null;

  const tempPart = parts[0]; // "78f"
  const rhPart = parts[1]; // "60"

  const unit = tempPart.endsWith("f") ? "F" : tempPart.endsWith("c") ? "C" : null;
  if (!unit) return null;

  const tempNum = Number(tempPart.slice(0, -1));
  const rhNum = Number(rhPart);

  if (!Number.isFinite(tempNum) || !Number.isFinite(rhNum)) return null;
  return { temp: tempNum, unit, rh: rhNum };
}

function rowTime(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    const time = value ? new Date(value).getTime() : 0;
    if (Number.isFinite(time) && time > 0) return time;
  }
  return 0;
}

function formatDate(value: any) {
  const time = value ? new Date(value).getTime() : 0;
  if (!Number.isFinite(time) || time <= 0) return "no date";
  return new Date(time).toLocaleDateString();
}

function activeGrows(grows: any[]) {
  return grows.filter((grow) => String(grow?.status || "").toLowerCase() !== "harvested");
}

function latestLog(logs: any[]) {
  return [...logs].sort(
    (left, right) =>
      rowTime(right, ["date", "createdAt", "updatedAt"]) -
      rowTime(left, ["date", "createdAt", "updatedAt"])
  )[0];
}

function nextOpenTask(tasks: any[]) {
  return [...tasks]
    .filter((task) => !task?.completed)
    .sort(
      (left, right) =>
        rowTime(left, ["dueDate", "dueAt", "createdAt"]) -
        rowTime(right, ["dueDate", "dueAt", "createdAt"])
    )[0];
}

function buildContextReply(text: string, context: ContextData | null) {
  const lower = text.toLowerCase();
  if (!context) {
    return "I am still loading your grows, journal entries, and tasks. Try again in a moment, or use: vpd 78f 60.";
  }

  if (lower.includes("task") || lower.includes("todo") || lower.includes("next")) {
    const task = nextOpenTask(context.tasks);
    if (!task) {
      return `You have no open personal grow tasks. Across this account I see ${context.growCount} grows and ${context.logCount} journal entries.`;
    }
    return `Next open task: ${task.title || "Untitled task"} due ${formatDate(task.dueDate || task.dueAt)}. ${task.description || "Open the grow task list to update or complete it."}`;
  }

  if (lower.includes("log") || lower.includes("journal") || lower.includes("recent")) {
    const log = latestLog(context.logs);
    if (!log) {
      return "No journal entries are recorded yet. Start with one observation: date, stage, watering/feed, environment, and plant response.";
    }
    return `Latest journal entry: ${log.title || log.type || "Untitled entry"} on ${formatDate(log.date || log.createdAt)}. ${log.notes || "Open the journal to review details."}`;
  }

  if (lower.includes("grow") || lower.includes("garden") || lower.includes("plant")) {
    const active = activeGrows(context.grows);
    const newest = [...active].sort(
      (left, right) =>
        rowTime(right, ["updatedAt", "createdAt", "startDate"]) -
        rowTime(left, ["updatedAt", "createdAt", "startDate"])
    )[0];
    if (!context.growCount) {
      return "No grows are set up yet. Create a grow first so logs, tools, tasks, and AI context have a place to attach.";
    }
    return `You have ${active.length} active grow${active.length === 1 ? "" : "s"} out of ${context.growCount}. Current focus: ${newest?.name || newest?.title || "active grow"}.`;
  }

  if (
    lower.includes("diagnose") ||
    lower.includes("sick") ||
    lower.includes("deficiency") ||
    lower.includes("pest")
  ) {
    return "For diagnosis, include plant type, stage, symptom location, spread speed, watering/feed, pH/EC if known, temperature, RH, light level, and a clear photo when available. Save the result to the grow journal so follow-up tasks stay attached.";
  }

  if (
    lower.includes("dew") ||
    lower.includes("humidity") ||
    lower.includes("environment") ||
    lower.includes("mold") ||
    lower.includes("rot")
  ) {
    return "For environment risk, use Dew Point Guard with current or sensor readings. Watch night-cycle RH, cold surfaces, dense canopy zones, and dew point spread under 2C.";
  }

  if (lower.includes("feed") || lower.includes("water") || lower.includes("nutrient")) {
    return "For feeding or watering, use the feeding schedule, NPK, and watering tools with grow stage, medium, container size, recent runoff, and plant response.";
  }

  return `I have context for ${context.growCount} grows, ${context.logCount} journal entries, and ${context.taskCount} tasks. Ask about next task, recent journal, grow status, diagnosis, dew point risk, feeding, watering, or use: vpd 78f 60.`;
}

export default function AiScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Ask about your next task, recent journal, diagnosis, dew point risk, feeding, watering, or try: vpd 78f 60"
    }
  ]);
  const [context, setContext] = useState<ContextData | null>(null);
  const [actions, setActions] = useState<AssistantAction[]>([]);
  const [references, setReferences] = useState<AssistantReference[]>([]);
  const [proposedWrites, setProposedWrites] = useState<AssistantProposedWrite[]>([]);
  const [selectedGrowId, setSelectedGrowId] = useState("");
  const [sending, setSending] = useState(false);
  const [writeFeedback, setWriteFeedback] = useState("");

  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending]);

  // Fetch context (grows, logs, tasks) on mount
  useEffect(() => {
    async function loadContext() {
      try {
        const [grows, logs, tasks, toolRuns, diagnoses] = await Promise.all([
          listPersonalGrows(),
          listPersonalLogs(),
          listPersonalTasks(),
          listToolRuns(),
          getDiagnosisHistory()
        ]);
        const activeGrowId =
          selectedGrowId ||
          String(
            grows.find((grow) => grow.status !== "harvested")?.id || grows[0]?.id || ""
          );
        const photosMetadata = logs.flatMap((log: any) =>
          Array.isArray(log.photoMetadata) ? log.photoMetadata : []
        );

        setContext({
          growCount: grows.length,
          logCount: logs.length,
          taskCount: tasks.length,
          loadedAt: new Date().toLocaleTimeString(),
          grows,
          logs,
          tasks,
          toolRuns,
          diagnoses,
          photosMetadata
        });
        if (!selectedGrowId && activeGrowId) setSelectedGrowId(activeGrowId);
      } catch (err) {
        console.error("[AI] Failed to load context:", err);
        setContext({
          growCount: 0,
          logCount: 0,
          taskCount: 0,
          loadedAt: "error",
          grows: [],
          logs: [],
          tasks: [],
          toolRuns: [],
          diagnoses: [],
          photosMetadata: []
        });
      }
    }

    loadContext();
  }, [selectedGrowId]);

  const selectedGrow = useMemo(
    () => context?.grows.find((grow) => String(grow.id || grow._id) === selectedGrowId),
    [context?.grows, selectedGrowId]
  );

  function assistantContext() {
    const growId = selectedGrowId;
    const scoped = (rows: any[]) =>
      growId ? rows.filter((row) => !row?.growId || String(row.growId) === growId) : rows;
    return {
      selectedGrowId: growId || null,
      selectedGrow: selectedGrow || null,
      grows: context?.grows || [],
      logs: scoped(context?.logs || []).slice(0, 20),
      tasks: scoped(context?.tasks || []).slice(0, 20),
      toolRuns: scoped(context?.toolRuns || []).slice(0, 12),
      diagnoses: scoped(context?.diagnoses || []).slice(0, 12),
      photosMetadata: scoped(context?.photosMetadata || []).slice(0, 20),
      environmentHistory: [],
      recipes: [],
      phenoScores: []
    };
  }

  async function askBackend(text: string) {
    const res = await askPersonalAssistant({
      message: text,
      context: context ? assistantContext() : { grows: [], logs: [], tasks: [] }
    });

    if (!res?.success || !res.reply) {
      throw new Error("Personal assistant did not return a reply.");
    }

    setActions(Array.isArray(res.actions) ? res.actions : []);
    setReferences(Array.isArray(res.referencedData) ? res.referencedData : []);
    setProposedWrites(Array.isArray(res.proposedWrites) ? res.proposedWrites : []);
    return res.reply;
  }

  async function confirmWrite(write: AssistantProposedWrite) {
    setWriteFeedback("");
    const payload = { ...(write.payload || {}) };
    const growId = payload.growId || selectedGrowId;
    if (!growId) {
      setWriteFeedback("Select a grow before confirming an AI draft.");
      return;
    }
    if (write.type === "create_task") {
      const created = await createPersonalTask({
        growId,
        title: String(payload.title || "AI suggested task"),
        description: String(payload.description || ""),
        priority: payload.priority || "medium",
        sourceType: "ai_assistant",
        sourceObjectId: payload.sourceObjectId || undefined
      });
      if (!created) throw new Error("Unable to create AI suggested task.");
      setWriteFeedback("AI suggested task created.");
    } else if (write.type === "draft_log") {
      const created = await createPersonalLog({
        growId,
        title: String(payload.title || "AI grow summary"),
        notes: String(payload.notes || ""),
        type: String(payload.type || "ai_summary"),
        date: new Date().toISOString(),
        tags: ["ai_assistant"]
      });
      if (!created) throw new Error("Unable to create AI drafted log.");
      setWriteFeedback("AI drafted log saved.");
    } else {
      setWriteFeedback(`Unsupported AI draft: ${write.type}`);
      return;
    }
    setProposedWrites((current) => current.filter((item) => item !== write));
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    setDraft("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", text }]);

    const cmd = parseVpdCommand(text);
    if (cmd) {
      const res = runTool({ name: "calc_vpd", args: cmd });
      if (res.ok) {
        const v = res.data.vpdKpa;
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: `VPD approx ${v.toFixed(2)} kPa (tempC=${res.data.tempC.toFixed(1)} C)`
          }
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: `Error: ${res.error.message}` }
        ]);
      }
      setSending(false);
      return;
    }

    try {
      setReferences([]);
      setProposedWrites([]);
      const reply = await askBackend(text);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err: any) {
      setActions([]);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `${buildContextReply(text, context)}\n\nAPI fallback: ${
            err?.message || "Unable to reach assistant endpoint."
          }`
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        {context && (
          <View style={styles.contextCard}>
            <Text style={[styles.contextText, styles.contextTitle]}>Context Loaded</Text>
            <Text style={styles.contextText}>Grows: {context.growCount}</Text>
            <Text style={styles.contextText}>Logs: {context.logCount}</Text>
            <Text style={styles.contextText}>Tasks: {context.taskCount}</Text>
            <Text style={styles.contextText}>Tool runs: {context.toolRuns.length}</Text>
            <Text style={styles.contextText}>Diagnoses: {context.diagnoses.length}</Text>
            <Text style={styles.contextText}>Updated: {context.loadedAt}</Text>
            {context.grows.length ? (
              <View style={styles.growPicker}>
                {context.grows.map((grow) => {
                  const id = String(grow.id || grow._id || "");
                  const active = id === selectedGrowId;
                  return (
                    <Pressable
                      key={id || grow.name}
                      accessibilityRole="button"
                      accessibilityLabel={`Select AI grow ${grow.name || id}`}
                      onPress={() => setSelectedGrowId(id)}
                      style={[styles.growChip, active && styles.growChipOn]}
                    >
                      <Text
                        style={[styles.growChipText, active && styles.growChipTextOn]}
                      >
                        {grow.name || id}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        )}
        {messages.map((m, idx) => (
          <View key={idx} style={styles.msg}>
            <Text style={styles.msgRole}>{m.role.toUpperCase()}</Text>
            <Text style={styles.msgText}>{m.text}</Text>
          </View>
        ))}
        {actions.length ? (
          <View style={styles.actionCard}>
            <Text style={[styles.contextText, styles.contextTitle]}>
              Suggested actions
            </Text>
            {actions.map((action) => (
              <Pressable
                key={`${action.label}-${action.href}`}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => router.push(action.href as any)}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {references.length ? (
          <View style={styles.referenceCard}>
            <Text style={[styles.contextText, styles.contextTitle]}>
              Referenced grow data
            </Text>
            {references.map((item, index) => (
              <Text key={`${item.type}-${item.id || index}`} style={styles.contextText}>
                {item.type}: {item.title}
                {item.timestamp ? ` (${formatDate(item.timestamp)})` : ""}
              </Text>
            ))}
          </View>
        ) : null}
        {proposedWrites.length ? (
          <View style={styles.draftCard}>
            <Text style={[styles.contextText, styles.contextTitle]}>
              Drafted actions require confirmation
            </Text>
            {proposedWrites.map((write, index) => (
              <View key={`${write.type}-${index}`} style={{ marginTop: 8 }}>
                <Text style={styles.contextText}>
                  {write.type}:{" "}
                  {write.payload?.title || write.payload?.notes || "AI draft"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Confirm ${write.type}`}
                  onPress={() => confirmWrite(write)}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Confirm</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {writeFeedback ? <Text style={styles.hint}>{writeFeedback}</Text> : null}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type here..."
          onSubmitEditing={send}
        />
        <Pressable
          style={[styles.send, { opacity: canSend ? 1 : 0.5 }]}
          disabled={!canSend}
          onPress={send}
          accessibilityRole="button"
          accessibilityLabel="Send"
        >
          <Text style={styles.sendText}>{sending ? "Thinking..." : "Send"}</Text>
        </Pressable>
        <Text style={styles.hint}>Commands: vpd 78f 60 | vpd 25c 60</Text>
      </View>
    </View>
  );
}
