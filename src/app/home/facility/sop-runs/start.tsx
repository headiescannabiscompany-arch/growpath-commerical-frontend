import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

type CreatedRun = { id?: string; _id?: string; runId?: string };
type CreateResponse = { created?: CreatedRun; run?: CreatedRun } & CreatedRun;

function pickId(x: CreatedRun | undefined) {
  return String(x?.id ?? x?._id ?? x?.runId ?? "");
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilitySopRunsStartRoute() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
    <View style={styles.container}>
      <Text style={styles.h1}>Start SOP Run</Text>
      <TextInput style={styles.input} placeholder="Run title" value={title} onChangeText={setTitle} />
      <TextInput
        style={styles.input}
        placeholder="Template ID (optional)"
        value={templateId}
        onChangeText={setTemplateId}
      />
      <TextInput
        style={[styles.input, styles.notes]}
        placeholder="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <Pressable onPress={submit} style={styles.btn}>
        <Text style={styles.btnText}>{saving ? "Starting..." : "Start Run"}</Text>
      </Pressable>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "900" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, backgroundColor: "#fff" },
  notes: { minHeight: 90, textAlignVertical: "top" },
  btn: { backgroundColor: "#16a34a", borderRadius: 10, padding: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
  msg: { color: "#b91c1c", fontWeight: "700" }
});
