import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import RequirePlan from "../../src/auth/RequirePlan";
import { createCommercialPost } from "../../src/api/commercialFeed";
import { logEvent } from "../../src/api/events";

export default function NewPostScreen() {
  const router = useRouter();

  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"update" | "listing" | "iso" | "question">("update");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!body.trim()) {
      setError("Post cannot be empty.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createCommercialPost({
        type,
        title,
        body
      });
      logEvent("POST_CREATE");
      // Go back to feed (it will refetch automatically)
      router.replace("/(app)/feed");
    } catch (err: any) {
      setError(err?.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePlan allow={["commercial", "facility"]}>
      <View style={{ flex: 1, padding: 24 }}>
        <Text style={{ fontSize: 22, marginBottom: 12 }}>New Commercial Post</Text>

        <Text style={{ marginBottom: 4 }}>Title (optional)</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Short headline"
          style={{
            borderWidth: 1,
            borderRadius: 10,
            padding: 10,
            marginBottom: 12
          }}
        />

        <Text style={{ marginBottom: 4 }}>Post</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Share an update, listing, or question..."
          multiline
          style={{
            minHeight: 120,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginBottom: 16
          }}
        />

        {error && <Text style={{ color: "red", marginTop: 12 }}>{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{
            marginTop: 24,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            alignItems: "center"
          }}
        >
          {loading ? <ActivityIndicator /> : <Text>Post</Text>}
        </Pressable>
      </View>
    </RequirePlan>
  );
}
