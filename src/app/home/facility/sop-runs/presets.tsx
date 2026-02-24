import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { normalizeApiError } from "@/api/errors";
import { useSopTemplates } from "@/hooks/useSopTemplates";
import { useFacility } from "@/state/useFacility";
import type { SOPTemplate } from "@/api/sop";

function pickId(x: SOPTemplate, idx: number) {
  return String(x?.id ?? x?._id ?? `template-${idx}`);
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilitySopRunsPresetsRoute() {
  const { selectedId: facilityId } = useFacility();
  const { templates, isLoading, createTemplate, creating, refetch } =
    useSopTemplates(facilityId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const create = async () => {
    if (!facilityId) {
      setMsg("Select a facility first.");
      return;
    }
    if (!title.trim()) {
      setMsg("Template title is required.");
      return;
    }
    setMsg(null);
    try {
      await createTemplate({ title: title.trim(), content: content.trim() || undefined });
      setTitle("");
      setContent("");
      await refetch();
    } catch (e: unknown) {
      setMsg(getErrorMessage(e, "Failed to create template"));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>SOP Presets</Text>
      <TextInput
        style={styles.input}
        placeholder="Template title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.notes]}
        placeholder="Template content"
        value={content}
        onChangeText={setContent}
        multiline
      />
      <Pressable onPress={create} style={styles.btn}>
        <Text style={styles.btnText}>{creating ? "Saving..." : "Create Preset"}</Text>
      </Pressable>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      {isLoading ? <Text>Loading presets...</Text> : null}
      <FlatList
        data={templates}
        keyExtractor={pickId}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{String(item?.title || "Untitled Template")}</Text>
            <Text style={styles.sub}>{String(item?.content || "")}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  h1: { fontSize: 22, fontWeight: "900" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff"
  },
  notes: { minHeight: 80, textAlignVertical: "top" },
  btn: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    padding: 10,
    alignItems: "center"
  },
  btnText: { color: "#fff", fontWeight: "800" },
  msg: { color: "#b91c1c", fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    marginTop: 10
  },
  title: { fontWeight: "800" },
  sub: { opacity: 0.75 }
});
