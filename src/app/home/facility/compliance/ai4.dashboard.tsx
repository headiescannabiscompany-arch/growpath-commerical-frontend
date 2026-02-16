$root="C:\growpath-commercial\frontend"; cd $root

@'
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

type RecommendedSop = { id: string; title: string; reason?: string };

function normalizeRecommended(raw: any): RecommendedSop[] {
  const arr =
    Array.isArray(raw) ? raw :
    Array.isArray(raw?.recommended) ? raw.recommended :
    Array.isArray(raw?.items) ? raw.items :
    Array.isArray(raw?.sops) ? raw.sops :
    [];

  return arr
    .map((x: any) => ({
      id: String(x?.id ?? x?._id ?? x?.sopId ?? ""),
      title: String(x?.title ?? x?.name ?? x?.sopTitle ?? "SOP"),
      reason: x?.reason ? String(x.reason) : undefined
    }))
    .filter((x: RecommendedSop) => x.id.length > 0 || x.title.length > 0);
}

export default function Ai4ComplianceDashboardScreen() {
  const { selectedId: facilityId } = useFacility();
  const router = useRouter();
  const onApiError = useApiErrorHandler();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const [summary, setSummary] = useState<any | null>(null);
  const [recommended, setRecommended] = useState<RecommendedSop[]>([]);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setError(null);
    try {
      const [a, b] = await Promise.all([
        apiRequest(endpoints.compliance.deviationsSummary(facilityId), { method: "GET" }),
        apiRequest(endpoints.compliance.sopsRecommended(facilityId), { method: "GET" })
      ]);
      setSummary(a ?? null);
      setRecommended(normalizeRecommended(b));
    } catch (e: any) {
      setError(onApiError(e));
    } finally {
      setLoading(false);
    }
  }, [facilityId, onApiError]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = useMemo(() => {
    const s = summary || {};
    const items: { label: string; value: string }[] = [
      { label: "Open deviations", value: String(s.open ?? s.openCount ?? s.deviationsOpen ?? "—") },
      { label: "High risk", value: String(s.highRisk ?? s.highRiskCount ?? "—") },
      { label: "Due soon", value: String(s.dueSoon ?? s.dueSoonCount ?? "—") }
    ];
    return items;
  }, [summary]);

  return (
    <ScreenBoundary name="facility.compliance.ai4.dashboard">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>AI4 Compliance Dashboard</Text>

        {!facilityId ? (
          <>
            <Text style={{ opacity: 0.75 }}>Select a facility first.</Text>
            <TouchableOpacity
              onPress={() => router.push("/home/facility/select")}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Go to Facility Select</Text>
            </TouchableOpacity>
          </>
        ) : loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ opacity: 0.75 }}>Loading AI4 model…</Text>
          </View>
        ) : (
          <>
            <InlineError title={error?.title} message={error?.message} requestId={error?.requestId} />

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {cards.map((c) => (
                <View key={c.label} style={{ borderWidth: 1, borderRadius: 12, padding: 12, minWidth: 140 }}>
                  <Text style={{ opacity: 0.75 }}>{c.label}</Text>
                  <Text style={{ fontSize: 18, fontWeight: "900" }}>{c.value}</Text>
                </View>
              ))}
            </View>

            <Text style={{ marginTop: 6, fontWeight: "900" }}>Recommended SOPs</Text>

            <FlatList
              data={recommended}
              keyExtractor={(x, i) => (x.id ? `${x.id}` : `row-${i}`)}
              contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={async () => {
                    setRefreshing(true);
                    await load();
                    setRefreshing(false);
                  }}
                />
              }
              renderItem={({ item }) => (
                <View style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontWeight: "900" }}>{item.title}</Text>
                  {item.id ? <Text style={{ opacity: 0.7 }}>ID: {item.id}</Text> : null}
                  {item.reason ? <Text style={{ opacity: 0.75, marginTop: 6 }}>{item.reason}</Text> : null}
                </View>
              )}
              ListEmptyComponent={<Text style={{ opacity: 0.75 }}>No recommendations returned.</Text>}
            />
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
'@ | Set-Content -Encoding UTF8 .\src\app\home\facility\compliance\ai4.dashboard.tsx
