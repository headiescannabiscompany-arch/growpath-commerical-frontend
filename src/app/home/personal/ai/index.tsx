import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { runTool } from "@/ai/toolRegistry";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  body: { flex: 1, padding: 16 },
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

export default function AiScreen() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Ask me something. Try: vpd 78f 60" }
  ]);

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

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
            text: `VPD ≈ ${v.toFixed(2)} kPa (tempC=${res.data.tempC.toFixed(1)}°C)`
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

    // Minimal: acknowledge for now (no backend yet)
    setMessages((m) => [
      ...m,
      { role: "assistant", text: "Got it. (Next: add grow/log context + photo uploads.)" }
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
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
          placeholder="Type here…"
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
