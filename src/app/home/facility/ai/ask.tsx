import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useFacility } from "@/state/useFacility";
import { useAICall } from "@/hooks/useAICall";

export default function FacilityAiAskRoute() {
  const { selectedId: facilityId } = useFacility();
  const { callAI, loading, error, last } = useAICall(String(facilityId || ""));

  const [tool, setTool] = useState("harvest");
  const [fn, setFn] = useState("estimateHarvestWindow");
  const [argsJson, setArgsJson] = useState('{"daysSinceFlip":65,"goal":"balanced","distribution":{"clear":0.2,"cloudy":0.7,"amber":0.1}}');

  const canRun = useMemo(
    () => !!facilityId && tool.trim() && fn.trim() && argsJson.trim() && !loading,
    [facilityId, tool, fn, argsJson, loading]
  );

  const run = async () => {
    if (!canRun) return;
    let parsed: any = {};
    try {
      parsed = JSON.parse(argsJson);
    } catch {
      return;
    }
    await callAI({ tool: tool.trim(), fn: fn.trim(), args: parsed, context: {} });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Facility AI Ask</Text>
      <Text style={styles.sub}>Run direct AI tool calls for debugging and operations.</Text>

      <TextInput value={tool} onChangeText={setTool} style={styles.input} placeholder="Tool" />
      <TextInput value={fn} onChangeText={setFn} style={styles.input} placeholder="Function" />
      <TextInput
        value={argsJson}
        onChangeText={setArgsJson}
        style={[styles.input, styles.code]}
        placeholder="Args JSON"
        multiline
      />

      <Pressable onPress={run} disabled={!canRun} style={[styles.button, !canRun && styles.disabled]}>
        <Text style={styles.buttonText}>{loading ? "Running..." : "Run AI Call"}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error.code}: {error.message}</Text> : null}
      {last ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last Response</Text>
          <Text selectable style={styles.codeText}>{JSON.stringify(last, null, 2)}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  code: { minHeight: 120, textAlignVertical: "top", fontFamily: "monospace" },
  button: { marginTop: 4, backgroundColor: "#111827", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  disabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "800" },
  error: { color: "#b91c1c", marginTop: 4 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 10, backgroundColor: "#fff", marginTop: 6 },
  cardTitle: { fontWeight: "800", marginBottom: 4 },
  codeText: { fontFamily: "monospace", fontSize: 12 }
});
