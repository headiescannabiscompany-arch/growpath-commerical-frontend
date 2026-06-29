import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import type { SOPTemplate } from "@/api/sop";
import { useSopTemplates } from "@/hooks/useSopTemplates";
import { useFacility } from "@/state/useFacility";

type CreatedRun = { id?: string; _id?: string; runId?: string };
type CreateResponse = { created?: CreatedRun; run?: CreatedRun } & CreatedRun;

function pickId(x: CreatedRun | undefined) {
  return String(x?.id ?? x?._id ?? x?.runId ?? "");
}

function pickTemplateId(x: SOPTemplate, idx: number) {
  return String(x?.id ?? x?._id ?? `template-${idx}`);
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilitySopRunsStartRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string; templateTitle?: string }>();
  const { selectedId: facilityId } = useFacility();
  const { templates, isLoading } = useSopTemplates(facilityId);
  const [title, setTitle] = useState(
    params.templateTitle ? `Run: ${String(params.templateTitle)}` : ""
  );
  const [templateId, setTemplateId] = useState(
    params.templateId ? String(params.templateId) : ""
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selectedTemplate = templates.find(
    (template, idx) => pickTemplateId(template, idx) === templateId
  );

  function selectTemplate(template: SOPTemplate, idx: number) {
    const id = pickTemplateId(template, idx);
    setTemplateId(id);
    if (!title.trim()) setTitle(`Run: ${String(template.title || "SOP Template")}`);
    setMsg(null);
  }

  const submit = async () => {
    if (!facilityId) {
      setMsg("Select a facility first.");
      return;
    }
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        title: title.trim() || "Untitled SOP Run",
        templateId: templateId.trim() || undefined,
        notes: notes.trim() || undefined
      };
      const res = await apiRequest<CreateResponse>(endpoints.sopRuns(facilityId), {
        method: "POST",
        body
      });
      const id = pickId(res?.created ?? res?.run ?? res);
      if (id) {
        router.replace({ pathname: "/home/facility/sop-runs/[id]", params: { id } });
        return;
      }
      router.replace("/home/facility/sop-runs");
    } catch (e: unknown) {
      setMsg(getErrorMessage(e, "Failed to start run"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Start SOP Run</Text>
      <Text style={styles.sub}>
        Choose a preset or start a one-off run. Completed SOP runs become inspection
        evidence in facility exports.
      </Text>
      <TextInput
        accessibilityLabel="SOP run title"
        style={styles.input}
        placeholder="Run title"
        value={title}
        onChangeText={setTitle}
      />
      <View style={styles.templatePanel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Template</Text>
          <Text style={styles.panelMeta}>
            {selectedTemplate?.title
              ? `Selected: ${selectedTemplate.title}`
              : templateId
                ? `Selected ID: ${templateId}`
                : "Optional"}
          </Text>
        </View>
        {isLoading ? <Text style={styles.muted}>Loading templates...</Text> : null}
        {templates.length ? (
          templates.map((template, idx) => {
            const id = pickTemplateId(template, idx);
            const active = id === templateId;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`Select SOP template ${String(template.title || id)}`}
                onPress={() => selectTemplate(template, idx)}
                style={[styles.templateCard, active && styles.templateCardActive]}
              >
                <Text style={styles.templateTitle}>
                  {String(template.title || "Untitled Template")}
                </Text>
                <Text style={styles.templateBody} numberOfLines={3}>
                  {String(
                    template.content || template.description || "No procedure text yet."
                  )}
                </Text>
              </Pressable>
            );
          })
        ) : !isLoading ? (
          <Text style={styles.muted}>
            No SOP templates yet. You can still start a run.
          </Text>
        ) : null}
        {templateId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear SOP template selection"
            onPress={() => setTemplateId("")}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Clear template</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        accessibilityLabel="SOP run notes"
        style={[styles.input, styles.notes]}
        placeholder="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start SOP run"
        onPress={submit}
        style={styles.btn}
      >
        <Text style={styles.btnText}>{saving ? "Starting..." : "Start Run"}</Text>
      </Pressable>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { color: "#475569", fontWeight: "700", lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff"
  },
  templatePanel: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: "#f8fafc"
  },
  panelHeader: { gap: 2 },
  panelTitle: { color: "#0f172a", fontWeight: "900" },
  panelMeta: { color: "#475569", fontSize: 12, fontWeight: "800" },
  templateCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff"
  },
  templateCardActive: { borderColor: "#16a34a", borderWidth: 2 },
  templateTitle: { color: "#111827", fontWeight: "900" },
  templateBody: { color: "#475569", fontSize: 12, lineHeight: 18, marginTop: 4 },
  muted: { color: "#64748b", fontWeight: "700" },
  clearBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff"
  },
  clearBtnText: { color: "#334155", fontWeight: "900" },
  notes: { minHeight: 90, textAlignVertical: "top" },
  btn: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    padding: 12,
    alignItems: "center"
  },
  btnText: { color: "#fff", fontWeight: "800" },
  msg: { color: "#b91c1c", fontWeight: "700" }
});
