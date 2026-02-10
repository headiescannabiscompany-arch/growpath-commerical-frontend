import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function FacilitySopRunStart() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="FacilitySopRunStart">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>FacilitySopRunStart</Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : (
          <>
            <Text style={{ opacity: 0.75 }}>
              Stub screen (safe mount). Wire API later.
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ fontWeight: "900" }}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenBoundary>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";

import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";
import { RoleGate } from "@/components/RoleGate";

// SOPTemplate type
function normalizeTemplates(res: any) {
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.templates)) return res.templates;
  if (Array.isArray(res)) return res;
  return [];
}

function normalizeCreatedRunId(res: any): string | null {
  const run = res?.run || res?.sopRun || res?.item || res;
  const id = run?._id || run?.id;
  return id ? String(id) : null;
}

export default function StartSOPRunScreen({ navigation }: any) {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<any>(null);

  const load = async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(endpoints.sopTemplates(facilityId));
      setItems(normalizeTemplates(res));
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [facilityId]);

  const activeTemplates = useMemo(() => items.filter((t) => !t.archived), [items]);

  const startRun = async (templateId: string) => {
    if (!facilityId) return;
    setSubmitting(templateId);
    setError(null);
    try {
      const res = await apiRequest(endpoints.sopRuns(facilityId), {
        method: "POST",
        body: { sopTemplateId: templateId }
      });
      const runId = normalizeCreatedRunId(res);
      if (!runId) {
        setError({
          code: "INVALID_RESPONSE",
          message: "Run created but no run id returned"
        });
        return;
      }
      navigation.replace("SOPRunDetail", { id: runId });
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 40 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "800" }}>Start SOP Run</Text>
        <TouchableOpacity onPress={load}>
          <Text style={{ fontWeight: "700" }}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <InlineError error={error} />
      <RoleGate
        minRole="STAFF"
        fallback={<Text>Read-only role: cannot start SOP runs.</Text>}
      >
        {activeTemplates.length === 0 ? (
          <Text>No active SOP templates</Text>
        ) : (
          <FlatList
            data={activeTemplates}
            keyExtractor={(t) => String(t._id)}
            renderItem={({ item }) => {
              const isBusy = submitting === item._id;
              return (
                <TouchableOpacity
                  onPress={() => startRun(String(item._id))}
                  disabled={!!submitting}
                >
                  <View
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: "#e5e7eb",
                      opacity: isBusy ? 0.6 : 1
                    }}
                  >
                    <Text style={{ fontWeight: "800" }}>
                      {item.title || "Untitled SOP"}
                    </Text>
                    <Text style={{ opacity: 0.75 }}>
                      {isBusy ? "Starting..." : "Tap to start run"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </RoleGate>
    </View>
  );
}
