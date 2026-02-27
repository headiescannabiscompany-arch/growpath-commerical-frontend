import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { apiRequest } from "@/api/apiRequest";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#475569", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "700", marginTop: 10 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12
  },
  cta: {
    marginTop: 20,
    backgroundColor: "#166534",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  ctaText: { color: "#FFFFFF", fontWeight: "700" },
  errorBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10
  },
  errorText: { color: "#7F1D1D", fontWeight: "700" }
});

export default function NewLogScreen() {
  const router = useRouter();
  const { growId: growIdParam } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId =
    typeof growIdParam === "string"
      ? growIdParam
      : Array.isArray(growIdParam)
        ? growIdParam[0]
        : "";
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [logType, setLogType] = React.useState("other");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const canSave = growId.length > 0 && title.trim().length > 0 && date.trim().length > 0;

  const onSave = React.useCallback(async () => {
    if (!growId) {
      setError("A grow is required. Open this screen from a grow.");
      return;
    }
    if (!canSave) {
      setError("Title and date are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/personal/logs", {
        method: "POST",
        body: {
          growId,
          title: title.trim(),
          date: date.trim(),
          notes: notes.trim(),
          type: logType
        }
      });
      router.replace(`/home/personal/grows/${growId}/journal`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create log.");
    } finally {
      setSaving(false);
    }
  }, [canSave, date, growId, logType, notes, router, title]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Journal Entry</Text>
      <Text style={styles.subtitle}>
        {growId ? `Grow context: ${growId}` : "No grow selected"}
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Title</Text>
      <TextInput
        placeholder="Day 12 - Defoliation"
        style={styles.input}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput placeholder="2026-02-27" style={styles.input} value={date} onChangeText={setDate} />

      <Text style={styles.label}>Type</Text>
      <TextInput
        placeholder="watering | feed | training | environment | issues | harvest | other"
        style={styles.input}
        value={logType}
        onChangeText={setLogType}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        placeholder="What happened today?"
        style={[styles.input, { height: 120, textAlignVertical: "top" }]}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <Pressable style={styles.cta} disabled={!canSave || saving} onPress={onSave}>
        <Text style={styles.ctaText}>{saving ? "Saving..." : "Create Log"}</Text>
      </Pressable>
    </View>
  );
}
