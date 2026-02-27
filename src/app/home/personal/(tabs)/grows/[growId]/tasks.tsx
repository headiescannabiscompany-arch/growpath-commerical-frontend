import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { createPersonalTask, listPersonalTasks, updatePersonalTask } from "@/api/tasks";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, fmtDate, getRowId } from "./utils";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#64748B", marginBottom: 10 },
  row: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  addBtn: {
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#166534"
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700" },
  card: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#F8FAFC"
  },
  taskTitle: { fontWeight: "700" },
  taskMeta: { color: "#64748B", marginTop: 4, fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF"
  },
  actionText: { fontWeight: "700", color: "#0F172A" }
});

export default function GrowTasksScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!growId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listPersonalTasks({ growId });
      setTasks(Array.isArray(rows) ? rows : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.subtitle}>Personal grow tasks linked to this grow.</Text>
      <GrowWorkspaceNav growId={growId} active="tasks" />

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Add task title"
          value={newTitle}
          onChangeText={setNewTitle}
        />
        <Pressable
          style={styles.addBtn}
          onPress={async () => {
            if (!growId || !newTitle.trim()) return;
            const created = await createPersonalTask({
              growId,
              title: newTitle.trim()
            });
            if (created) {
              setNewTitle("");
              setFeedback("Task created.");
              await load();
            } else {
              setFeedback("Unable to create task.");
            }
          }}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {feedback ? <Text style={styles.taskMeta}>{feedback}</Text> : null}

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.taskMeta}>No tasks yet.</Text>
        </View>
      ) : (
        tasks.map((task) => {
          const id = getRowId(task);
          const done = Boolean(task?.completed);
          return (
            <View key={id || `${task.title}-${task.dueDate}`} style={styles.card}>
              <Text style={styles.taskTitle}>
                {done ? "Done: " : ""}
                {task?.title || "Untitled task"}
              </Text>
              <Text style={styles.taskMeta}>Due: {fmtDate(task?.dueDate)}</Text>
              <View style={styles.actionRow}>
                {id ? (
                  <Pressable
                    style={styles.actionBtn}
                    onPress={async () => {
                      const updated = await updatePersonalTask(id, { completed: !done });
                      if (updated) {
                        setFeedback(done ? "Task reopened." : "Task completed.");
                        await load();
                      } else {
                        setFeedback("Unable to update task.");
                      }
                    }}
                  >
                    <Text style={styles.actionText}>{done ? "Reopen" : "Complete"}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
