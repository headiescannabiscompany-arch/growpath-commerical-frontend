import React, { useState } from "react";
import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
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
    <ScreenBoundary
      title="SOP Presets"
      showBack
      backFallbackHref="/home/facility/sop-runs"
    >
      <View style={styles.container}>
        <Text style={styles.h1}>SOP Presets</Text>
        <TextInput
          accessibilityLabel="SOP preset title"
          style={styles.input}
          placeholder="Template title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          accessibilityLabel="SOP preset content"
          style={[styles.input, styles.notes]}
          placeholder="Template content"
          value={content}
          onChangeText={setContent}
          multiline
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create SOP preset"
          onPress={create}
          style={styles.btn}
        >
          <Text style={styles.btnText}>{creating ? "Saving..." : "Create Preset"}</Text>
        </Pressable>
        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
        {isLoading ? <Text>Loading presets...</Text> : null}
        <FlatList
          data={templates}
          keyExtractor={pickId}
          renderItem={({ item, index }) => {
            const id = pickId(item, index);
            const titleText = String(item?.title || "Untitled Template");
            return (
              <View style={styles.card}>
                <Text style={styles.title}>{titleText}</Text>
                <Text style={styles.sub}>{String(item?.content || "")}</Text>
                <Link
                  accessibilityRole="button"
                  accessibilityLabel={`Start run from SOP preset ${titleText}`}
                  href={{
                    pathname: "/home/facility/sop-runs/start",
                    params: { templateId: id, templateTitle: titleText }
                  }}
                  style={styles.startLink}
                >
                  Start run from preset
                </Link>
              </View>
            );
          }}
        />
      </View>
    </ScreenBoundary>
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
  sub: { opacity: 0.75 },
  startLink: {
    color: "#2563eb",
    fontWeight: "900",
    marginTop: 10
  }
});
