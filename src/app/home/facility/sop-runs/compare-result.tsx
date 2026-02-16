import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

type UiError = { title?: string; message?: string; requestId?: string };

function normalizeError(e: any): UiError {
  const env = e?.error || e;
  return {
    title: env?.code ? String(env.code) : "REQUEST_FAILED",
    message: String(env?.message || e?.message || e || "Unknown error"),
    requestId: env?.requestId ? String(env.requestId) : undefined
  };
}

function safeJson(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function shallowDiff(a: any, b: any) {
  const A = a && typeof a === "object" ? a : {};
  const B = b && typeof b === "object" ? b : {};
  const keys = Array.from(new Set([...Object.keys(A), ...Object.keys(B)])).sort();

  const diffs: { key: string; a: string; b: string }[] = [];
  for (const k of keys) {
    const av = A[k];
    const bv = B[k];
    const as = safeJson(av);
    const bs = safeJson(bv);
    if (as !== bs) diffs.push({ key: k, a: as, b: bs });
  }
  return diffs;
}

export default function SopRunsCompareResultScreen() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const params = useLocalSearchParams<{ a?: string; b?: string }>();

  const aId = typeof params.a === "string" ? params.a : "";
  const bId = typeof params.b === "string" ? params.b : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);
  const [aRun, setARun] = useState<any>(null);
  const [bRun, setBRun] = useState<any>(null);

  const fetchBoth = useCallback(async () => {
    if (!facilityId || !aId || !bId) return;
    setError(null);

    const urlA = `${endpoints.sopRuns(facilityId)}/${encodeURIComponent(aId)}`;
    const urlB = `${endpoints.sopRuns(facilityId)}/${encodeURIComponent(bId)}`;

    const [ra, rb] = await Promise.all([
      apiRequest(urlA, { method: "GET" }),
      apiRequest(urlB, { method: "GET" })
    ]);

    setARun(ra);
    setBRun(rb);
  }, [facilityId, aId, bId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetchBoth();
      } catch (e) {
        if (!alive) return;
        setError(normalizeError(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchBoth]);

  const diffs = useMemo(() => shallowDiff(aRun, bRun), [aRun, bRun]);

  return (
    <ScreenBoundary name="facility.sopRuns.compareResult">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Compare Result</Text>

        <Text style={{ opacity: 0.85 }}>Facility: {facilityId || "none"}</Text>
        <Text style={{ opacity: 0.85 }}>A: {aId || "missing"}</Text>
        <Text style={{ opacity: 0.85 }}>B: {bId || "missing"}</Text>

        <InlineError
          title={error?.title}
          message={error?.message}
          requestId={error?.requestId}
        />

        {!facilityId ? (
          <TouchableOpacity
            onPress={() => router.replace("/home/facility/select")}
            style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
          >
            <Text style={{ fontWeight: "900" }}>Go to Facility Select</Text>
          </TouchableOpacity>
        ) : loading ? (
          <>
            <ActivityIndicator />
            <Text style={{ opacity: 0.75 }}>Loading runs…</Text>
          </>
        ) : (
          <>
            <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
              <Text style={{ fontWeight: "900" }}>Top-level differences</Text>
              {diffs.length === 0 ? (
                <Text style={{ opacity: 0.75 }}>No top-level differences detected.</Text>
              ) : (
                diffs.slice(0, 60).map((d) => (
                  <View key={d.key} style={{ borderTopWidth: 1, paddingTop: 10, gap: 6 }}>
                    <Text style={{ fontWeight: "900" }}>{d.key}</Text>
                    <Text style={{ opacity: 0.75, fontFamily: "monospace" }}>
                      A: {d.a}
                    </Text>
                    <Text style={{ opacity: 0.75, fontFamily: "monospace" }}>
                      B: {d.b}
                    </Text>
                  </View>
                ))
              )}
              {diffs.length > 60 ? (
                <Text style={{ opacity: 0.75 }}>Showing first 60 diffs.</Text>
              ) : null}
            </View>

            <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
              <Text style={{ fontWeight: "900" }}>Raw A payload</Text>
              <Text style={{ opacity: 0.75, fontFamily: "monospace" }}>
                {safeJson(aRun)}
              </Text>
            </View>

            <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
              <Text style={{ fontWeight: "900" }}>Raw B payload</Text>
              <Text style={{ opacity: 0.75, fontFamily: "monospace" }}>
                {safeJson(bRun)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenBoundary>
  );
}
