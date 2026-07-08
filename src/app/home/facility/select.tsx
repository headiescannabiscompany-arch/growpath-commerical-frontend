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
    await auth.logout();
    router.replace("/login");
  }, [auth, router]);

  return (
    <ScreenBoundary title="Select Facility">
      <View style={styles.container}>
        {resolved.error ? <InlineError error={resolved.error} /> : null}

        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Select a Facility</Text>
              <Text style={styles.muted}>Choose where you want to work.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={logout}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading facilities...</Text>
          </View>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
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
                onPress={() => {
                  if (!id) return;
                  selectFacility({ ...item, id, name });
                  router.replace("/home/facility/dashboard");
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {id}
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  headerRow: { gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7 },
  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
  list: { paddingVertical: 6, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  rowPressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 8 },
  empty: { paddingVertical: 26, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 8
  },
  primaryButton: {
    backgroundColor: "#166534",
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryText: { color: "#0F172A", fontWeight: "800" },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FEF2F2"
  },
  logoutText: { color: "#991B1B", fontWeight: "800" }
});
