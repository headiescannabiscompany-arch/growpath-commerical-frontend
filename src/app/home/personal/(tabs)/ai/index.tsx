import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { runTool } from "@/ai/toolRegistry";
import { listPersonalGrows } from "@/api/grows";
import { listPersonalLogs } from "@/api/logs";
import { listPersonalTasks } from "@/api/tasks";

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
  contextText: { fontSize: 12, color: "#64748B", marginBottom: 4 },
  contextTitle: { fontWeight: "700", color: "#0F172A" },
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

interface ContextData {
  growCount: number;
  logCount: number;
  taskCount: number;
  loadedAt: string;
  grows: any[];
  logs: any[];
  tasks: any[];
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
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Ask me something. Try: vpd 78f 60" }
  ]);
  const [context, setContext] = useState<ContextData | null>(null);

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

  // Fetch context (grows, logs, tasks) on mount
  useEffect(() => {
    async function loadContext() {
      try {
        const [grows, logs, tasks] = await Promise.all([
          listPersonalGrows(),
          listPersonalLogs(),
          listPersonalTasks()
        ]);

        setContext({
          growCount: grows.length,
          logCount: logs.length,
          taskCount: tasks.length,
          loadedAt: new Date().toLocaleTimeString(),
          grows,
          logs,
          tasks
        });
      } catch (err) {
        console.error("[AI] Failed to load context:", err);
        setContext({
          growCount: 0,
          logCount: 0,
          taskCount: 0,
          loadedAt: "error",
          grows: [],
          logs: [],
          tasks: []
        });
      }
    }

    loadContext();
  }, []);

  function send() {
    const text = draft.trim();
    if (!text) return;

    setDraft("");
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
      return;
    }

    setMessages((m) => [
      ...m,
      { role: "assistant", text: buildContextReply(text, context) }
    ]);
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
            <Text style={styles.contextText}>Updated: {context.loadedAt}</Text>
          </View>
        )}
        {messages.map((m, idx) => (
          <View key={idx} style={styles.msg}>
            <Text style={styles.msgRole}>{m.role.toUpperCase()}</Text>
            <Text style={styles.msgText}>{m.text}</Text>
          </View>
        ))}
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
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
        <Text style={styles.hint}>Commands: vpd 78f 60 | vpd 25c 60</Text>
      </View>
    </View>
  );
}
