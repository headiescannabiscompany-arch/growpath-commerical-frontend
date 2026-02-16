import React, { useCallback, useEffect, useState } from "react";
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

export default function AuditLogDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedId: facilityId } = useFacility();

  const auditId = typeof id === "string" ? id : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);
  const [item, setItem] = useState<any>(null);

  const fetchDetail = useCallback(async () => {
    if (!facilityId || !auditId) return;
    setError(null);
    const url = `${endpoints.auditLogs(facilityId)}/${encodeURIComponent(auditId)}`;
    const raw = await apiRequest(url, { method: "GET" });
    setItem(raw);
  }, [facilityId, auditId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetchDetail();
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
  }, [fetchDetail]);

  return (
    <ScreenBoundary name="facility.auditLog.detail">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Audit Log Detail</Text>
        <Text style={{ opacity: 0.85 }}>Facility: {facilityId || "none"}</Text>
        <Text style={{ opacity: 0.85 }}>ID: {auditId || "missing"}</Text>

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
            <Text style={{ opacity: 0.75 }}>Loading…</Text>
          </>
        ) : (
          <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
            <Text style={{ fontWeight: "900" }}>Raw payload</Text>
            <Text style={{ opacity: 0.75, fontFamily: "monospace" }}>
              {safeJson(item)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        >
          <Text style={{ fontWeight: "900" }}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenBoundary>
  );
}
