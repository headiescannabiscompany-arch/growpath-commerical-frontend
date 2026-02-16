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

async function fetchWithFallback(primary: string, fallback: string) {
  try {
    return await apiRequest(primary, { method: "GET" });
  } catch {
    return await apiRequest(fallback, { method: "GET" });
  }
}

export default function CommercialAlertDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const alertId = typeof id === "string" ? id : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    if (!alertId) return;
    setError(null);
    const primary = `/api/commercial/alerts/${encodeURIComponent(alertId)}`;
    const fallback = `/api/alerts/${encodeURIComponent(alertId)}`;
    const res = await fetchWithFallback(primary, fallback);
    setData(res);
  }, [alertId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
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
  }, [load]);

  return (
    <ScreenBoundary name="commercial.alerts.detail">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Alert Detail</Text>
        <Text style={{ opacity: 0.8 }}>ID: {alertId || "missing"}</Text>

        <InlineError
          title={error?.title}
          message={error?.message}
          requestId={error?.requestId}
        />

        {loading ? (
          <>
            <ActivityIndicator />
            <Text style={{ opacity: 0.75 }}>Loading…</Text>
          </>
        ) : (
          <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
            <Text style={{ fontWeight: "900" }}>Payload</Text>
            <Text style={{ opacity: 0.75, fontFamily: "monospace" }}>
              {safeJson(data)}
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
