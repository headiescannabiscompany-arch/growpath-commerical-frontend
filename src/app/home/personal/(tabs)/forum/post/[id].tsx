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

export default function ForumPostDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const postId = typeof id === "string" ? id : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);
  const [post, setPost] = useState<any>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    setError(null);
    const url = `/api/forum/posts/${encodeURIComponent(postId)}`;
    const res = await apiRequest(url, { method: "GET" });
    setPost(res);
  }, [postId]);

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

  const title = String(post?.title || post?.name || "Post");
  const body = String(post?.body || post?.content || "");

  return (
    <ScreenBoundary name="personal.forum.postDetail">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>{title}</Text>

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
            <Text style={{ opacity: 0.9 }}>{body || "(no content)"}</Text>
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
