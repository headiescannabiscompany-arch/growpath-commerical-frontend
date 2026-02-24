import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Redirect, useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { useFacility } from "@/facility/FacilityProvider";
import { useFacilities } from "@/hooks/useFacilities";

export default function PickFacilityScreen() {
  const auth = useAuth();
  const router = useRouter();
  const facilityStore = useFacility();
  const facilitiesQuery = useFacilities();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const facilities = useMemo(() => {
    return Array.isArray(facilitiesQuery.data) ? facilitiesQuery.data : [];
  }, [facilitiesQuery.data]);

  if (auth.isHydrating) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!auth.token) {
    return <Redirect href="/login" />;
  }

  const handleSelect = async (id: string, name: string) => {
    try {
      setSelectingId(id);
      await facilityStore.selectFacility({ id, name });
      router.replace(`/facilities/${id}/dashboard` as any);
    } catch (err: any) {
      Alert.alert(
        "Unable to switch facility",
        String(err?.message || err || "Unknown error")
      );
    } finally {
      setSelectingId(null);
    }
  };

  const loading = facilitiesQuery.isLoading || facilitiesQuery.isFetching;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pick a Facility</Text>
      <Text style={styles.subtitle}>Select the facility you want to continue with.</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.helper}>Loading facilities...</Text>
        </View>
      ) : null}

      {!loading && facilitiesQuery.isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {String(
              (facilitiesQuery.error as any)?.message || "Failed to load facilities."
            )}
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => facilitiesQuery.refetch()}
          >
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !facilitiesQuery.isError && facilities.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.helper}>No facilities were found for this account.</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace("/onboarding/create-facility" as any)}
          >
            <Text style={styles.primaryButtonText}>Create Facility</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && facilities.length > 0 ? (
        <View style={styles.list}>
          {facilities.map((fac: any) => {
            const id = String(fac?.id || fac?._id || "");
            const name = String(fac?.name || "Unnamed Facility");
            const disabled = !id || selectingId !== null;

            return (
              <Pressable
                key={`${id}:${name}`}
                style={[styles.card, disabled && styles.cardDisabled]}
                disabled={disabled}
                onPress={() => handleSelect(id, name)}
              >
                <Text style={styles.cardTitle}>{name}</Text>
                {fac?.tier ? (
                  <Text style={styles.meta}>Tier: {String(fac.tier)}</Text>
                ) : null}
                {fac?.licenseNumber ? (
                  <Text style={styles.meta}>License: {String(fac.licenseNumber)}</Text>
                ) : null}
                <Text style={styles.pickText}>
                  {selectingId === id ? "Switching..." : "Use this facility"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, gap: 12 },
  centered: { alignItems: "center", justifyContent: "center", minHeight: 160, gap: 10 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, color: "#4b5563" },
  helper: { fontSize: 14, color: "#6b7280" },
  list: { gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
    gap: 4
  },
  cardDisabled: { opacity: 0.65 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  meta: { fontSize: 13, color: "#4b5563" },
  pickText: { marginTop: 6, fontSize: 13, color: "#2563eb", fontWeight: "700" },
  errorBox: {
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    gap: 10
  },
  errorText: { color: "#b91c1c", fontSize: 13 },
  emptyBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    gap: 10
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: "#111827",
    paddingVertical: 11,
    alignItems: "center"
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 10,
    alignItems: "center"
  },
  secondaryButtonText: { color: "#111827", fontWeight: "700" }
});
