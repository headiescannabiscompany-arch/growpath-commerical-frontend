import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;

function getId(params: Record<string, any>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

export default function ForumPostDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = getId(params as any);

  const apiErr: any = useApiErrorHandler();
  const resolved = useMemo(() => {
    const error = apiErr?.error ?? apiErr?.[0] ?? null;
    const handleApiError = apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {});
    const clearError = apiErr?.clearError ?? apiErr?.[2] ?? (() => {});
    return { error, handleApiError, clearError };
  }, [apiErr]);

  const [post, setPost] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!id) {
        setPost(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        resolved.clearError();

        const path =
          (endpoints as any)?.forumPost?.(id) ??
          (endpoints as any)?.forum?.post?.(id) ??
          `/api/forum/posts/${encodeURIComponent(id)}`;

        const res = await apiRequest(path, { method: "GET" });
        setPost(res ?? null);
      } catch (e) {
        resolved.handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, resolved]
  );

  useEffect(() => {
    load();
  }, [load]);

  const keys = useMemo(() => (post ? Object.keys(post).sort() : []), [post]);

  return (
    <ScreenBoundary title="Forum Post">
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
          <Text style={styles.h1}>Forum Post</Text>
          <Text style={styles.muted}>id: {id || "(missing)"}</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading post…</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {post ? (
            <View style={styles.kvWrap}>
              {keys.map((k) => (
                <View key={k} style={styles.kv}>
                  <Text style={styles.k}>{k}</Text>
                  <Text style={styles.v} selectable>
                    {typeof post[k] === "string" ? post[k] : JSON.stringify(post[k])}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>
              {id ? "No post returned." : "Missing post id."}
            </Text>
          )}
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
    backgroundColor: "white"
  },
  kvWrap: { marginTop: 6 },
  kv: { gap: 4, marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 },
  backLink: { fontWeight: "800", marginTop: 6 }
});
