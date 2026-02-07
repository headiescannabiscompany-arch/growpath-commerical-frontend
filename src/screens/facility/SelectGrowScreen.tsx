import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

export default function SelectGrowScreen({
  facilityId,
  growId,
  onSelect
}: {
  facilityId: string;
  growId: string;
  onSelect: (growId: string) => void;
}) {
  const [value, setValue] = useState(growId || "");

  const trimmed = useMemo(() => value.trim(), [value]);
  const canSave = trimmed.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Select Grow</Text>
      <Text style={styles.sub}>
        Enter a Grow ID to enable grow-scoped AI tools (Harvest).
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Facility</Text>
        <Text style={styles.mono}>{facilityId}</Text>

        <View style={{ height: 12 }} />

        <Text style={styles.label}>Grow ID</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="e.g. GROW_123"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <View style={{ height: 12 }} />

        <Pressable
          disabled={!canSave}
          onPress={() => onSelect(trimmed)}
          style={[styles.btn, !canSave && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>Use This Grow</Text>
        </Pressable>

        <Pressable onPress={() => onSelect("")} style={styles.linkBtn}>
          <Text style={styles.linkText}>Clear grow selection</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Later: replace this with a picker backed by GET /grows once it exists.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  sub: { fontSize: 14, opacity: 0.7, marginBottom: 12, lineHeight: 18 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff"
  },
  label: { fontSize: 12, fontWeight: "700", opacity: 0.6, marginBottom: 6 },
  mono: { fontSize: 12, fontFamily: "monospace", opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#111827"
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "800" },
  linkBtn: { paddingVertical: 10, alignItems: "center" },
  linkText: { fontSize: 13, fontWeight: "700", opacity: 0.7 },
  hint: { marginTop: 12, fontSize: 12, opacity: 0.6, lineHeight: 16 }
});
