import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import RequirePlan from "../../../src/auth/RequirePlan";
import { getCommercialPost } from "../../../src/api/commercialFeed";

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await getCommercialPost(String(id));
        const p = res?.post || res?.item || res; // defensive
        setPost(p);
      } catch (e: any) {
        setError(e?.message || "Failed to load post");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <RequirePlan allow={["commercial", "facility"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ opacity: 0.7 }}>← Back</Text>
        </Pressable>

        {loading ? (
          <View style={{ paddingVertical: 40 }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View style={{ padding: 12, borderWidth: 1, borderRadius: 12 }}>
            <Text style={{ marginBottom: 8 }}>{error}</Text>
            <Pressable
              onPress={() => router.replace(`/(app)/post/${id}`)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderRadius: 10,
                alignSelf: "flex-start"
              }}
            >
              <Text>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
            <Text style={{ fontSize: 20, marginBottom: 8 }}>
              {post?.title?.length ? post.title : "Commercial Post"}
            </Text>

            <Text style={{ opacity: 0.75, marginBottom: 10 }}>
              {post?.author?.displayName || "Unknown"} •{" "}
              {new Date(post?.createdAt).toLocaleString()}
            </Text>

            <Text style={{ fontSize: 16, lineHeight: 22 }}>{post?.body || ""}</Text>

            {Array.isArray(post?.tags) && post.tags.length ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ opacity: 0.8, marginBottom: 6 }}>Tags</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {post.tags.map((t: string) => (
                    <View
                      key={t}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderWidth: 1,
                        borderRadius: 999,
                        marginRight: 8,
                        marginBottom: 8
                      }}
                    >
                      <Text>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </RequirePlan>
  );
}
