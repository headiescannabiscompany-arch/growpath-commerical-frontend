import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import ReportBugButton from "@/components/ReportBugButton";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/auth/AuthContext";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { radius } from "@/theme/theme";
import TokenBalanceWidget from "@/components/TokenBalanceWidget";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.facilities)) return res.facilities;
  if (Array.isArray(res?.data?.facilities)) return res.data.facilities;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}

function unwrapRecord(res: any): AnyRec | null {
  const value = res?.data?.user ?? res?.user ?? res?.data ?? res;
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function renderKV(obj: AnyRec | null, key: string) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;

  return (
    <View style={styles.kv} key={key}>
      <Text style={styles.k}>
        {(
          {
            displayName: "Display name",
            legalName: "Legal name",
            createdAt: "Created",
            license: "License number"
          } as Record<string, string>
        )[key] || key.replace(/Id$/, " ID")}
      </Text>
      <Text style={styles.v}>{typeof v === "string" ? v : JSON.stringify(v)}</Text>
    </View>
  );
}

function ProfileAction({
  label,
  onPress,
  accessibilityLabel
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.actionButton}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export default function FacilityProfileRoute() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedId: facilityId } = useFacility();

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [me, setMe] = useState<AnyRec | null>(null);
  const [facility, setFacility] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();

        const [meResult, facilitiesResult] = await Promise.allSettled([
          apiRequest(endpoints.me, { method: "GET", timeoutMs: 10000 }),
          apiRequest(endpoints.facilities, { method: "GET", timeoutMs: 10000 })
        ]);

        setMe(
          meResult.status === "fulfilled"
            ? unwrapRecord(meResult.value)
            : (auth.user ?? null)
        );

        const facilities =
          facilitiesResult.status === "fulfilled" ? asArray(facilitiesResult.value) : [];
        const found =
          facilities.find(
            (f) =>
              String(f?.id ?? f?._id ?? f?.facilityId) === String(facilityId) ||
              String(f?.facilityId ?? "") === String(facilityId)
          ) ?? null;

        setFacility(found);

        if (meResult.status === "rejected" && facilitiesResult.status === "rejected") {
          handleApiError(meResult.reason);
        }
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [auth.user, facilityId, clearError, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const logout = useCallback(async () => {
    await auth.logout();
    router.replace("/login");
  }, [auth, router]);

  const meKeys = useMemo(() => {
    if (!me) return [];
    const preferred = [
      "id",
      "_id",
      "email",
      "name",
      "displayName",
      "plan",
      "role",
      "createdAt"
    ];
    return preferred.filter((k) => k in me);
  }, [me]);

  const facilityKeys = useMemo(() => {
    if (!facility) return [];
    const facilityPreferred = [
      "id",
      "_id",
      "name",
      "legalName",
      "license",
      "state",
      "createdAt"
    ];
    return facilityPreferred.filter((k) => k in facility);
  }, [facility]);

  return (
    <ScreenBoundary title="Profile">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading profile...</Text>
          </View>
        ) : null}

        <View style={[styles.card, styles.workspaceCard]}>
          <Text style={styles.kicker}>Facility workspace</Text>
          <Text style={styles.workspaceTitle}>Operational facility identity</Text>
          <Text style={styles.workspaceText}>
            Facility is for rooms, operational runs, team tasks, sensor streams,
            compliance, and audit history. Commercial storefront outreach and Personal
            grow records stay in their own workspaces.
          </Text>
          <View style={styles.actionRow}>
            <ProfileAction
              label="Switch workspace"
              accessibilityLabel="Switch workspace mode"
              onPress={() => router.push("/account/mode" as any)}
            />
            <ProfileAction
              label="Account profile"
              accessibilityLabel="Open account profile"
              onPress={() => router.push("/profile" as any)}
            />
            <ReportBugButton location="Facility profile" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h1}>Facility</Text>

          {facility ? (
            <View style={styles.kvWrap}>
              {facilityKeys.map((k) => renderKV(facility, k))}
            </View>
          ) : (
            <Text style={styles.muted}>
              Facility details are unavailable right now. Pull to refresh or switch
              facilities.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.h1}>Account</Text>

          {me ? (
            <View style={styles.kvWrap}>{meKeys.map((k) => renderKV(me, k))}</View>
          ) : (
            <Text style={styles.muted}>Account details are unavailable right now.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.h1}>AI usage</Text>
          <TokenBalanceWidget interactive={false} />
        </View>

        <View style={styles.card}>
          <Text style={styles.h1}>Facility setup</Text>
          <Text style={styles.muted}>
            Manage the people, sensor connections, training, and community attached to
            this workspace.
          </Text>
          <View style={styles.actionRow}>
            <ProfileAction
              label="Team"
              accessibilityLabel="Open facility team"
              onPress={() => router.push("/home/facility/team" as any)}
            />
            <ProfileAction
              label="Pulse / TrolMaster"
              accessibilityLabel="Open facility integrations"
              onPress={() => router.push("/home/facility/integrations" as any)}
            />
            <ProfileAction
              label="Courses"
              accessibilityLabel="Open courses"
              onPress={() => router.push("/courses" as any)}
            />
            <ProfileAction
              label="Forum"
              accessibilityLabel="Open forum"
              onPress={() => router.push("/forum" as any)}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={logout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },

  loading: { paddingVertical: 18, alignItems: "center" },
  muted: { opacity: 0.7 },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  workspaceCard: {
    backgroundColor: "#172317",
    borderColor: "#2f402f"
  },
  kicker: {
    color: "#BFD6C0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: "uppercase"
  },
  h1: { fontSize: 18, fontWeight: "900", marginBottom: 6 },
  workspaceTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6
  },
  workspaceText: { color: "#E8F1E7", fontSize: 14, lineHeight: 21 },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#EEF7EE",
    borderColor: "#BFD6C0",
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  actionText: { color: "#172317", fontWeight: "900" },

  kvWrap: { marginTop: 8 },
  kv: { marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7, marginBottom: 3 },
  v: { fontSize: 14 },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center"
  },
  logoutText: { color: "#991B1B", fontWeight: "900" }
});
