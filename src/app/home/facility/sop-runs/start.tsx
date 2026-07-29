import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import type { SOPTemplate } from "@/api/sop";
import { useSopTemplates } from "@/hooks/useSopTemplates";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

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
  const [oneOffSteps, setOneOffSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selectedTemplate = templates.find(
    (template, idx) => pickTemplateId(template, idx) === templateId
  );

  function selectTemplate(template: SOPTemplate, idx: number) {
    const id = pickTemplateId(template, idx);
    setTemplateId(id);
    setOneOffSteps("");
    if (!title.trim()) setTitle(`Run: ${String(template.title || "SOP Template")}`);
    setMsg(null);
  }

  const parsedOneOffSteps = oneOffSteps
    .split(/\r?\n/)
    .map((step) => step.replace(/^[-*0-9.)\s]+/, "").trim())
    .filter(Boolean);
  const canStart = Boolean(
    facilityId && title.trim() && (templateId || parsedOneOffSteps.length) && !saving
  );

  const submit = async () => {
    if (!facilityId) {
      setMsg("Select a facility first.");
      return;
    }
    if (!title.trim()) {
      setMsg("Run title is required.");
      return;
    }
    if (!templateId && !parsedOneOffSteps.length) {
      setMsg("Choose an SOP template or add at least one one-off checklist step.");
      return;
    }
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        title: title.trim(),
        templateId: templateId.trim() || undefined,
        notes: notes.trim() || undefined,
        steps: templateId ? undefined : parsedOneOffSteps.map((step) => ({ title: step }))
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
    <ScreenBoundary
      title="Start SOP Run"
      showBack
      backFallbackHref="/home/facility/sop-runs"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Start SOP Run</Text>
        <Text style={styles.sub}>
          Choose an approved template, or enter one checklist step per line for a one-off
          run. Completed checklist evidence becomes part of facility exports.
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
            <View style={styles.emptyPanel}>
              <Text style={styles.muted}>
                No SOP templates yet. Add one in the SOP Library or enter one-off steps
                below.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open SOP Library from start run"
                onPress={() => router.push("/home/facility/sop-runs/presets")}
                style={styles.libraryBtn}
              >
                <Text style={styles.libraryBtnText}>Open SOP Library</Text>
              </Pressable>
            </View>
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
        {!templateId ? (
          <TextInput
            accessibilityLabel="One-off SOP checklist steps"
            style={[styles.input, styles.steps]}
            placeholder={"One step per line\nInspect room\nRecord measurements"}
            value={oneOffSteps}
            onChangeText={setOneOffSteps}
            multiline
          />
        ) : null}
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
          accessibilityState={{ disabled: !canStart }}
          disabled={!canStart}
          onPress={submit}
          style={[styles.btn, !canStart && styles.disabled]}
        >
          <Text style={styles.btnText}>{saving ? "Starting..." : "Start Run"}</Text>
        </Pressable>
        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { color: "#475569", fontWeight: "700", lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "#fff"
  },
  templatePanel: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
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
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "#fff"
  },
  templateCardActive: { borderColor: "#16a34a", borderWidth: 2 },
  templateTitle: { color: "#111827", fontWeight: "900" },
  templateBody: { color: "#475569", fontSize: 12, lineHeight: 18, marginTop: 4 },
  muted: { color: "#64748b", fontWeight: "700" },
  emptyPanel: { gap: 8 },
  libraryBtn: {
    alignSelf: "flex-start",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  libraryBtnText: { color: "#334155", fontWeight: "900" },
  clearBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff"
  },
  clearBtnText: { color: "#334155", fontWeight: "900" },
  notes: { minHeight: 90, textAlignVertical: "top" },
  steps: { minHeight: 110, textAlignVertical: "top" },
  btn: {
    backgroundColor: "#16a34a",
    borderRadius: radius.card,
    padding: 12,
    alignItems: "center"
  },
  btnText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.45 },
  msg: { color: "#b91c1c", fontWeight: "700" }
});
