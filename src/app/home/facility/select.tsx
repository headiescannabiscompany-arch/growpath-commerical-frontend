import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/auth/AuthContext";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.facilities)) return res.facilities;
  return [];
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.facilityId ?? "");
}

function pickName(x: AnyRec): string {
  return String(x?.name ?? x?.facilityName ?? x?.title ?? pickId(x) ?? "Facility");
}

function uniquePaths(paths: unknown[]): string[] {
  return Array.from(
    new Set(paths.filter((path): path is string => typeof path === "string" && !!path))
  );
}

export default function FacilitySelectRoute() {
  const router = useRouter();
  const store: any = useFacility();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilitySelectStyles(palette), [palette]);

  const apiErr: any = useApiErrorHandler();
  const resolved = useMemo(() => {
    const error = apiErr?.error ?? apiErr?.[0] ?? null;
    const handleApiError = apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {});
    const clearError = apiErr?.clearError ?? apiErr?.[2] ?? (() => {});
    return { error, handleApiError, clearError };
  }, [apiErr]);

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectingId, setSelectingId] = useState("");

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        resolved.clearError();

        const paths = uniquePaths([
          typeof (endpoints as any)?.facilitiesMine === "function"
            ? (endpoints as any).facilitiesMine()
            : (endpoints as any)?.facilitiesMine,
          (endpoints as any)?.facilities,
          "/api/facilities"
        ]);

        let lastError: unknown = null;
        let nextItems: AnyRec[] = [];

        for (const path of paths) {
          try {
            const res = await apiRequest(path, { method: "GET" });
            nextItems = asArray(res);
            if (nextItems.length > 0) break;
          } catch (e) {
            lastError = e;
          }
        }

        if (nextItems.length === 0 && lastError) throw lastError;

        setItems(nextItems);
      } catch (e) {
        resolved.handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [resolved]
  );

  useEffect(() => {
    load();
  }, [load]);

  const selectFacility: (facility: AnyRec | string) => void =
    store?.selectFacility ??
    store?.setSelected ??
    store?.setSelectedId ??
    store?.setFacilityId ??
    ((_: AnyRec | string) => {});

  const logout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await auth.logout();
      router.replace("/login");
    } catch (error) {
      resolved.handleApiError(error);
      setLoggingOut(false);
    }
  }, [auth, loggingOut, resolved, router]);

  return (
    <ScreenBoundary title="Select Facility">
      <View style={styles.container}>
        {resolved.error ? <InlineError error={resolved.error} /> : null}

        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
                Select a Facility
              </Text>
              <Text style={styles.muted}>Choose where you want to work.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              accessibilityState={{ disabled: loggingOut, busy: loggingOut }}
              disabled={loggingOut}
              onPress={logout}
              style={[styles.logoutButton, loggingOut && styles.disabledButton]}
            >
              <Text style={styles.logoutText}>
                {loggingOut ? "Logging out..." : "Log out"}
              </Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View
            accessibilityLabel="Loading facilities"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading facilities...</Text>
          </View>
        ) : null}

        <FlatList
          accessibilityLabel="Available facilities"
          data={items}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
              colors={[palette.accent]}
              tintColor={palette.accent}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No facility found.</Text>
                <Text style={styles.muted}>
                  Create a facility, request access with an invite, or switch accounts.
                </Text>
                <View style={styles.emptyActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create facility"
                    onPress={() => router.push("/onboarding/create-facility")}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryText}>Create Facility</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Request facility access"
                    onPress={() => router.push("/onboarding/join-facility")}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Request Access</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Switch account"
                    onPress={logout}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Switch Account</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Contact support"
                    onPress={() => router.push("/support")}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Contact Support</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const id = pickId(item);
            const name = pickName(item);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select facility ${name}`}
                accessibilityState={{
                  busy: selectingId === id,
                  disabled: Boolean(selectingId),
                  selected: String(store?.selectedId ?? "") === id
                }}
                disabled={Boolean(selectingId)}
                onPress={() => {
                  if (!id || selectingId) return;
                  setSelectingId(id);
                  try {
                    selectFacility({ ...item, id, name });
                    router.replace("/home/facility/dashboard");
                  } catch (error) {
                    resolved.handleApiError(error);
                    setSelectingId("");
                  }
                }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                  Boolean(selectingId) && styles.disabledButton
                ]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    Facility workspace
                  </Text>
                </View>
                <Text style={styles.chev}>{">"}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenBoundary>
  );
}

export function createFacilitySelectStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 12, backgroundColor: palette.page },
    headerRow: { gap: 4 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    muted: { color: palette.textMuted },
    loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
    list: { paddingVertical: 6, gap: 10 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card
    },
    rowPressed: { opacity: 0.85 },
    disabledButton: { opacity: 0.55 },
    rowTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    chev: { color: palette.textMuted, fontSize: 22, paddingLeft: 8 },
    empty: { paddingVertical: 26, alignItems: "center", gap: 8 },
    emptyTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    emptyActions: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
      marginTop: 8
    },
    primaryButton: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryText: { color: palette.text, fontWeight: "800" },
    logoutButton: {
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: palette.surfaceMuted
    },
    logoutText: { color: palette.danger, fontWeight: "800" }
  });
}
