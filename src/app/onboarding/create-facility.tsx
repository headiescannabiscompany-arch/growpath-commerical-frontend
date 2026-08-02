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
import { useEntitlements } from "@/entitlements";
import { useCreateFacility } from "@/hooks/useCreateFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export default function CreateFacilityScreen() {
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("indoor cultivation");
  const [touched, setTouched] = useState(false);
  const [createdName, setCreatedName] = useState("");
  const createFacility = useCreateFacility();
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = createFacilityStyles(palette);

  if (auth.isHydrating || !entitlements.ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  if (!auth.token) {
    return <Redirect href="/login" />;
  }

  if (entitlements.facilityId) {
    return (
      <AppPage
        routeKey="create-facility"
        railOverride={null}
        header={
          <View style={styles.header}>
            <Text style={styles.kicker}>Facility setup</Text>
            <Text accessibilityRole="header" aria-level={1} style={styles.title}>
              Facility already connected
            </Text>
            <Text style={styles.subtitle}>
              This account already belongs to a Facility workspace. Open that workspace
              instead of creating another one.
            </Text>
          </View>
        }
      >
        <AppCard>
          <Pressable
            onPress={() => router.replace("/home/facility")}
            accessibilityRole="button"
            accessibilityLabel="Open facility workspace"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Open facility workspace</Text>
          </Pressable>
        </AppCard>
      </AppPage>
    );
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
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Create your facility
          </Text>
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
            placeholderTextColor={palette.textMuted}
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
              <ActivityIndicator color={palette.accentText} />
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

export const createFacilityStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    centered: {
      alignItems: "center",
      backgroundColor: palette.page,
      flex: 1,
      justifyContent: "center"
    },
    header: { gap: 6 },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: {
      color: palette.text,
      fontSize: 30,
      fontWeight: "900"
    },
    subtitle: {
      color: palette.textMuted,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 20,
      maxWidth: 760
    },
    form: { gap: 12 },
    typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    typeButton: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    typeButtonSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    typeButtonText: { color: palette.textSoft, fontWeight: "800" },
    typeButtonTextSelected: { color: palette.accentText },
    label: {
      color: palette.textSoft,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontSize: 16,
      paddingHorizontal: 12,
      paddingVertical: 12
    },
    error: { color: palette.danger, fontWeight: "800" },
    feedback: { color: palette.success, fontWeight: "800" },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12
    },
    disabledButton: { opacity: 0.55 },
    primaryButtonText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingVertical: 12
    },
    secondaryButtonText: { color: palette.text, fontWeight: "900" }
  });
