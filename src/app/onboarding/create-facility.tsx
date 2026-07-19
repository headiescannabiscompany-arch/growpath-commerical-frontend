import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Redirect, useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useCreateFacility } from "@/hooks/useCreateFacility";
import { radius } from "@/theme/theme";

export default function CreateFacilityScreen() {
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("indoor cultivation");
  const [touched, setTouched] = useState(false);
  const [createdName, setCreatedName] = useState("");
  const createFacility = useCreateFacility();
  const router = useRouter();
  const auth = useAuth();

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

  const trimmedName = name.trim();
  const canCreate = trimmedName.length > 1 && !createFacility.isPending;

  function handleCreate() {
    setTouched(true);
    if (!canCreate) return;
    createFacility.mutate(
      { name: trimmedName, businessType },
      {
        onSuccess: (facility: any) => {
          setCreatedName(String(facility?.name || trimmedName));
          router.replace("/onboarding/first-setup");
        }
      }
    );
  }

  return (
    <AppPage
      routeKey="create-facility"
      railOverride={null}
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Facility setup</Text>
          <Text style={styles.title}>Create your facility</Text>
          <Text style={styles.subtitle}>
            Each account is limited to one facility. If one already exists, GrowPath
            returns that facility instead of creating a duplicate.
          </Text>
        </View>
      }
    >
      <AppCard>
        <View style={styles.form}>
          <Text style={styles.label}>Facility name</Text>
          <TextInput
            style={styles.input}
            placeholder="Facility name"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
            onBlur={() => setTouched(true)}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Text style={styles.label}>Facility type</Text>
          <View style={styles.typeRow}>
            {[
              "indoor cultivation",
              "greenhouse",
              "outdoor",
              "nursery / propagation",
              "mixed use"
            ].map((type) => (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityLabel={`Set facility type to ${type}`}
                onPress={() => setBusinessType(type)}
                style={[
                  styles.typeButton,
                  businessType === type && styles.typeButtonSelected
                ]}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    businessType === type && styles.typeButtonTextSelected
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
          {touched && !trimmedName ? (
            <Text style={styles.error}>Facility name is required.</Text>
          ) : null}
          {createFacility.isError ? (
            <Text style={styles.error}>
              {createFacility.error?.message || "Failed to create facility."}
            </Text>
          ) : null}
          {createdName ? (
            <Text style={styles.feedback}>Facility ready: {createdName}</Text>
          ) : null}

          <Pressable
            onPress={handleCreate}
            disabled={!canCreate}
            accessibilityRole="button"
            accessibilityLabel="Create facility"
            style={[styles.primaryButton, !canCreate && styles.disabledButton]}
          >
            {createFacility.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create facility</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.replace("/home/facility/select")}
            accessibilityRole="button"
            accessibilityLabel="Back to facilities"
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Back to facilities</Text>
          </Pressable>
        </View>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center"
  },
  header: { gap: 6 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    maxWidth: 760
  },
  form: { gap: 12 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeButton: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  typeButtonSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  typeButtonText: { color: "#475569", fontWeight: "800" },
  typeButtonTextSelected: { color: "#ffffff" },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#111827",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  error: { color: "#b91c1c", fontWeight: "800" },
  feedback: { color: "#047857", fontWeight: "800" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingVertical: 12
  },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: "#ffffff", fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingVertical: 12
  },
  secondaryButtonText: { color: "#111827", fontWeight: "900" }
});
