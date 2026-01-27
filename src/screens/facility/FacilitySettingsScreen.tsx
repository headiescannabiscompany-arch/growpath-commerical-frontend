import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

type Facility = {
  id: string;
  name: string;
  timezone?: string;
  address?: string;
  notes?: string;
  complianceMode?: "basic" | "strict";
};

async function safeFetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, {
    ...(opts || {}),
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers || {})
    }
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return json;
}

export default function FacilitySettingsScreen({ route, navigation }: any) {
  const facilityId = route?.params?.facilityId as string | undefined;

  const [loading, setLoading] = useState(false);
  const [facility, setFacility] = useState<Facility | null>(null);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [complianceMode, setComplianceMode] =
    useState<Facility["complianceMode"]>("basic");

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
      Alert.alert("Facility", "Missing facilityId.");
      navigation?.goBack?.();
      return;
    }
    setLoading(true);
    try {
      const data = await safeFetchJson(
        `https://example.com/api/facilities/${facilityId}`
      );
      const f: Facility = data?.facility || data;
      setFacility(f);
      setName(f.name || "");
      setTimezone(f.timezone || "America/New_York");
      setAddress(f.address || "");
      setNotes(f.notes || "");
      setComplianceMode(f.complianceMode || "basic");
    } catch (e: any) {
      Alert.alert("Facility", e?.message || "Failed to load facility.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!facilityId) return;
    if (!name.trim()) return Alert.alert("Facility", "Name is required.");
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        timezone: timezone.trim(),
        address: address.trim(),
        notes: notes.trim(),
        complianceMode
      };
      const data = await safeFetchJson(
        `https://example.com/api/facilities/${facilityId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload)
        }
      );
      const f: Facility = data?.facility || data;
      setFacility(f);
      Alert.alert("Saved", "Facility settings updated.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [facilityId]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Facility Settings</Text>
        <Pressable style={styles.btn} onPress={load}>
          <Text style={styles.btnText}>Refresh</Text>
        </Pressable>
      </View>

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
