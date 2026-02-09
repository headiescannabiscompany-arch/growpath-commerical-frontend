
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { apiRequest } from "@/api/client";
import { useApiErrorHandler, UiErrorState } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

type Facility = {
  id: string;
  name: string;
  timezone?: string;
  address?: string;
  notes?: string;
  complianceMode?: "basic" | "strict";
};


  const facilityId = route?.params?.facilityId as string | undefined;
  const onApiError = useApiErrorHandler();

  const [loading, setLoading] = useState(false);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [err, setErr] = useState<UiErrorState | null>(null);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [complianceMode, setComplianceMode] = useState<Facility["complianceMode"]>("basic");

  const dirty = useMemo(() => {
    if (!facility) return false;
    return (
      name !== (facility.name || "") ||
      timezone !== (facility.timezone || "") ||
      address !== (facility.address || "") ||
      notes !== (facility.notes || "") ||
      complianceMode !== (facility.complianceMode || "basic")
    );
  }, [facility, name, timezone, address, notes, complianceMode]);

  async function load() {
    if (!facilityId) {
      setErr({ message: "Missing facilityId." });
      navigation?.goBack?.();
      return;
    }
    setLoading(true);
    setErr(null);
    const r = await apiRequest<{ facility: Facility }>(`/api/facilities/${facilityId}`);
    if (!r.ok) return setErr(onApiError(r));
    const f: Facility = r.data?.facility || (r.data as any) || {};
    setFacility(f);
    setName(f.name || "");
    setTimezone(f.timezone || "America/New_York");
    setAddress(f.address || "");
    setNotes(f.notes || "");
    setComplianceMode(f.complianceMode || "basic");
    setLoading(false);
  }

  async function save() {
    if (!facilityId) return setErr({ message: "Missing facilityId." });
    if (!name.trim()) return setErr({ message: "Name is required." });
    setLoading(true);
    setErr(null);
    const payload = {
      name: name.trim(),
      timezone: timezone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      complianceMode
    };
    const r = await apiRequest<{ facility: Facility }>(`/api/facilities/${facilityId}`, {
      method: "PATCH",
      body: payload
    });
    if (!r.ok) return setErr(onApiError(r));
    const f: Facility = r.data?.facility || (r.data as any) || {};
    setFacility(f);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Facility Settings</Text>
        <Pressable style={styles.btn} onPress={load}>
          <Text style={styles.btnText}>Refresh</Text>
        </Pressable>
      </View>

      {err ? (
        <InlineError title={err.title} message={err.message} requestId={err.requestId ?? null} />
      ) : null}

      {loading && !facility ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Facility name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} />

          <Text style={styles.label}>Timezone</Text>
          <TextInput value={timezone} onChangeText={setTimezone} style={styles.input} />

          <Text style={styles.label}>Address</Text>
          <TextInput value={address} onChangeText={setAddress} style={styles.input} />

          <Text style={styles.label}>Compliance mode</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.chip, complianceMode === "basic" && styles.chipActive]}
              onPress={() => setComplianceMode("basic")}
            >
              <Text
                style={[
                  styles.chipText,
                  complianceMode === "basic" && styles.chipTextActive
                ]}
              >
                Basic
              </Text>
            </Pressable>
            <Pressable
              style={[styles.chip, complianceMode === "strict" && styles.chipActive]}
              onPress={() => setComplianceMode("strict")}
            >
              <Text
                style={[
                  styles.chipText,
                  complianceMode === "strict" && styles.chipTextActive
                ]}
              >
                Strict
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, { height: 110 }]}
            multiline
          />

          <View style={styles.footerRow}>
            <Text style={styles.muted}>{dirty ? "Unsaved changes" : "Up to date"}</Text>
            <Pressable
              style={[styles.btn, !dirty && styles.btnDisabled]}
              onPress={save}
              disabled={!dirty || loading}
            >
              <Text style={styles.btnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 22, fontWeight: "800" },
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff"
  },
  label: { marginTop: 12, fontSize: 12, color: "#6B7280", fontWeight: "700" },
  input: {
    marginTop: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    backgroundColor: "#fff"
  },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  chipActive: { borderColor: "#111827", backgroundColor: "#111827" },
  chipText: { color: "#111827", fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  footerRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111827"
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "900" },
  muted: { color: "#6B7280" },
  center: { padding: 20, alignItems: "center", justifyContent: "center", gap: 10 }
});
