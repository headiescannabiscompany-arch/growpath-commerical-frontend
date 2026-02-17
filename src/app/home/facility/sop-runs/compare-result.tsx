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
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;

function getParam(params: Record<string, any>, key: string): string {
  const raw = params?.[key];
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function pickCompareIds(params: Record<string, any>) {
  const a =
    getParam(params, "a") ||
    getParam(params, "left") ||
    getParam(params, "leftId") ||
    getParam(params, "runA") ||
    getParam(params, "runIdA");
  const b =
    getParam(params, "b") ||
    getParam(params, "right") ||
    getParam(params, "rightId") ||
    getParam(params, "runB") ||
    getParam(params, "runIdB");
  return { a, b };
}

function safeCountSteps(run: AnyRec | null): number | null {
  if (!run) return null;
  const steps = run?.steps ?? run?.items ?? run?.data?.steps;
  if (Array.isArray(steps)) return steps.length;
  return null;
}

export default function FacilitySopRunCompareResultRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { a, b } = pickCompareIds(params as any);

  const { selectedId: facilityId } = useFacility();

  const apiErr: any = useApiErrorHandler();
  const resolved = useMemo(() => {
    const error = apiErr?.error ?? apiErr?.[0] ?? null;
    const handleApiError = apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {});
    const clearError = apiErr?.clearError ?? apiErr?.[2] ?? (() => {});
    return { error, handleApiError, clearError };
  }, [apiErr]);

  const [runA, setRunA] = useState<AnyRec | null>(null);
  const [runB, setRunB] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        resolved.clearError(); // This line remains unchanged

        const [ra, rb] = await Promise.all([
          a
            ? apiRequest(endpoints.sopRun(facilityId, a), { method: "GET" })
            : Promise.resolve(null),
          b
            ? apiRequest(endpoints.sopRun(facilityId, b), { method: "GET" })
            : Promise.resolve(null)
        ]);

        setRunA(ra ?? null);
        setRunB(rb ?? null);
      } catch (e) {
        resolved.handleApiError(e); // This line remains unchanged
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [a, b, facilityId, resolved]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const aSteps = useMemo(() => safeCountSteps(runA), [runA]);
  const bSteps = useMemo(() => safeCountSteps(runB), [runB]);

  return (
    <ScreenBoundary title="Compare Result">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {resolved.error ? <InlineError error={resolved.error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>SOP Compare Result</Text>
          <Text style={styles.muted}>
            A: {a || "(missing)"} • B: {b || "(missing)"}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading runs…</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <Text style={styles.muted}>
            Steps — A: {aSteps ?? "?"} • B: {bSteps ?? "?"}
          </Text>

          <View style={styles.rowBtns}>
            <Pressable
              onPress={() =>
                a &&
                router.push({
                  pathname: "/home/facility/sop-runs/[id]",
                  params: { id: a }
                })
              }
              style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnPressed,
                !a && styles.btnDisabled
              ]}
              disabled={!a}
            >
              <Text style={styles.btnText}>Open Run A</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                b &&
                router.push({
                  pathname: "/home/facility/sop-runs/[id]",
                  params: { id: b }
                })
              }
              style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnPressed,
                !b && styles.btnDisabled
              ]}
              disabled={!b}
            >
              <Text style={styles.btnText}>Open Run B</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/home/facility/sop-runs/presets")}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.linkText}>Go to Presets</Text>
          </Pressable>
        </View>

        <Text onPress={() => router.back()} style={styles.backLink}>
          ‹ Back
        </Text>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  headerRow: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7 },
  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    gap: 10
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  rowBtns: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center"
  },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: "800" },
  linkBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)"
  },
  linkText: { fontWeight: "800" },
  backLink: { fontWeight: "800", marginTop: 6 }
});
