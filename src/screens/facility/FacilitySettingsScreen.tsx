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
import { useFacility } from "../../facility/FacilityProvider";
import { handleApiError } from "../../ui/handleApiError";
import { useFacilitySettings } from "../../hooks/useFacilitySettings";

type Facility = {
  id: string;
  name: string;
  timezone?: string;
  address?: string;
  notes?: string;
  complianceMode?: "basic" | "strict";
};

export default function FacilitySettingsScreen({ route, navigation }: any) {
  const { activeFacilityId } = useFacility();
  const facilityId =
    (route?.params?.facilityId as string | undefined) ?? (activeFacilityId || undefined);

  const { facility, isLoading, error, refetch, updateFacility, updating } =
    useFacilitySettings(facilityId);

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [complianceMode, setComplianceMode] =
    useState<Facility["complianceMode"]>("basic");

  const handlers = useMemo(
    () => ({
      onAuthRequired: () => {
        console.log("AUTH_REQUIRED: route to login");
      },
      onFacilityDenied: () => {
        Alert.alert("No Access", "You don't have access to this facility.");
      },
      toast: (msg: string) => Alert.alert("Notice", msg)
    }),
    []
  );

  useEffect(() => {
    if (error) handleApiError(error, "Failed to load facility settings");
  }, [error]);

  useEffect(() => {
    if (!facility) return;
    setName(facility.name || "");
    setTimezone(facility.timezone || "America/New_York");
    setAddress(facility.address || "");
    setNotes(facility.notes || "");
    setComplianceMode(facility.complianceMode || "basic");
  }, [facility]);

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
    await refetch();
  }

  async function save() {
    if (!facilityId) return;
    if (!name.trim()) return Alert.alert("Facility", "Name is required.");
    try {
      const payload = {
        name: name.trim(),
        timezone: timezone.trim(),
        address: address.trim(),
        notes: notes.trim(),
        complianceMode
      };
      await updateFacility(payload);
      Alert.alert("Saved", "Facility settings updated.");
    } catch (e: any) {
      handleApiError(e, "Failed to save settings");
      Alert.alert("Save failed", e?.message || "Failed to save settings.");
    }
  }

  useEffect(() => {
    load();
  }, [facilityId]);

  if (!facilityId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>No facility selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Facility Settings</Text>
        <Pressable style={styles.btn} onPress={load}>
          <Text style={styles.btnText}>Refresh</Text>
        </Pressable>
      </View>

      {isLoading && !facility ? (
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
              style={[styles.btn, (!dirty || updating) && styles.btnDisabled]}
              onPress={save}
              disabled={!dirty || updating}
            >
              <Text style={styles.btnText}>{updating ? "Saving..." : "Save"}</Text>
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
