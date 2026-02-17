import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.facilities)) return res.facilities;
  return [];
}

function renderKV(obj: AnyRec | null, key: string) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;

  return (
    <View style={styles.kv} key={key}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v}>{typeof v === "string" ? v : JSON.stringify(v)}</Text>
    </View>
  );
}

export default function FacilityProfileRoute() {
  const router = useRouter();
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

        const [meRes, facilitiesRes] = await Promise.all([
          apiRequest(endpoints.me, { method: "GET" }),
          apiRequest(endpoints.facilities, { method: "GET" })
        ]);

        setMe(meRes ?? null);

        const facilities = asArray(facilitiesRes);
        const found =
          facilities.find((f) => String(f?.id ?? f?._id) === String(facilityId)) ?? null;

        setFacility(found);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, clearError, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

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
    const rest = Object.keys(me)
      .filter((k) => !preferred.includes(k))
      .sort();
    return [...preferred.filter((k) => k in me), ...rest];
  }, [me]);

  const facilityKeys = useMemo(() => {
    if (!facility) return [];
    const preferred = ["id", "_id", "name", "legalName", "license", "state", "createdAt"];
    const rest = Object.keys(facility)
      .filter((k) => !preferred.includes(k))
      .sort();
    return [...preferred.filter((k) => k in facility), ...rest];
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
            <Text style={styles.muted}>Loading profile…</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.h1}>Selected Facility</Text>
          <Text style={styles.muted}>
            facilityId: {facilityId ? String(facilityId) : "(none)"}
          </Text>

          {facility ? (
            <View style={styles.kvWrap}>
              {facilityKeys.map((k) => renderKV(facility, k))}
            </View>
          ) : (
            <Text style={styles.muted}>
              No facility record found from /api/facilities.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.h1}>Me</Text>

          {me ? (
            <View style={styles.kvWrap}>{meKeys.map((k) => renderKV(me, k))}</View>
          ) : (
            <Text style={styles.muted}>No /api/me data.</Text>
          )}
        </View>
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
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  h1: { fontSize: 18, fontWeight: "900", marginBottom: 6 },

  kvWrap: { marginTop: 8 },
  kv: { marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7, marginBottom: 3 },
  v: { fontSize: 14 }
});
