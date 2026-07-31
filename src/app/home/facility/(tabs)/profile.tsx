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
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/auth/AuthContext";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { radius } from "@/theme/theme";
import { useAppTheme } from "@/theme/appTheme";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import CannabisContentControls from "@/components/account/CannabisContentControls";

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

function renderKV(
  obj: AnyRec | null,
  key: string,
  colors: { label: string; value: string }
) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;
  const displayValue =
    key === "createdAt" && !Number.isNaN(Date.parse(String(v)))
      ? new Date(String(v)).toLocaleDateString()
      : key === "role" || key === "plan"
        ? String(v)
            .toLowerCase()
            .replace(/(^|[_-])\w/g, (match) => match.replace(/[_-]/, " ").toUpperCase())
        : typeof v === "string"
          ? v
          : JSON.stringify(v);

  return (
    <View style={styles.kv} key={key}>
      <Text style={[styles.k, { color: colors.label }]}>
        {(
          {
            displayName: "Display name",
            legalName: "Legal name",
            createdAt: "Created",
            license: "License number"
          } as Record<string, string>
        )[key] || key.replace(/Id$/, " ID")}
      </Text>
      <Text style={[styles.v, { color: colors.value }]}>{displayValue}</Text>
    </View>
  );
}

function ProfileAction({
  label,
  onPress,
  accessibilityLabel,
  backgroundColor,
  borderColor,
  textColor
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor, borderColor }]}
    >
      <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export default function FacilityProfileRoute() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedId: facilityId, selected: selectedFacility } = useFacility();
  const { palette } = useAppTheme();

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
    const preferred = ["email", "name", "displayName", "plan", "role", "createdAt"];
    return preferred.filter((k) => k in me);
  }, [me]);

  const facilityKeys = useMemo(() => {
    if (!facility) return [];
    const facilityPreferred = ["name", "legalName", "license", "state", "createdAt"];
    return facilityPreferred.filter((k) => k in facility);
  }, [facility]);
  const kvColors = { label: palette.textMuted, value: palette.text };

  return (
    <ScreenBoundary title="Profile">
      <ScrollView
        style={{ backgroundColor: palette.page }}
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

        <View
          style={[
            styles.card,
            styles.workspaceCard,
            {
              backgroundColor: palette.hero,
              borderColor: palette.border
            }
          ]}
        >
          <Text style={[styles.kicker, { color: palette.heroMuted }]}>
            Facility workspace
          </Text>
          <Text style={[styles.workspaceTitle, { color: palette.heroText }]}>
            Operational facility identity
          </Text>
          <Text style={[styles.workspaceText, { color: palette.textMuted }]}>
            Facility is for rooms, operational runs, team tasks, sensor streams,
            compliance, and audit history. Commercial storefront outreach and Personal
            grow records stay in their own workspaces.
          </Text>
          <View style={styles.actionRow}>
            <ProfileAction
              label="Switch workspace"
              accessibilityLabel="Switch workspace mode"
              onPress={() => router.push("/account/mode" as any)}
              backgroundColor={palette.surfaceMuted}
              borderColor={palette.border}
              textColor={palette.text}
            />
            <ProfileAction
              label="Account profile"
              accessibilityLabel="Open account profile"
              onPress={() => router.push("/profile" as any)}
              backgroundColor={palette.surfaceMuted}
              borderColor={palette.border}
              textColor={palette.text}
            />
            <ProfileAction
              label="Plans & billing"
              accessibilityLabel="Manage facility plan and billing"
              onPress={() => router.push("/offers" as any)}
              backgroundColor={palette.surfaceMuted}
              borderColor={palette.border}
              textColor={palette.text}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.h1, { color: palette.text }]}>Facility</Text>

          {facility ? (
            <View style={styles.kvWrap}>
              {facilityKeys.map((k) => renderKV(facility, k, kvColors))}
            </View>
          ) : (
            <Text style={[styles.muted, { color: palette.textMuted }]}>
              Facility details are unavailable right now. Pull to refresh or switch
              facilities.
            </Text>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <ThemeModeSelector />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.h1, { color: palette.text }]}>Account</Text>

          {me ? (
            <View style={styles.kvWrap}>
              {meKeys.map((k) => renderKV(me, k, kvColors))}
            </View>
          ) : (
            <Text style={[styles.muted, { color: palette.textMuted }]}>
              Account details are unavailable right now.
            </Text>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.h1, { color: palette.text }]}>AI usage</Text>
          <TokenBalanceWidget
            interactive={false}
            workspaceType="facility"
            facilityId={String(facilityId || "")}
            workspaceName={String(
              facility?.name || selectedFacility?.name || "Selected Facility"
            )}
          />
        </View>

        <CannabisContentControls />

        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.h1, { color: palette.text }]}>Facility setup</Text>
          <Text style={[styles.muted, { color: palette.textMuted }]}>
            Manage the people, sensor connections, training, and community attached to
            this workspace.
          </Text>
          <View style={styles.actionRow}>
            <ProfileAction
              label="Team"
              accessibilityLabel="Open facility team"
              onPress={() => router.push("/home/facility/team" as any)}
              backgroundColor={palette.surfaceMuted}
              borderColor={palette.border}
              textColor={palette.text}
            />
            <ProfileAction
              label="Pulse / TrolMaster"
              accessibilityLabel="Open facility integrations"
              onPress={() => router.push("/home/facility/integrations" as any)}
              backgroundColor={palette.surfaceMuted}
              borderColor={palette.border}
              textColor={palette.text}
            />
            <ProfileAction
              label="Courses"
              accessibilityLabel="Open courses"
              onPress={() => router.push("/courses" as any)}
              backgroundColor={palette.surfaceMuted}
              borderColor={palette.border}
              textColor={palette.text}
            />
            <ProfileAction
              label="Videos"
              accessibilityLabel="Open Facility video library"
              onPress={() => router.push("/videos?tab=library" as any)}
              backgroundColor={palette.surfaceMuted}
              borderColor={palette.border}
              textColor={palette.text}
            />
            <ProfileAction
              label="Forum"
              accessibilityLabel="Open forum"
              onPress={() => router.push("/forum" as any)}
              backgroundColor={palette.surfaceMuted}
              borderColor={palette.border}
              textColor={palette.text}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={logout}
          style={[
            styles.logoutButton,
            { borderColor: palette.danger, backgroundColor: palette.surfaceMuted }
          ]}
        >
          <Text style={[styles.logoutText, { color: palette.danger }]}>Log out</Text>
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
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 12
  },
  workspaceCard: {},
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: "uppercase"
  },
  h1: { fontSize: 18, fontWeight: "900", marginBottom: 6 },
  workspaceTitle: { fontSize: 18, fontWeight: "900", marginBottom: 6 },
  workspaceText: { fontSize: 14, lineHeight: 21 },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },
  actionButton: {
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  actionText: { fontWeight: "900" },

  kvWrap: { marginTop: 8 },
  kv: { marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7, marginBottom: 3 },
  v: { fontSize: 14 },
  logoutButton: {
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center"
  },
  logoutText: { fontWeight: "900" }
});
