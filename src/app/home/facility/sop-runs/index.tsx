import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

type SopRun = {
  _id: string;
  sopTemplateTitleSnapshot?: string;
  sopTemplateId?: string;
  status?: string; // "active" | "completed" | etc
  createdAt?: string;
  completedAt?: string;
};

function normalizeRuns(res: any): SopRun[] {
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.runs)) return res.runs;
  if (Array.isArray(res?.sopRuns)) return res.sopRuns;
  if (Array.isArray(res)) return res;
  return [];
}

function safeDateLabel(x?: string) {
  if (!x) return "";
  const t = new Date(x).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(x).toLocaleString();
}

function statusRank(status?: string) {
  const s = String(status || "active").toLowerCase();
  if (s === "active" || s === "open" || s === "in_progress") return 0;
  if (s === "completed" || s === "done") return 1;
  return 2;
}

export default function FacilitySopRunsListScreen() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<SopRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchRuns = useCallback(async () => {
    if (!facilityId) return;
    setError(null);
    const res = await apiRequest(endpoints.sopRuns(facilityId));
    setItems(normalizeRuns(res));
  }, [facilityId]);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    try {
      await fetchRuns();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  }, [facilityId, fetchRuns, handleApiError]);

  const onRefresh = useCallback(async () => {
    if (!facilityId) return;
    setRefreshing(true);
    setError(null);
    try {
      await fetchRuns();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setRefreshing(false);
    }
  }, [facilityId, fetchRuns, handleApiError]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const ra = statusRank(a.status);
      const rb = statusRank(b.status);
      if (ra !== rb) return ra - rb;

      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      const aOk = Number.isFinite(ta) ? ta : 0;
      const bOk = Number.isFinite(tb) ? tb : 0;
      return bOk - aOk; // newest first
    });
    return copy;
  }, [items]);

  if (!facilityId) {
    return (
      <ScreenBoundary name="facility.sopRuns.list">
        <View style={{ flex: 1, padding: 16 }}>
          <Text>Select a facility first.</Text>

          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => router.push("/home/facility/select")}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Go to Facility Select</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenBoundary>
    );
  }

  if (loading) {
    return (
      <ScreenBoundary name="facility.sopRuns.list">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary name="facility.sopRuns.list">
      <View style={{ flex: 1, padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "900" }}>SOP Runs</Text>

          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={() => router.push("/home/facility/sop-runs/presets")}
            >
              \<Text style={{ fontWeight: "900" }}>Presets</Text>
            </TouchableOpacity>

            <View style={{ width: 14 }} />

            <TouchableOpacity onPress={load}>
              <Text style={{ fontWeight: "900" }}>Reload</Text>
            </TouchableOpacity>
          </View>
        </View>

        <InlineError error={error} />

        {sorted.length === 0 ? (
          <View style={{ paddingVertical: 8 }}>
            <Text>No SOP runs yet.</Text>
            <Text style={{ opacity: 0.7, marginTop: 6 }}>
              When SOP runs are created, they’ll appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(i) => String(i._id)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => {
              const title =
                item.sopTemplateTitleSnapshot || item.sopTemplateId || "SOP Run";

              const status = String(item.status || "active");
              const subtitle =
                status.toLowerCase() === "completed"
                  ? `Completed · ${safeDateLabel(item.completedAt)}`
                  : `Created · ${safeDateLabel(item.createdAt)}`;

              return (
                <TouchableOpacity
                  onPress={() => router.push(`/home/facility/sop-runs/${item._id}`)}
                >
                  <View
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: "#e5e7eb"
                    }}
                  >
                    <Text style={{ fontWeight: "900" }}>{title}</Text>
                    <Text style={{ opacity: 0.75, marginTop: 2 }}>
                      {status.toUpperCase()} · {subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </ScreenBoundary>
  );
}
