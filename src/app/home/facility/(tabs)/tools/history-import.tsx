import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import DewPointGuardTool from "@/app/home/personal/(tabs)/tools/dew-point-guard";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export function canImportFacilityHistory(role: string | null | undefined = "") {
  const normalized = String(role).toUpperCase();
  return normalized === "OWNER" || normalized === "MANAGER";
}

function growRows(response: any) {
  const rows =
    response?.grows ??
    response?.items ??
    response?.data?.grows ??
    response?.data ??
    response;
  return Array.isArray(rows) ? rows : [];
}

export default function FacilityHistoryImportRoute() {
  const router = useRouter();
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityHistoryImportStyles(palette), [palette]);
  const params = useLocalSearchParams<{ growId?: string; growName?: string }>();
  const { selectedId: facilityId } = useFacility();
  const growId = String(params.growId || "").trim();
  const [grows, setGrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(!growId);
  const [error, setError] = useState("");
  const canImport = canImportFacilityHistory(entitlements.facilityRole);

  useEffect(() => {
    if (!canImport || growId || !facilityId) return;
    setLoading(true);
    apiRequest(endpoints.grows(facilityId))
      .then((response) => setGrows(growRows(response)))
      .catch((reason: any) =>
        setError(reason?.message || "Unable to load facility grows.")
      )
      .finally(() => setLoading(false));
  }, [canImport, facilityId, growId]);

  if (!canImport) {
    return (
      <ScreenBoundary
        title="Import Grow History"
        showBack
        backFallbackHref="/home/facility/integrations"
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.readOnlyCard} accessibilityRole="alert">
            <Text accessibilityRole="header" aria-level={2} style={styles.growName}>
              Grow history import is read-only
            </Text>
            <Text style={styles.copy}>
              Your Facility role can review imported history, but only owners and managers
              can select a grow or upload controller records.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to Facility integrations"
              style={styles.returnAction}
              onPress={() => router.push("/home/facility/integrations" as any)}
            >
              <Text style={styles.returnActionText}>Return to Integrations</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenBoundary>
    );
  }

  if (growId) {
    return (
      <ScreenBoundary
        title={params.growName ? `Import: ${params.growName}` : "Import grow history"}
        showBack
        backFallbackHref="/home/facility/integrations"
      >
        <DewPointGuardTool historyImportMode />
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title="Choose a grow for imported history"
      showBack
      backFallbackHref="/home/facility/integrations"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.copy}>
          Controller history belongs to a grow so its environment readings, alerts, AI
          analysis, tasks, and timeline remain connected. Choose the destination before
          selecting the CSV.
        </Text>
        {loading ? <ActivityIndicator color={palette.accent} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !grows.length ? (
          <Text style={styles.copy}>No grows are available in this facility yet.</Text>
        ) : null}
        {grows.map((grow) => {
          const id = String(grow.id || grow._id || grow.growId || "");
          const name = String(grow.name || grow.title || grow.strain || "Grow");
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Import history into ${name}`}
              style={styles.growCard}
              onPress={() =>
                router.push({
                  pathname: "/home/facility/tools/history-import" as any,
                  params: { growId: id, growName: name }
                })
              }
            >
              <View>
                <Text style={styles.growName}>{name}</Text>
                <Text style={styles.meta}>
                  {grow.roomName || grow.stage || grow.status || "Facility grow"}
                </Text>
              </View>
              <Text style={styles.action}>Choose</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </ScreenBoundary>
  );
}

export function createFacilityHistoryImportStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { backgroundColor: palette.page, gap: 12, padding: 16, paddingBottom: 32 },
    copy: { color: palette.textMuted, lineHeight: 21 },
    error: { color: palette.danger, fontWeight: "700" },
    readOnlyCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      padding: 16
    },
    growCard: {
      alignItems: "center",
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 14
    },
    growName: { color: palette.text, fontSize: 17, fontWeight: "900" },
    meta: { color: palette.textMuted, marginTop: 4 },
    action: { color: palette.link, fontWeight: "900" },
    returnAction: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    returnActionText: { color: palette.accentText, fontWeight: "900" }
  });
}
