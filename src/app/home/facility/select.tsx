$root="C:\growpath-commercial\frontend"; cd $root

@'
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { apiRequest } from "@/api/apiRequest";
import { useFacility } from "@/state/useFacility";

type FacilityRow = { id: string; name: string };

function normalizeFacilities(raw: any): FacilityRow[] {
  const arr =
    Array.isArray(raw) ? raw :
    Array.isArray(raw?.facilities) ? raw.facilities :
    Array.isArray(raw?.items) ? raw.items :
    Array.isArray(raw?.data) ? raw.data :
    [];

  return arr
    .map((f: any) => ({
      id: String(f?.id ?? f?._id ?? f?.facilityId ?? ""),
      name: String(f?.name ?? f?.facilityName ?? f?.title ?? f?.id ?? f?._id ?? "Facility")
    }))
    .filter((f: FacilityRow) => f.id.length > 0);
}

export default function FacilitySelectScreen() {
  const router = useRouter();
  const { selectedId, setSelectedId } = useFacility();
  const onApiError = useApiErrorHandler();

  const [rows, setRows] = useState<FacilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest("/api/facilities", { method: "GET" });
      setRows(normalizeFacilities(res));
    } catch (e: any) {
      setError(onApiError(e));
    } finally {
      setLoading(false);
    }
  }, [onApiError]);

  useEffect(() => {
    load();
  }, [load]);

  const header = useMemo(() => {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Select Facility</Text>
        <Text style={{ opacity: 0.75 }}>
          Choose the facility you want to operate in. This selection controls facility-scoped tabs.
        </Text>
        <InlineError title={error?.title} message={error?.message} requestId={error?.requestId} />
      </View>
    );
  }, [error]);

  const onPick = useCallback(
    (id: string) => {
      setSelectedId(id);
      router.replace("/home/facility"); // let /home/facility/index.tsx do the deterministic redirect
    },
    [router, setSelectedId]
  );

  const renderItem = ({ item }: { item: FacilityRow }) => {
    const active = item.id === selectedId;
    return (
      <Pressable
        onPress={() => onPick(item.id)}
        style={{
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          opacity: active ? 1 : 0.9
        }}
      >
        <Text style={{ fontWeight: "900" }}>{item.name}</Text>
        <Text style={{ opacity: 0.7 }}>ID: {item.id}</Text>
        {active ? <Text style={{ marginTop: 6, fontWeight: "900" }}>Selected</Text> : null}
      </Pressable>
    );
  };

  return (
    <ScreenBoundary name="facility.select">
      <View style={{ flex: 1, padding: 16 }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ opacity: 0.75 }}>Loading facilities…</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(x) => x.id}
            ListHeaderComponent={header}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            renderItem={renderItem}
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
            ListEmptyComponent={
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ opacity: 0.75 }}>
                  No facilities found for this account (or the API returned an unexpected shape).
                </Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenBoundary>
  );
}
'@ | Set-Content -Encoding UTF8 .\src\app\home\facility\select.tsx
