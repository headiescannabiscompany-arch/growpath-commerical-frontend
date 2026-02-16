$root="C:\growpath-commercial\frontend"; cd $root

@'
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

export default function SopRunDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const runId = String(id || "");
  const { selectedId: facilityId } = useFacility();
  const router = useRouter();
  const onApiError = useApiErrorHandler();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const [run, setRun] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!facilityId || !runId) return;
    setError(null);
    try {
      const url = `${endpoints.sopRuns(facilityId)}/${encodeURIComponent(runId)}`;
      const res = await apiRequest(url, { method: "GET" });
      setRun(res ?? null);
    } catch (e: any) {
      setError(onApiError(e));
    } finally {
      setLoading(false);
    }
  }, [facilityId, runId, onApiError]);

  useEffect(() => {
    load();
  }, [load]);

  const title = useMemo(() => {
    const r = run || {};
    return String(r.title ?? r.name ?? r.templateName ?? "SOP Run");
  }, [run]);

  return (
    <ScreenBoundary name="facility.sopRun.detail">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>{title}</Text>
        <Text style={{ opacity: 0.75 }}>Facility: {facilityId || "none"}</Text>
        <Text style={{ opacity: 0.75 }}>Run ID: {runId || "missing"}</Text>

        {!facilityId ? (
          <TouchableOpacity
            onPress={() => router.push("/home/facility/select")}
            style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
          >
            <Text style={{ fontWeight: "900" }}>Go to Facility Select</Text>
          </TouchableOpacity>
        ) : loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ opacity: 0.75 }}>Loading SOP run…</Text>
          </View>
        ) : (
          <>
            <InlineError title={error?.title} message={error?.message} requestId={error?.requestId} />

            <ScrollView style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontFamily: "monospace", fontSize: 12 }}>
                {JSON.stringify(run, null, 2)}
              </Text>
            </ScrollView>

            <TouchableOpacity onPress={() => router.back()} style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}>
              <Text style={{ fontWeight: "900" }}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
'@ | Set-Content -Encoding UTF8 .\src\app\home\facility\sop-runs\[id].tsx
