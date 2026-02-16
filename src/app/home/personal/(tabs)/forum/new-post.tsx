import React, { useCallback, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

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

export default function ForumNewPostRoute() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = { title: title.trim(), body: body.trim() };
      await apiRequest("/api/forum/posts", { method: "POST", body: payload });
      router.back();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSubmitting(false);
    }
  }, [title, body, router]);

  const disabled = !title.trim() || !body.trim() || submitting;

  return (
    <ScreenBoundary name="personal.forum.newPost">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>New Post</Text>

        <InlineError
          title={error?.title}
          message={error?.message}
          requestId={error?.requestId}
        />

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          style={{
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10
          }}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write your update…"
          multiline
          style={{
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            minHeight: 140,
            textAlignVertical: "top"
          }}
        />

        <TouchableOpacity
          onPress={submit}
          disabled={disabled}
          style={{
            borderWidth: 1,
            borderRadius: 10,
            padding: 12,
            opacity: disabled ? 0.5 : 1
          }}
        >
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ fontWeight: "900" }}>Post</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        >
          <Text style={{ fontWeight: "900" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScreenBoundary>
  );
}
