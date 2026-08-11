import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function rowId(row: any) {
  return String(row?.id || row?._id || row?.growId || "").trim();
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
  const loadInFlightRef = useRef(false);
  const canImport = canImportFacilityHistory(entitlements.facilityRole);

  const loadGrows = useCallback(async () => {
    if (!facilityId || loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest(endpoints.grows(facilityId));
      setGrows(growRows(response));
    } catch (reason: any) {
      setError(reason?.message || "Unable to load facility grows.");
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    if (!canImport || growId) return;
    void loadGrows();
  }, [canImport, facilityId, growId, loadGrows, router]);

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
              accessibilityRole="link"
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
        {loading ? (
          <View
            accessibilityLabel="Loading facility grows for history import"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.copy}>Loading grows...</Text>
          </View>
        ) : null}
        {error ? (
          <View accessibilityLiveRegion="polite" style={styles.errorCard}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              accessibilityLabel="Retry loading facility grows"
              accessibilityRole="button"
              disabled={loading}
              onPress={() => void loadGrows()}
              style={styles.retryAction}
            >
              <Text style={styles.retryActionText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {!loading && !grows.length ? (
          <Text style={styles.copy}>No grows are available in this facility yet.</Text>
        ) : null}
        {grows
          .filter((grow) => rowId(grow))
          .map((grow) => {
            const id = String(grow.id || grow._id || grow.growId || "");
            const name = String(grow.name || grow.title || grow.strain || "Grow");
            return (
              <Pressable
                key={id}
                accessibilityRole="link"
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
    errorCard: { alignItems: "flex-start", gap: 8 },
    loading: { alignItems: "center", gap: 8, paddingVertical: 12 },
    retryAction: {
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 9
    },
    retryActionText: { color: palette.danger, fontWeight: "900" },
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
